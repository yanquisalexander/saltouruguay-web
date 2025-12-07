import { client } from "@/db/client";
import { SaltogramPostsTable } from "@/db/schema";
import type { APIContext } from "astro";
import { desc, eq, gt } from "drizzle-orm";

const POLL_TIMEOUT = 15000; // 15 seconds
const CHECK_INTERVAL = 1000; // Check every 1 second

/**
 * GET - Long polling endpoint for new posts
 * Waits up to 15 seconds for new posts
 */
export const GET = async ({ request, url }: APIContext) => {
    const searchParams = url.searchParams;
    const lastPostId = searchParams.get("lastPostId");

    if (!lastPostId) {
        return new Response(
            JSON.stringify({ error: "lastPostId es requerido" }),
            {
                status: 400,
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );
    }

    const startTime = Date.now();
    const lastId = parseInt(lastPostId);

    try {
        // Poll for new posts
        while (Date.now() - startTime < POLL_TIMEOUT) {
            const newPosts = await client
                .select({
                    id: SaltogramPostsTable.id,
                })
                .from(SaltogramPostsTable)
                .where(
                    eq(SaltogramPostsTable.isHidden, false),
                    gt(SaltogramPostsTable.id, lastId)
                )
                .orderBy(desc(SaltogramPostsTable.createdAt))
                .limit(1);

            if (newPosts.length > 0) {
                return new Response(
                    JSON.stringify({ hasNewPosts: true, count: 1 }),
                    {
                        status: 200,
                        headers: {
                            "Content-Type": "application/json",
                        },
                    }
                );
            }

            // Wait before checking again
            await new Promise((resolve) => setTimeout(resolve, CHECK_INTERVAL));
        }

        // No new posts found within timeout
        return new Response(JSON.stringify({ hasNewPosts: false }), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
            },
        });
    } catch (error) {
        console.error("Error in long polling:", error);
        return new Response(
            JSON.stringify({ error: "Error en la consulta" }),
            {
                status: 500,
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );
    }
};
