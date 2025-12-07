import { client } from "@/db/client";
import { SaltogramPostsTable, SaltogramReactionsTable } from "@/db/schema";
import { awardCoins, SALTOGRAM_REWARDS } from "@/services/saltogram-rewards";
import type { APIContext } from "astro";
import { getSession } from "auth-astro/server";
import { eq, and, sql } from "drizzle-orm";

const ALLOWED_EMOJIS = ["❤️", "🔥", "😂", "👍", "😮", "😢", "😡"];

/**
 * POST - Add or remove a reaction
 */
export const POST = async ({ request, params }: APIContext) => {
    const session = await getSession(request);

    if (!session?.user) {
        return new Response(JSON.stringify({ error: "No autorizado" }), {
            status: 401,
            headers: {
                "Content-Type": "application/json",
            },
        });
    }

    const userId = session.user.id;
    const postId = parseInt(params.postId || "");

    if (isNaN(postId)) {
        return new Response(
            JSON.stringify({ error: "ID de publicación inválido" }),
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

        // Check if post exists
        const post = await client
            .select()
            .from(SaltogramPostsTable)
            .where(eq(SaltogramPostsTable.id, postId))
            .limit(1);

        if (!post[0]) {
            return new Response(
                JSON.stringify({ error: "Publicación no encontrada" }),
                {
                    status: 404,
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );
        }

        // Check if user already reacted with this emoji
        const existingReaction = await client
            .select()
            .from(SaltogramReactionsTable)
            .where(
                and(
                    eq(SaltogramReactionsTable.postId, postId),
                    eq(SaltogramReactionsTable.userId, userId),
                    eq(SaltogramReactionsTable.emoji, emoji)
                )
            )
            .limit(1);

        if (existingReaction[0]) {
            // Remove reaction
            await client
                .delete(SaltogramReactionsTable)
                .where(eq(SaltogramReactionsTable.id, existingReaction[0].id));

            return new Response(
                JSON.stringify({
                    action: "removed",
                    emoji,
                }),
                {
                    status: 200,
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );
        } else {
            // Add reaction
            await client.insert(SaltogramReactionsTable).values({
                postId,
                userId,
                emoji,
            });

            // Award coins to the post author (if not reacting to own post)
            if (post[0].userId !== userId) {
                await awardCoins(post[0].userId, SALTOGRAM_REWARDS.RECEIVE_REACTION);
            }

            // Award coins to the user who reacted
            await awardCoins(userId, SALTOGRAM_REWARDS.ADD_REACTION);

            return new Response(
                JSON.stringify({
                    action: "added",
                    emoji,
                }),
                {
                    status: 201,
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );
        }
    } catch (error) {
        console.error("Error handling reaction:", error);
        return new Response(
            JSON.stringify({ error: "Error al procesar la reacción" }),
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
 * GET - Get reactions for a post
 */
export const GET = async ({ params }: APIContext) => {
    const postId = parseInt(params.postId || "");

    if (isNaN(postId)) {
        return new Response(
            JSON.stringify({ error: "ID de publicación inválido" }),
            {
                status: 400,
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );
    }

    try {
        const reactions = await client
            .select({
                emoji: SaltogramReactionsTable.emoji,
                count: sql<number>`COUNT(*)::int`,
            })
            .from(SaltogramReactionsTable)
            .where(eq(SaltogramReactionsTable.postId, postId))
            .groupBy(SaltogramReactionsTable.emoji);

        return new Response(JSON.stringify({ reactions }), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
            },
        });
    } catch (error) {
        console.error("Error fetching reactions:", error);
        return new Response(
            JSON.stringify({ error: "Error al cargar las reacciones" }),
            {
                status: 500,
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );
    }
};
