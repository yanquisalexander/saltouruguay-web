import { CINEMATICS_CDN_PREFIX } from "@/config";
import { client } from "@/db/client";
import { StreamerWarsChatMessagesTable, StreamerWarsTeamPlayersTable, StreamerWarsTeamsTable } from "@/db/schema";
import Cache from "@/lib/Cache";
import cacheService from "@/services/cache";
import { pusher } from "@/utils/pusher";
import { eliminatePlayer, removePlayer, addPlayer, revivePlayer, getUserIdsOfPlayers, joinTeam, removePlayerFromTeam, resetRoles, acceptBribe, selfEliminate, aislatePlayer, unaislatePlayer, beforeLaunchGame, unaislateAllPlayers, getPlayersLiveOnTwitch, massEliminatePlayers, getAutoEliminatedPlayers, getTodayEliminatedPlayers } from "@/utils/streamer-wars";
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
    revivePlayer: defineAction({
        input: z.object({
            playerNumber: z.number(),
        }),
        handler: async ({ playerNumber }, { request }) => {
            const session = await getSession(request);

            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Debes iniciar sesión para revivir jugadores"
                })
            }

            await revivePlayer(playerNumber);
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
                const isChatLocked = await cacheService.create({ ttl: 60 * 60 * 24 }).get("streamer-wars-chat-locked") as boolean;
                if (isChatLocked) {
                    throw new ActionError({
                        code: "BAD_REQUEST",
                        message: "El chat está bloqueado"
                    })
                }
            } catch (error) {
                console.error(`Error getting chat lock status: ${error}`);
            }

            try {
                const [{ id }] = await client
                    .insert(StreamerWarsChatMessagesTable)
                    .values({ userId: session.user.id, message })
                    .returning({ id: StreamerWarsChatMessagesTable.id })
                    .execute()


                await pusher.trigger("streamer-wars", "new-message", { id, message, user: session.user.name, admin: session.user.isAdmin });
            } catch (error) {
                throw new ActionError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Error al enviar mensaje"
                })
            }
            return { success: true }
        }
    }),
    deleteMessage: defineAction({
        input: z.object({
            messageId: z.number(),
        }),
        handler: async ({ messageId }, { request }) => {
            const session = await getSession(request);

            if (!session || !session.user.isAdmin) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "No tienes permisos para eliminar mensajes"
                })
            }

            await client.delete(StreamerWarsChatMessagesTable).where(eq(StreamerWarsChatMessagesTable.id, messageId)).execute();
            await pusher.trigger("streamer-wars", "message-deleted", { messageId });
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
                    id: true,
                    message: true,
                    isAnnouncement: true,
                },
                with: {
                    user: {
                        columns: {
                            username: true,
                            admin: true,
                            displayName: true
                        }
                    }
                }
            }).execute().then((data) => data.map(({ id, user, message, isAnnouncement }) => ({
                id,
                user: user?.displayName || user?.username,
                message,
                isAnnouncement,
                admin: user?.admin
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

                await pusher.trigger("streamer-wars", "new-announcement", { message });
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
                    aislated: true
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
            }).execute().then((data) => data.map(({ playerNumber, user, eliminated, aislated }) => ({
                playerNumber,
                avatar: user?.avatar,
                displayName: user?.displayName,
                admin: user?.admin,
                id: user?.id,
                eliminated,
                aislated,
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
            /* await pusher.trigger("cinematic-player", "new-event", {
                targetUsers: await getUserIdsOfPlayers(),
                videoUrl: `${CINEMATICS_CDN_PREFIX}/cinematica-jornada-guerra.mp4`
            }) */

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

            /*  await pusher.trigger('cinematic-player', 'new-event', {
                 targetUsers: userIds,
                 videoUrl: 'url',
             }); */

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

            try {
                await beforeLaunchGame();

            } catch (error) {
                console.error(`Error executing pre-launch game actions: ${error}`);
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

            await pusher.trigger("streamer-wars", "clear-chat", null);

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

            await pusher.trigger("streamer-wars", "player-joined", { playerNumber, avatar: session.user.image!, displayName: session.user.name, team, isCaptain: true });
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

            await pusher.trigger("streamer-wars", "player-joined", { playerNumber: existingCaptain.playerNumber, avatar: session.user.image!, displayName: session.user.name, team, isCaptain: false });
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
            const message = "En este momento estamos experimentando dificultades técnicas. Por favor, esperen"
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
    acceptBribe: defineAction({
        handler: async (_, { request }) => {
            const session = await getSession(request);

            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Debes iniciar sesión para aceptar sobornos"
                });
            }
            const { success, error } = await acceptBribe(session.user.streamerWarsPlayerNumber!);
            if (!success) {
                throw new ActionError({
                    code: "BAD_REQUEST",
                    message: error
                });
            }

            return { success: true }
        }
    }),
    selfEliminate: defineAction({
        handler: async (_, { request }) => {
            const session = await getSession(request);

            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Debes iniciar sesión para autoeliminarte"
                });
            }
            const { success, error } = await selfEliminate(session.user.streamerWarsPlayerNumber!);
            if (!success) {
                throw new ActionError({
                    code: "BAD_REQUEST",
                    message: error
                });
            }

            return { success: true }
        }
    }),
    getAutoEliminatedPlayers: defineAction({
        handler: async (_, { request }) => {
            const session = await getSession(request);

            if (!session || !session.user.isAdmin) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "No tienes permisos para ver los jugadores autoeliminados"
                });
            }

            const autoEliminatedPlayers = await getAutoEliminatedPlayers() ?? [];

            return { autoEliminatedPlayers }
        }
    }),
    addPlayer: defineAction({
        input: z.object({
            playerNumber: z.number(),
            twitchUsername: z.string(),
        }),
        handler: async ({ playerNumber, twitchUsername }, { request }) => {
            const session = await getSession(request);

            if (!session || !session.user.isAdmin) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "No tienes permisos para añadir jugadores"
                });
            }

            const { success, error } = await addPlayer({ playerNumber, twitchUsername });
            if (!success) {
                throw new ActionError({
                    code: "BAD_REQUEST",
                    message: error
                });
            }

            return { success: true }
        }
    }),
    removePlayer: defineAction({
        input: z.object({
            playerNumber: z.number(),
        }),
        handler: async ({ playerNumber }, { request }) => {
            const session = await getSession(request);

            if (!session || !session.user.isAdmin) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "No tienes permisos para eliminar jugadores"
                });
            }

            const { success, error } = await removePlayer(playerNumber);
            if (!success) {
                throw new ActionError({
                    code: "BAD_REQUEST",
                    message: error
                });
            }

            return { success: true }
        }
    }),
    notifyNewVersion: defineAction({
        handler: async (_, { request }) => {
            const session = await getSession(request);

            if (!session || session.user.name!.toLowerCase() !== "alexitoo_uy") {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "No tienes permisos para notificar nueva versión"
                });
            }

            await pusher.trigger("streamer-wars", "new-version", null);
            return { success: true }
        }
    }),
    aislatePlayer: defineAction({
        input: z.object({
            playerNumber: z.number(),
        }),
        handler: async ({ playerNumber }, { request }) => {
            const session = await getSession(request);

            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Debes iniciar sesión para aislar jugadores"
                });
            }

            const { success, error } = await aislatePlayer(playerNumber);
            if (!success) {
                throw new ActionError({
                    code: "BAD_REQUEST",
                    message: error
                });
            }

            return { success: true }
        }
    }),
    unaislatePlayer: defineAction({
        input: z.object({
            playerNumber: z.number(),
        }),
        handler: async ({ playerNumber }, { request }) => {
            const session = await getSession(request);

            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Debes iniciar sesión para aislar jugadores"
                });
            }

            const { success, error } = await unaislatePlayer(playerNumber);
            if (!success) {
                throw new ActionError({
                    code: "BAD_REQUEST",
                    message: error
                });
            }

            return { success: true }
        }
    }),
    unaislateAllPlayers: defineAction({
        handler: async (_, { request }) => {
            const session = await getSession(request);

            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Debes iniciar sesión para aislar jugadores"
                });
            }

            const { success, error } = await unaislateAllPlayers();
            if (!success) {
                throw new ActionError({
                    code: "BAD_REQUEST",
                    message: error
                });
            }

            return { success: true }
        }
    }),
    getPlayersLiveOnTwitch: defineAction({
        handler: async (_, { request }) => {
            const session = await getSession(request);

            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Debes iniciar sesión para ver los jugadores en vivo"
                });
            }

            const players = await getPlayersLiveOnTwitch();

            return players.map(({ userName }) => userName);
        }
    }),
    massEliminatePlayers: defineAction({
        input: z.object({
            playerNumbers: z.array(z.number()),
        }),
        handler: async ({ playerNumbers }, { request }) => {
            const session = await getSession(request);

            if (!session || !session.user.isAdmin) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "No tienes permisos para eliminar jugadores"
                });
            }

            try {
                await massEliminatePlayers(playerNumbers);
                return { success: true }
            } catch (error) {
                throw new ActionError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Error al eliminar jugadores"
                });
            }
        }
    }),
    reloadOverlay: defineAction({
        handler: async (_, { request }) => {
            const session = await getSession(request);

            if (!session || !session.user.isAdmin) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "No tienes permisos para recargar el overlay"
                });
            }

            await pusher.trigger("streamer-wars", "reload-overlay", null);
            return { success: true }
        }
    }),
    reloadForUser: defineAction({
        input: z.object({
            playerNumber: z.number(),
        }),
        handler: async ({ playerNumber }, { request }) => {
            const session = await getSession(request);

            if (!session || !session.user.isAdmin) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "No tienes permisos para recargar el navegador de un jugador"
                });
            }

            await pusher.trigger("streamer-wars", "reload-for-user", { playerNumber });
            return { success: true }
        }
    }),
    getTodayEliminatedPlayers: defineAction({
        handler: async (_, { request }) => {
            const session = await getSession(request);



            const todayEliminatedPlayers = await getTodayEliminatedPlayers() ?? [];

            return { todayEliminatedPlayers }
        }
    }),
    lockChat: defineAction({
        handler: async (_, { request }) => {
            const session = await getSession(request);

            if (!session || !session.user.isAdmin) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "No tienes permisos para bloquear el chat"
                });
            }

            const cache = cacheService.create({ ttl: 60 * 60 * 24 });
            await cache.set("streamer-wars-chat-locked", true);
            await pusher.trigger("streamer-wars", "lock-chat", null);
            return { success: true }
        }
    }),
    unlockChat: defineAction({
        handler: async (_, { request }) => {
            const session = await getSession(request);

            if (!session || !session.user.isAdmin) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "No tienes permisos para desbloquear el chat"
                });
            }

            const cache = cacheService.create({ ttl: 60 * 60 * 24 });
            await cache.set("streamer-wars-chat-locked", false);
            await pusher.trigger("streamer-wars", "unlock-chat", null);
            return { success: true }
        }
    }),
    getChatLockStatus: defineAction({
        handler: async (_, { request }) => {
            const session = await getSession(request);

            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Debes iniciar sesión para ver el estado del chat"
                });
            }

            const cache = cacheService.create({ ttl: 60 * 60 * 24 });
            const chatLocked = await cache.get("streamer-wars-chat-locked") as boolean;

            return chatLocked
        }
    }),
}