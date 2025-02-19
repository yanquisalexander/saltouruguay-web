import { client } from "@/db/client";
import { NegativeVotesStreamersTable, StreamerWarsInscriptionsTable, StreamerWarsPlayersTable, StreamerWarsTeamPlayersTable, StreamerWarsTeamsTable, UsersTable } from "@/db/schema";
import cacheService from "@/services/cache";
import { and, asc, count, eq, inArray, not, or } from "drizzle-orm";
import { pusher } from "./pusher";
import { tts } from "@/services/tts";
import { addRoleToUser, DISCORD_ROLES, getDiscordUser, getGuildMember, LOGS_CHANNEL_WEBHOOK_ID, removeRoleFromUser, ROLE_GUERRA_STREAMERS, sendDiscordEmbed, sendWebhookMessage } from "@/services/discord";
import { SALTO_DISCORD_GUILD_ID } from "@/config";
import { DISCORD_LOGS_WEBHOOK_TOKEN } from "astro:env/server";
import { getTranslation } from "./translate";
import { getLiveStreams } from "./twitch-runtime";

const PRESENCE_CHANNEL = "presence-streamer-wars";


export interface SimonSaysGameState {
    teams: Record<
        string,
        {
            players: number[];
        }
    >;
    currentRound: number;
    currentPlayers: Record<string, number | null>; // null si no hay jugador disponible
    completedPlayers: number[]; // Jugadores que han completado el patrón actual
    pattern: string[];
    eliminatedPlayers: number[]; // Jugadores eliminados
    status: "playing" | "waiting";
    playerWhoAlreadyPlayed: number[]; // Jugadores que ya han jugado en rondas anteriores
}

const CACHE_KEY = "streamer-wars.simon-says:game-state";
const COLORS = ["red", "blue", "green", "yellow"];

const getRandomItem = <T>(array: T[]): T =>
    array[Math.floor(Math.random() * array.length)];
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
};



export const eliminatePlayer = async (playerNumber: number) => {
    try {
        // Actualiza el estado del jugador en la base de datos.

        if (import.meta.env.PROD) {
            await client
                .update(StreamerWarsPlayersTable)
                .set({ eliminated: true })
                .where(eq(StreamerWarsPlayersTable.playerNumber, playerNumber))
                .execute();
        }

        // Genera el audio.
        const audioBase64 = await tts(`Jugador, ${playerNumber}, eliminado`);

        // Envía el evento a Pusher con los datos actualizados.
        await pusher.trigger("streamer-wars", "player-eliminated", {
            playerNumber,
            audioBase64,
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

        // Obtener el discordId del jugador desde una relación con playerNumber
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
            await addRoleToUser(SALTO_DISCORD_GUILD_ID, user.discordId, roleId);
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




        const guildMember = await getGuildMember(SALTO_DISCORD_GUILD_ID, user.discordId);

        const { roles } = guildMember as { roles: string[] };

        for (const roleId of roles) {
            if (roleId === DISCORD_ROLES.EQUIPO_AZUL || roleId === DISCORD_ROLES.EQUIPO_ROJO || roleId === DISCORD_ROLES.EQUIPO_AMARILLO || roleId === DISCORD_ROLES.EQUIPO_MORADO || roleId === DISCORD_ROLES.EQUIPO_BLANCO) {
                await removeRoleFromUser(SALTO_DISCORD_GUILD_ID, user.discordId!, roleId);
            }
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

    const players = await client.query.StreamerWarsPlayersTable.findMany({
        where: and(
            not(eq(StreamerWarsPlayersTable.eliminated, true)),
            not(eq(StreamerWarsPlayersTable.aislated, true))
        )
    }).execute();

    const res = await pusher.get({ path: "/channels/presence-streamer-wars/users" });
    /* { users: [ { id: 1 } ] } */
    const userIds: number[] = await res.json().then(({ users }) => users.map(({ id }: { id: number }) => id));

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
            // Especificamos la columna para contar
            votes: count(NegativeVotesStreamersTable.id),
            displayName: UsersTable.displayName,
            avatar: UsersTable.avatar
        })
        .from(NegativeVotesStreamersTable)
        .innerJoin(UsersTable, eq(UsersTable.id, NegativeVotesStreamersTable.userId))
        .groupBy(
            NegativeVotesStreamersTable.playerNumber,
            UsersTable.displayName,
            UsersTable.avatar
        )
        .execute()
        .then(res => {
            // Filtrar entradas inválidas antes de calcular totalVotes
            const validResults = res.filter(({ playerNumber, avatar }) => playerNumber !== null && avatar !== null);
            // Calcular el total de votos a partir de los datos filtrados
            const totalVotes = validResults.reduce((acc, { votes }) => acc + votes, 0);
            return validResults
                .sort((a, b) => b.votes - a.votes)
                .map(({ playerNumber, displayName, avatar, votes }) => ({
                    playerNumber: playerNumber!,
                    displayName,
                    avatar: avatar!,
                    votes,
                    percentage: totalVotes > 0 ? (votes / totalVotes) * 100 : 0
                }));
        })
        .catch((e) => {
            console.log(e);
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