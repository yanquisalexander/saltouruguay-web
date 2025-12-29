import { client } from "@/db/client";
import { SaltogramPostsTable } from "@/db/schema";
import type { APIContext } from "astro";
import { desc, eq, gt, and } from "drizzle-orm";

export const GET = async ({ url }: APIContext) => {
    const searchParams = url.searchParams;
    const lastPostId = searchParams.get("lastPostId");

    if (!lastPostId) {
        return new Response(
            JSON.stringify({ error: "lastPostId es requerido" }),
            { status: 400, headers: { "Content-Type": "application/json" } }
        );
    }

    const lastId = parseInt(lastPostId);

    try {
        // Consulta OPTIMIZADA: Solo buscamos si existe AL MENOS un post nuevo.
        // No necesitamos traer todos los datos, solo el ID es suficiente para saber que hay novedad.
        const newPosts = await client
            .select({ id: SaltogramPostsTable.id })
            .from(SaltogramPostsTable)
            .where(
                and(
                    eq(SaltogramPostsTable.isHidden, false),
                    gt(SaltogramPostsTable.id, lastId)
                )
            )
            .limit(1); // Limit 1 hace la consulta ultra rápida

        const hasNew = newPosts.length > 0;

        return new Response(
            JSON.stringify({ hasNewPosts: hasNew, count: hasNew ? 1 : 0 }),
            {
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                    // IMPORTANTE: Evita que el navegador cachee la respuesta "false"
                    "Cache-Control": "no-cache, no-store, must-revalidate",
                },
            }
        );

    } catch (error) {
        console.error("Error in polling:", error);
        return new Response(
            JSON.stringify({ error: "Error en la consulta" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
};