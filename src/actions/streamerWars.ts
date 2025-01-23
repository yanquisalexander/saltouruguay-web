import { eliminatePlayer } from "@/utils/streamer-wars";
import { ActionError, defineAction } from "astro:actions";
import { z } from "astro:schema";
import { getSession } from "auth-astro/server";

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
    })
}