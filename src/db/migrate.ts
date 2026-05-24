import { client } from "./client";

export async function createTablesIfNotExist() {
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
        console.log("✓ fortnite_league_scores table ready");
    } catch (error) {
        console.error("Error creating table:", error);
    }
}