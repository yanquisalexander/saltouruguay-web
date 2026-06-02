import { client } from "@/db/client";
import { UsersTable } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export const SALTOGRAM_REWARDS = {
    CREATE_POST: 5,
    RECEIVE_REACTION: 1,
    RECEIVE_COMMENT: 2,
    ADD_REACTION: 1,
    ADD_COMMENT: 1,
} as const;

export const FEATURE_POST_COST = 50;
export const FEATURE_POST_DURATION_HOURS = 24;

/**
 * Award coins to a user — atómico, single SQL UPDATE
 */
export async function awardCoins(userId: number, amount: number): Promise<void> {
    await client
        .update(UsersTable)
        .set({
            coins: sql`${UsersTable.coins} + ${amount}`,
        })
        .where(eq(UsersTable.id, userId));
}

/**
 * Deduct coins from a user — atómico con check en la misma query
 */
export async function deductCoins(userId: number, amount: number): Promise<boolean> {
    const result = await client
        .update(UsersTable)
        .set({
            coins: sql`${UsersTable.coins} - ${amount}`,
        })
        .where(
            sql`${UsersTable.id} = ${userId} AND ${UsersTable.coins} >= ${amount}`
        )
        .returning({ id: UsersTable.id });

    return result.length > 0;
}

/**
 * Get user's current coins
 */
export async function getUserCoins(userId: number): Promise<number> {
    const user = await client
        .select({ coins: UsersTable.coins })
        .from(UsersTable)
        .where(eq(UsersTable.id, userId))
        .limit(1);

    return user[0]?.coins || 0;
}
