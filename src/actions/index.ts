import { CATEGORIES } from "@/awards/Categories";
import { NOMINEES } from "@/awards/Nominees";
import { IS_VOTES_OPEN, SALTO_DISCORD_GUILD_ID, VOTES_OPEN_TIMESTAMP } from "@/config";
import type { MemberCardSkins } from "@/consts/MemberCardSkins";
import { client } from "@/db/client";
import { DebateAnonymousMessagesTable, NegativeVotesStreamersTable, SaltoCraftExtremo3InscriptionsTable, StreamerWarsInscriptionsTable, StreamerWarsPlayersTable, UserSuspensionsTable, Extremo3PlayersTable, Extremo3RepechajeVotesTable } from "@/db/schema";
import { submitVotes } from "@/utils/awards-vote-system";
import { pusher } from "@/utils/pusher";
import { updateCardSkin, updateStickers } from "@/utils/user";
import { ActionError, defineAction } from "astro:actions";
import { z } from "astro:schema";
import { getSession } from "auth-astro/server";
import { count, eq, sql } from "drizzle-orm";
import { users } from "./admin/users";
import { streamerWars } from "./streamerWars";
import { games } from "./games";
import { oauth } from "./users/oauth";
import { twoFactor } from "./users/two-factor";
import { serverTools } from "./admin/serverTools";
import { customPages } from "./admin/customPages";
import { events } from "./admin/events";
import { events as userEvents } from "./events";
import { sendNotificationEmail } from "@/utils/email";
import { experimental_AstroContainer } from "astro/container";
import InscripcionExtremo from "@/email/InscripcionExtremo.astro";
import { addRoleToUserWithoutLogging } from "@/services/discord";
import { audio } from "./audio";
import { voice } from "./voice";
export const server = {
    userEvents,
    sendVotes: defineAction({
        input: z.object({
            votes: z.record(z.array(z.object({
                nomineeId: z.string(),
                categoryId: z.string(),
            })).max(2))
        }),
        handler: async ({ votes }, { request }) => {
            await new Promise(resolve => setTimeout(resolve, 2000))
            const session = await getSession(request)
            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Debes iniciar sesión para votar"
                })
            }

            if (!IS_VOTES_OPEN()) {
                const openDate = new Date(VOTES_OPEN_TIMESTAMP)
                throw new ActionError({
                    code: "PRECONDITION_FAILED",
                    message: `La votación está cerrada, se abrirá el ${openDate.toLocaleDateString('es-UY', { dateStyle: 'full', timeZone: 'America/Montevideo' })}
                    a las ${openDate.toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'America/Montevideo' })}`

                })
            }

            /* 
                Verificar que haya al menos un voto en cada categoría
            */
            /*
            const categories = Object.keys(CATEGORIES);
            for (const categoryId of categories) {
                if (!votes[categoryId] || votes[categoryId].length === 0) {
                    throw new ActionError({
                        code: "BAD_REQUEST",
                        message: `Debe haber al menos un voto en la categoría: ${CATEGORIES.find(c => c.id === categoryId)?.name || 'desconocida'}`
                    });
                }
            } */


            try {
                await submitVotes(votes, session.user)
                return { success: true }
            } catch (error) {
                throw new ActionError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: "Error al enviar los votos"
                })
            }
        }
    }),
    updateStickers: defineAction({
        input: z.object({
            stickers: z.array(z.string().nullable())
        }),
        handler: async ({ stickers }, { request }) => {
            const session = await getSession(request)

            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Debes iniciar sesión para actualizar tus stickers"
                })
            }

            await updateStickers(session.user.id, stickers as string[])
            return { success: true }
        }
    }),
    updateMemberCardSkin: defineAction({
        input: z.object({
            skin: z.string()
        }),
        handler: async ({ skin }, { request }) => {
            const session = await getSession(request)

            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Debes iniciar sesión para actualizar tu skin"
                })
            }

            await updateCardSkin(session.user.id, skin as typeof MemberCardSkins[number]['id'])
            return { success: true }
        }
    }),
    addDebateOpinion: defineAction({
        input: z.object({
            message: z.string().min(1).max(500),
        }),
        handler: async ({ message }, { request }) => {
            const session = await getSession(request)

            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Debes iniciar sesión para enviar tu opinión"
                })
            }

            try {
                await client
                    .insert(DebateAnonymousMessagesTable)
                    .values({ userId: session.user.id, message })
                    .execute();
                return { success: true }
            } catch (error) {
                throw new ActionError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: "Error al enviar la opinión"
                })
            }
        }

    }),
    approveDebateOpinion: defineAction({
        input: z.object({
            opinionId: z.number()
        }),
        handler: async ({ opinionId }, { request }) => {
            const session = await getSession(request)

            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Debes iniciar sesión para aprobar opiniones"
                })
            }

            if (!session.user.isAdmin) {
                throw new ActionError({
                    code: "FORBIDDEN",
                    message: "No tienes permisos para aprobar opiniones"
                })
            }

            try {
                await client
                    .update(DebateAnonymousMessagesTable)
                    .set({ approvedAt: new Date() })
                    .where(eq(DebateAnonymousMessagesTable.id, opinionId))
                    .execute();

                await pusher.trigger('admins', 'approved-opinion', { opinionId })
                return { success: true }
            } catch (error) {
                throw new ActionError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: "Error al aprobar la opinión"
                })
            }
        }
    }),
    pinDebateOpinion: defineAction({
        input: z.object({
            opinionId: z.number()
        }),
        handler: async ({ opinionId }, { request }) => {
            const session = await getSession(request)

            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Debes iniciar sesión para pinear opiniones"
                })
            }

            if (!session.user.isAdmin) {
                throw new ActionError({
                    code: "FORBIDDEN",
                    message: "No tienes permisos para pinear opiniones"
                })
            }

            try {
                await pusher.trigger('debate', 'pin-debate-message', { opinionId })
                return { success: true }
            } catch (error) {
                throw new ActionError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: "Error al pinear la opinión"
                })
            }
        }
    }),
    getDebateMessageById: defineAction({
        input: z.object({
            opinionId: z.number()
        }),
        handler: async ({ opinionId }) => {
            const opinion = await client
                .select()
                .from(DebateAnonymousMessagesTable)
                .where(eq(DebateAnonymousMessagesTable.id, opinionId))
                .execute();

            if (!opinion.length) {
                throw new ActionError({
                    code: 'NOT_FOUND',
                    message: "Opinión no encontrada"
                })
            }

            return { opinion: opinion[0] }
        }
    }),
    inscribeToStreamerWars: defineAction({
        input: z.object({
            discordUsername: z.string(),
            acceptedTerms: z.boolean()
        }),
        handler: async ({ discordUsername, acceptedTerms }, { request }) => {
            const session = await getSession(request)

            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Debes iniciar sesión para inscribirte a Guerra de Streamers"
                })
            }

            if (!acceptedTerms) {
                throw new ActionError({
                    code: "BAD_REQUEST",
                    message: "Debes aceptar los términos y condiciones para inscribirte a Guerra de Streamers"
                })
            }

            await client.insert(StreamerWarsInscriptionsTable)
                .values(
                    {
                        userId: session.user.id,
                        acceptedTerms,
                        discordUsername
                    }
                )
                .onConflictDoNothing()
                .execute()

            return { success: true }

        }
    }),
    inscribeToSaltoCraftExtremo3: defineAction({
        input: z.object({
            acceptedTerms: z.boolean(),
            discordUsername: z.string().min(1).max(50),
            instagram: z.string().min(1),
            participated_sc: z.enum(["si", "no"]),
            minecraft_username: z.string().min(1),
            team_status: z.enum(["tengo", "buscare"]).default("buscare").optional(),
            content_channel: z.string().url().optional().or(z.literal("").optional()),
        }),
        handler: async (
            {
                acceptedTerms,
                discordUsername,
                instagram,
                participated_sc,
                minecraft_username,
                team_status,
                content_channel
            },
            { request }
        ) => {
            const session = await getSession(request)

            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Debes iniciar sesión para inscribirte a SaltoCraft Extremo 3"
                })
            }

            if (!acceptedTerms) {
                throw new ActionError({
                    code: "BAD_REQUEST",
                    message: "Debes aceptar los términos y condiciones para inscribirte a SaltoCraft Extremo 3"
                })
            }



            await client.insert(SaltoCraftExtremo3InscriptionsTable)
                .values({
                    userId: session.user.id,
                    acceptedTerms,
                    discordUsername,
                    instagram,
                    participated_sc,
                    minecraft_username,
                    team_status,
                    content_channel: content_channel || null
                })
                .onConflictDoNothing()
                .execute()

            try {
                const container = await experimental_AstroContainer.create()
                const emailBody = await container.renderToString(InscripcionExtremo)
                await sendNotificationEmail(session.user.email!, "Inscripción SaltoCraft Extremo 3", emailBody)
            } catch (error) {
                console.error("Error sending inscription email:", error)
            }

            // Try to add role on Discord

            try {
                await addRoleToUserWithoutLogging(SALTO_DISCORD_GUILD_ID, session.user.discordId!, "1283086442842554521")
            } catch {
                console.error("Error adding role on Discord")
            }



            return { success: true }
        }
    }),
    admin: {
        users,
        serverTools,
        customPages,
        events,
        launchCinematic: defineAction({
            input: z.object({
                url: z.string().url(),
                targetUsers: z.array(z.number()).default([]),
            }),
            handler: async ({ url, targetUsers }, { request }) => {
                const session = await getSession(request);

                // Verificar si el usuario está autenticado
                if (!session) {
                    throw new ActionError({
                        code: "UNAUTHORIZED",
                        message: "Debes iniciar sesión para lanzar cinemáticas",
                    });
                }

                // Verificar si el usuario tiene permisos de administrador
                if (!session.user.isAdmin) {
                    throw new ActionError({
                        code: "FORBIDDEN",
                        message: "No tienes permisos para lanzar cinemáticas",
                    });
                }

                // Verificar si se proporcionó una URL válida
                if (!url) {
                    throw new ActionError({
                        code: "BAD_REQUEST",
                        message: "Debes proporcionar una URL para lanzar la cinemática",
                    });
                }

                const finalTargetUsers = targetUsers.length > 0 ? targetUsers : "everyone";

                // Enviar evento a través de Pusher
                await pusher.trigger('cinematic-player', 'new-event', {
                    targetUsers: finalTargetUsers,
                    videoUrl: url,
                });

                return { success: true };
            },
        }),
        updateExtremoPlayer: defineAction({
            input: z.object({
                playerId: z.number(),
                livesCount: z.number().min(0).max(3).optional(),
                isConfirmedPlayer: z.boolean().optional(),
                isRepechaje: z.boolean().optional(),
                minecraft_username: z.string().optional(),
            }),
            handler: async ({ playerId, livesCount, isConfirmedPlayer, isRepechaje, minecraft_username }, { request }) => {
                const session = await getSession(request);

                if (!session) {
                    throw new ActionError({
                        code: "UNAUTHORIZED",
                        message: "Debes iniciar sesión para actualizar jugadores",
                    });
                }

                if (!session.user.isAdmin) {
                    throw new ActionError({
                        code: "FORBIDDEN",
                        message: "No tienes permisos para actualizar jugadores",
                    });
                }

                // Solo actualizar los campos que se hayan enviado
                const updateData: any = {
                    updatedAt: new Date(),
                };

                if (livesCount !== undefined) {
                    updateData.livesCount = livesCount;
                }

                if (isConfirmedPlayer !== undefined) {
                    updateData.isConfirmedPlayer = isConfirmedPlayer;
                }

                if (isRepechaje !== undefined) {
                    updateData.isRepechaje = isRepechaje;
                }

                await client
                    .update(Extremo3PlayersTable)
                    .set(updateData)
                    .where(eq(Extremo3PlayersTable.id, playerId))
                    .execute();

                // Actualizar minecraft_username en la tabla de inscripciones si se proporcionó
                if (minecraft_username !== undefined) {
                    const player = await client
                        .select({ inscriptionId: Extremo3PlayersTable.inscriptionId })
                        .from(Extremo3PlayersTable)
                        .where(eq(Extremo3PlayersTable.id, playerId))
                        .execute();

                    if (player.length > 0 && player[0].inscriptionId) {
                        await client
                            .update(SaltoCraftExtremo3InscriptionsTable)
                            .set({ minecraft_username })
                            .where(eq(SaltoCraftExtremo3InscriptionsTable.id, player[0].inscriptionId))
                            .execute();
                    }
                }

                return { success: true };
            },
        }),
        voteExtremoRepechaje: defineAction({
            input: z.object({
                playerId: z.number(),
            }),
            handler: async ({ playerId }, { request }) => {
                const session = await getSession(request);

                if (!session) {
                    throw new ActionError({
                        code: "UNAUTHORIZED",
                        message: "Debes iniciar sesión para votar en repechaje",
                    });
                }

                // Verificar si el player está en repechaje
                const player = await client
                    .select()
                    .from(Extremo3PlayersTable)
                    .where(eq(Extremo3PlayersTable.id, playerId))
                    .execute();

                if (player.length === 0 || !player[0].isRepechaje) {
                    throw new ActionError({
                        code: "BAD_REQUEST",
                        message: "El jugador no está en repechaje",
                    });
                }

                // Verificar si ya votó
                const existingVote = await client
                    .select()
                    .from(Extremo3RepechajeVotesTable)
                    .where(eq(Extremo3RepechajeVotesTable.userId, session.user.id))
                    .execute();

                if (existingVote.length > 0) {
                    throw new ActionError({
                        code: "BAD_REQUEST",
                        message: "Ya has votado en repechaje",
                    });
                }

                // Insertar voto
                await client
                    .insert(Extremo3RepechajeVotesTable)
                    .values({
                        userId: session.user.id,
                        playerId,
                    })
                    .execute();

                return { success: true };
            },
        })
    },
    streamerWars,
    games,
    voteToExpulsePlayer: defineAction({
        input: z.object({
            playerNumber: z.number(),
        }),
        handler: async ({ playerNumber }, { request }) => {
            const session = await getSession(request);

            // Verificar si el usuario está autenticado
            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Debes iniciar sesión para votar por un jugador a expulsar",
                });
            }

            // Verificar si el usuario ya votó a alguien
            const hasVoted = await client
                .select()
                .from(NegativeVotesStreamersTable)
                .where(eq(NegativeVotesStreamersTable.userId, session.user.id))
                .execute();

            if (hasVoted.length > 0) {
                throw new ActionError({
                    code: "BAD_REQUEST",
                    message: "Ya has votado por un jugador a expulsar",
                });
            }

            // Verificar si el jugador existe
            const player = await client
                .select()
                .from(StreamerWarsPlayersTable)
                .where(eq(StreamerWarsPlayersTable.playerNumber, playerNumber))
                .execute();

            if (player.length === 0) {
                throw new ActionError({
                    code: "BAD_REQUEST",
                    message: "El jugador no existe",
                });
            }

            // Votar por el jugador
            await client
                .insert(NegativeVotesStreamersTable)
                .values({
                    userId: session.user.id,
                    playerNumber,
                })
                .execute();


            return { success: true };
        },
    }),
    sendAppelation: defineAction({
        input: z.object({
            message: z.string().min(1).max(500),
        }),
        handler: async ({ message }, { request }) => {
            const session = await getSession(request);
            if (!session) throw new ActionError({ code: "UNAUTHORIZED", message: "Debes iniciar sesión para enviar tu apelación" });

            try {
                // Obtener la suspensión del usuario
                const suspension = await client
                    .select()
                    .from(UserSuspensionsTable)
                    .where(eq(UserSuspensionsTable.userId, session.user.id))
                    .execute()
                    .then((suspensions) => suspensions[0]);

                if (!suspension) throw new ActionError({ code: 'NOT_FOUND', message: "Suspensión no encontrada" });

                // Registrar la apelación
                await client
                    .update(UserSuspensionsTable)
                    .set({ appealMessage: message, appealDate: new Date() })
                    .where(eq(UserSuspensionsTable.id, suspension.id))
                    .execute();

            } catch (error) {
                throw new ActionError({ code: "INTERNAL_SERVER_ERROR", message: "Error al enviar la apelación" });
            }
        },
    }),
    audio,
    voice,
    users: {
        oauth,
        twoFactor
    }
}