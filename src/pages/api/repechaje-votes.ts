import { client } from "@/db/client";
import { Extremo3PlayersTable, SaltoCraftExtremo3InscriptionsTable, Extremo3RepechajeVotesTable } from "@/db/schema";
import { eq, count, desc } from "drizzle-orm";

export async function GET() {
    try {
        // Obtener jugadores en repechaje
        const playersInRepechaje = await client
            .select({
                id: Extremo3PlayersTable.id,
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
            .where(eq(Extremo3PlayersTable.isRepechaje, true))
            .execute();

        // Obtener conteo de votos para cada jugador
        const voteCounts = await client
            .select({
                playerId: Extremo3RepechajeVotesTable.playerId,
                count: count(Extremo3RepechajeVotesTable.id),
            })
            .from(Extremo3RepechajeVotesTable)
            .groupBy(Extremo3RepechajeVotesTable.playerId)
            .execute();

        // Combinar los datos
        const votes = playersInRepechaje
            .map((player) => {
                const voteData = voteCounts.find((v) => v.playerId === player.id);
                return {
                    playerId: player.id,
                    minecraft_username: player.inscription.minecraft_username,
                    discordUsername: player.inscription.discordUsername,
                    voteCount: voteData?.count || 0,
                };
            })
            .sort((a, b) => b.voteCount - a.voteCount);

        return new Response(JSON.stringify({ votes }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Error fetching repechaje votes:", error);
        return new Response(JSON.stringify({ error: "Internal server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}