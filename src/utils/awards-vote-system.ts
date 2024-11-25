import { CATEGORIES } from "@/awards/Categories";
import { NOMINEES } from "@/awards/Nominees";
import { client } from "@/db/client";
import { VotesTable } from "@/db/schema";
import cacheService from "@/services/cache";
import type { Session } from "@auth/core/types";
import { z } from "astro/zod";
import { count, eq, sql } from "drizzle-orm";


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
    const votes = await client.select().from(VotesTable).where(eq(VotesTable.userId, userId)).execute();

    if (votes.length === 0) {
        return null;
    }
    return votes;
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
        totalPoints: sql<number>`SUM(
            CASE 
                WHEN ${VotesTable.ranking} = 0 THEN 1
                WHEN ${VotesTable.ranking} = 1 THEN 0.5
                ELSE 0
            END
        )`.as("total_points"),
    }).from(VotesTable).groupBy(VotesTable.categoryId, VotesTable.nomineeId).execute();

    return votes;
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
                percentage: 0.00,
            })),
        ])
    );

    // Fill the structure with actual data
    for (const vote of calculatedVotes) {
        const { categoryId, nomineeId, totalPoints } = vote;

        const category = groupedVotes[categoryId];
        if (category) {
            const nominee = category.find(n => n.nomineeId === nomineeId);

            if (nominee) {
                nominee.realTotalPoints = totalPoints;
                nominee.roundTotalPoints = Math.round(totalPoints);
                nominee.percentage = Math.round((totalPoints / category.reduce((acc, n) => acc + n.realTotalPoints, 0)) * 100)
            }
        }
    }

    return groupedVotes;
}

export const getGroupedVotes = async () => {
    const cache = cacheService.create({ ttl: 60 * 60 * 48 /* 48 hours */ });

    const groupedVotes = await cache.get("calculatedVotes");

    if (!groupedVotes) {
        const calculatedVotes = await calculateVotes();
        const groupedVotes = createGroupedVotes({ calculatedVotes });

        cache.set("calculatedVotes", groupedVotes);

        return groupedVotes;
    }

    return groupedVotes;
}