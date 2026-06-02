import { client } from "@/db/client";
import { SaltogramPostsTable, UsersTable, FriendsTable, SaltogramReactionsTable, SaltogramCommentsTable } from "@/db/schema";
import { uploadImage, validateImage } from "@/services/saltogram-storage";
import { awardCoins, SALTOGRAM_REWARDS } from "@/services/saltogram-rewards";
import type { APIContext } from "astro";
import { getAuthenticatedUser } from "@/lib/auth";
import { desc, eq, sql, and, ilike, or } from "drizzle-orm";
import { createNotification } from "@/actions/notifications";
import { invalidateSaltogramCache } from "@/lib/saltogram";

const MAX_TEXT_LENGTH = 500;

/**
 * GET - Get feed posts with pagination
 * Optimizado: sin N+1, toda la data de reacciones se obtiene en la query principal
 */
export const GET = async ({ request, url }: APIContext) => {
    const auth = await getAuthenticatedUser(request);

    // Allow viewing posts without login, but some features may be limited
    const userId = auth?.user?.id;

    const searchParams = url.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const sort = searchParams.get("sort") || "recent"; // recent | popular
    const userFilter = searchParams.get("userId");
    const tag = searchParams.get("tag");

    const offset = (page - 1) * limit;

    try {
        // Build the query — toda la data en una sola query, sin N+1
        let query = client
            .select({
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
                // Reacción del usuario actual (si está logueado) — subquery inline, 0 queries extra
                userReaction: sql<string | null>`
                    ${userId
                        ? sql`(
                            SELECT sr.emoji FROM saltogram_reactions sr
                            WHERE sr.post_id = ${SaltogramPostsTable.id} AND sr.user_id = ${userId}
                            LIMIT 1
                        )`
                        : sql`NULL::varchar`
                    }
                `,
                // Últimas 5 reacciones con datos de usuario — subquery json_agg, 0 queries extra
                recentReactions: sql<any[]>`
                    (
                        SELECT COALESCE(json_agg(r), '[]'::json)
                        FROM (
                            SELECT
                                u2.id as "userId",
                                u2.display_name as "displayName",
                                u2.username,
                                u2.avatar,
                                sr2.emoji
                            FROM saltogram_reactions sr2
                            JOIN users u2 ON sr2.user_id = u2.id
                            WHERE sr2.post_id = ${SaltogramPostsTable.id}
                            ORDER BY sr2.created_at DESC
                            LIMIT 5
                        ) r
                    )
                `,
                // Stats de reacciones agrupadas por emoji — subquery json_agg, 0 queries extra
                reactions: sql<any[]>`
                    (
                        SELECT COALESCE(json_agg(rs), '[]'::json)
                        FROM (
                            SELECT sr3.emoji, COUNT(*)::int as count
                            FROM saltogram_reactions sr3
                            WHERE sr3.post_id = ${SaltogramPostsTable.id}
                            GROUP BY sr3.emoji
                            ORDER BY count DESC
                        ) rs
                    )
                `,
            })
            .from(SaltogramPostsTable)
            .innerJoin(UsersTable, eq(SaltogramPostsTable.userId, UsersTable.id));

        // Build where conditions
        const conditions = [eq(SaltogramPostsTable.isHidden, false)];

        if (userFilter) {
            conditions.push(eq(SaltogramPostsTable.userId, parseInt(userFilter)));
        }

        if (tag) {
            conditions.push(ilike(SaltogramPostsTable.text, `%#${tag}%`));
        }

        query = query.where(and(...conditions));

        // Apply sorting
        if (sort === "popular") {
            // Sort by reactions + comments count
            query = query.orderBy(
                desc(sql`
                    (SELECT COUNT(*) FROM saltogram_reactions WHERE post_id = ${SaltogramPostsTable.id}) +
                    (SELECT COUNT(*) FROM saltogram_comments WHERE post_id = ${SaltogramPostsTable.id})
                `)
            );
        } else {
            // Sort by pinned first, then featured, then by creation date
            query = query.orderBy(
                desc(SaltogramPostsTable.isPinned),
                desc(SaltogramPostsTable.isFeatured),
                desc(SaltogramPostsTable.createdAt)
            );
        }

        const posts = await query.limit(limit).offset(offset);

        return new Response(JSON.stringify({ posts }), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
            },
        });
    } catch (error) {
        console.error("Error fetching posts:", error);
        return new Response(
            JSON.stringify({ error: "Error al cargar las publicaciones" }),
            {
                status: 500,
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );
    }
};

/**
 * POST - Create a new post
 */
export const POST = async ({ request }: APIContext) => {
    const auth = await getAuthenticatedUser(request);

    if (!auth) {
        return new Response(JSON.stringify({ error: "No autorizado" }), {
            status: 401,
            headers: {
                "Content-Type": "application/json",
            },
        });
    }

    const userId = auth.user.id;

    try {
        const formData = await request.formData();
        const text = formData.get("text") as string | null;
        const image = formData.get("image") as File | null;
        const metadataStr = formData.get("metadata") as string | null;
        const metadata = metadataStr ? JSON.parse(metadataStr) : null;

        // Validate text length
        if (text && text.length > MAX_TEXT_LENGTH) {
            return new Response(
                JSON.stringify({
                    error: `El texto no puede exceder ${MAX_TEXT_LENGTH} caracteres`,
                }),
                {
                    status: 400,
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );
        }

        // At least one of text or image must be provided
        if (!text && !image) {
            return new Response(
                JSON.stringify({
                    error: "Debes proporcionar texto o una imagen",
                }),
                {
                    status: 400,
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );
        }

        let imageUrl: string | null = null;

        // Handle image upload if provided
        if (image) {
            const imageBuffer = Buffer.from(await image.arrayBuffer());

            // Validate image
            await validateImage(imageBuffer);

            // Upload image
            const uploadResult = await uploadImage(
                imageBuffer,
                image.name,
                userId
            );
            imageUrl = uploadResult.url;
        }

        // Create post
        const [newPost] = await client
            .insert(SaltogramPostsTable)
            .values({
                userId,
                text,
                imageUrl,
                metadata,
            })
            .returning();

        // Award coins for creating post
        await awardCoins(userId, SALTOGRAM_REWARDS.CREATE_POST);

        // Invalidate cache (stats + trending tags)
        invalidateSaltogramCache().catch(() => {});

        // --- NOTIFY FRIENDS (limitado a 50 para evitar saturación) ---
        try {
            const friends = await client
                .select({
                    userId: FriendsTable.userId,
                    friendId: FriendsTable.friendId,
                })
                .from(FriendsTable)
                .where(
                    and(
                        eq(FriendsTable.status, "accepted"),
                        or(
                            eq(FriendsTable.userId, userId),
                            eq(FriendsTable.friendId, userId)
                        )
                    )
                )
                .limit(50);

            const friendIds = friends.map(f => f.userId === userId ? f.friendId : f.userId);

            // Send notifications in background (concurrente limitado a 5 a la vez)
            const chunkSize = 5;
            for (let i = 0; i < friendIds.length; i += chunkSize) {
                const chunk = friendIds.slice(i, i + chunkSize);
                await Promise.all(chunk.map(friendId =>
                    createNotification(friendId, {
                        type: "saltogram_post",
                        title: "Nueva publicación",
                        message: `${auth.user.displayName} ha publicado algo nuevo`,
                        link: `/saltogram/post/${newPost.id}`,
                        image: auth.user.avatar || undefined
                    })
                )).catch(err => console.error("Error sending friend notifications:", err));
            }

        } catch (error) {
            console.error("Error fetching friends for notification:", error);
        }

        // Fetch the complete post with user data
        const [completePost] = await client
            .select({
                id: SaltogramPostsTable.id,
                userId: SaltogramPostsTable.userId,
                text: SaltogramPostsTable.text,
                imageUrl: SaltogramPostsTable.imageUrl,
                isPinned: SaltogramPostsTable.isPinned,
                isFeatured: SaltogramPostsTable.isFeatured,
                metadata: SaltogramPostsTable.metadata,
                createdAt: SaltogramPostsTable.createdAt,
                user: {
                    id: UsersTable.id,
                    displayName: UsersTable.displayName,
                    username: UsersTable.username,
                    avatar: UsersTable.avatar,
                },
            })
            .from(SaltogramPostsTable)
            .innerJoin(UsersTable, eq(SaltogramPostsTable.userId, UsersTable.id))
            .where(eq(SaltogramPostsTable.id, newPost.id));

        return new Response(
            JSON.stringify({
                post: {
                    ...completePost,
                    reactionsCount: 0,
                    commentsCount: 0,
                },
            }),
            {
                status: 201,
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );
    } catch (error) {
        console.error("Error creating post:", error);
        const errorMessage =
            error instanceof Error ? error.message : "Error al crear la publicación";
        return new Response(JSON.stringify({ error: errorMessage }), {
            status: 500,
            headers: {
                "Content-Type": "application/json",
            },
        });
    }
};
