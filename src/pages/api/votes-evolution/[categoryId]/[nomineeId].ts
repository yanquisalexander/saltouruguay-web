import { client } from "@/db/client";
import { VotesTable } from "@/db/schema";
import { and, eq, sql, gte, lte } from "drizzle-orm";
import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ params }) => {
    const { categoryId, nomineeId } = params;

    if (!categoryId || !nomineeId) {
        return new Response(JSON.stringify({ error: "Missing parameters" }), { status: 400 });
    }

    // Define date range for December 2025
    const startDate = new Date('2025-12-01T00:00:00');
    const endDate = new Date('2025-12-23T23:59:59');

    try {
        // Query votes grouped by date
        // We cast created_at to date to group by day
        const votes = await client
            .select({
                date: sql<string>`TO_CHAR(${VotesTable.createdAt}, 'YYYY-MM-DD')`,
                points: sql<number>`SUM(
                  CASE 
                      WHEN ${VotesTable.ranking} = 0 THEN 1
                      WHEN ${VotesTable.ranking} = 1 THEN 0.5
                      ELSE 0
                  END
                )`,
                count: sql<number>`COUNT(*)`
            })
            .from(VotesTable)
            .where(
                and(
                    eq(VotesTable.categoryId, categoryId),
                    eq(VotesTable.nomineeId, nomineeId),
                    gte(VotesTable.createdAt, startDate),
                    lte(VotesTable.createdAt, endDate)
                )
            )
            .groupBy(sql`TO_CHAR(${VotesTable.createdAt}, 'YYYY-MM-DD')`)
            .orderBy(sql`TO_CHAR(${VotesTable.createdAt}, 'YYYY-MM-DD')`);

        const dailyPoints: Record<string, number> = {};
        const dailyVotes: Record<string, number> = {};

        votes.forEach(v => {
            dailyPoints[v.date] = Number(v.points);
            dailyVotes[v.date] = Number(v.count);
        });

        const labels: string[] = [];
        const pointsData: number[] = [];
        const votesData: number[] = [];
        const dailyPointsData: number[] = [];
        const dailyVotesData: number[] = [];

        let cumulativePoints = 0;
        let cumulativeVotes = 0;

        // Loop from Dec 1 to Dec 23
        for (let d = 1; d <= 23; d++) {
            const dateStr = `2025-12-${d.toString().padStart(2, '0')}`;

            const points = dailyPoints[dateStr] || 0;
            const votesCount = dailyVotes[dateStr] || 0;

            cumulativePoints += points;
            cumulativeVotes += votesCount;

            labels.push(`${d} Dic`);
            pointsData.push(cumulativePoints);
            votesData.push(cumulativeVotes);
            dailyPointsData.push(points);
            dailyVotesData.push(votesCount);
        }

        return new Response(JSON.stringify({ labels, pointsData, votesData, dailyPointsData, dailyVotesData }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (error) {
        console.error("Error fetching votes evolution:", error);
        return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
    }
}
