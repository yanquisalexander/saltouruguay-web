import { IS_VOTES_OPEN, VOTES_OPEN_TIMESTAMP } from "@/config";
import { submitVotes } from "@/utils/awards-vote-system";
import { updateStickers } from "@/utils/user";
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

            if (!IS_VOTES_OPEN) {
                const openDate = new Date(VOTES_OPEN_TIMESTAMP)
                throw new ActionError({
                    code: "PRECONDITION_FAILED",
                    message: `La votación está cerrada, se abrirá el ${openDate.toLocaleDateString()} a las ${openDate.toLocaleTimeString()}`

                })
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
}