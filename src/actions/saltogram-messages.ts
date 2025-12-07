import { defineAction, ActionError } from "astro:actions";
import { z } from "astro:schema";
import { getSession } from "auth-astro/server";
import { client } from "@/db/client";
import { SaltogramMessagesTable, SaltogramStoriesTable } from "@/db/schema";
import { eq, and, or, desc } from "drizzle-orm";

export const messages = {
    send: defineAction({
        input: z.object({
            receiverId: z.number(),
            content: z.string().optional(),
            storyId: z.number().optional(),
            reaction: z.string().optional(),
        }),
        handler: async ({ receiverId, content, storyId, reaction }, { request }) => {
            const session = await getSession(request);
            if (!session?.user?.id) {
                throw new ActionError({ code: "UNAUTHORIZED", message: "Debes iniciar sesión" });
            }

            const senderId = Number(session.user.id);

            if (!content && !reaction) {
                throw new ActionError({ code: "BAD_REQUEST", message: "El mensaje debe tener contenido o reacción" });
            }

            await client.insert(SaltogramMessagesTable)
                .values({
                    senderId,
                    receiverId,
                    content,
                    storyId,
                    reaction
                });

            return { success: true };
        }
    }),

    getConversation: defineAction({
        input: z.object({
            otherUserId: z.number(),
        }),
        handler: async ({ otherUserId }, { request }) => {
            const session = await getSession(request);
            if (!session?.user?.id) {
                throw new ActionError({ code: "UNAUTHORIZED", message: "Debes iniciar sesión" });
            }

            const userId = Number(session.user.id);

            const messages = await client.query.SaltogramMessagesTable.findMany({
                where: or(
                    and(eq(SaltogramMessagesTable.senderId, userId), eq(SaltogramMessagesTable.receiverId, otherUserId)),
                    and(eq(SaltogramMessagesTable.senderId, otherUserId), eq(SaltogramMessagesTable.receiverId, userId))
                ),
                orderBy: [desc(SaltogramMessagesTable.createdAt)],
                with: {
                    story: true
                },
                limit: 50
            });

            return { messages: messages.reverse() };
        }
    }),

    getInbox: defineAction({
        handler: async (_, { request }) => {
            const session = await getSession(request);
            if (!session?.user?.id) {
                return { conversations: [] };
            }

            const userId = Number(session.user.id);

            // Fetch all messages involving the user
            const allMessages = await client.query.SaltogramMessagesTable.findMany({
                where: or(
                    eq(SaltogramMessagesTable.senderId, userId),
                    eq(SaltogramMessagesTable.receiverId, userId)
                ),
                orderBy: [desc(SaltogramMessagesTable.createdAt)],
                with: {
                    sender: true,
                    receiver: true
                }
            });

            // Group by conversation partner
            const conversationsMap = new Map();

            for (const msg of allMessages) {
                const otherUser = msg.senderId === userId ? msg.receiver : msg.sender;
                const otherUserId = otherUser.id;

                if (!conversationsMap.has(otherUserId)) {
                    conversationsMap.set(otherUserId, {
                        user: otherUser,
                        lastMessage: msg,
                        unreadCount: (msg.receiverId === userId && !msg.isRead) ? 1 : 0
                    });
                } else {
                    const conv = conversationsMap.get(otherUserId);
                    if (msg.receiverId === userId && !msg.isRead) {
                        conv.unreadCount++;
                    }
                }
            }

            return { conversations: Array.from(conversationsMap.values()) };
        }
    })
};
