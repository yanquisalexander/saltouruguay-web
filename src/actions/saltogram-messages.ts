import { defineAction, ActionError } from "astro:actions";
import { z } from "astro:schema";
import { getAuthenticatedUser } from "@/lib/auth";
import { client } from "@/db/client";
import { SaltogramMessagesTable, SaltogramStoriesTable, UsersTable } from "@/db/schema";
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
            const auth = await getAuthenticatedUser(request);
            if (!auth) {
                throw new ActionError({ code: "UNAUTHORIZED", message: "Debes iniciar sesión" });
            }

            const senderId = auth.user.id;

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
            const auth = await getAuthenticatedUser(request);
            if (!auth) {
                throw new ActionError({ code: "UNAUTHORIZED", message: "Debes iniciar sesión" });
            }

            const userId = auth.user.id;

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

            const partner = await client.query.UsersTable.findFirst({
                where: eq(UsersTable.id, otherUserId),
                columns: {
                    id: true,
                    username: true,
                    displayName: true,
                    avatar: true,
                }
            });

            return { messages: messages.reverse(), partner };
        }
    }),

    getConversations: defineAction({
        handler: async (_, { request }) => {
            const auth = await getAuthenticatedUser(request);
            if (!auth) {
                return { conversations: [] };
            }

            const userId = auth.user.id;

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
