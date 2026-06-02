import { defineAction, ActionError } from "astro:actions";
import { z } from "astro:schema";
import { getAuthenticatedUser } from "@/lib/auth";
import { client } from "@/db/client";
import { SaltogramMessagesTable, SaltogramStoriesTable, UsersTable } from "@/db/schema";
import { eq, and, or, desc, sql, inArray } from "drizzle-orm";

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

            // Query eficiente: latest message per partner via window function + unread counts
            // 1. Get latest message per conversation partner (max 20 conversations)
            const latestMessages = await client.execute(sql`
                WITH ranked AS (
                    SELECT *,
                        ROW_NUMBER() OVER (
                            PARTITION BY CASE
                                WHEN sender_id = ${userId} THEN receiver_id
                                ELSE sender_id
                            END
                            ORDER BY created_at DESC
                        ) as rn
                    FROM saltogram_messages
                    WHERE sender_id = ${userId} OR receiver_id = ${userId}
                )
                SELECT
                    r.id,
                    r.sender_id AS "senderId",
                    r.receiver_id AS "receiverId",
                    r.content,
                    r.story_id AS "storyId",
                    r.reaction,
                    r.is_read AS "isRead",
                    r.created_at AS "createdAt",
                    CASE WHEN r.sender_id = ${userId} THEN r.receiver_id ELSE r.sender_id END AS "partnerId"
                FROM ranked r
                WHERE r.rn = 1
                ORDER BY r.created_at DESC
                LIMIT 20
            `);

            if (latestMessages.rows.length === 0) {
                return { conversations: [] };
            }

            // 2. Get unread counts per partner
            const unreadCounts = await client.execute(sql`
                SELECT
                    CASE
                        WHEN sender_id = ${userId} THEN receiver_id
                        ELSE sender_id
                    END AS "partnerId",
                    COUNT(*)::int AS "unreadCount"
                FROM saltogram_messages
                WHERE receiver_id = ${userId} AND is_read = false
                GROUP BY "partnerId"
            `);

            const unreadMap = new Map<number, number>();
            for (const row of unreadCounts.rows) {
                unreadMap.set(row.partnerId as number, row.unreadCount as number);
            }

            // 3. Fetch partner user data
            const partnerIds = latestMessages.rows.map(r => r.partnerId as number);
            const partners = partnerIds.length > 0
                ? await client
                    .select({
                        id: UsersTable.id,
                        username: UsersTable.username,
                        displayName: UsersTable.displayName,
                        avatar: UsersTable.avatar,
                    })
                    .from(UsersTable)
                    .where(inArray(UsersTable.id, partnerIds))
                : [];

            const partnerMap = new Map(partners.map(p => [p.id, p]));

            // 4. Build response
            const conversations = latestMessages.rows.map((msg: any) => {
                const partnerId = msg.partnerId as number;
                return {
                    user: partnerMap.get(partnerId) || null,
                    lastMessage: msg,
                    unreadCount: unreadMap.get(partnerId) || 0,
                };
            }).filter(c => c.user !== null);

            return { conversations };
        }
    }),

    markAsRead: defineAction({
        input: z.object({
            otherUserId: z.number(),
        }),
        handler: async ({ otherUserId }, { request }) => {
            const auth = await getAuthenticatedUser(request);
            if (!auth) {
                throw new ActionError({ code: "UNAUTHORIZED", message: "Debes iniciar sesión" });
            }

            const userId = auth.user.id;

            await client.update(SaltogramMessagesTable)
                .set({ isRead: true })
                .where(and(
                    eq(SaltogramMessagesTable.senderId, otherUserId),
                    eq(SaltogramMessagesTable.receiverId, userId),
                    eq(SaltogramMessagesTable.isRead, false)
                ));

            return { success: true };
        }
    })
};
