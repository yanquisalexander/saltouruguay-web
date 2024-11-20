import { SALTO_BROADCASTER_ID } from "@/config";
import { client } from "@/db/client";
import { MemberCards, UsersTable } from "@/db/schema";

import {
    createUserApiClient,
    createStaticAuthProvider,
    TWITCH_SCOPES,
} from "@/lib/Twitch";
import { count, eq, QueryPromise } from "drizzle-orm";
import { unlockAchievement } from "./achievements";
import { ACHIEVEMENTS } from "@/consts/Achievements";



export const getUserSubscription = async (twitchUserId: string, token: string) => {
    try {
        console.log("Fetching subscription for user", twitchUserId);
        console.log({ twitchUserId, token });
        const authProvider = createStaticAuthProvider(token);
        const apiClient = createUserApiClient(authProvider);

        const subscription = await apiClient.subscriptions.checkUserSubscription(
            twitchUserId,
            SALTO_BROADCASTER_ID,
        );

        if (!subscription) {
            console.log("User is not subscribed");
            return null;
        }

        return subscription.tier
            ? (parseInt(subscription.tier.charAt(0)) as 1 | 2 | 3)
            : null;
    } catch (error) {
        console.error("Error fetching subscription:", error);
        return null;
    }
};


export const updateStickers = async (memberId: number, stickers: string[]) => {
    try {
        // Verifica si ya existe un registro para la membercard
        const existingMemberCard = await client
            .select()
            .from(MemberCards)
            .where(eq(MemberCards.userId, memberId.toString()))
            .execute();

        // Si no existe un registro previo, desbloquea el logro
        if (!existingMemberCard.length) {
            try {
                await unlockAchievement({
                    userId: memberId,
                    achievementId: ACHIEVEMENTS.CREATED_MEMBER_CARD,
                });
            } catch (error) {
                console.error("Error unlocking achievement: Maybe it was already unlocked?", error);
            }
        }

        // Inserta o actualiza el registro
        await client
            .insert(MemberCards)
            .values({
                userId: memberId.toString(),
                stickers,
            })
            .onConflictDoUpdate({
                target: [MemberCards.userId],
                set: {
                    stickers,
                    updatedAt: new Date(),
                },
            });

    } catch (error) {
        console.error("Error updating stickers:", error);
    }
};


export const getMemberCardData = async (memberId: number) => {
    const card = await client.query.MemberCards.findFirst({
        where: eq(MemberCards.userId, memberId.toString()),
    })

    return card
}

export const getTotalOfMemberCards = async () => {
    const result = await client.select({ value: count() }).from(MemberCards).execute();
    const { value } = result[0];
    return value;
}