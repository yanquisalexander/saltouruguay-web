import { CATEGORIES } from "@/awards/Categories";
import { NOMINEES } from "@/awards/Nominees";
import { client } from "@/db/client";
import { VotesTable } from "@/db/schema";
import cacheService from "@/services/cache";
import type { Session } from "@auth/core/types";
import { z } from "astro/zod";
import { asc, count, eq, sql } from "drizzle-orm";


export const VoteSchema = z.object({
    nomineeId: z.string(),
    categoryId: z.string(),
});

export const VotesSchema = z.record(z.array(VoteSchema));

export type Vote = z.infer<typeof VoteSchema>;

export type Votes = z.infer<typeof VotesSchema>;


export const submitVotes = async (votes: Votes, user: Session['user']) => {
    console.log({ votes })
    console.log("Votos enviados")




    try {
        await client.insert(VotesTable).values(
            Object.entries(votes).map(([categoryId, votes]) =>
                votes.map((vote, index) => ({
                    nomineeId: vote.nomineeId,
                    categoryId,
                    userId: user.id,
                    ranking: index,
                }))
            ).flat()
        ).onConflictDoNothing().execute();
    } catch (error) {
        console.error(error);
        throw new Error("Error al guardar los votos");
    }

    console.log("Votos guardados")

    return true;
}


export const currentUserVotes = async (userId: number) => {
    const votes = await client.select().from(VotesTable).where(eq(VotesTable.userId, userId))
        .orderBy(VotesTable.ranking, asc(VotesTable.ranking)).execute();

    if (votes.length === 0) {
        return null;
    }
    return votes
}

export const calculateVotes = async () => {
    /* 
    SELECT 
    v.category_id AS categoria_id,
    v.nominee_id AS nominacion_id,
    SUM(
        CASE 
            WHEN v.ranking = 0 THEN 1
            WHEN v.ranking = 1 THEN 0.5
            ELSE 0
        END
    ) AS total_puntos
FROM votes v
GROUP BY v.category_id, v.nominee_id */

    const votes = await client.select({
        categoryId: VotesTable.categoryId,
        nomineeId: VotesTable.nomineeId,
        totalPoints: sql<string>`SUM(
            CASE 
                WHEN ${VotesTable.ranking} = 0 THEN 1
                WHEN ${VotesTable.ranking} = 1 THEN 0.5
                ELSE 0
            END
        )`.as("total_points"),
        count: count().as("votes"),
    }).from(VotesTable).groupBy(VotesTable.categoryId, VotesTable.nomineeId).execute();

    return votes.map((vote) => ({
        ...vote,
        totalPoints: parseFloat(vote.totalPoints),

    }));
}

export const createGroupedVotes = ({ calculatedVotes }: { calculatedVotes: Awaited<ReturnType<typeof calculateVotes>> }) => {
    // Initialize the structure with all categories and their nominees
    const groupedVotes = Object.fromEntries(
        CATEGORIES.map(category => [
            category.id,
            category.nominees.map(({ id: nomineeId }) => ({
                nomineeId,
                displayName: Object.values(NOMINEES).find(n => n.username === nomineeId)?.displayName || "Unknown",
                realTotalPoints: 0,
                roundTotalPoints: 0,
                percentage: 0.0,
                votes: 0,
            })),
        ])
    );

    // Fill the structure with actual data
    for (const vote of calculatedVotes) {
        const { categoryId, nomineeId, totalPoints } = vote;
        console.log({ vote })

        const category = groupedVotes[categoryId];
        if (category) {
            const nominee = category.find(n => n.nomineeId === nomineeId);

            if (nominee) {
                nominee.realTotalPoints = totalPoints;
                nominee.roundTotalPoints = Math.round(totalPoints);
                nominee.votes = vote.count || 0;
            }
        }
    }

    // Calculate percentages per category
    for (const category of CATEGORIES) {
        const nominees = groupedVotes[category.id];
        const totalPoints = nominees.reduce((acc, nominee) => acc + nominee.realTotalPoints, 0);

        for (const nominee of nominees) {
            nominee.percentage = totalPoints === 0
                ? 0
                : parseFloat(((nominee.realTotalPoints / totalPoints) * 100).toFixed(1));
        }
    }

    return groupedVotes;
};


export const getGroupedVotes = async (): Promise<ReturnType<typeof createGroupedVotes>> => {
    const cache = cacheService.create({ ttl: 60 * 60 * 48 /* 48 hours */ });

    let groupedVotes = await cache.get("calculatedVotes");

    if (!groupedVotes) {
        const calculatedVotes = await calculateVotes();
        groupedVotes = createGroupedVotes({ calculatedVotes });

        await cache.set("calculatedVotes", groupedVotes);
    }

    return groupedVotes as ReturnType<typeof createGroupedVotes>;
};


export const getTotalVotes = async () => {
    const result = await client.select({ count: sql<number>`count(*)`.as('count') }).from(VotesTable).execute();
    const count = result[0]?.count || 0;

    return count;
}