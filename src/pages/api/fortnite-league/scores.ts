// src/pages/api/fortnite-league/scores.ts
export const prerender = false;

import { client } from "@/db/client";
import { FortniteLeagueScoresTable, FortniteLeagueInscriptionsTable } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET — obtener todos los puntajes
export async function GET() {
    try {
        const scores = await client
            .select()
            .from(FortniteLeagueScoresTable)
            .execute();

        return new Response(JSON.stringify({ scores }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Error fetching scores:", error);
        return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
    }
}

// POST — crear o actualizar puntaje de un jugador
export async function POST({ request }: { request: Request }) {
    try {
        const body = await request.json();
        const { inscriptionId, set1, set2, set3 } = body;

        if (!inscriptionId) {
            return new Response(JSON.stringify({ error: "Falta inscriptionId" }), { status: 400 });
        }

        const s1 = parseInt(set1) || 0;
        const s2 = parseInt(set2) || 0;
        const s3 = parseInt(set3) || 0;
        const total = s1 + s2 + s3;

        // Upsert: si ya existe actualiza, sino crea
        const existing = await client
            .select()
            .from(FortniteLeagueScoresTable)
            .where(eq(FortniteLeagueScoresTable.inscriptionId, inscriptionId))
            .execute();

        let score;
        if (existing.length > 0) {
            [score] = await client
                .update(FortniteLeagueScoresTable)
                .set({ set1: s1, set2: s2, set3: s3, total, updatedAt: new Date() })
                .where(eq(FortniteLeagueScoresTable.inscriptionId, inscriptionId))
                .returning()
                .execute();
        } else {
            [score] = await client
                .insert(FortniteLeagueScoresTable)
                .values({ inscriptionId, set1: s1, set2: s2, set3: s3, total })
                .returning()
                .execute();
        }

        return new Response(JSON.stringify({ score }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Error saving score:", error);
        return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
    }
}
