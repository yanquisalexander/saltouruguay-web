import { client } from "@/db/client";
import { StreamerWarsInscriptionsTable, StreamerWarsPlayersTable, StreamerWarsTeamPlayersTable, StreamerWarsTeamsTable, UsersTable } from "@/db/schema";
import cacheService from "@/services/cache";
import { and, asc, count, eq, not, or } from "drizzle-orm";
import { pusher } from "./pusher";
import { tts } from "@/services/tts";
import { addRoleToUser, DISCORD_ROLES, removeRoleFromUser, ROLE_GUERRA_STREAMERS } from "@/services/discord";
import { SALTO_DISCORD_GUILD_ID } from "@/config";


export interface SimonSaysGameState {
    teams: Record<
        string,
        {
            players: number[];
            played: number[];
        }
    >;
    currentRound: number;
    currentPlayers: Record<string, number | null>; // null si no hay jugador disponible
    completedPlayers: number[]; // Jugadores que han completado el patrón actual
    pattern: string[];
    eliminatedPlayers: number[]; // Jugadores eliminados
    status: "playing" | "waiting";
}

const CACHE_KEY = "streamer-wars.simon-says:game-state";
const COLORS = ["red", "blue", "green", "yellow"];

const getRandomItem = <T>(array: T[]): T => array[Math.floor(Math.random() * array.length)];
const createCache = () => cacheService.create({ ttl: 60 * 60 * 48 });


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

            // Selecciona aleatoriamente un jugador actual por cada equipo
            const currentPlayers = Object.fromEntries(
                Object.entries(teams).map(([team, data]) => {
                    const chosenPlayer =
                        data.players.length > 0 ? getRandomItem(data.players) : null;
                    return [team, chosenPlayer];
                })
            );

            const patternFirstColor = getRandomItem(COLORS);

            const newGameState: SimonSaysGameState = {
                teams: Object.fromEntries(
                    Object.entries(teams).map(([team, data]) => [
                        team,
                        { ...data, played: [] },
                    ])
                ),
                currentRound: 1,
                currentPlayers,
                pattern: [patternFirstColor],
                eliminatedPlayers: [],
                status: "playing",
                completedPlayers: [],
            };

            await cache.set(CACHE_KEY, newGameState);
            await pusher.trigger("streamer-wars.simon-says", "game-state", newGameState);
            return newGameState;
        },

        completePattern: async (playerNumber: number) => {
            const cache = createCache();
            const gameState = await games.simonSays.getGameState();

            const newCompletedPlayers = Array.from(
                new Set([...gameState.completedPlayers, playerNumber])
            );



            const newGameState: SimonSaysGameState = {
                ...gameState,
                completedPlayers: newCompletedPlayers,
            };

            await cache.set(CACHE_KEY, newGameState);

            // Si todos los jugadores de cada equipo han completado el patrón, se avanza a la siguiente ronda
            const allCompleted = Object.values(gameState.currentPlayers).every(
                (player) => player === null || newCompletedPlayers.includes(player)
            );

            if (allCompleted) {
                await games.simonSays.advanceToNextRoundForCurrentPlayers();
            }
        },

        patternFailed: async (playerNumber: number) => {
            const cache = createCache();
            const gameState = await games.simonSays.getGameState();

            // Marca al jugador como eliminado y marca a todos los jugadores de su equipo como habiendo jugado
            const newEliminatedPlayers = Array.from(
                new Set([...gameState.eliminatedPlayers, playerNumber])
            );

            const newTeams = Object.fromEntries(
                Object.entries(gameState.teams).map(([team, data]) => [
                    team,
                    {
                        ...data,
                        // En este caso, se marca a todos los jugadores de ese equipo como que ya jugaron
                        played: Array.from(new Set([...data.played, ...data.players])),
                    },
                ])
            );

            const newGameState: SimonSaysGameState = {
                ...gameState,
                status: "waiting",
                eliminatedPlayers: newEliminatedPlayers,
                teams: newTeams,
            };

            await cache.set(CACHE_KEY, newGameState);
            await pusher.trigger("streamer-wars.simon-says", "pattern-failed", {
                playerNumber,
            });
            await pusher.trigger("streamer-wars.simon-says", "game-state", newGameState);

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
            await new Promise((resolve) => setTimeout(resolve, 2000));
            await pusher.trigger("streamer-wars.simon-says", "game-state", newGameState);
            return newGameState;
        },

        /**
         * Avanza a una nueva partida con jugadores que aún no han jugado y no están eliminados.
         * Para cada equipo, se selecciona un nuevo jugador de entre los que:
         * - Están en `teams.players`
         * - No están en `eliminatedPlayers`
         * - No han sido seleccionados en partidas anteriores (según `team.played`)
         *
         * Se reinicia el patrón, se establece la ronda en 1 y se limpia `completedPlayers`.
         */
        nextRoundWithOtherPlayers: async () => {
            const cache = createCache();
            const gameState = await games.simonSays.getGameState();

            // Para cada equipo, filtra los jugadores que no han jugado y no están eliminados
            const newCurrentPlayers: Record<string, number | null> = {};
            const newTeams = { ...gameState.teams };

            for (const [team, data] of Object.entries(gameState.teams)) {
                const availablePlayers = data.players.filter(
                    (player) =>
                        !data.played.includes(player) &&
                        !gameState.eliminatedPlayers.includes(player)
                );

                newCurrentPlayers[team] = availablePlayers.length > 0
                    ? getRandomItem(availablePlayers)
                    : null;
            }

            // Se define un nuevo patrón iniciando con un color aleatorio
            const newPattern = [getRandomItem(COLORS)];

            // Se arma el nuevo estado de juego. Se reinicia la ronda y los jugadores que completaron.
            const newGameState: SimonSaysGameState = {
                ...gameState,
                currentRound: 1,
                currentPlayers: newCurrentPlayers,
                pattern: newPattern,
                completedPlayers: [],
                status: "playing",
                // Se mantiene el historial de jugadores que ya jugaron para evitar reutilizarlos
                teams: newTeams,
            };

            await cache.set(CACHE_KEY, newGameState);
            await pusher.trigger("streamer-wars.simon-says", "game-state", newGameState);
            return newGameState;
        },
    },
};



export const eliminatePlayer = async (playerNumber: number) => {
    try {
        // Actualiza el estado del jugador en la base de datos.
        await client
            .update(StreamerWarsPlayersTable)
            .set({ eliminated: true })
            .where(eq(StreamerWarsPlayersTable.playerNumber, playerNumber))
            .execute();

        // Genera el audio.
        const audioBase64 = await tts(`Jugador, ${playerNumber}, eliminado`);

        // Envía el evento a Pusher con los datos actualizados.
        await pusher.trigger("streamer-wars", "player-eliminated", {
            playerNumber,
            audioBase64,
        });

        //await removeRoleFromUser(SALTO_DISCORD_GUILD_ID, playerNumber, ROLE_GUERRA_STREAMERS);
    } catch (error) {
        console.error("Error en eliminatePlayer:", error);
    }
};

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

        console.log({ user });

        if (!user || !user.discordId) {
            return {
                success: false,
                error: "No se encontró el usuario asociado al jugador",
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
            await addRoleToUser(SALTO_DISCORD_GUILD_ID, user.discordId, roleId);
        }

        // Notificar al canal mediante Pusher
        await pusher.trigger("streamer-wars", "player-joined", null);

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
                error: "No se encontró el usuario asociado al jugador",
            };
        }

        // Remover rol del usuario en Discord
        await removeRoleFromUser(SALTO_DISCORD_GUILD_ID, user.discordId, DISCORD_ROLES.EQUIPO_AZUL);
        await removeRoleFromUser(SALTO_DISCORD_GUILD_ID, user.discordId, DISCORD_ROLES.EQUIPO_ROJO);
        await removeRoleFromUser(SALTO_DISCORD_GUILD_ID, user.discordId, DISCORD_ROLES.EQUIPO_AMARILLO);
        await removeRoleFromUser(SALTO_DISCORD_GUILD_ID, user.discordId, DISCORD_ROLES.EQUIPO_MORADO);
        await removeRoleFromUser(SALTO_DISCORD_GUILD_ID, user.discordId, DISCORD_ROLES.EQUIPO_BLANCO);

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