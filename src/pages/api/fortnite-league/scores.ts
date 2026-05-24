export const prerender = false;

import { client } from "@/db/client";
import { FortniteLeagueScoresTable } from "@/db/schema";
import { eq } from "drizzle-orm";

// Crear tabla si no existe
async function ensureTable() {
    try {
        await client.execute(`
            CREATE TABLE IF NOT EXISTS fortnite_league_scores (
                id SERIAL PRIMARY KEY,
                inscription_id INTEGER NOT NULL REFERENCES fortnite_league_inscriptions(id) ON DELETE CASCADE,
                set1 INTEGER NOT NULL DEFAULT 0,
                set2 INTEGER NOT NULL DEFAULT 0,
                set3 INTEGER NOT NULL DEFAULT 0,
                total INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMP NOT NULL DEFAULT current_timestamp,
                updated_at TIMESTAMP NOT NULL DEFAULT current_timestamp,
                UNIQUE(inscription_id)
            );
        `);
    } catch (e) {
        // Ya existe, continuar
    }
}

// GET — obtener todos los puntajes
export async function GET() {
    await ensureTable();
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
    await ensureTable();
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
