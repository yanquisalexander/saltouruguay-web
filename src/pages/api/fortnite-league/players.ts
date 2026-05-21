export const prerender = false;

import { client } from "@/db/client";
import { FortniteLeagueInscriptionsTable } from "@/db/schema";

// GET — obtener todos los jugadores
export async function GET() {
    try {
        const players = await client
            .select()
            .from(FortniteLeagueInscriptionsTable)
            .orderBy(FortniteLeagueInscriptionsTable.createdAt)
            .execute();

        return new Response(JSON.stringify({ players }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Error fetching fortnite players:", error);
        return new Response(JSON.stringify({ error: "Internal server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}

// POST — inscribir un nuevo jugador
export async function POST({ request }: { request: Request }) {
    try {
        const body = await request.json();
        const { discordUsername, epicId, platform, division } = body;

        if (!discordUsername || !epicId || !platform) {
            return new Response(JSON.stringify({ error: "Faltan campos obligatorios" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        const [player] = await client
            .insert(FortniteLeagueInscriptionsTable)
            .values({
                discordUsername,
                epicId,
                platform,
                division: division || "clasificatoria",
            })
            .returning()
            .execute();

        return new Response(JSON.stringify({ player }), {
            status: 201,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error: any) {
        if (error?.code === "23505") {
            return new Response(JSON.stringify({ error: "Ya existe un jugador con ese Discord o Epic ID" }), {
                status: 409,
                headers: { "Content-Type": "application/json" },
            });
        }
        console.error("Error inserting fortnite player:", error);
        return new Response(JSON.stringify({ error: "Internal server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}