import { submitVotes } from "@/utils/awards-vote-system";
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
    })
}