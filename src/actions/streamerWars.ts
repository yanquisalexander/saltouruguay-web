import { CINEMATICS_CDN_PREFIX } from "@/config";
import { client } from "@/db/client";
import { StreamerWarsChatMessagesTable, StreamerWarsTeamPlayersTable, StreamerWarsTeamsTable } from "@/db/schema";
import Cache from "@/lib/Cache";
import cacheService from "@/services/cache";
import { pusher } from "@/utils/pusher";
import { eliminatePlayer, getUserIdsOfPlayers, joinTeam, removePlayerFromTeam, resetRoles } from "@/utils/streamer-wars";
import { ActionError, defineAction } from "astro:actions";
import { z } from "astro:schema";
import { getSession } from "auth-astro/server";
import { and, eq } from "drizzle-orm";

export const streamerWars = {
    eliminatePlayer: defineAction({
        input: z.object({
            playerNumber: z.number(),
        }),
        handler: async ({ playerNumber }, { request }) => {
            const session = await getSession(request);

            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Debes iniciar sesión para eliminar jugadores"
                })
            }

            await eliminatePlayer(playerNumber);
            return { success: true }
        }
    }),
    sendMessage: defineAction({
        input: z.object({
            message: z.string().min(1).max(200),
        }),
        handler: async ({ message }, { request }) => {
            const session = await getSession(request);

            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Debes iniciar sesión para enviar mensajes"
                })
            }

            const hasLinks = /https?:\/\/\S+\.\S+/;
            if (hasLinks.test(message)) {
                throw new ActionError({
                    code: "BAD_REQUEST",
                    message: "No puedes enviar mensajes con links"
                })
            }

            try {
                await client
                    .insert(StreamerWarsChatMessagesTable)
                    .values({ userId: session.user.id, message })
                    .execute();

                await pusher.trigger("streamer-wars", "new-message", { message, user: session.user.username });
            } catch (error) {
                throw new ActionError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Error al enviar mensaje"
                })
            }
            return { success: true }
        }
    }),
    getAllMessages: defineAction({
        handler: async (_, { request }) => {
            const session = await getSession(request);

            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Debes iniciar sesión para ver los mensajes"
                })
            }

            const messages = await client.query.StreamerWarsChatMessagesTable.findMany({
                columns: {
                    message: true,
                    isAnnouncement: true,
                },
                with: {
                    user: {
                        columns: {
                            username: true,
                        }
                    }
                }
            }).execute().then((data) => data.map(({ user, message, isAnnouncement }) => ({
                user: user?.username,
                message,
                isAnnouncement
            })))


            return { messages }
        }
    }),
    sendAnnouncement: defineAction({
        input: z.object({
            message: z.string().min(1).max(200),
        }),
        handler: async ({ message }, { request }) => {
            const session = await getSession(request);

            if (!session || !session.user.isAdmin) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "No tienes permisos para enviar anuncios"
                })
            }


            try {
                await client
                    .insert(StreamerWarsChatMessagesTable)
                    .values({ userId: session.user.id, message, isAnnouncement: true })
                    .execute();

                await pusher.trigger("streamer-wars", "new-message", { message, type: "announcement" });
            } catch (error) {
                throw new ActionError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Error al enviar anuncio"
                })
            }
            return { success: true }
        }
    }),
    joinTeam: defineAction({
        input: z.object({
            team: z.string(),
        }),
        handler: async ({ team }, { request }) => {
            const session = await getSession(request);

            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Debes iniciar sesión para unirte a un equipo"
                })
            }

            if (!session.user.streamerWarsPlayerNumber) {
                throw new ActionError({
                    code: "BAD_REQUEST",
                    message: "Debes ser jugador para unirte a un equipo"
                })
            }

            const { success, error } = await joinTeam(session.user.streamerWarsPlayerNumber, team);
            if (!success) {
                throw new ActionError({
                    code: "BAD_REQUEST",
                    message: error
                })
            }

            return { success: true }
        }
    }),
    getPlayers: defineAction({
        handler: async (_, { request }) => {
            const session = await getSession(request);

            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Debes iniciar sesión para ver los jugadores"
                })
            }

            const players = await client.query.StreamerWarsPlayersTable.findMany({
                columns: {
                    playerNumber: true,
                    eliminated: true,
                },
                orderBy(fields, operators) {
                    return operators.asc(fields.playerNumber)
                },
                with: {
                    user: {
                        columns: {
                            id: true,
                            admin: true,
                            avatar: true,
                            displayName: true
                        }
                    }
                }
            }).execute().then((data) => data.map(({ playerNumber, user, eliminated }) => ({
                playerNumber,
                avatar: user?.avatar,
                displayName: user?.displayName,
                admin: user?.admin,
                id: user?.id,
                eliminated
            })))

            return { players }
        }
    }),
    getPlayersTeams: defineAction({
        handler: async (_, { request }) => {
            const session = await getSession(request);

            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Debes iniciar sesión para ver los equipos"
                })
            }

            const playersTeams = await client.query.StreamerWarsTeamPlayersTable.findMany({
                columns: {
                    isCaptain: true
                },
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
            }).execute().then((data) => data.reduce((acc, { isCaptain, player, team }) => {
                if (team && !acc[team.color]) {
                    acc[team.color] = [];
                }
                if (team) {
                    acc[team.color].push({
                        playerNumber: player?.playerNumber as number,
                        avatar: player?.user?.avatar as string,
                        displayName: player?.user?.displayName as string,
                        isCaptain
                    });
                }
                return acc;
            }, {} as { [team: string]: { isCaptain: boolean, playerNumber: number; avatar: string; displayName: string }[] }))

            return { playersTeams }
        }
    }),
    getGameState: defineAction({
        handler: async (_, { request }) => {
            const session = await getSession(request);

            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Debes iniciar sesión para ver el estado del juego"
                })
            }

            const cache = cacheService.create({ ttl: 60 * 60 * 24 });
            const gameState = await cache.get("streamer-wars-gamestate") as any
            const dayAvailable = await cache.get("streamer-wars-day-available") as boolean;

            return { gameState, dayAvailable }
        }
    }),
    setDayAsAvailable: defineAction({
        handler: async (_, { request }) => {
            const session = await getSession(request);

            if (!session || !session.user.isAdmin) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "No tienes permisos para marcar el día como disponible"
                })
            }

            const cache = cacheService.create({ ttl: 60 * 60 * 24 });
            await cache.set("streamer-wars-day-available", true);
            await pusher.trigger("cinematic-player", "new-event", {
                targetUsers: await getUserIdsOfPlayers(),
                videoUrl: `${CINEMATICS_CDN_PREFIX}/cinematica-jornada-guerra.mp4`
            })

            await pusher.trigger("streamer-wars", "day-available", null);
            return { success: true }
        }
    }),
    finishDay: defineAction({
        handler: async (_, { request }) => {
            const session = await getSession(request);

            if (!session || !session.user.isAdmin) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "No tienes permisos para finalizar el día"
                })
            }

            const cache = cacheService.create({ ttl: 60 * 60 * 24 });
            await cache.set("streamer-wars-day-available", false);

            const userIds = await getUserIdsOfPlayers();

            console.log({ userIds });

            await pusher.trigger('cinematic-player', 'new-event', {
                targetUsers: userIds,
                videoUrl: 'url',
            });

            await pusher.trigger("streamer-wars", "day-finished", null);
            return { success: true }
        }
    }),
    sendToWaitingRoom: defineAction({
        handler: async (_, { request }) => {
            const session = await getSession(request);

            if (!session || !session.user.isAdmin) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "No tienes permisos para enviar a la sala de espera"
                })
            }

            const cache = cacheService.create({ ttl: 60 * 60 * 24 });
            await cache.set("streamer-wars-gamestate", null);

            await pusher.trigger("streamer-wars", "send-to-waiting-room", null);
            return { success: true }
        }
    }),
    launchGame: defineAction({
        input: z.object({
            game: z.string(),
            props: z.record(z.any()),
        }),
        handler: async ({ game, props }, { request }) => {
            const session = await getSession(request);

            if (!session || !session.user.isAdmin) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "No tienes permisos para lanzar juegos"
                })
            }

            const cache = cacheService.create({ ttl: 60 * 60 * 24 });
            await cache.set("streamer-wars-gamestate", { game, props });

            await pusher.trigger("streamer-wars", "launch-game", { game, props });
            return { success: true }
        }
    }),
    clearChat: defineAction({
        handler: async (_, { request }) => {
            const session = await getSession(request);

            if (!session || !session.user.isAdmin) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "No tienes permisos para limpiar el chat"
                })
            }

            await client.delete(StreamerWarsChatMessagesTable).execute();
            return { success: true }
        }
    }),
    setTeamCaptain: defineAction({
        input: z.object({
            playerNumber: z.number(),
            team: z.string(),
        }),
        handler: async ({ playerNumber, team }, { request }) => {
            const session = await getSession(request);

            if (!session || !session.user.isAdmin) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "No tienes permisos para asignar capitanes"
                });
            }

            const teamId = await client.query.StreamerWarsTeamsTable.findFirst({
                where: eq(StreamerWarsTeamsTable.color, team)
            }).then((data) => data?.id!);

            // Verificar si el equipo ya tiene un capitán
            const existingCaptain = await client.query.StreamerWarsTeamPlayersTable.findFirst({
                where: and(
                    eq(StreamerWarsTeamPlayersTable.teamId, teamId),
                    eq(StreamerWarsTeamPlayersTable.isCaptain, true)
                )
            });

            // Si hay un capitán, lo actualizamos para que ya no sea capitán
            if (existingCaptain) {
                await client.update(StreamerWarsTeamPlayersTable)
                    .set({ isCaptain: false })
                    .where(eq(StreamerWarsTeamPlayersTable.id, existingCaptain.id))
            }

            // Asignar el nuevo capitán
            await client.update(StreamerWarsTeamPlayersTable)
                .set({ isCaptain: true })
                .where(and(
                    eq(StreamerWarsTeamPlayersTable.playerNumber, playerNumber),
                    eq(StreamerWarsTeamPlayersTable.teamId, teamId)
                ));

            await pusher.trigger("streamer-wars", "player-joined", null);
            await pusher.trigger("streamer-wars", "captain-assigned", { playerNumber, team });
            return { success: true }
        }
    }),
    removeTeamCaptain: defineAction({
        input: z.object({
            team: z.string(),
        }),
        handler: async ({ team }, { request }) => {
            const session = await getSession(request);

            if (!session || !session.user.isAdmin) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "No tienes permisos para remover capitanes"
                });
            }

            const teamId = await client.query.StreamerWarsTeamsTable.findFirst({
                where: eq(StreamerWarsTeamsTable.color, team)
            }).then((data) => data?.id!);

            // Verificar si el equipo ya tiene un capitán
            const existingCaptain = await client.query.StreamerWarsTeamPlayersTable.findFirst({
                where: and(
                    eq(StreamerWarsTeamPlayersTable.teamId, teamId),
                    eq(StreamerWarsTeamPlayersTable.isCaptain, true)
                )
            });

            if (!existingCaptain) {
                throw new ActionError({
                    code: "BAD_REQUEST",
                    message: "El equipo no tiene capitán"
                });
            }

            // Remover el capitán
            await client.update(StreamerWarsTeamPlayersTable)
                .set({ isCaptain: false })
                .where(eq(StreamerWarsTeamPlayersTable.id, existingCaptain.id));

            await pusher.trigger("streamer-wars", "player-joined", null);
            return { success: true }
        }
    }),
    resetTeams: defineAction({
        handler: async (_, { request }) => {
            const session = await getSession(request);

            if (!session || !session.user.isAdmin) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "No tienes permisos para reiniciar los equipos"
                });
            }

            /* 
                Resetear los equipos implica:
                - Eliminar todos los jugadores de los equipos
                - Eliminar los roles en Discord
            */

            await client.delete(StreamerWarsTeamPlayersTable).execute();



            return { success: true }
        }
    }),
    techDifficulties: defineAction({
        handler: async (_, { request }) => {
            const session = await getSession(request);

            if (!session || !session.user.isAdmin) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "No tienes permisos para enviar mensajes de dificultades técnicas"
                });
            }
            const message = "¡Dificultades técnicas! Estamos trabajando para solucionar el problema";
            await client
                .insert(StreamerWarsChatMessagesTable)
                .values({ userId: session.user.id, message, isAnnouncement: true })
                .execute();

            await pusher.trigger("streamer-wars", "tech-difficulties", null);
            await pusher.trigger("streamer-wars", "new-message", { message, type: "announcement", suppressAudio: true });

            return { success: true }
        }
    }),
    removePlayerFromTeam: defineAction({
        input: z.object({
            playerNumber: z.number(),
        }),
        handler: async ({ playerNumber }, { request }) => {
            const session = await getSession(request);

            if (!session || !session.user.isAdmin) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "No tienes permisos para remover jugadores de equipos"
                });
            }

            const { success, error } = await removePlayerFromTeam(playerNumber);
            if (!success) {
                throw new ActionError({
                    code: "BAD_REQUEST",
                    message: error
                });
            }

            return { success: true }
        }
    }),
    resetRoles: defineAction({
        handler: async (_, { request }) => {
            const session = await getSession(request);

            if (!session || !session.user.isAdmin) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "No tienes permisos para reiniciar los roles"
                });
            }

            await resetRoles();

            /* 
                Resetear los roles implica:
                - Eliminar todos los roles en Discord
            */

            return { success: true }
        }
    }),

}