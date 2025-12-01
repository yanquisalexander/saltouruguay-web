import { client } from "@/db/client";
import { NegativeVotesStreamersTable, StreamerWarsInscriptionsTable, StreamerWarsPlayersTable, StreamerWarsTeamPlayersTable, StreamerWarsTeamsTable, UsersTable } from "@/db/schema";
import cacheService from "@/services/cache";
import { and, asc, count, eq, inArray, min, not, desc } from "drizzle-orm";
import { pusher } from "./pusher";
import { tts } from "@/services/tts";
import { addRoleToUser, DISCORD_ROLES, getDiscordUser, getGuildMember, LOGS_CHANNEL_WEBHOOK_ID, removeRoleFromUser, ROLE_GUERRA_STREAMERS, sendDiscordEmbed, sendWebhookMessage } from "@/services/discord";
import { SALTO_DISCORD_GUILD_ID } from "@/config";
import { DISCORD_LOGS_WEBHOOK_TOKEN } from "astro:env/server";
import { getTranslation } from "./translate";
import { getLiveStreams } from "./twitch-runtime";
import { CINEMATICS } from "@/consts/cinematics";
import { encodeAudioForPusher } from "@/services/pako-compress";
import { DalgonaShape, type DalgonaShapeData, createDalgonaShapeData, generateDalgonaImage } from "@/services/dalgona-image-generator";

// Import from modular structure
import { generatePlayerChallenges } from "./streamer-wars/minigames/bomb-challenges";
import { createCache } from "./streamer-wars/cache";
import { getRandomItem } from "./streamer-wars/utils";
import type {
    SimonSaysGameState,
    DalgonaPlayerState,
    DalgonaGameState,
    TugOfWarGameState,
    BombChallengeType,
    BombChallenge,
    BombPlayerState,
    BombGameState,
    FishingGameState
} from "./streamer-wars/types";

// Re-export types for backward compatibility
export type {
    SimonSaysGameState,
    DalgonaPlayerState,
    DalgonaGameState,
    TugOfWarGameState,
    BombChallengeType,
    BombChallenge,
    BombPlayerState,
    BombGameState,
    FishingGameState
};

const PRESENCE_CHANNEL = "presence-streamer-wars";

// Local constants for backward compatibility (these reference the modular structure)
const CACHE_KEY = "streamer-wars.simon-says";
const DALGONA_CACHE_KEY = "streamer-wars.dalgona:game-state";
const TUG_OF_WAR_CACHE_KEY = "streamer-wars.tug-of-war:game-state";
const COLORS = ["red", "blue", "green", "yellow"];
const COOLDOWN_MS = 1500; // 1.5 seconds cooldown per player
const BOMB_CACHE_KEY = "streamer-wars.bomb:game-state";
const MAX_CHALLENGES = 5;
const MAX_ERRORS = 3;
const FISHING_CACHE_KEY = "streamer-wars.fishing:game-state";
const FISHING_ELIMINATED_KEY = "fishing:eliminated-players";

// Dalgona game constants
const DALGONA_MIN_COMPLETION_TIME_MS = 10000; // 10 seconds minimum
const DALGONA_MAX_COMPLETION_TIME_MS = 300000; // 5 minutes maximum
const DALGONA_MIN_COMPLETION_PERCENTAGE = 95; // Minimum 95% removal required

// Team to shape mapping for Dalgona game
const TEAM_SHAPE_MAP: Record<number, DalgonaShape> = {
    1: DalgonaShape.Circle,    // Easy
    2: DalgonaShape.Triangle,  // Easy
    3: DalgonaShape.Star,      // Medium
    4: DalgonaShape.Umbrella,  // Hard
};

// Note: Types and challenge generators are now imported from modular structure

export const games = {
    simonSays: {
        getGameState: async (): Promise<SimonSaysGameState> => {
            const cache = createCache();
            return (
                (await cache.get<SimonSaysGameState>(CACHE_KEY)) ?? {
                    teams: {},
                    currentRound: 0,
                    currentPlayers: {},
                    pattern: [],
                    eliminatedPlayers: [],
                    status: "waiting",
                    completedPlayers: [],
                    playerWhoAlreadyPlayed: [],
                }
            );
        },

        generateNextPattern: async (): Promise<string[]> => {
            const gameState = await games.simonSays.getGameState();
            const nextColor = getRandomItem(COLORS);
            return [...gameState.pattern, nextColor];
        },

        startGame: async (teams: Record<string, { players: number[] }>) => {
            const cache = createCache();

            const currentPlayers = Object.fromEntries(
                Object.entries(teams)
                    .map(([team, data]) => {
                        const chosenPlayer = data.players.length > 0 ? getRandomItem(data.players) : null;
                        return [team, chosenPlayer];
                    })
                    .filter(([, chosenPlayer]) => chosenPlayer !== null)
            );

            const patternFirstColor = getRandomItem(COLORS);

            const newGameState: SimonSaysGameState = {
                teams,
                currentRound: 1,
                currentPlayers, // Aquí ya solo estarán los equipos con jugador asignado
                pattern: [patternFirstColor],
                eliminatedPlayers: [],
                status: "playing",
                completedPlayers: [],
                playerWhoAlreadyPlayed: [],
            };

            await cache.set(CACHE_KEY, newGameState);
            await pusher.trigger("streamer-wars.simon-says", "game-state", newGameState);
            return newGameState;
        },

        completePattern: async (playerNumber: number) => {
            const cache = createCache();
            const gameState = await games.simonSays.getGameState();

            // Agrega el jugador que completó el patrón (si aún no está)
            const newCompletedPlayers = Array.from(
                new Set([...gameState.completedPlayers, playerNumber])
            );


            const newGameState: SimonSaysGameState = {
                ...gameState,
                completedPlayers: newCompletedPlayers,
            };

            // Verifica si todos los jugadores asignados (en currentPlayers) han completado el patrón.
            // Se ignoran aquellos equipos sin jugador asignado (null).
            const allCompleted = Object.values(gameState.currentPlayers).every(
                (player) => player === null || newCompletedPlayers.includes(player)
            );

            await cache.set(CACHE_KEY, newGameState);

            await pusher.trigger("streamer-wars.simon-says", "completed-pattern", {
                playerNumber,
            });

            if (allCompleted) {
                await games.simonSays.advanceToNextRoundForCurrentPlayers();
            }

            try {
                await sendWebhookMessage(LOGS_CHANNEL_WEBHOOK_ID, DISCORD_LOGS_WEBHOOK_TOKEN, {
                    content: null,
                    embeds: [
                        {
                            title: "Patrón completado",
                            description: `El jugador **#${playerNumber}** ha completado el patrón de Simon Says.`,
                            color: 0x00ff00,
                            fields: [
                                {
                                    name: "Equipo",
                                    value: getTranslation(Object.entries(gameState.currentPlayers).find(([team, player]) => player === playerNumber)?.[0]!) ?? "Sin equipo",
                                    inline: true,
                                },
                                {
                                    name: "Ronda",
                                    value: gameState.currentRound.toString(),
                                    inline: true,
                                },
                                {
                                    name: "Completaron",
                                    value: `${newCompletedPlayers.length} de ${Object.values(gameState.currentPlayers).filter(player => player !== null).length}`,
                                    inline: true,
                                }
                            ],
                        },

                    ],
                });
            } catch (error) {

            }
        },

        patternFailed: async (playerNumber: number) => {
            const cache = createCache();
            const gameState = await games.simonSays.getGameState();

            // Agrega el jugador a la lista de eliminados

            const newEliminatedPlayers = Array.from(
                new Set([...gameState.eliminatedPlayers, playerNumber])
            );

            // Agrega a todos los jugadores asignados a la lista de jugadores que ya jugaron

            const newPlayerWhoAlreadyPlayed = Array.from(
                new Set([
                    ...gameState.playerWhoAlreadyPlayed,
                    ...Object.values(gameState.currentPlayers).filter((player) => player !== null),
                ])
            );

            const newGameState: SimonSaysGameState = {
                ...gameState,
                status: "waiting",
                eliminatedPlayers: newEliminatedPlayers,
                playerWhoAlreadyPlayed: newPlayerWhoAlreadyPlayed,
            };

            await cache.set(CACHE_KEY, newGameState);
            await pusher.trigger("streamer-wars.simon-says", "pattern-failed", {
                playerNumber,
            });
            await pusher.trigger("streamer-wars.simon-says", "game-state", newGameState);

            try {
                await sendWebhookMessage(LOGS_CHANNEL_WEBHOOK_ID, DISCORD_LOGS_WEBHOOK_TOKEN, {
                    content: null,
                    embeds: [
                        {
                            title: "Patrón fallado",
                            description: `El jugador ${playerNumber} ha fallado el patrón de Simon Says y ha sido eliminado.`,
                            color: 0xff0000,
                        },
                    ],
                });
            } catch (error) {

            }

            await eliminatePlayer(playerNumber);
            return newGameState;
        },

        advanceToNextRoundForCurrentPlayers: async () => {
            const cache = createCache();
            const gameState = await games.simonSays.getGameState();

            const pattern = await games.simonSays.generateNextPattern();

            const newGameState: SimonSaysGameState = {
                ...gameState,
                currentRound: gameState.currentRound + 1,
                pattern,
                completedPlayers: [],
                status: "playing",
            };

            await cache.set(CACHE_KEY, newGameState);
            // Se espera un momento antes de enviar el nuevo estado
            await new Promise((resolve) => setTimeout(resolve, 2000));
            await pusher.trigger("streamer-wars.simon-says", "game-state", newGameState);

            try {
                await sendWebhookMessage(LOGS_CHANNEL_WEBHOOK_ID, DISCORD_LOGS_WEBHOOK_TOKEN, {
                    content: null,
                    embeds: [
                        {
                            title: "Siguiente ronda",
                            description: `Se ha avanzado a la ronda ${newGameState.currentRound} de Simón Dice.`,
                            color: 15267327,
                        },
                    ],
                });
            } catch (error) {

            }
            return newGameState;
        },

        /**
         * Avanza a una nueva partida con jugadores que aún no han jugado y no están eliminados.
         * Para cada equipo, se selecciona un nuevo jugador de entre los que:
         * - Están en `teams.players`
         * - No están en `eliminatedPlayers`
         * - No están en `playerWhoAlreadyPlayed`
         *
         * Se reinicia el patrón, se establece la ronda en 1 y se limpia `completedPlayers`.
         */
        nextRoundWithOtherPlayers: async () => {
            const cache = createCache();
            const gameState = await games.simonSays.getGameState();

            // Para cada equipo, filtra a los jugadores que no hayan jugado y que no estén eliminados,
            // y solo asigna un jugador si hay alguno disponible.
            const newCurrentPlayers = Object.fromEntries(
                Object.entries(gameState.teams)
                    .map(([team, data]) => {
                        const availablePlayers = data.players.filter(
                            (player) =>
                                !gameState.playerWhoAlreadyPlayed.includes(player) &&
                                !gameState.eliminatedPlayers.includes(player)
                        );
                        return availablePlayers.length > 0 ? [team, getRandomItem(availablePlayers)] : null;
                    })
                    .filter((entry): entry is [string, number] => entry !== null) // Elimina las entradas nulas
            ) as Record<string, number>;

            // Se define un nuevo patrón iniciando con un color aleatorio
            const newPattern = [getRandomItem(COLORS)];

            // Se arma el nuevo estado de juego para la siguiente partida
            const newGameState: SimonSaysGameState = {
                ...gameState,
                currentRound: 1,
                currentPlayers: newCurrentPlayers, // Solo equipos con jugador asignado
                pattern: newPattern,
                completedPlayers: [],
                status: "playing",
                // Se mantiene playerWhoAlreadyPlayed y eliminatedPlayers para no reutilizar jugadores ya usados o eliminados
            };

            await cache.set(CACHE_KEY, newGameState);
            await pusher.trigger("streamer-wars.simon-says", "game-state", newGameState);
            return newGameState;
        },

    },

    dalgona: {
        /**
         * Gets the current Dalgona game state from cache
         */
        getGameState: async (): Promise<DalgonaGameState> => {
            const cache = createCache();
            return (
                (await cache.get<DalgonaGameState>(DALGONA_CACHE_KEY)) ?? {
                    players: {},
                    status: 'waiting',
                }
            );
        },

        /**
         * Starts the Dalgona minigame
         * Assigns shapes to players based on their team and generates images
         */
        startGame: async () => {
            const cache = createCache();

            // Get all players with their teams
            const playersWithTeams = await client
                .select({
                    playerNumber: StreamerWarsPlayersTable.playerNumber,
                    teamId: StreamerWarsTeamPlayersTable.teamId,
                    eliminated: StreamerWarsPlayersTable.eliminated,
                    aislated: StreamerWarsPlayersTable.aislated,
                    userId: StreamerWarsPlayersTable.userId,
                })
                .from(StreamerWarsPlayersTable)
                .innerJoin(
                    StreamerWarsTeamPlayersTable,
                    eq(StreamerWarsTeamPlayersTable.playerNumber, StreamerWarsPlayersTable.playerNumber)
                )
                .where(
                    and(
                        not(eq(StreamerWarsPlayersTable.eliminated, true)),
                        not(eq(StreamerWarsPlayersTable.aislated, true))
                    )
                )
                .execute();

            // Initialize player states
            const players: Record<number, DalgonaPlayerState> = {};

            for (const player of playersWithTeams) {
                // Assign shape based on team (default to circle if team not in map)
                const shapeType = TEAM_SHAPE_MAP[player.teamId] || DalgonaShape.Circle;
                const shape = createDalgonaShapeData(shapeType);

                // Generate the Dalgona cookie image
                const imageUrl = generateDalgonaImage(shapeType);

                // Store player state in Redis
                await cache.set(`player:${player.playerNumber}:dalgona_shape`, shapeType);

                players[player.playerNumber] = {
                    playerNumber: player.playerNumber,
                    teamId: player.teamId,
                    shape,
                    imageUrl,
                    lives: 3, // Changed from attemptsLeft: 2 to lives: 3
                    status: 'playing',
                };
            }

            // Save game state
            const gameState: DalgonaGameState = {
                players,
                status: 'active',
                startedAt: Date.now(),
            };

            await cache.set(DALGONA_CACHE_KEY, gameState);

            // Broadcast game started to all players FIRST
            await pusher.trigger('streamer-wars', 'dalgona:game-started', {
                totalPlayers: Object.keys(players).length,
            });

            // Then send individual events to each player
            for (const player of playersWithTeams) {
                if (player.userId) {
                    const playerState = players[player.playerNumber];
                    await pusher.trigger('streamer-wars', 'dalgona:start', {
                        userId: player.userId,
                        imageUrl: playerState.imageUrl,
                        lives: 3, // Changed from attemptsLeft: 2 to lives: 3
                        shape: TEAM_SHAPE_MAP[player.teamId] || DalgonaShape.Circle,
                    });
                }
            }

            try {
                await sendWebhookMessage(LOGS_CHANNEL_WEBHOOK_ID, DISCORD_LOGS_WEBHOOK_TOKEN, {
                    content: null,
                    embeds: [
                        {
                            title: "Dalgona - Juego iniciado",
                            description: `Se ha iniciado el minijuego Dalgona con ${Object.keys(players).length} jugadores.`,
                            color: 0xffa500,
                        },
                    ],
                });
            } catch (error) {
                console.error("Error sending Discord webhook:", error);
            }

            return gameState;
        },

        /**
         * Validates a player's trace submission
         * @param playerNumber The player's number
         * @param traceData The trace data from the client (includes percentage completed and timing)
         * @returns Success status and updated game state
         */
        submitTrace: async (playerNumber: number, traceData: any) => {
            const cache = createCache();
            const gameState = await games.dalgona.getGameState();

            const playerState = gameState.players[playerNumber];

            if (!playerState) {
                return {
                    success: false,
                    error: 'Player not found in game',
                };
            }

            if (playerState.status !== 'playing') {
                return {
                    success: false,
                    error: 'Player is not in playing state',
                };
            }

            // Anti-cheat: Validate timing
            if (gameState.startedAt) {
                const timeElapsed = Date.now() - gameState.startedAt;
                
                if (timeElapsed < DALGONA_MIN_COMPLETION_TIME_MS) {
                    // Log to server logs only (not console) for anti-cheat monitoring
                    try {
                        await sendWebhookMessage(LOGS_CHANNEL_WEBHOOK_ID, DISCORD_LOGS_WEBHOOK_TOKEN, {
                            content: null,
                            embeds: [
                                {
                                    title: "Dalgona - Anti-cheat Alert",
                                    description: `Player #${playerNumber} completed suspiciously fast: ${timeElapsed}ms`,
                                    color: 0xff0000,
                                },
                            ],
                        });
                    } catch (error) {
                        // Silent fail - don't expose errors to client
                    }
                    return {
                        success: false,
                        error: 'Completion time is suspiciously fast',
                        eliminated: false,
                    };
                }
                
                if (timeElapsed > DALGONA_MAX_COMPLETION_TIME_MS) {
                    return {
                        success: false,
                        error: 'Time limit exceeded',
                        eliminated: false,
                    };
                }
            }

            // Validate completion percentage
            // Note: percentageRemoved comes from client. For production, consider
            // server-side validation by having client send mask data for verification
            const percentageRemoved = traceData.percentageRemoved || 0;
            if (percentageRemoved < DALGONA_MIN_COMPLETION_PERCENTAGE) {
                return {
                    success: false,
                    error: 'Not enough pixels removed',
                    eliminated: false,
                };
            }

            // All validations passed

            // Player succeeded
                playerState.status = 'completed';
                gameState.players[playerNumber] = playerState;

                await cache.set(DALGONA_CACHE_KEY, gameState);

                // Get player info for notification
                const player = await client.query.StreamerWarsPlayersTable.findFirst({
                    where: eq(StreamerWarsPlayersTable.playerNumber, playerNumber),
                    with: {
                        user: {
                            columns: {
                                id: true,
                            }
                        }
                    }
                });

                // Notify player of success
                if (player?.user?.id) {
                    await pusher.trigger('streamer-wars', 'dalgona:success', {
                        userId: player.user.id,
                        playerNumber,
                    });
                }

                // Broadcast to all
                await pusher.trigger('streamer-wars', 'dalgona:player-completed', {
                    playerNumber,
                });

                try {
                    // Genera el audio.
                    const audioBase64 = await tts(`Jugador, ${playerNumber}. pasa!`);

                    const audioPayload = encodeAudioForPusher(audioBase64!);

                    await pusher.trigger("streamer-wars", "megaphony", {
                        audioBase64: audioPayload,
                    });
                } catch (error) {

                }

                try {
                    await sendWebhookMessage(LOGS_CHANNEL_WEBHOOK_ID, DISCORD_LOGS_WEBHOOK_TOKEN, {
                        content: null,
                        embeds: [
                            {
                                title: "Dalgona - Desafío completado",
                                description: `El jugador #${playerNumber} ha completado exitosamente el desafío Dalgona.`,
                                color: 0x00ff00,
                            },
                        ],
                    });
                } catch (error) {
                    console.error("Error sending Discord webhook:", error);
                }

                return {
                    success: true,
                    status: 'completed',
                };
        },

        /**
         * Handles damage event when player makes an error
         * @param playerNumber The player's number
         * @returns Updated lives count and status
         */
        handleDamage: async (playerNumber: number) => {
            const cache = createCache();
            const gameState = await games.dalgona.getGameState();

            const playerState = gameState.players[playerNumber];

            if (!playerState) {
                return {
                    success: false,
                    error: 'Player not found in game',
                };
            }

            if (playerState.status !== 'playing') {
                return {
                    success: false,
                    error: 'Player is not in playing state',
                };
            }

            // Reduce lives
            playerState.lives -= 1;

            if (playerState.lives <= 0) {
                // No more lives - eliminate player
                playerState.status = 'failed';
                gameState.players[playerNumber] = playerState;

                await cache.set(DALGONA_CACHE_KEY, gameState);

                // Eliminate the player
                await eliminatePlayer(playerNumber);

                return {
                    success: true,
                    lives: 0,
                    eliminated: true,
                };
            } else {
                // Still has lives left
                gameState.players[playerNumber] = playerState;
                await cache.set(DALGONA_CACHE_KEY, gameState);

                return {
                    success: true,
                    lives: playerState.lives,
                    eliminated: false,
                };
            }
        },

        /**
         * Ends the Dalgona game and eliminates players who didn't complete it
         */
        endGame: async () => {
            const cache = createCache();
            const gameState = await games.dalgona.getGameState();

            // Find all players who didn't complete
            const failedPlayers = Object.values(gameState.players)
                .filter(p => p.status === 'playing' || p.status === 'failed')
                .map(p => p.playerNumber);

            // Update game state
            gameState.status = 'completed';
            await cache.set(DALGONA_CACHE_KEY, gameState);

            // Broadcast game ended
            await pusher.trigger('streamer-wars', 'dalgona:game-ended', {
                completedPlayers: Object.values(gameState.players)
                    .filter(p => p.status === 'completed')
                    .map(p => p.playerNumber),
                eliminatedPlayers: failedPlayers,
            });

            // Send timer to zero
            const timerCache = createCache();
            await timerCache.set("streamer-wars-timer", {
                startedAt: Date.now(),
                duration: 0,
            });
            await pusher.trigger("streamer-wars", "show-timer", {
                startedAt: Date.now(),
                duration: 0,
            });

            // Anunciar por megáfono el fin del juego
            try {
                const audioBase64 = await tts(`Atención jugadores. El minijuego "Dalgona" ha finalizado. Los jugadores que no lograron superar el desafío serán eliminados.`);

                const audioPayload = encodeAudioForPusher(audioBase64!);

                await pusher.trigger("streamer-wars", "megaphony", {
                    audioBase64: audioPayload,
                });

                // Esperar unos segundos para que se escuche el anuncio antes de eliminar jugadores
                await new Promise((resolve) => setTimeout(resolve, 10000));
            } catch (error) {
                console.error("Error generating megaphone audio:", error);
            }



            // Eliminate all failed players
            if (failedPlayers.length > 0) {
                await massEliminatePlayers(failedPlayers);
            }



            try {
                await sendWebhookMessage(LOGS_CHANNEL_WEBHOOK_ID, DISCORD_LOGS_WEBHOOK_TOKEN, {
                    content: null,
                    embeds: [
                        {
                            title: "Dalgona - Juego finalizado",
                            description: `El minijuego Dalgona ha finalizado. ${failedPlayers.length} jugadores fueron eliminados.`,
                            color: 0xff0000,
                        },
                    ],
                });
            } catch (error) {
                console.error("Error sending Discord webhook:", error);
            }

            return {
                success: true,
                gameState,
            };
        },
    },

    tugOfWar: {
        /**
         * Gets the current Tug of War game state from cache
         */
        getGameState: async (): Promise<TugOfWarGameState> => {
            const cache = createCache();
            return (
                (await cache.get<TugOfWarGameState>(TUG_OF_WAR_CACHE_KEY)) ?? {
                    teams: {
                        teamA: { id: 0, color: '', name: '', playerCount: 0 },
                        teamB: { id: 0, color: '', name: '', playerCount: 0 },
                    },
                    players: { teamA: [], teamB: [] },
                    progress: 0,
                    status: 'waiting',
                    playedTeams: [],
                    playerCooldowns: {},
                }
            );
        },

        /**
         * Starts a new Tug of War game with random team selection
         * Selects 2 teams that haven't played yet
         */
        startGame: async () => {
            const cache = createCache();

            // Get all teams with their active (non-eliminated, non-isolated) players
            const teamsData = await client
                .select({
                    teamId: StreamerWarsTeamsTable.id,
                    teamColor: StreamerWarsTeamsTable.color,
                    playerNumber: StreamerWarsPlayersTable.playerNumber,
                })
                .from(StreamerWarsTeamsTable)
                .innerJoin(
                    StreamerWarsTeamPlayersTable,
                    eq(StreamerWarsTeamPlayersTable.teamId, StreamerWarsTeamsTable.id)
                )
                .innerJoin(
                    StreamerWarsPlayersTable,
                    eq(StreamerWarsPlayersTable.playerNumber, StreamerWarsTeamPlayersTable.playerNumber)
                )
                .where(
                    and(
                        not(eq(StreamerWarsPlayersTable.eliminated, true)),
                        not(eq(StreamerWarsPlayersTable.aislated, true))
                    )
                )
                .execute();

            // Group players by team
            const teamGroups = teamsData.reduce((acc, row) => {
                if (row.teamId && row.playerNumber) {
                    if (!acc[row.teamId]) {
                        acc[row.teamId] = {
                            id: row.teamId,
                            color: row.teamColor,
                            players: [],
                        };
                    }
                    acc[row.teamId].players.push(row.playerNumber);
                }
                return acc;
            }, {} as Record<number, { id: number; color: string; players: number[] }>);

            // Get teams with at least 1 player
            const availableTeams = Object.values(teamGroups).filter(t => t.players.length > 0);

            console.log('Available teams for Tug of War:', availableTeams);
            if (availableTeams.length < 2) {
                throw new Error('No hay suficientes equipos disponibles para jugar Tug of War');
            }

            // Get played teams from state
            const currentState = await games.tugOfWar.getGameState();
            let playedTeams = currentState.playedTeams || [];

            // Filter out teams that have already played
            let unplayedTeams = availableTeams.filter(t => !playedTeams.includes(t.id));

            // If all teams have played or less than 2 unplayed teams, reset
            if (unplayedTeams.length < 2) {
                playedTeams = [];
                unplayedTeams = availableTeams;
            }

            // Randomly select 2 teams
            const selectedTeams = [];
            const teamsCopy = [...unplayedTeams];
            for (let i = 0; i < 2 && teamsCopy.length > 0; i++) {
                const randomIndex = Math.floor(Math.random() * teamsCopy.length);
                selectedTeams.push(teamsCopy.splice(randomIndex, 1)[0]);
            }

            if (selectedTeams.length < 2) {
                throw new Error('No se pudieron seleccionar 2 equipos para el juego');
            }

            // Order selected teams deterministically so teamA is the left team (smaller id)
            selectedTeams.sort((a, b) => a.id - b.id);

            const [teamA, teamB] = selectedTeams;

            // Update played teams
            playedTeams.push(teamA.id, teamB.id);

            const gameState: TugOfWarGameState = {
                teams: {
                    teamA: {
                        id: teamA.id,
                        color: teamA.color,
                        name: getTranslation(teamA.color) || teamA.color,
                        playerCount: teamA.players.length,
                    },
                    teamB: {
                        id: teamB.id,
                        color: teamB.color,
                        name: getTranslation(teamB.color) || teamB.color,
                        playerCount: teamB.players.length,
                    },
                },
                players: { teamA: teamA.players, teamB: teamB.players },
                progress: 0,
                status: 'playing',
                playedTeams,
                playerCooldowns: {},
            };

            await cache.set(TUG_OF_WAR_CACHE_KEY, gameState);
            await pusher.trigger('streamer-wars', 'tug-of-war:game-started', gameState);

            try {
                await sendWebhookMessage(LOGS_CHANNEL_WEBHOOK_ID, DISCORD_LOGS_WEBHOOK_TOKEN, {
                    content: null,
                    embeds: [
                        {
                            title: "Tug of War - Juego iniciado",
                            description: `Se ha iniciado el minijuego Tug of War entre ${gameState.teams.teamA.name} y ${gameState.teams.teamB.name}.`,
                            color: 0x00aaff,
                            fields: [
                                {
                                    name: gameState.teams.teamA.name,
                                    value: `${gameState.teams.teamA.playerCount} jugadores`,
                                    inline: true,
                                },
                                {
                                    name: gameState.teams.teamB.name,
                                    value: `${gameState.teams.teamB.playerCount} jugadores`,
                                    inline: true,
                                },
                            ],
                        },
                    ],
                });
            } catch (error) {
                console.error("Error sending Discord webhook:", error);
            }

            return gameState;
        },

        /**
         * Handles a player click/pull action
         * Validates cooldown and updates progress
         */
        handlePlayerClick: async (playerNumber: number) => {
            const cache = createCache();
            const gameState = await games.tugOfWar.getGameState();

            if (gameState.status !== 'playing') {
                return {
                    success: false,
                    error: 'El juego no está activo',
                };
            }

            // Check player cooldown
            const now = Date.now();
            const cooldownEnd = gameState.playerCooldowns[playerNumber] || 0;
            if (now < cooldownEnd) {
                return {
                    success: false,
                    error: 'Debes esperar antes de tirar de la cuerda nuevamente',
                    cooldownRemaining: cooldownEnd - now,
                };
            }

            // Get player's team
            const playerTeam = await client
                .select({
                    teamId: StreamerWarsTeamPlayersTable.teamId,
                })
                .from(StreamerWarsTeamPlayersTable)
                .where(eq(StreamerWarsTeamPlayersTable.playerNumber, playerNumber))
                .execute()
                .then(res => res[0]?.teamId);

            if (!playerTeam) {
                return {
                    success: false,
                    error: 'No perteneces a ningún equipo',
                };
            }

            // Check if player is in one of the competing teams
            const isTeamA = playerTeam === gameState.teams.teamA.id;
            const isTeamB = playerTeam === gameState.teams.teamB.id;

            if (!isTeamA && !isTeamB) {
                return {
                    success: false,
                    error: 'Tu equipo no está jugando en esta ronda',
                };
            }

            // Update progress
            const delta = isTeamA ? 1 : -1;
            gameState.progress = Math.max(-100, Math.min(100, gameState.progress + delta));

            // Set cooldown for this player
            gameState.playerCooldowns[playerNumber] = now + COOLDOWN_MS;

            // Check win condition
            if (gameState.progress >= 100) {
                gameState.status = 'finished';
                gameState.winner = 'teamA';
            } else if (gameState.progress <= -100) {
                gameState.status = 'finished';
                gameState.winner = 'teamB';
            }

            await cache.set(TUG_OF_WAR_CACHE_KEY, gameState);

            // Broadcast state update
            await pusher.trigger('streamer-wars', 'tug-of-war:state-update', {
                progress: gameState.progress,
                status: gameState.status,
                winner: gameState.winner,
            });

            // If game finished, announce winner
            if (gameState.status === 'finished') {
                const winningTeam = gameState.winner === 'teamA' ? gameState.teams.teamA : gameState.teams.teamB;

                try {
                    const audioBase64 = await tts(`¡El equipo ${winningTeam.name} ha ganado la partida de Tug of War!`);
                    const audioPayload = encodeAudioForPusher(audioBase64!);

                    await pusher.trigger("streamer-wars", "megaphony", {
                        audioBase64: audioPayload,
                    });
                } catch (error) {
                    console.error("Error generating megaphone audio:", error);
                }

                try {
                    await sendWebhookMessage(LOGS_CHANNEL_WEBHOOK_ID, DISCORD_LOGS_WEBHOOK_TOKEN, {
                        content: null,
                        embeds: [
                            {
                                title: "Tug of War - Juego finalizado",
                                description: `¡El equipo ${winningTeam.name} ha ganado!`,
                                color: 0x00ff00,
                                fields: [
                                    {
                                        name: "Progreso final",
                                        value: `${gameState.progress}`,
                                        inline: true,
                                    },
                                ],
                            },
                        ],
                    });
                } catch (error) {
                    console.error("Error sending Discord webhook:", error);
                }
            }

            return {
                success: true,
                gameState,
            };
        },

        /**
         * Ends the game (admin command or timeout)
         */
        endGame: async () => {
            const cache = createCache();
            const gameState = await games.tugOfWar.getGameState();

            if (gameState.status === 'waiting') {
                return {
                    success: false,
                    error: 'No hay juego activo',
                };
            }

            // Determine winner based on progress if not already set
            if (!gameState.winner) {
                if (gameState.progress > 0) {
                    gameState.winner = 'teamA';
                } else if (gameState.progress < 0) {
                    gameState.winner = 'teamB';
                }
            }

            gameState.status = 'finished';
            await cache.set(TUG_OF_WAR_CACHE_KEY, gameState);

            const winningTeam = gameState.winner === 'teamA' ? gameState.teams.teamA :
                gameState.winner === 'teamB' ? gameState.teams.teamB : null;

            await pusher.trigger('streamer-wars', 'tug-of-war:game-ended', {
                winner: gameState.winner,
                progress: gameState.progress,
                winningTeam: winningTeam ? winningTeam.name : 'Empate',
            });

            if (winningTeam) {
                try {
                    await sendWebhookMessage(LOGS_CHANNEL_WEBHOOK_ID, DISCORD_LOGS_WEBHOOK_TOKEN, {
                        content: null,
                        embeds: [
                            {
                                title: "Tug of War - Juego finalizado",
                                description: `El equipo ${winningTeam.name} ha ganado el Tug of War.`,
                                color: 0xffaa00,
                            },
                        ],
                    });
                } catch (error) {
                    console.error("Error sending Discord webhook:", error);
                }
            }

            return {
                success: true,
                gameState,
            };
        },
        clearGameState: async () => {
            const cache = createCache();
            await cache.delete(TUG_OF_WAR_CACHE_KEY);
            await pusher.trigger('streamer-wars', 'tug-of-war:game-cleared', {});
            return {
                success: true,
            };
        }
    },

    bomb: {
        /**
         * Gets the current Bomb game state from cache
         */
        getGameState: async (): Promise<BombGameState> => {
            const cache = createCache();
            return (
                (await cache.get<BombGameState>(BOMB_CACHE_KEY)) ?? {
                    players: {},
                    status: 'waiting',
                }
            );
        },

        /**
         * Starts the Bomb minigame
         * Generates 5 unique challenges for each player
         */
        startGame: async () => {
            const cache = createCache();

            // Get all active players
            const playersData = await client
                .select({
                    playerNumber: StreamerWarsPlayersTable.playerNumber,
                    userId: StreamerWarsPlayersTable.userId,
                    eliminated: StreamerWarsPlayersTable.eliminated,
                    aislated: StreamerWarsPlayersTable.aislated,
                })
                .from(StreamerWarsPlayersTable)
                .where(
                    and(
                        not(eq(StreamerWarsPlayersTable.eliminated, true)),
                        not(eq(StreamerWarsPlayersTable.aislated, true))
                    )
                )
                .execute();

            // Initialize player states
            const players: Record<number, BombPlayerState> = {};

            for (const player of playersData) {
                if (!player.userId) continue;

                // Generate 5 challenges for this player
                const challenges = generatePlayerChallenges();

                // Store challenges in Redis for validation
                await cache.set(`player:${player.playerNumber}:bomb_challenges`, challenges);

                players[player.playerNumber] = {
                    playerNumber: player.playerNumber,
                    userId: player.userId,
                    challengesCompleted: 0,
                    errorsCount: 0,
                    status: 'playing',
                    currentChallenge: challenges[0],
                    challenges,
                };
            }

            // Save game state
            const gameState: BombGameState = {
                players,
                status: 'active',
                startedAt: Date.now(),
            };

            await cache.set(BOMB_CACHE_KEY, gameState);

            // Broadcast game started to all players
            await pusher.trigger('streamer-wars', 'bomb:game-started', {
                totalPlayers: Object.keys(players).length,
            });

            // Send individual events to each player with their first challenge
            for (const player of playersData) {
                if (player.userId && players[player.playerNumber]) {
                    const playerState = players[player.playerNumber];
                    await pusher.trigger('streamer-wars', 'bomb:start', {
                        playerNumber: player.playerNumber,
                        challenge: playerState.currentChallenge,
                        challengesCompleted: 0,
                        errorsCount: 0,
                    });
                }
            }

            try {
                await sendWebhookMessage(LOGS_CHANNEL_WEBHOOK_ID, DISCORD_LOGS_WEBHOOK_TOKEN, {
                    content: null,
                    embeds: [
                        {
                            title: "Bomba - Juego iniciado",
                            description: `Se ha iniciado el minijuego "Desactivar la Bomba" con ${Object.keys(players).length} jugadores.`,
                            color: 0xff4500,
                        },
                    ],
                });
            } catch (error) {
                console.error("Error sending Discord webhook:", error);
            }

            return gameState;
        },

        /**
         * Validates a player's answer submission
         * @param playerNumber The player's number
         * @param answer The player's answer
         * @returns Success status and updated state
         */
        submitAnswer: async (playerNumber: number, answer: string) => {
            const cache = createCache();
            const gameState = await games.bomb.getGameState();

            const playerState = gameState.players[playerNumber];

            if (!playerState) {
                return {
                    success: false,
                    error: 'Jugador no encontrado en el juego',
                };
            }

            if (playerState.status !== 'playing') {
                return {
                    success: false,
                    error: 'El jugador no está en estado de juego',
                };
            }

            if (!playerState.currentChallenge) {
                return {
                    success: false,
                    error: 'No hay desafío actual',
                };
            }

            // Normalize answer for comparison
            const normalizedAnswer = answer.toLowerCase().trim();
            const normalizedCorrect = playerState.currentChallenge.correctAnswer.toLowerCase().trim();

            const isCorrect = normalizedAnswer === normalizedCorrect;

            if (isCorrect) {
                // Player answered correctly
                playerState.challengesCompleted += 1;

                // Check if player completed all challenges
                if (playerState.challengesCompleted >= MAX_CHALLENGES) {
                    playerState.status = 'completed';
                    playerState.currentChallenge = undefined;

                    gameState.players[playerNumber] = playerState;
                    await cache.set(BOMB_CACHE_KEY, gameState);

                    // Get player info for notification
                    const player = await client.query.StreamerWarsPlayersTable.findFirst({
                        where: eq(StreamerWarsPlayersTable.playerNumber, playerNumber),
                        with: {
                            user: {
                                columns: {
                                    id: true,
                                }
                            }
                        }
                    });

                    // Notify player of success
                    if (player?.user?.id) {
                        await pusher.trigger('streamer-wars', 'bomb:success', {
                            playerNumber,
                        });
                    }

                    // Broadcast to all
                    await pusher.trigger('streamer-wars', 'bomb:player-completed', {
                        playerNumber,
                    });

                    try {
                        const audioBase64 = await tts(`Jugador ${playerNumber}, pasa!`);
                        const audioPayload = encodeAudioForPusher(audioBase64!);

                        await pusher.trigger("streamer-wars", "megaphony", {
                            audioBase64: audioPayload,
                        });
                    } catch (error) {
                        console.error("Error generating TTS:", error);
                    }

                    try {
                        await sendWebhookMessage(LOGS_CHANNEL_WEBHOOK_ID, DISCORD_LOGS_WEBHOOK_TOKEN, {
                            content: null,
                            embeds: [
                                {
                                    title: "Bomba - Desafío completado",
                                    description: `El jugador #${playerNumber} ha desactivado la bomba exitosamente.`,
                                    color: 0x00ff00,
                                },
                            ],
                        });
                    } catch (error) {
                        console.error("Error sending Discord webhook:", error);
                    }

                    return {
                        success: true,
                        status: 'completed',
                        isCorrect: true,
                    };
                } else {
                    // Move to next challenge
                    playerState.currentChallenge = playerState.challenges[playerState.challengesCompleted];
                    gameState.players[playerNumber] = playerState;
                    await cache.set(BOMB_CACHE_KEY, gameState);

                    // Get player info for notification
                    const player = await client.query.StreamerWarsPlayersTable.findFirst({
                        where: eq(StreamerWarsPlayersTable.playerNumber, playerNumber),
                        with: {
                            user: {
                                columns: {
                                    id: true,
                                }
                            }
                        }
                    });

                    // Send next challenge
                    if (player?.user?.id) {
                        await pusher.trigger('streamer-wars', 'bomb:next-challenge', {
                            playerNumber,
                            challenge: playerState.currentChallenge,
                            challengesCompleted: playerState.challengesCompleted,
                            errorsCount: playerState.errorsCount,
                        });
                    }

                    return {
                        success: true,
                        status: 'playing',
                        isCorrect: true,
                        nextChallenge: playerState.currentChallenge,
                        challengesCompleted: playerState.challengesCompleted,
                        errorsCount: playerState.errorsCount,
                    };
                }
            } else {
                // Player answered incorrectly
                playerState.errorsCount += 1;

                if (playerState.errorsCount >= MAX_ERRORS) {
                    // Too many errors - player fails
                    playerState.status = 'failed';
                    gameState.players[playerNumber] = playerState;
                    await cache.set(BOMB_CACHE_KEY, gameState);

                    // Get player info for notification
                    const player = await client.query.StreamerWarsPlayersTable.findFirst({
                        where: eq(StreamerWarsPlayersTable.playerNumber, playerNumber),
                        with: {
                            user: {
                                columns: {
                                    id: true,
                                }
                            }
                        }
                    });

                    // Notify player of failure
                    if (player?.user?.id) {
                        await pusher.trigger('streamer-wars', 'bomb:failed', {
                            playerNumber,
                        });
                    }

                    try {
                        await sendWebhookMessage(LOGS_CHANNEL_WEBHOOK_ID, DISCORD_LOGS_WEBHOOK_TOKEN, {
                            content: null,
                            embeds: [
                                {
                                    title: "Bomba - Jugador eliminado",
                                    description: `El jugador #${playerNumber} ha cometido ${MAX_ERRORS} errores y ha sido eliminado.`,
                                    color: 0xff0000,
                                },
                            ],
                        });
                    } catch (error) {
                        console.error("Error sending Discord webhook:", error);
                    }

                    await eliminatePlayer(playerNumber);

                    return {
                        success: true,
                        status: 'failed',
                        isCorrect: false,
                    };
                } else {
                    // Still has attempts left
                    gameState.players[playerNumber] = playerState;
                    await cache.set(BOMB_CACHE_KEY, gameState);

                    // Get player info for notification
                    const player = await client.query.StreamerWarsPlayersTable.findFirst({
                        where: eq(StreamerWarsPlayersTable.playerNumber, playerNumber),
                        with: {
                            user: {
                                columns: {
                                    id: true,
                                }
                            }
                        }
                    });

                    // Notify player of error
                    if (player?.user?.id) {
                        await pusher.trigger('streamer-wars', 'bomb:error', {
                            playerNumber,
                            errorsCount: playerState.errorsCount,
                            errorsRemaining: MAX_ERRORS - playerState.errorsCount,
                        });
                    }

                    return {
                        success: true,
                        status: 'playing',
                        isCorrect: false,
                        errorsCount: playerState.errorsCount,
                        errorsRemaining: MAX_ERRORS - playerState.errorsCount,
                    };
                }
            }
        },

        /**
         * Ends the game manually (admin command)
         */
        endGame: async () => {
            const cache = createCache();
            const gameState = await games.bomb.getGameState();

            if (gameState.status === 'waiting') {
                return {
                    success: false,
                    error: 'No hay juego activo',
                };
            }

            // Mark game as completed
            gameState.status = 'completed';
            await cache.set(BOMB_CACHE_KEY, gameState);

            // Broadcast game ended
            await pusher.trigger('streamer-wars', 'bomb:game-ended', {});

            // Eliminate players who didn't complete
            for (const [playerNumber, playerState] of Object.entries(gameState.players)) {
                if (playerState.status === 'playing') {
                    await eliminatePlayer(parseInt(playerNumber));
                }
            }

            const completedCount = Object.values(gameState.players).filter(p => p.status === 'completed').length;
            const failedCount = Object.values(gameState.players).filter(p => p.status !== 'completed').length;

            try {
                await sendWebhookMessage(LOGS_CHANNEL_WEBHOOK_ID, DISCORD_LOGS_WEBHOOK_TOKEN, {
                    content: null,
                    embeds: [
                        {
                            title: "Bomba - Juego finalizado",
                            description: `El minijuego "Desactivar la Bomba" ha finalizado.`,
                            color: 0xffaa00,
                            fields: [
                                {
                                    name: "Completaron",
                                    value: completedCount.toString(),
                                    inline: true,
                                },
                                {
                                    name: "Eliminados",
                                    value: failedCount.toString(),
                                    inline: true,
                                },
                            ],
                        },
                    ],
                });
            } catch (error) {
                console.error("Error sending Discord webhook:", error);
            }

            return {
                success: true,
                gameState,
            };
        },
    },

    fishing: {
        /**
         * Get the current Fishing game state
         */
        getGameState: async (): Promise<FishingGameState> => {
            const cache = createCache();
            return (
                (await cache.get<FishingGameState>(FISHING_CACHE_KEY)) ?? {
                    status: 'waiting',
                    eliminatedPlayers: [],
                }
            );
        },

        /**
         * Start the fishing game
         */
        startGame: async (): Promise<FishingGameState> => {
            const cache = createCache();
            
            const newGameState: FishingGameState = {
                status: 'active',
                eliminatedPlayers: [],
                startedAt: Date.now(),
            };

            await cache.set(FISHING_CACHE_KEY, newGameState);
            await cache.set(FISHING_ELIMINATED_KEY, []);
            
            await pusher.trigger("streamer-wars", "fishing:game-started", newGameState);
            
            return newGameState;
        },

        /**
         * Record a player elimination (called when a player fails)
         */
        recordElimination: async (playerNumber: number): Promise<{ success: boolean; error?: string }> => {
            const cache = createCache();
            const gameState = await games.fishing.getGameState();

            if (gameState.status !== 'active') {
                return { success: false, error: 'El juego no está activo' };
            }

            // Get current eliminated players array
            let eliminatedPlayers = await cache.get<number[]>(FISHING_ELIMINATED_KEY) ?? [];
            
            // Check if player is already eliminated
            if (eliminatedPlayers.includes(playerNumber)) {
                return { success: false, error: 'Ya estás eliminado' };
            }

            // Add player to eliminated list
            eliminatedPlayers = [...eliminatedPlayers, playerNumber];
            await cache.set(FISHING_ELIMINATED_KEY, eliminatedPlayers);

            // Update game state
            const newGameState: FishingGameState = {
                ...gameState,
                eliminatedPlayers,
            };
            await cache.set(FISHING_CACHE_KEY, newGameState);

            // Notify about elimination
            await pusher.trigger("streamer-wars", "fishing:player-eliminated", {
                playerNumber,
            });

            return { success: true };
        },

        /**
         * End the fishing game and process eliminations
         */
        endGame: async (): Promise<{ success: boolean; eliminatedPlayers: number[]; error?: string }> => {
            const cache = createCache();
            const gameState = await games.fishing.getGameState();

            if (gameState.status !== 'active') {
                return { success: false, eliminatedPlayers: [], error: 'El juego no está activo' };
            }

            // Get all eliminated players
            const eliminatedPlayers = await cache.get<number[]>(FISHING_ELIMINATED_KEY) ?? [];

            // Update game state to ended
            const newGameState: FishingGameState = {
                ...gameState,
                status: 'ended',
                eliminatedPlayers,
            };
            await cache.set(FISHING_CACHE_KEY, newGameState);

            // Broadcast game end
            await pusher.trigger("streamer-wars", "fishing:game-ended", {
                eliminatedPlayers,
            });

            // Process eliminations through the elimination system
            for (const playerNum of eliminatedPlayers) {
                try {
                    await eliminatePlayer(playerNum);
                } catch (error) {
                    console.error(`Error eliminating player ${playerNum}:`, error);
                }
            }

            return { success: true, eliminatedPlayers };
        },

        /**
         * Get the list of eliminated players
         */
        getEliminatedPlayers: async (): Promise<number[]> => {
            const cache = createCache();
            return await cache.get<number[]>(FISHING_ELIMINATED_KEY) ?? [];
        },

        /**
         * Check if a player is eliminated
         */
        isPlayerEliminated: async (playerNumber: number): Promise<boolean> => {
            const eliminatedPlayers = await games.fishing.getEliminatedPlayers();
            return eliminatedPlayers.includes(playerNumber);
        },

        /**
         * Reset the game state (for admin use)
         */
        resetGame: async (): Promise<FishingGameState> => {
            const cache = createCache();
            
            const newGameState: FishingGameState = {
                status: 'waiting',
                eliminatedPlayers: [],
            };

            await cache.set(FISHING_CACHE_KEY, newGameState);
            await cache.set(FISHING_ELIMINATED_KEY, []);
            
            await pusher.trigger("streamer-wars", "fishing:game-reset", {});
            
            return newGameState;
        },
    },
};

/**
 * Validación REAL del juego Dalgona.
 * Compara el trazo contra la figura y devuelve true/false.
 * Valida posición, escala y precisión del contorno.
 */
export function validateTrace(shape: DalgonaShapeData, traceData: any): boolean {
    if (!traceData || !Array.isArray(traceData.points) || traceData.points.length < 10) {
        console.log("Trace inválido: puntos insuficientes");
        return false;
    }

    const tracePoints = traceData.points;
    const shapePoints = shape.points;

    // ---- Calcular centro y dimensiones ----
    const getBounds = (pts: any[]) => {
        const xs = pts.map(p => p.x);
        const ys = pts.map(p => p.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const width = maxX - minX;
        const height = maxY - minY;
        return { minX, maxX, minY, maxY, centerX, centerY, width, height };
    };

    const shapeBounds = getBounds(shapePoints);
    const traceBounds = getBounds(tracePoints);

    // ---- VALIDACIÓN 1: Verificar que el centro del trazo esté cerca del centro de la forma ----
    const centerDistanceX = Math.abs(traceBounds.centerX - shapeBounds.centerX);
    const centerDistanceY = Math.abs(traceBounds.centerY - shapeBounds.centerY);
    const maxCenterOffset = 50; // pixels de tolerancia

    if (centerDistanceX > maxCenterOffset || centerDistanceY > maxCenterOffset) {
        console.log(`Trazo fuera de posición: offsetX=${centerDistanceX.toFixed(1)}, offsetY=${centerDistanceY.toFixed(1)}`);
        return false;
    }

    // ---- VALIDACIÓN 2: Verificar que la escala sea similar ----
    const scaleX = traceBounds.width / shapeBounds.width;
    const scaleY = traceBounds.height / shapeBounds.height;
    const minScale = 0.7; // 70% del tamaño original
    const maxScale = 1.3; // 130% del tamaño original

    if (scaleX < minScale || scaleX > maxScale || scaleY < minScale || scaleY > maxScale) {
        console.log(`Escala incorrecta: scaleX=${scaleX.toFixed(2)}, scaleY=${scaleY.toFixed(2)}`);
        return false;
    }

    // ---- VALIDACIÓN 3: Calcular distancia promedio de cada punto del trazo al contorno ----
    const distToShape = (px: number, py: number) => {
        let min = Infinity;
        for (let i = 0; i < shapePoints.length - 1; i++) {
            const a = shapePoints[i];
            const b = shapePoints[i + 1];

            // Vector AB y AP
            const ABx = b.x - a.x;
            const ABy = b.y - a.y;
            const APx = px - a.x;
            const APy = py - a.y;

            // Proyección punto-segmento
            const ABdotAB = ABx * ABx + ABy * ABy;
            if (ABdotAB === 0) {
                // Punto a y b son iguales
                const dx = px - a.x;
                const dy = py - a.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < min) min = dist;
                continue;
            }

            const t = Math.max(0, Math.min(1, (APx * ABx + APy * ABy) / ABdotAB));

            const cx = a.x + ABx * t;
            const cy = a.y + ABy * t;

            const dx = px - cx;
            const dy = py - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < min) min = dist;
        }
        return min;
    };

    // Calcular error promedio
    let totalError = 0;
    for (const p of tracePoints) {
        totalError += distToShape(p.x, p.y);
    }

    const avgError = totalError / tracePoints.length;

    // ---- Convertir error a accuracy (0–100%) ----
    // La tolerancia es en pixels: 0 pixels = 100%, más pixels = menos accuracy
    const maxAcceptableError = 30; // pixels
    const accuracy = Math.max(0, 100 * (1 - avgError / maxAcceptableError));

    console.log(`ACCURACY: ${accuracy.toFixed(2)}% | Error promedio: ${avgError.toFixed(2)}px | Centro: (${centerDistanceX.toFixed(1)}, ${centerDistanceY.toFixed(1)}) | Escala: (${scaleX.toFixed(2)}, ${scaleY.toFixed(2)})`);

    // ---- Exigir precisión según la figura ----
    const ACCURACY_REQUIRED: Record<DalgonaShape, number> = {
        [DalgonaShape.Circle]: 75,     // Círculo es más fácil
        [DalgonaShape.Triangle]: 70,   // Triángulo es fácil
        [DalgonaShape.Umbrella]: 60,   // Paraguas es difícil
        [DalgonaShape.Star]: 65,       // Estrella es medio
    };

    const required = ACCURACY_REQUIRED[shape.type];

    return accuracy >= required;
}






export const eliminatePlayer = async (playerNumber: number) => {
    try {
        // Actualiza el estado del jugador en la base de datos.

        await client.update(StreamerWarsPlayersTable)
            .set({ eliminated: true })
            .where(eq(StreamerWarsPlayersTable.playerNumber, playerNumber))
            .execute();

        /* 
            ¿Se está jugando Simon Says?
 
            En ese caso, debemos quitarlo de la partida y establecer el estado de eliminado, y
            setear el estado de Simon Says a "waiting"
        */

        const cache = createCache();
        const gameState = await cache.get(CACHE_KEY) as SimonSaysGameState;

        if (gameState && gameState.status === "playing") {
            const newCurrentPlayers = { ...gameState.currentPlayers };
            delete newCurrentPlayers[playerNumber.toString()];

            const newEliminatedPlayers = Array.from(
                new Set([...gameState.eliminatedPlayers, playerNumber])
            );

            const newGameState: SimonSaysGameState = {
                ...gameState,
                currentPlayers: newCurrentPlayers,
                eliminatedPlayers: newEliminatedPlayers,
                status: "waiting",
            };

            await cache.set(CACHE_KEY, newGameState);
            await pusher.trigger("streamer-wars.simon-says", "game-state", newGameState);
        }


        /* 
            Add to today eliminateds
        */

        try {
            const todayEliminateds = await cache.get("streamer-wars-today-eliminateds") as number[] ?? [];
            await cache.set("streamer-wars-today-eliminateds", Array.from(new Set([...todayEliminateds, playerNumber])))


        } catch (error) {

        }



        // Genera el audio.
        const audioBase64 = await tts(`Jugador, ${playerNumber}, eliminado`);

        const audioPayload = encodeAudioForPusher(audioBase64!);

        // Envía el evento a Pusher con los datos actualizados.
        await pusher.trigger("streamer-wars", "player-eliminated", {
            playerNumber,
            audioBase64: audioPayload,
        });

        try {
            await sendWebhookMessage(SALTO_DISCORD_GUILD_ID, DISCORD_LOGS_WEBHOOK_TOKEN, {
                title: "Jugador eliminado",
                description: `El jugador ${playerNumber} ha sido eliminado de Streamer Wars.`,
                color: 16739693,
            });
        } catch (error) {

        }

        //await removeRoleFromUser(SALTO_DISCORD_GUILD_ID, playerNumber, ROLE_GUERRA_STREAMERS);
    } catch (error) {
        console.error("Error en eliminatePlayer:", error);
    }
};

export const massEliminatePlayers = async (playerNumbers: number[]) => {
    try {
        playerNumbers = Array.from(new Set(playerNumbers)); // Evitar duplicados
        if (playerNumbers.length === 0) return; // Si no hay jugadores, no hacer nada

        if (import.meta.env.PROD) {
            // Intenta actualizar la base de datos, ignorando jugadores no encontrados
            await client
                .update(StreamerWarsPlayersTable)
                .set({ eliminated: true })
                .where(inArray(StreamerWarsPlayersTable.playerNumber, playerNumbers))
                .execute()
                .catch(() => { }); // Ignorar error si algún jugador no es encontrado
        }
        // Genera el audio.
        const audioBase64 = await tts(
            `Los jugadores. ${new Intl.ListFormat("es-ES").format(
                playerNumbers.map((n) => n.toString())
            )}. han sido eliminados`
        );

        const audioPayload = encodeAudioForPusher(audioBase64!);

        // Envía el evento a Pusher con los datos actualizados.
        await pusher.trigger("streamer-wars", "players-eliminated", {
            playerNumbers,
            audioBase64: audioPayload,
        });

        // Envía el log al webhook de Discord.
        await sendWebhookMessage(SALTO_DISCORD_GUILD_ID, DISCORD_LOGS_WEBHOOK_TOKEN, {
            title: "Jugadores eliminados",
            description: `Los jugadores ${new Intl.ListFormat("es-ES").format(
                playerNumbers.map((n) => `#${n.toString().padStart(3, "0")}`)
            )} han sido eliminados de Streamer Wars.`,
            color: 16739693,
        }).catch(() => { }); // Ignorar error si falla el webhook

        try {
            /* 
                Add to redis
            */

            const cache = cacheService.create({ ttl: 60 * 60 * 48 });
            const todayEliminateds = await cache.get("streamer-wars-today-eliminateds") as number[] ?? [];

            /* 
                new Set()
            */

            await cache.set("streamer-wars-today-eliminateds", Array.from(new Set([...todayEliminateds, ...playerNumbers])))

        } catch (error) {

        }

        //await removeRoleFromUser(SALTO_DISCORD_GUILD_ID, playerNumber, ROLE_GUERRA_STREAMERS);
    } catch (error) {
        console.error("Error en massEliminatePlayers:", error);
    }
};


export const revivePlayer = async (playerNumber: number) => {
    try {
        // Actualiza el estado del jugador en la base de datos.
        await client
            .update(StreamerWarsPlayersTable)
            .set({ eliminated: false })
            .where(eq(StreamerWarsPlayersTable.playerNumber, playerNumber))
            .execute();

        // Envía el evento a Pusher con los datos actualizados.
        await pusher.trigger("streamer-wars", "player-revived", {
            playerNumber,
        });
    } catch (error) {
        console.error("Error en revivePlayer:", error);
    }
}

export const getPlayers = async () => {
    return await client.query.StreamerWarsPlayersTable.findMany({
        orderBy: [asc(StreamerWarsPlayersTable.playerNumber)],
        with: {
            user: {
                columns: {
                    displayName: true,
                    avatar: true,
                    discordId: true
                }
            }
        }
    })
}


export const joinTeam = async (playerNumber: number, teamToJoin: string) => {
    try {
        // Verificar si el jugador ya pertenece a algún equipo
        const existingPlayerTeam = await client
            .select()
            .from(StreamerWarsTeamPlayersTable)
            .where(eq(StreamerWarsTeamPlayersTable.playerNumber, playerNumber))
            .execute();

        if (existingPlayerTeam.length > 0) {
            return {
                success: false,
                error: "Ya perteneces a un equipo",
            };
        }

        // Verificar si el equipo al que se desea unir existe
        const team = await client
            .select()
            .from(StreamerWarsTeamsTable)
            .where(eq(StreamerWarsTeamsTable.color, teamToJoin))
            .execute()
            .then((res) => res[0]);

        if (!team) {
            return {
                success: false,
                error: "El equipo no existe",
            };
        }

        // Obtener el discordId del
        const user = await client
            .select({
                id: UsersTable.id,
                discordId: UsersTable.discordId,
                avatar: UsersTable.avatar,
                displayName: UsersTable.displayName,

            })
            .from(UsersTable)
            .innerJoin(
                StreamerWarsPlayersTable, // Tabla que contiene playerNumber
                eq(StreamerWarsPlayersTable.userId, UsersTable.id) // Relación entre tablas
            )
            .where(eq(StreamerWarsPlayersTable.playerNumber, playerNumber))
            .execute()
            .then((res) => res[0]);

        console.log({ user });

        if (!user || !user.discordId) {
            return {
                success: false,
                error: "Parece que tu usuario no está asociado a Discord. Por favor, contacta a un moderador",
            };
        }

        const cache = cacheService.create({ ttl: 60 * 60 * 48 });
        const gameState = await cache.get("streamer-wars-gamestate") as any

        /* 
            Check limit of players per team
 
            {
  "game": "ButtonBox",
  "props": {
    "teamsQuantity": 2,
    "playersPerTeam": 4
  }
}
        */

        const playersPerTeam = gameState.props.playersPerTeam as number;

        const [{ playersCount }] = await client
            .select({ playersCount: count() })
            .from(StreamerWarsTeamPlayersTable)
            .where(eq(StreamerWarsTeamPlayersTable.teamId, team.id))
            .execute();

        if (playersCount >= playersPerTeam) {
            return {
                success: false,
                error: "El equipo ya está lleno",
            };
        }



        // Insertar al jugador en el equipo
        await client
            .insert(StreamerWarsTeamPlayersTable)
            .values({
                playerNumber,
                teamId: team.id,
            })
            .execute();

        let roleId: string | null = null;
        switch (teamToJoin) {
            case "red":
                roleId = DISCORD_ROLES.EQUIPO_ROJO;
                break;
            case "blue":
                roleId = DISCORD_ROLES.EQUIPO_AZUL;
                break;
            case "yellow":
                roleId = DISCORD_ROLES.EQUIPO_AMARILLO;
                break;
            case "purple":
                roleId = DISCORD_ROLES.EQUIPO_MORADO;
                break;
            case "white":
                roleId = DISCORD_ROLES.EQUIPO_BLANCO;
                break;
        }

        if (roleId) {
            // Agregar rol al usuario en Discord
            try {
                await addRoleToUser(SALTO_DISCORD_GUILD_ID, user.discordId, roleId);

            } catch (error) {

            }
        }

        // Notificar al canal mediante Pusher
        await pusher.trigger("streamer-wars", "player-joined", { playerNumber, avatar: user.avatar, displayName: user.displayName, team: teamToJoin });

        return {
            success: true,
        };
    } catch (error) {
        console.error("Error en joinTeam:", error);
        return {
            success: false,
            error: "Ocurrió un error al intentar unirse al equipo",
        };
    }
};

export const removePlayerFromTeam = async (playerNumber: number) => {
    try {
        // Obtener el equipo al que pertenece el jugador
        const playerTeam = await client
            .select()
            .from(StreamerWarsTeamPlayersTable)
            .where(eq(StreamerWarsTeamPlayersTable.playerNumber, playerNumber))
            .execute()
            .then((res) => res[0]);

        if (!playerTeam) {
            return {
                success: false,
                error: "El jugador no pertenece a ningún equipo",
            };
        }

        // Eliminar al jugador del equipo
        await client
            .delete(StreamerWarsTeamPlayersTable)
            .where(eq(StreamerWarsTeamPlayersTable.playerNumber, playerNumber))
            .execute();

        // Obtener el discordId del jugador desde una relación con playerNumber
        const user = await client
            .select({
                discordId: UsersTable.discordId,
            })
            .from(UsersTable)
            .innerJoin(
                StreamerWarsPlayersTable, // Tabla que contiene playerNumber
                eq(StreamerWarsPlayersTable.userId, UsersTable.id) // Relación entre tablas
            )
            .where(eq(StreamerWarsPlayersTable.playerNumber, playerNumber))
            .execute()
            .then((res) => res[0]);

        if (!user || !user.discordId) {
            return {
                success: false,
                error: "Parece que el usuario no está asociado a Discord. No se pudo remover el rol",
            };
        }




        try {
            const guildMember = await getGuildMember(SALTO_DISCORD_GUILD_ID, user.discordId);

            const { roles } = guildMember as { roles: string[] };

            for (const roleId of roles) {
                if (roleId === DISCORD_ROLES.EQUIPO_AZUL || roleId === DISCORD_ROLES.EQUIPO_ROJO || roleId === DISCORD_ROLES.EQUIPO_AMARILLO || roleId === DISCORD_ROLES.EQUIPO_MORADO || roleId === DISCORD_ROLES.EQUIPO_BLANCO) {
                    await removeRoleFromUser(SALTO_DISCORD_GUILD_ID, user.discordId!, roleId);
                }
            }

        } catch (error) {

        }



        // Notificar al canal mediante Pusher
        await pusher.trigger("streamer-wars", "player-removed", { playerNumber });

        return {
            success: true,
        };
    } catch (error) {
        console.error("Error en removePlayerFromTeam:", error);
        return {
            success: false,
            error: "Ocurrió un error al intentar remover al jugador del equipo",
        };
    }
}

export const getPlayersTeams = async () => {
    try {
        const playersTeams = await client.query.StreamerWarsTeamPlayersTable.findMany({
            with: {
                player: {
                    columns: {
                        playerNumber: true,
                    },
                    with: {
                        user: {
                            columns: {
                                avatar: true,
                                displayName: true
                            }
                        }
                    }
                },
                team: {
                    columns: {
                        color: true,
                    }
                }
            }
        }).execute();

        const teams = playersTeams.reduce((acc, { player, team }) => {
            if (team && !acc[team.color]) {
                acc[team.color] = [];
            }
            if (team) {
                acc[team.color].push({
                    playerNumber: player?.playerNumber as number,
                    avatar: player?.user?.avatar as string,
                    displayName: player?.user?.displayName as string
                });
            }
            return acc;
        }, {} as { [team: string]: { playerNumber: number; avatar: string; displayName: string }[] });

        return { playersTeams: teams };
    }
    catch (error) {
        console.error("Error en getPlayersTeams:", error);
        return { playersTeams: {} };
    }
}

export const getUserIdsOfPlayers = async (): Promise<number[]> => {
    return await client.query.StreamerWarsPlayersTable.findMany({
        columns: {
            userId: true
        },
        where: not(eq(StreamerWarsPlayersTable.eliminated, true))
    }).then(res => res.map(({ userId }) => userId).filter((userId): userId is number => userId !== null)).catch(() => []);
}

export const getCurrentInscriptions = async () => {
    return await client.query.StreamerWarsInscriptionsTable.findMany({
        with: {
            user: {
                columns: {
                    id: true,
                    displayName: true,
                    avatar: true,
                    discordId: true
                }
            }
        }
    }).execute();
}

export const isPlayerEliminated = async (playerNumber: number) => {
    return await client.query.StreamerWarsPlayersTable.findFirst({
        columns: {
            eliminated: true
        },
        where: eq(StreamerWarsPlayersTable.playerNumber, playerNumber)
    }).then(res => res?.eliminated ?? false).catch(() => false);
}

export const resetRoles = async () => {
    const players = await getPlayers();
    for (const player of players.filter(player => !player.eliminated)) {
        if (!player.user?.discordId) continue;
        const guildMember = await getGuildMember(SALTO_DISCORD_GUILD_ID, player.user.discordId)

        const { roles } = guildMember as { roles: string[] };

        for (const roleId of roles) {
            if (roleId === DISCORD_ROLES.EQUIPO_AZUL || roleId === DISCORD_ROLES.EQUIPO_ROJO || roleId === DISCORD_ROLES.EQUIPO_AMARILLO || roleId === DISCORD_ROLES.EQUIPO_MORADO || roleId === DISCORD_ROLES.EQUIPO_BLANCO) {
                await removeRoleFromUser(SALTO_DISCORD_GUILD_ID, player.user?.discordId!, roleId);
            }
        }


    }
}

export const getExpulsionVotes = async () => {
    const votes = await client
        .select({

            playerNumber: NegativeVotesStreamersTable.playerNumber,
            votes: count(),
        })
        .from(NegativeVotesStreamersTable)
        .groupBy(NegativeVotesStreamersTable.playerNumber)
        .execute();

    return { votes };
}

export const currentUserHasVoted = async (userId: number) => {
    return await client
        .select()
        .from(NegativeVotesStreamersTable)
        .where(eq(NegativeVotesStreamersTable.userId, userId))
        .execute()
        .then((res) => res.length > 0);
}

export const acceptBribe = async (playerNumber: number) => {
    const player = await client
        .select()
        .from(StreamerWarsPlayersTable)
        .where(eq(StreamerWarsPlayersTable.playerNumber, playerNumber))
        .execute()
        .then((res) => res[0]);

    if (!player) {
        return {
            success: false,
            error: "El jugador no existe",
        };
    }

    try {
        const teamColor = await client
            .select({
                color: StreamerWarsTeamsTable.color,
            })
            .from(StreamerWarsTeamsTable)
            .innerJoin(
                StreamerWarsTeamPlayersTable,
                and(
                    eq(StreamerWarsTeamPlayersTable.teamId, StreamerWarsTeamsTable.id),
                    eq(StreamerWarsTeamPlayersTable.playerNumber, playerNumber)
                )
            )
            .execute()
            .then((res) => res[0]?.color);

        if (!teamColor) {
            return {
                success: false,
                error: "El jugador no pertenece a ningún equipo",
            };
        }

        await pusher.trigger("streamer-wars", "bribe-accepted", { team: teamColor });

        return {
            success: true,
        };
    } catch (error) {
        console.error("Error en acceptBribe:", error);
        return {
            success: false,
            error: "Ocurrió un error al aceptar el soborno",
        };
    }
}

export const selfEliminate = async (playerNumber: number) => {
    const player = await client
        .select()
        .from(StreamerWarsPlayersTable)
        .where(eq(StreamerWarsPlayersTable.playerNumber, playerNumber))
        .execute()
        .then((res) => res[0]);

    if (!player) {
        return {
            success: false,
            error: "El jugador no existe",
        };
    }

    try {


        /* 
        add to redis
        */

        const cache = cacheService.create({ ttl: 60 * 60 * 48 });
        const gameState = await cache.get("streamer-wars-self-eliminateds") as number[] ?? [];
        if (gameState.includes(playerNumber)) {
            return {
                success: false,
                error: "Ya te has autoeliminado",
            };
        }

        if (gameState.length >= 3) {
            return {
                success: false,
                error: "Ya hay 3 autoeliminados",
            };
        }

        gameState.push(playerNumber);
        await cache.set("streamer-wars-self-eliminateds", gameState);
        await pusher.trigger("auto-elimination", "player-autoeliminated", { playerNumber });


        try {
            await sendWebhookMessage(LOGS_CHANNEL_WEBHOOK_ID, DISCORD_LOGS_WEBHOOK_TOKEN, {
                content: null,
                embeds: [
                    {
                        title: "Autoeliminación",
                        description: `El jugador #${playerNumber.toString().padStart(3, '0')} se ha autoeliminado de Guerra de Streamers.`,
                        color: 0xff0000,
                    },
                ],
            });
        } catch (error) {

        }
        await new Promise((resolve) => setTimeout(resolve, 3000));
        await eliminatePlayer(playerNumber);
        return {
            success: true,
        };
    } catch (error) {
        console.error("Error en selfEliminate:", error);
        return {
            success: false,
            error: "Ocurrió un error al autoeliminarse",
        };
    }
}

export const getAutoEliminatedPlayers = async () => {
    const cache = cacheService.create({ ttl: 60 * 60 * 48 });
    return await cache.get("streamer-wars-self-eliminateds") as number[]
}

export const removePlayer = async (playerNumber: number) => {
    const player = await client
        .select()
        .from(StreamerWarsPlayersTable)
        .where(eq(StreamerWarsPlayersTable.playerNumber, playerNumber))
        .execute()
        .then((res) => res[0]);

    if (!player) {
        return {
            success: false,
            error: "El jugador no existe",
        };
    }

    try {
        await client.delete(StreamerWarsPlayersTable)
            .where(eq(StreamerWarsPlayersTable.playerNumber, playerNumber))
            .execute();

        try {
            await sendWebhookMessage(LOGS_CHANNEL_WEBHOOK_ID, DISCORD_LOGS_WEBHOOK_TOKEN, {
                content: null,
                embeds: [
                    {
                        title: "Eliminación (Admin)",
                        description: `El jugador #${playerNumber.toString().padStart(3, '0')} ha sido eliminado de Guerra de Streamers.`,
                        color: 0xff0000,
                    },
                ],
            });
        } catch (error) {

        }
        return {
            success: true,
        };
    } catch (error) {
        console.error("Error en removePlayer:", error);
        return {
            success: false,
            error: "Ocurrió un error al eliminar al jugador",
        };
    }
}

export const addPlayer = async ({ playerNumber, twitchUsername }: { playerNumber: number; twitchUsername: string }) => {
    try {
        const user = await client.query.UsersTable.findFirst({
            where: eq(UsersTable.username, twitchUsername)
        }).execute().then(res => res?.id);

        if (!user) {
            return {
                success: false,
                error: "No se encontró el usuario en la base de datos",
            };
        }

        const playerWithNumber = await client.query.StreamerWarsPlayersTable.findFirst({
            where: eq(StreamerWarsPlayersTable.playerNumber, playerNumber)
        }).execute();

        if (playerWithNumber) {
            return {
                success: false,
                error: "Ya existe un jugador con ese número",
            };
        }

        try {
            await client.insert(StreamerWarsPlayersTable).values({
                playerNumber,
                userId: user
            }).execute()
            await sendDiscordEmbed(SALTO_DISCORD_GUILD_ID, {
                title: "Nuevo jugador",
                description: `Se ha agregado un nuevo jugador a Guerra de Streamers.`,
                fields: [
                    {
                        name: "Número",
                        value: playerNumber.toString().padStart(3, '0'),
                        inline: true
                    },
                    {
                        name: "Usuario",
                        value: twitchUsername,
                        inline: true
                    }
                ],
                color: 2685440
            })
        } catch (error) {

        }


        return {
            success: true,
        };
    } catch (error) {
        console.error("Error en addPlayer:", error);
        return {
            success: false,
            error: "Ocurrió un error al agregar al jugador",
        };
    }
}

export const aislatePlayer = async (playerNumber: number) => {
    try {
        await client
            .update(StreamerWarsPlayersTable)
            .set({ aislated: true })
            .where(eq(StreamerWarsPlayersTable.playerNumber, playerNumber))
            .execute();

        await pusher.trigger("streamer-wars", "player-aislated", { playerNumber });

        try {
            await sendWebhookMessage(LOGS_CHANNEL_WEBHOOK_ID, DISCORD_LOGS_WEBHOOK_TOKEN, {
                content: null,
                embeds: [
                    {
                        title: "Aislamiento",
                        description: `El jugador #${playerNumber.toString().padStart(3, '0')} ha sido aislado.`,
                        color: 16435200,
                    },
                ],
            });
        } catch (error) {

        }

        return {
            success: true,
        };
    } catch (error) {
        console.error("Error en aislatePlayer:", error);
        return {
            success: false,
            error: "Ocurrió un error al aislar al jugador",
        };
    }
}

export const unaislatePlayer = async (playerNumber: number) => {
    try {
        await client
            .update(StreamerWarsPlayersTable)
            .set({ aislated: false })
            .where(eq(StreamerWarsPlayersTable.playerNumber, playerNumber))
            .execute();

        await pusher.trigger("streamer-wars", "player-unaislated", { playerNumber });

        try {
            await sendWebhookMessage(LOGS_CHANNEL_WEBHOOK_ID, DISCORD_LOGS_WEBHOOK_TOKEN, {
                content: null,
                embeds: [
                    {
                        title: "Desaislamiento",
                        description: `El jugador #${playerNumber.toString().padStart(3, '0')} ha sido quitado del aislamiento.`,
                        color: 16435200,
                    },
                ],
            });
        } catch (error) {

        }

        return {
            success: true,
        };
    } catch (error) {
        console.error("Error en unaislatePlayer:", error);
        return {
            success: false,
            error: "Ocurrió un error al desaislar al jugador",
        };
    }
}

export const isPlayerAislated = async (playerNumber: number) => {
    return await client.query.StreamerWarsPlayersTable.findFirst({
        columns: {
            aislated: true
        },
        where: eq(StreamerWarsPlayersTable.playerNumber, playerNumber)
    }).then(res => res?.aislated ?? false);
}

export const aislateMultiplePlayers = async (playerNumbers: number[]) => {
    try {
        await client
            .update(StreamerWarsPlayersTable)
            .set({ aislated: true })
            .where(inArray(StreamerWarsPlayersTable.playerNumber, playerNumbers))
            .execute();

        await pusher.trigger("streamer-wars", "players-aislated", { playerNumbers });

        for (const playerNumber of playerNumbers) {
            try {
                await sendWebhookMessage(LOGS_CHANNEL_WEBHOOK_ID, DISCORD_LOGS_WEBHOOK_TOKEN, {
                    content: null,
                    embeds: [
                        {
                            title: "Aislamiento",
                            description: `El jugador #${playerNumber.toString().padStart(3, '0')} ha sido aislado.`,
                            color: 16435200,
                        },
                    ],
                });
            } catch (error) {

            }
        }

        return {
            success: true,
        };
    } catch (error) {
        console.error("Error en aislateMultiplePlayers:", error);
        return {
            success: false,
            error: "Ocurrió un error al aislar a los jugadores",
        };
    }
}

export const beforeLaunchGame = async () => {
    /* 
        Obtiene los jugadores que no han sido eliminados y que no están aislados.
        Consulta a Pusher para obtener los jugadores conectados.
 
        Si hay jugadores que no están conectados, se los aisla.
    */

    /* 
        Clear Simon Says cache
    */

    const cache = createCache();
    await cache.delete(CACHE_KEY);


    const players = await client.query.StreamerWarsPlayersTable.findMany({
        where: and(
            not(eq(StreamerWarsPlayersTable.eliminated, true)),
            not(eq(StreamerWarsPlayersTable.aislated, true))
        )
    }).execute();

    const res = await pusher.get({ path: "/channels/presence-streamer-wars/users" });
    /* { users: [ { id: 1 } ] } */
    const { users } = await res.json();
    const userIds: number[] = users ? users.map(({ id }: { id: number }) => id) : [];

    const playersNotConnected = players.filter(player => !userIds.includes(player.userId!)).map(player => player.playerNumber);


    if (playersNotConnected.length > 0) {
        await aislateMultiplePlayers(playersNotConnected);
    }

}

export const unaislateAllPlayers = async () => {
    try {
        const players = await client
            .update(StreamerWarsPlayersTable)
            .set({ aislated: false })
            .returning({ playerNumber: StreamerWarsPlayersTable.playerNumber })
            .execute();

        await pusher.trigger("streamer-wars", "players-unaislated", {});

        for (const player of players) {
            try {
                await sendWebhookMessage(LOGS_CHANNEL_WEBHOOK_ID, DISCORD_LOGS_WEBHOOK_TOKEN, {
                    content: null,
                    embeds: [
                        {
                            title: "Desaislamiento",
                            description: `El jugador #${player.playerNumber.toString().padStart(3, '0')} ha sido quitado del aislamiento.`,
                            color: 16435200,
                        },
                    ],
                });
            } catch (error) {

            }
        }

        return {
            success: true,
        };
    } catch (error) {
        console.error("Error en unaislateAllPlayers:", error);
        return {
            success: false,
            error: "Ocurrió un error al desaislar a los jugadores",
        };
    }
}



export const getNegativeVotes = async (): Promise<
    { playerNumber: number; displayName: string; avatar: string; votes: number; percentage: number }[]
> => {
    return await client
        .select({
            playerNumber: NegativeVotesStreamersTable.playerNumber,
            votes: count(NegativeVotesStreamersTable.id),
            displayName: UsersTable.displayName,
            avatar: UsersTable.avatar,
        })
        .from(NegativeVotesStreamersTable)
        // Primero se une con StreamerWarsPlayersTable usando playerNumber
        .innerJoin(
            StreamerWarsPlayersTable,
            eq(
                StreamerWarsPlayersTable.playerNumber,
                NegativeVotesStreamersTable.playerNumber
            )
        )
        // Luego se une con UsersTable usando userId de StreamerWarsPlayersTable
        .innerJoin(UsersTable, eq(UsersTable.id, StreamerWarsPlayersTable.userId))
        // Agrupamos por playerNumber y los datos del streamer
        .groupBy(
            NegativeVotesStreamersTable.playerNumber,
            UsersTable.displayName,
            UsersTable.avatar
        )
        // Ordenamos por votos descendente (usa desc sobre la función count)
        .orderBy(desc(count(NegativeVotesStreamersTable.id)))
        .execute()
        .then(res => {
            console.log('Resultado raw:', res);

            // Filtramos posibles resultados inválidos
            const validResults = res.filter(
                ({ playerNumber, avatar }) => playerNumber !== null && avatar !== null
            ).filter(({ votes }) => votes > 1);

            // Aunque la query ya ordena, volvemos a ordenar en caso de ser necesario
            const ordered = validResults.sort((a, b) => b.votes - a.votes);
            const totalVotes = ordered.reduce((acc, { votes }) => acc + votes, 0);

            return ordered.map(({ playerNumber, displayName, avatar, votes }) => ({
                playerNumber: playerNumber!,
                displayName,
                avatar: avatar!,
                votes,
                percentage: totalVotes > 0 ? (votes / totalVotes) * 100 : 0,
            }));
        })
        .catch(e => {
            console.error(e);
            return [];
        });
};


export const getPlayersLiveOnTwitch = async () => {
    /* 
        Get username of all players
    */

    const players = await client.query.StreamerWarsPlayersTable.findMany({
        with: {
            user: {
                columns: {
                    username: true
                }
            }
        }
    }).execute().then(res => res.map(({ user }) => user?.username).filter((username): username is string => username !== null));

    /* 
        Get live streams
    */

    const { data: liveNow } = await getLiveStreams(
        players
    );

    return liveNow;
}

export const getTodayEliminatedPlayers = async () => {
    /* 
        Redis 
    */

    const cache = createCache();
    return await cache.get("streamer-wars-today-eliminateds") as number[] ?? [];
}

export const launchGame = async (game: string, props: any) => {
    await beforeLaunchGame();
    const cache = cacheService.create({ ttl: 60 * 60 * 24 });
    await cache.set("streamer-wars-gamestate", { game, props });
    await pusher.trigger("streamer-wars", "launch-game", { game, props });
};

export const lockChat = async () => {
    const cache = createCache();
    await cache.set("streamer-wars-chat-locked", true);
    await pusher.trigger("streamer-wars", "lock-chat", null);
    return { success: true };
};

export const unlockChat = async () => {
    const cache = createCache();
    await cache.set("streamer-wars-chat-locked", false);
    await pusher.trigger("streamer-wars", "unlock-chat", null);
    return { success: true };
};

export const executeAdminCommand = async (command: string, args: string[]): Promise<{ success: boolean, feedback?: string }> => {
    try {
        switch (command) {
            case '/kill':
                const playerNumbers = Array.from(new Set(args.map(arg => parseInt(arg, 10)).filter(n => !isNaN(n))));
                if (playerNumbers.length === 0) {
                    return { success: false, feedback: 'No se proporcionaron números de jugador válidos' };
                }
                if (playerNumbers.length === 1) {
                    await eliminatePlayer(playerNumbers[0]);
                } else {
                    await massEliminatePlayers(playerNumbers);
                }
                return { success: true, feedback: `Jugador(es) ${playerNumbers.join(', ')} eliminados` };

            case '/launch':
                const gameId = args[0];
                if (!gameId) {
                    return { success: false, feedback: 'Se requiere un gameId para lanzar el juego' };
                }
                const props = args.length > 1 ? JSON.parse(args.slice(1).join(' ')) : {};
                await launchGame(gameId, props);
                return { success: true, feedback: `Juego ${gameId} lanzado` };

            case '/episode':
                const episodeNum = parseInt(args[0], 10);

                if (isNaN(episodeNum) || episodeNum < 0 || episodeNum > 3) {
                    return { success: false, feedback: 'Se requiere un número de episodio válido (0, 1, 2 o 3)' };
                }

                await pusher.trigger("streamer-wars", "episode-title", { episode: episodeNum });
                return { success: true, feedback: `Episodio ${episodeNum} mostrado` };

            case '/team':
                const teamColor = args[0];
                if (!teamColor) {
                    return { success: false, feedback: 'Se requiere un color de equipo' };
                }
                const { playersTeams } = await getPlayersTeams();
                const teamPlayers = playersTeams[teamColor] || [];
                const playerList = teamPlayers.map(p => `${p.playerNumber} (${p.displayName})`).join(', ');
                return { success: true, feedback: `Equipo ${teamColor}: ${playerList || 'sin miembros'}` };

            case '/waiting':
                const waitingAction = args[0];
                const expected = parseInt(args[1], 10);

                if (waitingAction === 'show') {
                    if (isNaN(expected)) {
                        return { success: false, feedback: 'Expected debe ser un número' };
                    }
                    const cache = createCache();
                    await cache.set("streamer-wars-expected-players", expected);
                    await cache.set("streamer-wars-waiting-screen-visible", true);
                    await pusher.trigger("streamer-wars", "show-waiting-screen", { expectedPlayers: expected });
                    return { success: true, feedback: `Pantalla de espera mostrada con ${expected} jugadores esperados` };
                } else if (waitingAction === 'hide') {
                    const cache = createCache();
                    await cache.set("streamer-wars-expected-players", 50); // Reset to default
                    await cache.set("streamer-wars-waiting-screen-visible", false);
                    await pusher.trigger("streamer-wars", "hide-waiting-screen", null);
                    return { success: true, feedback: 'Pantalla de espera oculta' };
                } else {
                    return { success: false, feedback: 'Uso: /waiting show <número> o /waiting hide' };
                }

            case '/play-cinematic':
                const cinematicId = args[0];
                if (!cinematicId || !CINEMATICS[cinematicId as keyof typeof CINEMATICS]) {
                    return { success: false, feedback: `Cinemática ${cinematicId} no encontrada` };
                }
                await pusher.trigger("streamer-wars-cinematic", "new-event", {
                    targetUsers: 'everyone',
                    videoUrl: CINEMATICS[cinematicId as keyof typeof CINEMATICS].url
                });
                return { success: true, feedback: `Cinemática ${cinematicId} reproducida` };

            case '/waiting-room':
                // Envía a todos los jugadores a la sala de espera
                const waitingCache = cacheService.create({ ttl: 60 * 60 * 24 });
                await waitingCache.set("streamer-wars-gamestate", null);

                await pusher.trigger("streamer-wars", "send-to-waiting-room", null);
                return { success: true, feedback: 'Todos los jugadores enviados a la sala de espera' };
            case '/announce':
                const message = args.join(' ');
                if (!message) {
                    return { success: false, feedback: 'Se requiere un mensaje para el anuncio' };
                }
                await pusher.trigger("streamer-wars", "new-announcement", { message });
                return { success: true, feedback: 'Anuncio enviado' };
            case '/chat':
                const chatAction = args[0];
                if (chatAction === 'lock') {
                    await lockChat();
                    return { success: true, feedback: 'Chat bloqueado' };
                } else if (chatAction === 'unlock') {
                    await unlockChat();
                    return { success: true, feedback: 'Chat desbloqueado' };
                } else {
                    return { success: false, feedback: 'Uso: /chat lock o /chat unlock' };
                }
            case '/dalgona':
                const dalgonaAction = args[0];
                if (dalgonaAction === 'start') {
                    const gameState = await games.dalgona.startGame();
                    return { success: true, feedback: `Minijuego Dalgona iniciado con ${Object.keys(gameState.players).length} jugadores` };
                } else if (dalgonaAction === 'end') {
                    const result = await games.dalgona.endGame();
                    const completedCount = result.gameState.players ? Object.values(result.gameState.players).filter(p => p.status === 'completed').length : 0;
                    const eliminatedCount = result.gameState.players ? Object.values(result.gameState.players).filter(p => p.status === 'failed' || p.status === 'playing').length : 0;
                    return { success: true, feedback: `Minijuego Dalgona finalizado. Completaron: ${completedCount}, Eliminados: ${eliminatedCount}` };
                } else {
                    return { success: false, feedback: 'Uso: /dalgona start o /dalgona end' };
                }
            case '/timer':
                const seconds = parseInt(args[0], 10);
                if (isNaN(seconds) || seconds <= 0) {
                    return { success: false, feedback: 'Se requiere un número de segundos válido mayor a 0' };
                }
                const timerCache = createCache();
                await timerCache.set("streamer-wars-timer", { startedAt: Date.now(), duration: seconds });
                await pusher.trigger("streamer-wars", "show-timer", { seconds });
                return { success: true, feedback: `Temporizador mostrado por ${seconds} segundos` };
            case '/cuerda':
                const cuerdaAction = args[0];
                if (cuerdaAction === 'start') {
                    const gameState = await games.tugOfWar.startGame();
                    return { success: true, feedback: `Juego de la cuerda iniciado entre ${gameState.teams.teamA.name} y ${gameState.teams.teamB.name}` };
                } else if (cuerdaAction === 'end') {
                    const result = await games.tugOfWar.endGame();
                    if (result.success && result.gameState) {
                        return { success: true, feedback: `Juego de la cuerda finalizado. Ganador: ${result.gameState.winner === 'teamA' ? result.gameState.teams.teamA.name : result.gameState.teams.teamB.name}` };
                    } else {
                        return { success: false, feedback: 'Error al finalizar el juego de la cuerda' };
                    }
                } else if (cuerdaAction === 'next') {
                    const gameState = await games.tugOfWar.startGame();
                    return { success: true, feedback: `Siguiente ronda de la cuerda iniciada entre ${gameState.teams.teamA.name} y ${gameState.teams.teamB.name}` };
                } else if (cuerdaAction === 'clear') {
                    const result = await games.tugOfWar.clearGameState();
                    if (result.success) {
                        return { success: true, feedback: 'Estado del juego de la cuerda reseteado' };
                    } else {
                        return { success: false, feedback: 'Error al resetear el estado del juego de la cuerda' };
                    }
                } else {
                    return { success: false, feedback: 'Uso: /cuerda start|end|next|clear' };
                }
            case '/bomb':
                const bombAction = args[0];
                if (bombAction === 'start') {
                    const gameState = await games.bomb.startGame();
                    return { success: true, feedback: `Minijuego "Desactivar la Bomba" iniciado con ${Object.keys(gameState.players).length} jugadores` };
                } else if (bombAction === 'end') {
                    const result = await games.bomb.endGame();
                    const completedCount = result.gameState?.players ? Object.values(result.gameState.players).filter(p => p.status === 'completed').length : 0;
                    const failedCount = result.gameState?.players ? Object.values(result.gameState.players).filter(p => p.status !== 'completed').length : 0;
                    return { success: true, feedback: `Minijuego "Desactivar la Bomba" finalizado. Completaron: ${completedCount}, Eliminados: ${failedCount}` };
                } else if (bombAction === 'status') {
                    const gameState = await games.bomb.getGameState();
                    if (gameState.status === 'waiting') {
                        return { success: true, feedback: 'No hay juego de bomba activo' };
                    }
                    const totalPlayers = Object.keys(gameState.players).length;
                    const completedCount = Object.values(gameState.players).filter(p => p.status === 'completed').length;
                    const playingCount = Object.values(gameState.players).filter(p => p.status === 'playing').length;
                    const failedCount = Object.values(gameState.players).filter(p => p.status === 'failed').length;
                    return { success: true, feedback: `Estado: ${totalPlayers} jugadores - Completaron: ${completedCount}, Jugando: ${playingCount}, Eliminados: ${failedCount}` };
                } else {
                    return { success: false, feedback: 'Uso: /bomb start|end|status' };
                }
            case '/revive':
                const playerNumber = parseInt(args[0], 10);
                if (isNaN(playerNumber)) {
                    return { success: false, feedback: 'Número de jugador inválido' };
                }
                await revivePlayer(playerNumber);
                return { success: true, feedback: `Jugador ${playerNumber} revivido` };
            default:
                return { success: false, feedback: 'Comando desconocido' };
        }
    } catch (error) {
        console.error('Error executing admin command:', error);
        return { success: false, feedback: 'Error al ejecutar el comando' };
    }
}

export const getCurrentTimer = async (): Promise<{ startedAt: number; duration: number } | null> => {
    const cache = createCache();
    const timerData = await cache.get<{ startedAt: number; duration: number }>("streamer-wars-timer");
    if (!timerData) return null;
    const elapsed = Date.now() - timerData.startedAt;
    const totalDurationMs = timerData.duration * 1000;
    if (elapsed >= totalDurationMs) {
        // Timer expirado, limpiar
        await cache.delete("streamer-wars-timer");
        return null;
    }
    return timerData;
};