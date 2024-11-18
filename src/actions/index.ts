import { ActionError, defineAction } from "astro:actions";
import { z } from "astro:schema";
import { getSession } from "auth-astro/server";

export const server = {
    sendVotes: defineAction({
        input: z.object({
            votes: z.record(z.array(z.object({
                nomineeId: z.string(),
                categoryId: z.string(),
            }))),
        }),
        handler: async ({ votes }, { request }) => {
            console.log({ votes })
            await new Promise(resolve => setTimeout(resolve, 2000))
            const session = await getSession(request)
            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Debes iniciar sesión para votar"
                })
            }

            console.log("Enviando votos al servidor...")
            console.log(votes)
            console.log("Votos enviados")
        }
    })
}