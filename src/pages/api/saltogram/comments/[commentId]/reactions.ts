import { client } from "@/db/client";
import { SaltogramCommentsTable, SaltogramCommentReactionsTable, UsersTable } from "@/db/schema";
import { awardCoins, SALTOGRAM_REWARDS } from "@/services/saltogram-rewards";
import type { APIContext } from "astro";
import { getAuthenticatedUser } from "@/lib/auth";
import { eq, and, sql, desc } from "drizzle-orm";
import { createNotification } from "@/actions/notifications";

const ALLOWED_EMOJIS = ["❤️", "🔥", "😂", "👍", "😮", "😢", "😡"];

/**
 * POST - Add or remove a reaction to a comment
 */
export const POST = async ({ request, params }: APIContext) => {
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
    const commentId = parseInt(params.commentId || "");

    if (isNaN(commentId)) {
        return new Response(
            JSON.stringify({ error: "ID de comentario inválido" }),
            {
                status: 400,
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );
    }

    try {
        const body = await request.json();
        const { emoji } = body;

        if (!emoji || !ALLOWED_EMOJIS.includes(emoji)) {
            return new Response(
                JSON.stringify({ error: "Emoji no válido" }),
                {
                    status: 400,
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );
        }

        // Check if comment exists
        const comment = await client
            .select()
            .from(SaltogramCommentsTable)
            .where(eq(SaltogramCommentsTable.id, commentId))
            .limit(1);

        if (!comment[0]) {
            return new Response(
                JSON.stringify({ error: "Comentario no encontrado" }),
                {
                    status: 404,
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );
        }

        // Check if user already reacted with this emoji to this comment
        const existingReaction = await client
            .select()
            .from(SaltogramCommentReactionsTable)
            .where(
                and(
                    eq(SaltogramCommentReactionsTable.commentId, commentId),
                    eq(SaltogramCommentReactionsTable.userId, userId),
                    eq(SaltogramCommentReactionsTable.emoji, emoji)
                )
            )
            .limit(1);

        if (existingReaction[0]) {
            // Remove reaction
            await client
                .delete(SaltogramCommentReactionsTable)
                .where(eq(SaltogramCommentReactionsTable.id, existingReaction[0].id));

            return new Response(
                JSON.stringify({ action: "removed", emoji }),
                {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                }
            );
        } else {
            // Add reaction
            await client.insert(SaltogramCommentReactionsTable).values({
                commentId,
                userId,
                emoji,
            });

            // Award coins to the comment author (if not reacting to own comment)
            if (comment[0].userId !== userId) {
                await awardCoins(comment[0].userId, SALTOGRAM_REWARDS.RECEIVE_REACTION);

                // Send Notification
                await createNotification(comment[0].userId, {
                    type: "saltogram_comment_reaction",
                    title: "Nueva reacción",
                    message: `${auth.user.displayName} reaccionó con ${emoji} a tu comentario`,
                    link: `/saltogram/post/${comment[0].postId}`,
                    image: auth.user.avatar || undefined
                });
            }

            // Award coins to the user who reacted
            await awardCoins(userId, SALTOGRAM_REWARDS.ADD_REACTION);

            return new Response(
                JSON.stringify({ action: "added", emoji }),
                {
                    status: 201,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }
    } catch (error) {
        console.error("Error handling comment reaction:", error);
        return new Response(
            JSON.stringify({ error: "Error al procesar la reacción" }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" },
            }
        );
    }
};

/**
 * GET - Get reactions for a comment
 */
export const GET = async ({ request, params }: APIContext) => {
    const commentId = parseInt(params.commentId || "");

    if (isNaN(commentId)) {
        return new Response(
            JSON.stringify({ error: "ID de comentario inválido" }),
            {
                status: 400,
                headers: { "Content-Type": "application/json" },
            }
        );
    }

    try {
        const auth = await getAuthenticatedUser(request);
        const currentUserId = auth?.user?.id || null;

        // 1. Get counts per emoji
        const reactionsStats = await client
            .select({ emoji: SaltogramCommentReactionsTable.emoji, count: sql<number>`COUNT(*)::int` })
            .from(SaltogramCommentReactionsTable)
            .where(eq(SaltogramCommentReactionsTable.commentId, commentId))
            .groupBy(SaltogramCommentReactionsTable.emoji)
            .orderBy(sql`count DESC`);

        // 2. Get current user's reaction
        let userReaction = null;
        if (currentUserId) {
            const result = await client
                .select({ emoji: SaltogramCommentReactionsTable.emoji })
                .from(SaltogramCommentReactionsTable)
                .where(and(
                    eq(SaltogramCommentReactionsTable.commentId, commentId),
                    eq(SaltogramCommentReactionsTable.userId, currentUserId)
                ))
                .limit(1);
            if (result.length > 0) userReaction = result[0].emoji;
        }

        // 3. Get recent reactions with user info
        const recentReactions = await client
            .select({
                userId: UsersTable.id,
                displayName: UsersTable.displayName,
                username: UsersTable.username,
                avatar: UsersTable.avatar,
                emoji: SaltogramCommentReactionsTable.emoji,
            })
            .from(SaltogramCommentReactionsTable)
            .innerJoin(UsersTable, eq(SaltogramCommentReactionsTable.userId, UsersTable.id))
            .where(eq(SaltogramCommentReactionsTable.commentId, commentId))
            .orderBy(desc(SaltogramCommentReactionsTable.createdAt))
            .limit(5);

        return new Response(JSON.stringify({ reactions: reactionsStats, userReaction, recentReactions }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Error fetching comment reactions:", error);
        return new Response(
            JSON.stringify({ error: "Error al cargar las reacciones" }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" },
            }
        );
    }
};
