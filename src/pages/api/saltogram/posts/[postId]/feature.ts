import { client } from "@/db/client";
import { SaltogramPostsTable } from "@/db/schema";
import {
    deductCoins,
    FEATURE_POST_COST,
    FEATURE_POST_DURATION_HOURS,
} from "@/services/saltogram-rewards";
import type { APIContext } from "astro";
import { getAuthenticatedUser } from "@/lib/auth";
import { eq } from "drizzle-orm";

/**
 * POST - Feature a post by spending coins
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
        // Check if post exists and belongs to user
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

        // Only the post author can feature their own post
        if (post[0].userId !== userId) {
            return new Response(
                JSON.stringify({
                    error: "Solo puedes destacar tus propias publicaciones",
                }),
                {
                    status: 403,
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );
        }

        // Check if post is already featured
        if (
            post[0].isFeatured &&
            post[0].featuredUntil &&
            new Date(post[0].featuredUntil) > new Date()
        ) {
            return new Response(
                JSON.stringify({
                    error: "Esta publicación ya está destacada",
                }),
                {
                    status: 400,
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );
        }

        // Deduct coins
        const success = await deductCoins(userId, FEATURE_POST_COST);

        if (!success) {
            return new Response(
                JSON.stringify({
                    error: `No tienes suficientes SaltoCoins. Necesitas ${FEATURE_POST_COST} SaltoCoins.`,
                }),
                {
                    status: 400,
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );
        }

        // Feature the post
        const featuredUntil = new Date();
        featuredUntil.setHours(featuredUntil.getHours() + FEATURE_POST_DURATION_HOURS);

        await client
            .update(SaltogramPostsTable)
            .set({
                isFeatured: true,
                featuredUntil,
            })
            .where(eq(SaltogramPostsTable.id, postId));

        return new Response(
            JSON.stringify({
                message: `Publicación destacada durante ${FEATURE_POST_DURATION_HOURS} horas`,
                featuredUntil,
            }),
            {
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );
    } catch (error) {
        console.error("Error featuring post:", error);
        return new Response(
            JSON.stringify({ error: "Error al destacar la publicación" }),
            {
                status: 500,
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );
    }
};
