import { defineAction, ActionError } from "astro:actions";
import { z } from "astro:schema";
import { getAuthenticatedUser } from "@/lib/auth";
import { client } from "@/db/client";
import { SaltogramPostsTable, UsersTable, SaltogramMessagesTable, FriendsTable, NotificationsTable } from "@/db/schema";
import { eq, ilike, or, and, count, gt } from "drizzle-orm";

export const saltogram = {
    poll: defineAction({
        input: z.object({
            lastPostId: z.number().optional(),
        }),
        handler: async ({ lastPostId }, { request }) => {
            const auth = await getAuthenticatedUser(request);
            if (!auth) {
                return {
                    unreadMessages: 0,
                    friendRequests: 0,
                    unreadNotifications: 0,
                    hasNewPosts: false
                };
            }

            const userId = auth.user.id;

            // 1. Unread Messages
            const [messagesResult] = await client
                .select({ count: count() })
                .from(SaltogramMessagesTable)
                .where(
                    and(
                        eq(SaltogramMessagesTable.receiverId, userId),
                        eq(SaltogramMessagesTable.isRead, false)
                    )
                );

            // 2. Friend Requests
            const [requestsResult] = await client
                .select({ count: count() })
                .from(FriendsTable)
                .where(
                    and(
                        eq(FriendsTable.friendId, userId),
                        eq(FriendsTable.status, "pending")
                    )
                );

            // 3. Unread Notifications
            const [notificationsResult] = await client
                .select({ count: count() })
                .from(NotificationsTable)
                .where(
                    and(
                        eq(NotificationsTable.userId, userId),
                        eq(NotificationsTable.read, false)
                    )
                );

            // 4. New Posts (if lastPostId provided)
            let hasNewPosts = false;
            if (lastPostId) {
                const [postsResult] = await client
                    .select({ count: count() })
                    .from(SaltogramPostsTable)
                    .where(gt(SaltogramPostsTable.id, lastPostId));

                hasNewPosts = (postsResult?.count ?? 0) > 0;
            }

            return {
                unreadMessages: messagesResult?.count ?? 0,
                friendRequests: requestsResult?.count ?? 0,
                unreadNotifications: notificationsResult?.count ?? 0,
                hasNewPosts
            };
        }
    }),
    searchUsers: defineAction({
        input: z.object({ query: z.string().min(1) }),
        handler: async ({ query }, { request }) => {
            const auth = await getAuthenticatedUser(request);
            if (!auth) {
                throw new ActionError({ code: "UNAUTHORIZED", message: "No autorizado" });
            }

            const users = await client
                .select({
                    id: UsersTable.id,
                    username: UsersTable.username,
                    displayName: UsersTable.displayName,
                    avatar: UsersTable.avatar,
                })
                .from(UsersTable)
                .where(
                    or(
                        ilike(UsersTable.username, `%${query}%`),
                        ilike(UsersTable.displayName, `%${query}%`)
                    )
                )
                .limit(5);

            return { users };
        }
    }),
    togglePin: defineAction({
        input: z.object({ postId: z.number() }),
        handler: async ({ postId }, { request }) => {
            const auth = await getAuthenticatedUser(request);
            if (!auth?.user?.admin) {
                throw new ActionError({ code: "UNAUTHORIZED", message: "No autorizado" });
            }

            const post = await client.query.SaltogramPostsTable.findFirst({
                where: eq(SaltogramPostsTable.id, postId)
            });

            if (!post) throw new ActionError({ code: "NOT_FOUND", message: "Post no encontrado" });

            const newStatus = !post.isPinned;

            await client.update(SaltogramPostsTable)
                .set({ isPinned: newStatus })
                .where(eq(SaltogramPostsTable.id, postId));

            return { success: true, isPinned: newStatus };
        }
    }),
    toggleFeature: defineAction({
        input: z.object({ postId: z.number() }),
        handler: async ({ postId }, { request }) => {
            const auth = await getAuthenticatedUser(request);
            if (!auth?.user?.admin) {
                throw new ActionError({ code: "UNAUTHORIZED", message: "No autorizado" });
            }

            const post = await client.query.SaltogramPostsTable.findFirst({
                where: eq(SaltogramPostsTable.id, postId)
            });

            if (!post) throw new ActionError({ code: "NOT_FOUND", message: "Post no encontrado" });

            const newStatus = !post.isFeatured;

            await client.update(SaltogramPostsTable)
                .set({ isFeatured: newStatus })
                .where(eq(SaltogramPostsTable.id, postId));

            return { success: true, isFeatured: newStatus };
        }
    }),
    deletePost: defineAction({
        input: z.object({ postId: z.number() }),
        handler: async ({ postId }, { request }) => {
            const auth = await getAuthenticatedUser(request);

            const post = await client.query.SaltogramPostsTable.findFirst({
                where: eq(SaltogramPostsTable.id, postId)
            });

            if (!post) throw new ActionError({ code: "NOT_FOUND", message: "Post no encontrado" });

            if (!auth?.user?.admin && auth?.user?.id !== post.userId) {
                throw new ActionError({ code: "UNAUTHORIZED", message: "No autorizado" });
            }

            await client.delete(SaltogramPostsTable)
                .where(eq(SaltogramPostsTable.id, postId));

            return { success: true };
        }
    })
}
