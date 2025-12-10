import { client } from "@/db/client";
import { VotesTable } from "@/db/schema";
import { and, eq, sql, gte, lte } from "drizzle-orm";
import type { APIRoute } from "astro";
import { NOMINEES } from "@/awards/Nominees";

export const GET: APIRoute = async ({ params }) => {
    const { categoryId } = params;

    if (!categoryId) {
        return new Response(JSON.stringify({ error: "Missing parameters" }), { status: 400 });
    }

    const startDate = new Date('2025-12-01T00:00:00');
    const endDate = new Date('2025-12-23T23:59:59');

    try {
        const votes = await client
            .select({
                nomineeId: VotesTable.nomineeId,
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
                    gte(VotesTable.createdAt, startDate),
                    lte(VotesTable.createdAt, endDate)
                )
            )
            .groupBy(VotesTable.nomineeId, sql`TO_CHAR(${VotesTable.createdAt}, 'YYYY-MM-DD')`)
            .orderBy(sql`TO_CHAR(${VotesTable.createdAt}, 'YYYY-MM-DD')`);

        // Process data
        const nomineesData: Record<string, { dailyPoints: Record<string, number>, dailyVotes: Record<string, number> }> = {};

        votes.forEach(v => {
            if (!nomineesData[v.nomineeId]) {
                nomineesData[v.nomineeId] = { dailyPoints: {}, dailyVotes: {} };
            }
            nomineesData[v.nomineeId].dailyPoints[v.date] = Number(v.points);
            nomineesData[v.nomineeId].dailyVotes[v.date] = Number(v.count);
        });

        const labels: string[] = [];
        const datasets: any[] = []; // Will hold data for each nominee

        // Generate labels (dates)
        for (let d = 1; d <= 23; d++) {
            labels.push(`${d} Dic`);
        }

        // Build datasets
        Object.keys(nomineesData).forEach(nomineeId => {
            // @ts-ignore
            const nominee = NOMINEES[nomineeId as keyof typeof NOMINEES];
            const displayName = nominee ? nominee.displayName : nomineeId;

            const pointsData: number[] = [];
            const votesData: number[] = [];
            const dailyPointsData: number[] = [];
            const dailyVotesData: number[] = [];

            let cumulativePoints = 0;
            let cumulativeVotes = 0;

            for (let d = 1; d <= 23; d++) {
                const dateStr = `2025-12-${d.toString().padStart(2, '0')}`;
                const points = nomineesData[nomineeId].dailyPoints[dateStr] || 0;
                const votesCount = nomineesData[nomineeId].dailyVotes[dateStr] || 0;

                cumulativePoints += points;
                cumulativeVotes += votesCount;

                pointsData.push(cumulativePoints);
                votesData.push(cumulativeVotes);
                dailyPointsData.push(points);
                dailyVotesData.push(votesCount);
            }

            datasets.push({
                label: displayName,
                nomineeId,
                pointsData,
                votesData,
                dailyPointsData,
                dailyVotesData
            });
        });

        return new Response(JSON.stringify({ labels, datasets }), {
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error("Error fetching category votes evolution:", error);
        return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
    }
}
