import { client } from "@/db/client";
import { Extremo3PlayersTable, SaltoCraftExtremo3InscriptionsTable } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
    try {
        const players = await client
            .select({
                id: Extremo3PlayersTable.id,
                livesCount: Extremo3PlayersTable.livesCount,
                isConfirmedPlayer: Extremo3PlayersTable.isConfirmedPlayer,
                inscription: {
                    minecraft_username: SaltoCraftExtremo3InscriptionsTable.minecraft_username,
                    discordUsername: SaltoCraftExtremo3InscriptionsTable.discordUsername,
                },
            })
            .from(Extremo3PlayersTable)
            .innerJoin(
                SaltoCraftExtremo3InscriptionsTable,
                eq(Extremo3PlayersTable.inscriptionId, SaltoCraftExtremo3InscriptionsTable.id)
            )
            .execute();

        return new Response(JSON.stringify({ players }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Error fetching players:", error);
        return new Response(JSON.stringify({ error: "Internal server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
