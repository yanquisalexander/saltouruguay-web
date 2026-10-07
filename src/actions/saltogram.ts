import { defineAction, ActionError } from "astro:actions";
import { z } from "astro:schema";
import { getAuthenticatedUser } from "@/lib/auth";
import { client } from "@/db/client";
import { SaltogramPostsTable, UsersTable, SaltogramMessagesTable, FriendsTable, NotificationsTable } from "@/db/schema";
import { eq, ilike, or, and, count, gt, sql, desc } from "drizzle-orm";

/**
 * SELECT compartido para posts con contadores, últimos comentarios y
 * reacción del lector. Espeja la query SSR de
 * `src/pages/saltogram/[...saltogram].astro` para que web y móvil
 * devuelvan exactamente la misma forma (ver `src/types/saltogram.ts`).
 */
function postSelectShape(viewerId: number) {
    return {
        id: SaltogramPostsTable.id,
        userId: SaltogramPostsTable.userId,
        text: SaltogramPostsTable.text,
        imageUrl: SaltogramPostsTable.imageUrl,
        isPinned: SaltogramPostsTable.isPinned,
        isFeatured: SaltogramPostsTable.isFeatured,
        featuredUntil: SaltogramPostsTable.featuredUntil,
        metadata: SaltogramPostsTable.metadata,
        createdAt: SaltogramPostsTable.createdAt,
        user: {
            id: UsersTable.id,
            displayName: UsersTable.displayName,
            username: UsersTable.username,
            avatar: UsersTable.avatar,
            admin: UsersTable.admin,
            twitchTier: UsersTable.twitchTier,
        },
        reactionsCount: sql<number>`
          (SELECT COUNT(*)::int FROM saltogram_reactions WHERE post_id = ${SaltogramPostsTable.id})
        `,
        userReaction: sql<string | null>`
          (SELECT emoji FROM saltogram_reactions WHERE post_id = ${SaltogramPostsTable.id} AND user_id = ${viewerId} LIMIT 1)
        `,
        commentsCount: sql<number>`
          (SELECT COUNT(*)::int FROM saltogram_comments WHERE post_id = ${SaltogramPostsTable.id})
        `,
        latestComments: sql<any[]>`
          (
            SELECT COALESCE(json_agg(c), '[]'::json)
            FROM (
                SELECT
                    sc.id,
                    sc.text,
                    sc.created_at as "createdAt",
                    sc.parent_id as "parentId",
                    json_build_object(
                        'id', u.id,
                        'displayName', u.display_name,
                        'username', u.username,
                        'avatar', u.avatar,
                        'admin', u.admin,
                        'twitchTier', u.twitch_tier
                    ) as user
                FROM saltogram_comments sc
                JOIN users u ON sc.user_id = u.id
                WHERE sc.post_id = ${SaltogramPostsTable.id} AND sc.parent_id IS NULL
                ORDER BY sc.created_at DESC
                LIMIT 2
            ) c
          )
        `,
    };
}

export const saltogram = {
    poll: defineAction({
        input: z.object({
            lastPostId: z.number().optional(),
        }),
        handler: async ({ lastPostId }, { request }) => {
            const auth = await getAuthenticatedUser(request);

            // Si no hay usuario, retornamos estado vacío inmediatamente
            if (!auth) {
                return {
                    unreadMessages: 0,
                    friendRequests: 0,
                    unreadNotifications: 0,
                    hasNewPosts: false
                };
            }

            const userId = auth.user.id;

            // EJECUCIÓN EN PARALELO:
            // Disparamos todas las promesas a la vez. El tiempo total será igual a la consulta más lenta,
            // no a la suma de todas.
            const [messagesResult, requestsResult, notificationsResult, postsResult] = await Promise.all([
                // 1. Unread Messages
                client
                    .select({ count: count() })
                    .from(SaltogramMessagesTable)
                    .where(and(
                        eq(SaltogramMessagesTable.receiverId, userId),
                        eq(SaltogramMessagesTable.isRead, false)
                    )),

                // 2. Friend Requests
                client
                    .select({ count: count() })
                    .from(FriendsTable)
                    .where(and(
                        eq(FriendsTable.friendId, userId),
                        eq(FriendsTable.status, "pending")
                    )),

                // 3. Unread Notifications
                client
                    .select({ count: count() })
                    .from(NotificationsTable)
                    .where(and(
                        eq(NotificationsTable.userId, userId),
                        eq(NotificationsTable.read, false)
                    )),

                // 4. New Posts (Condicional)
                lastPostId
                    ? client
                        .select({ count: count() })
                        .from(SaltogramPostsTable)
                        .where(gt(SaltogramPostsTable.id, lastPostId))
                    : Promise.resolve([{ count: 0 }]) // Retorno dummy si no hay ID
            ]);

            return {
                unreadMessages: messagesResult[0]?.count ?? 0,
                friendRequests: requestsResult[0]?.count ?? 0,
                unreadNotifications: notificationsResult[0]?.count ?? 0,
                hasNewPosts: (postsResult[0]?.count ?? 0) > 0
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
    }),
    /**
     * Feed principal (móvil + polling web). Requiere sesión porque
     * incluye `userReaction` del lector.
     */
    getFeed: defineAction({
        input: z.object({
            limit: z.number().min(1).max(50).default(20).optional(),
            offset: z.number().min(0).default(0).optional(),
        }),
        handler: async (input, { request }) => {
            const auth = await getAuthenticatedUser(request);
            if (!auth?.user?.id) {
                throw new ActionError({ code: "UNAUTHORIZED", message: "Debes iniciar sesión" });
            }

            const posts = await client
                .select(postSelectShape(auth.user.id))
                .from(SaltogramPostsTable)
                .innerJoin(UsersTable, eq(SaltogramPostsTable.userId, UsersTable.id))
                .orderBy(desc(SaltogramPostsTable.createdAt))
                .limit(input.limit ?? 20)
                .offset(input.offset ?? 0);

            return { posts };
        }
    }),
    /**
     * Detalle de publicación con comentarios (móvil).
     */
    getPost: defineAction({
        input: z.object({ postId: z.number() }),
        handler: async ({ postId }, { request }) => {
            const auth = await getAuthenticatedUser(request);
            if (!auth?.user?.id) {
                throw new ActionError({ code: "UNAUTHORIZED", message: "Debes iniciar sesión" });
            }

            const posts = await client
                .select(postSelectShape(auth.user.id))
                .from(SaltogramPostsTable)
                .innerJoin(UsersTable, eq(SaltogramPostsTable.userId, UsersTable.id))
                .where(eq(SaltogramPostsTable.id, postId))
                .limit(1);

            const post = posts[0] ?? null;
            if (!post) {
                throw new ActionError({ code: "NOT_FOUND", message: "Publicación no encontrada" });
            }

            return { post };
        }
    }),
    /**
     * Perfil público + últimos posts + conteo de amigos (móvil).
     */
    getProfile: defineAction({
        input: z.object({ username: z.string().min(1) }),
        handler: async ({ username }, { request }) => {
            const auth = await getAuthenticatedUser(request);
            if (!auth?.user?.id) {
                throw new ActionError({ code: "UNAUTHORIZED", message: "Debes iniciar sesión" });
            }

            const profile = await client.query.UsersTable.findFirst({
                where: eq(UsersTable.username, username),
                columns: {
                    id: true,
                    username: true,
                    displayName: true,
                    avatar: true,
                    admin: true,
                    twitchTier: true,
                },
            });

            if (!profile) {
                throw new ActionError({ code: "NOT_FOUND", message: "Usuario no encontrado" });
            }

            const [posts, friendsResult] = await Promise.all([
                client
                    .select(postSelectShape(auth.user.id))
                    .from(SaltogramPostsTable)
                    .innerJoin(UsersTable, eq(SaltogramPostsTable.userId, UsersTable.id))
                    .where(eq(SaltogramPostsTable.userId, profile.id))
                    .orderBy(desc(SaltogramPostsTable.createdAt))
                    .limit(10),
                client
                    .select({ count: count() })
                    .from(FriendsTable)
                    .where(and(
                        or(
                            eq(FriendsTable.userId, profile.id),
                            eq(FriendsTable.friendId, profile.id)
                        ),
                        eq(FriendsTable.status, "accepted")
                    )),
            ]);

            return {
                profile,
                posts,
                friendsCount: friendsResult[0]?.count ?? 0,
            };
        }
    }),
}
