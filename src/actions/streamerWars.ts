import { client } from "@/db/client";
import { StreamerWarsChatMessagesTable } from "@/db/schema";
import { pusher } from "@/utils/pusher";
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
    }),
    sendMessage: defineAction({
        input: z.object({
            message: z.string().min(1).max(500),
        }),
        handler: async ({ message }, { request }) => {
            const session = await getSession(request);

            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Debes iniciar sesión para enviar mensajes"
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
                },
                with: {
                    user: {
                        columns: {
                            username: true,
                        }
                    }
                }
            }).execute().then((data) => data.map(({ user, message }) => ({ user: user?.username as string, message })))

            return { messages }
        }
    })
}