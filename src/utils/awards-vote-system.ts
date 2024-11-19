import { CATEGORIES } from "@/awards/Categories";
import { client } from "@/db/client";
import { VotesTable } from "@/db/schema";
import type { Session } from "@auth/core/types";
import { z } from "astro/zod";
import { count, eq } from "drizzle-orm";


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
    return votes;
}