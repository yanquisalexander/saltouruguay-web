import { client } from "@/db/client";
import { SaltogramPostsTable, UsersTable } from "@/db/schema";
import type { APIContext } from "astro";
import { getAuthenticatedUser } from "@/lib/auth";
import { eq } from "drizzle-orm";

/**
 * POST - Pin/unpin a post (Admin only)
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

    if (!auth.user.admin) {
        return new Response(
            JSON.stringify({ error: "No tienes permisos de administrador" }),
            {
                status: 403,
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );
    }

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
        const { pinned } = body;

        if (typeof pinned !== "boolean") {
            return new Response(
                JSON.stringify({ error: "El campo 'pinned' debe ser booleano" }),
                {
                    status: 400,
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );
        }

        // Update post
        await client
            .update(SaltogramPostsTable)
            .set({ isPinned: pinned })
            .where(eq(SaltogramPostsTable.id, postId));

        return new Response(
            JSON.stringify({
                message: pinned
                    ? "Publicación fijada correctamente"
                    : "Publicación desfijada correctamente",
            }),
            {
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );
    } catch (error) {
        console.error("Error pinning/unpinning post:", error);
        return new Response(
            JSON.stringify({ error: "Error al procesar la solicitud" }),
            {
                status: 500,
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );
    }
};
