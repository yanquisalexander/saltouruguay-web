import { client } from "@/db/client";
import { SaltogramPostsTable, SaltogramReportsTable } from "@/db/schema";
import type { APIContext } from "astro";
import { getSession } from "auth-astro/server";
import { eq, and } from "drizzle-orm";

/**
 * POST - Report a post
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
        const { reason } = body;

        if (!reason || reason.trim().length === 0) {
            return new Response(
                JSON.stringify({ error: "Debes proporcionar una razón" }),
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

        // Check if user already reported this post
        const existingReport = await client
            .select()
            .from(SaltogramReportsTable)
            .where(
                and(
                    eq(SaltogramReportsTable.postId, postId),
                    eq(SaltogramReportsTable.reporterId, userId)
                )
            )
            .limit(1);

        if (existingReport[0]) {
            return new Response(
                JSON.stringify({ error: "Ya has reportado esta publicación" }),
                {
                    status: 400,
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );
        }

        // Create report
        await client.insert(SaltogramReportsTable).values({
            postId,
            reporterId: userId,
            reason: reason.trim(),
        });

        return new Response(
            JSON.stringify({
                message: "Reporte enviado correctamente",
            }),
            {
                status: 201,
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );
    } catch (error) {
        console.error("Error creating report:", error);
        return new Response(
            JSON.stringify({ error: "Error al enviar el reporte" }),
            {
                status: 500,
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );
    }
};
