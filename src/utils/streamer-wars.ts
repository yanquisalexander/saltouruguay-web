import { client } from "@/db/client";
import { StreamerWarsInscriptionsTable, StreamerWarsPlayersTable, StreamerWarsTeamPlayersTable, StreamerWarsTeamsTable, UsersTable } from "@/db/schema";
import cacheService from "@/services/cache";
import { and, asc, eq, not, or } from "drizzle-orm";
import { pusher } from "./pusher";
import { tts } from "@/services/tts";
import { addRoleToUser, DISCORD_ROLES, removeRoleFromUser, ROLE_GUERRA_STREAMERS } from "@/services/discord";
import { SALTO_DISCORD_GUILD_ID } from "@/config";




export interface SimonSaysGameState {
    teams: Record<string, { players: number[]; played: number[] }>;
    currentRound: number;
    currentPlayers: Record<string, number>;
    pattern: string[];
    failedPlayers: number[];
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
    simonSays: {
        getGameState: async () => {
            const cacheKey = "streamer-wars:simon-says:game-state";
            const cache = cacheService.create({ ttl: 60 * 60 * 48 });
            const cachedGameState = await cache.get<SimonSaysGameState>(cacheKey);

            if (cachedGameState) {
                return cachedGameState;
            }

            return {
                teams: {},
                currentRound: 0,
                currentPlayers: {},
                pattern: [],
                failedPlayers: []
            };
        },
        generateNextPattern: async () => {
            const cacheKey = "streamer-wars:simon-says:game-state";
            const cache = cacheService.create({ ttl: 60 * 60 * 48 });
            const gameState = await games.simonSays.getGameState();

            const colors = ["red", "blue", "green", "yellow"] as const;
            const nextColor = colors[Math.floor(Math.random() * colors.length)];

            const newGameState = {
                ...gameState,
                pattern: [...gameState.pattern, nextColor]
            };

            await cache.set(cacheKey, newGameState);
            return newGameState.pattern;
        },
        startGame: async (teams: Record<string, { players: number[] }>) => {
            const cacheKey = "streamer-wars:simon-says:game-state";
            const cache = cacheService.create({ ttl: 60 * 60 * 48 });

            const currentPlayers = Object.fromEntries(
                Object.entries(teams).map(([team, data]) => [
                    team,
                    data.players[Math.floor(Math.random() * data.players.length)]
                ])
            );

            const newGameState = {
                teams: Object.fromEntries(
                    Object.entries(teams).map(([team, data]) => [
                        team,
                        { ...data, played: [] }
                    ])
                ),
                currentRound: 1,
                currentPlayers,
                pattern: [],
                failedPlayers: []
            };

            await cache.set(cacheKey, newGameState);
            return newGameState;
        },
        completePattern: async (userId: number) => {
            const cacheKey = "streamer-wars:simon-says:game-state";
            const cache = cacheService.create({ ttl: 60 * 60 * 48 });
            const gameState = await games.simonSays.getGameState();

            const newGameState = {
                ...gameState,
                teams: Object.fromEntries(
                    Object.entries(gameState.teams).map(([team, data]) => [
                        team,
                        {
                            ...data,
                            played: [...data.played, userId]
                        }
                    ])
                )
            };

            await cache.set(cacheKey, newGameState);
            return newGameState;
        },
        patternFailed: async (userId: number) => {
            const cacheKey = "streamer-wars:simon-says:game-state";
            const cache = cacheService.create({ ttl: 60 * 60 * 48 });
            const gameState = await games.simonSays.getGameState();

            const newGameState = {
                ...gameState,
                failedPlayers: [...gameState.failedPlayers, userId],
                teams: Object.fromEntries(
                    Object.entries(gameState.teams).map(([team, data]) => [
                        team,
                        {
                            ...data,
                            played: [...data.played, userId]
                        }
                    ])
                )
            };

            await cache.set(cacheKey, newGameState);
            await pusher.trigger("streamer-wars:simon-says", "pattern-failed", {
                userId
            });

            return newGameState;
        }
    }
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