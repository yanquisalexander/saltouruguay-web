import { client } from "@/db/client";
import { StreamerWarsInscriptionsTable, StreamerWarsPlayersTable, StreamerWarsTeamPlayersTable, StreamerWarsTeamsTable, UsersTable } from "@/db/schema";
import cacheService from "@/services/cache";
import { and, asc, eq, or } from "drizzle-orm";
import { pusher } from "./pusher";
import { tts } from "@/services/tts";
import { addRoleToUser } from "@/services/discord";
import { SALTO_DISCORD_GUILD_ID } from "@/config";



const MEMORY_GAME_INITIAL_TIME = 120; // 2 minutes
const MEMORY_GAME_MIN_ROUND_TIME = 30; // 30 seconds
export interface MemoryGameGameState {
    actualPattern?: string;
    startedAt?: Date;
    currentRoundTimer?: number;
    completedPatternPlayersIds: number[];
}

export const getCurrentInscriptions = async () => {
    return await client.query.StreamerWarsInscriptionsTable.findMany({
        with: {
            user: {
                columns: {
                    displayName: true,
                    avatar: true,
                    discordId: true,
                }
            }
        }
    })
}



export const games = {
    memory: {
        getGameState: async () => {
            const cacheKey = "streamer-wars:memory:game-state";
            const cache = cacheService.create({ ttl: 60 * 60 * 48 });
            const cachedGameState = await cache.get<MemoryGameGameState>(cacheKey);

            if (cachedGameState) {
                return cachedGameState;
            }

            return {
                actualPattern: undefined,
                startedAt: undefined,
                currentRoundTimer: undefined,
                completedPatternPlayersIds: []
            }
        },
        generateNextPattern: async () => {
            const cacheKey = "streamer-wars:memory:game-state";
            const cache = cacheService.create({ ttl: 60 * 60 * 48 });
            const gameState = await games.memory.getGameState();

            const colors = ["red", "blue", "green", "yellow"] as const;
            const nextColor = colors[Math.floor(Math.random() * colors.length)];

            /* Por cada ronda (color), ir retirando 10 segundos, si es menor a 30, setearlo a 30 */
            const newRoundTimer = Math.max((gameState.currentRoundTimer ?? MEMORY_GAME_INITIAL_TIME) - 10, MEMORY_GAME_MIN_ROUND_TIME);

            const newGameState = {
                ...gameState,
                actualPattern: [...(gameState.actualPattern ?? []), nextColor],
                startedAt: new Date(),
                currentRoundTimer: newRoundTimer,
                completedPatternPlayersIds: []
            }

            await cache.set(cacheKey, newGameState);
            return newGameState.actualPattern;
        },
        startGame: async () => {

            const cacheKey = "streamer-wars:memory:game-state";
            const cache = cacheService.create({ ttl: 60 * 60 * 48 });
            const gameState = await games.memory.getGameState();

            const newGameState = {
                ...gameState,
                actualPattern: [],
                startedAt: new Date(),
                currentRoundTimer: MEMORY_GAME_INITIAL_TIME,
                completedPatternPlayersIds: []
            }
            await cache.set(cacheKey, newGameState);
            return newGameState;
        },
        completePattern: async (userId: number) => {
            const cacheKey = "streamer-wars:memory:game-state";
            const cache = cacheService.create({ ttl: 60 * 60 * 48 });
            const gameState = await games.memory.getGameState();

            const newGameState = {
                ...gameState,
                completedPatternPlayersIds: [...gameState.completedPatternPlayersIds, userId]
            }

            await cache.set(cacheKey, newGameState);
            return newGameState;
        },
        patternFailed: async (userId: number) => {
            /* 
                TODO: Eliminar al jugador en la base de datos (columna)
            */
            await pusher.trigger("streamer-wars:memory", "pattern-failed", {
                userId
            });
        }
    }
}


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

        // Insertar al jugador en el equipo
        await client
            .insert(StreamerWarsTeamPlayersTable)
            .values({
                playerNumber,
                teamId: team.id,
            })
            .execute();

        //await addRoleToUser(SALTO_DISCORD_GUILD_ID)

        await pusher.trigger("streamer-wars", "player-joined", null)

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