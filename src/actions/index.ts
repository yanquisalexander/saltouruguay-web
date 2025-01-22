import { CATEGORIES } from "@/awards/Categories";
import { NOMINEES } from "@/awards/Nominees";
import { IS_VOTES_OPEN, VOTES_OPEN_TIMESTAMP } from "@/config";
import type { MemberCardSkins } from "@/consts/MemberCardSkins";
import { client } from "@/db/client";
import { DebateAnonymousMessagesTable, StreamerWarsInscriptionsTable } from "@/db/schema";
import { submitVotes } from "@/utils/awards-vote-system";
import { pusher } from "@/utils/pusher";
import { updateCardSkin, updateStickers } from "@/utils/user";
import { ActionError, defineAction } from "astro:actions";
import { z } from "astro:schema";
import { getSession } from "auth-astro/server";
import { eq } from "drizzle-orm";
import { users } from "./admin/users";

export const server = {
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
    admin: {
        users
    }
}