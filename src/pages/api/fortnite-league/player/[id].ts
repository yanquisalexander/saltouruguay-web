export const prerender = false;

import { client } from "@/db/client";
// ... resto del código
import { client } from "@/db/client";
import { FortniteLeagueInscriptionsTable } from "@/db/schema";
import { eq } from "drizzle-orm";

// PATCH — editar un jugador
export async function PATCH({ params, request }: { params: { id: string }; request: Request }) {
    try {
        const id = parseInt(params.id);
        if (isNaN(id)) {
            return new Response(JSON.stringify({ error: "ID inválido" }), { status: 400 });
        }

        const body = await request.json();
        const { discordUsername, epicId, platform, division } = body;

        const [updated] = await client
            .update(FortniteLeagueInscriptionsTable)
            .set({
                ...(discordUsername && { discordUsername }),
                ...(epicId && { epicId }),
                ...(platform && { platform }),
                ...(division && { division }),
                updatedAt: new Date(),
            })
            .where(eq(FortniteLeagueInscriptionsTable.id, id))
            .returning()
            .execute();

        if (!updated) {
            return new Response(JSON.stringify({ error: "Jugador no encontrado" }), { status: 404 });
        }

        return new Response(JSON.stringify({ player: updated }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error: any) {
        if (error?.code === "23505") {
            return new Response(JSON.stringify({ error: "Discord o Epic ID ya en uso" }), { status: 409 });
        }
        console.error("Error updating fortnite player:", error);
        return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
    }
}

// DELETE — borrar un jugador
export async function DELETE({ params }: { params: { id: string } }) {
    try {
        const id = parseInt(params.id);
        if (isNaN(id)) {
            return new Response(JSON.stringify({ error: "ID inválido" }), { status: 400 });
        }

        const [deleted] = await client
            .delete(FortniteLeagueInscriptionsTable)
            .where(eq(FortniteLeagueInscriptionsTable.id, id))
            .returning()
            .execute();

        if (!deleted) {
            return new Response(JSON.stringify({ error: "Jugador no encontrado" }), { status: 404 });
        }

        return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Error deleting fortnite player:", error);
        return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
    }
}