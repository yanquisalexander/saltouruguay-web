import { client } from "@/db/client";
import { UsersTable } from "@/db/schema";
import { eq } from "drizzle-orm";

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
 * Award coins to a user
 */
export async function awardCoins(userId: number, amount: number): Promise<void> {
    await client
        .update(UsersTable)
        .set({
            coins: eq(UsersTable.coins, UsersTable.coins + amount),
        })
        .where(eq(UsersTable.id, userId));
}

/**
 * Deduct coins from a user
 */
export async function deductCoins(userId: number, amount: number): Promise<boolean> {
    const user = await client
        .select({ coins: UsersTable.coins })
        .from(UsersTable)
        .where(eq(UsersTable.id, userId))
        .limit(1);

    if (!user[0] || user[0].coins < amount) {
        return false;
    }

    await client
        .update(UsersTable)
        .set({
            coins: user[0].coins - amount,
        })
        .where(eq(UsersTable.id, userId));

    return true;
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
