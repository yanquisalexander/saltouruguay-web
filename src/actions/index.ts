import { CATEGORIES } from "@/awards/Categories";
import { NOMINEES } from "@/awards/Nominees";
import { IS_VOTES_OPEN, VOTES_OPEN_TIMESTAMP } from "@/config";
import type { MemberCardSkins } from "@/consts/MemberCardSkins";
import { submitVotes } from "@/utils/awards-vote-system";
import { updateCardSkin, updateStickers } from "@/utils/user";
import { ActionError, defineAction } from "astro:actions";
import { z } from "astro:schema";
import { getSession } from "auth-astro/server";

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

            const categories = Object.keys(CATEGORIES);
            for (const categoryId of categories) {
                if (!votes[categoryId] || votes[categoryId].length === 0) {
                    throw new ActionError({
                        code: "BAD_REQUEST",
                        message: `Debe haber al menos un voto en la categoría: ${CATEGORIES.find(c => c.id === categoryId)?.name || 'desconocida'}`
                    });
                }
            }


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
    })
}