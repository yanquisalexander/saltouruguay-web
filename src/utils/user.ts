import { SALTO_BROADCASTER_ID } from "@/config";
import { client } from "@/db/client";
import { MemberCards, UserAchievementsTable } from "@/db/schema";
import { MemberCardSkins } from "@/consts/MemberCardSkins";
import { createUserApiClient, createStaticAuthProvider } from "@/lib/Twitch";
import { count, eq } from "drizzle-orm";
import { unlockAchievement } from "./achievements";
import { ACHIEVEMENTS } from "@/consts/Achievements";

/**
 * Obtiene la suscripción de un usuario en Twitch.
 */
export const getUserSubscription = async (twitchUserId: string, token: string) => {
    try {
        const apiClient = createUserApiClient(createStaticAuthProvider(token));
        const subscription = await apiClient.subscriptions.checkUserSubscription(
            twitchUserId,
            SALTO_BROADCASTER_ID
        );

        return subscription?.tier ? parseInt(subscription.tier.charAt(0)) as 1 | 2 | 3 : null;
    } catch (error) {
        console.error("Error fetching subscription:", error);
        return null;
    }
};

/**
 * Actualiza las stickers de una MemberCard.
 */
export const updateStickers = async (memberId: number, stickers: string[]) => {
    await ensureMemberCardExists(memberId);

    try {
        await client
            .insert(MemberCards)
            .values({ userId: memberId.toString(), stickers })
            .onConflictDoUpdate({
                target: [MemberCards.userId],
                set: { stickers, updatedAt: new Date() },
            });
    } catch (error) {
        console.error("Error updating stickers:", error);
    }
};

/**
 * Obtiene la información de una MemberCard específica.
 */
export const getMemberCardData = async (memberId: number) => {
    return await client.query.MemberCards.findFirst({
        where: eq(MemberCards.userId, memberId.toString()),
    });
};

/**
 * Obtiene el total de MemberCards registradas.
 */
export const getTotalOfMemberCards = async () => {
    const result = await client.select({ value: count() }).from(MemberCards).execute();
    return result[0]?.value || 0;
};

/**
 * Actualiza la skin de una MemberCard.
 */
export const updateCardSkin = async (memberId: number, skin: typeof MemberCardSkins[number]['id']) => {
    await ensureMemberCardExists(memberId);

    try {
        await client
            .insert(MemberCards)
            .values({ userId: memberId.toString(), skin, stickers: [] })
            .onConflictDoUpdate({
                target: [MemberCards.userId],
                set: { skin, updatedAt: new Date() },
            });
    } catch (error) {
        console.error("Error updating card skin:", error);
    }
};

/**
 * Asegura que exista un registro para la MemberCard del usuario y desbloquea un logro si es necesario.
 */
const ensureMemberCardExists = async (memberId: number) => {
    const existingCard = await client
        .select()
        .from(MemberCards)
        .where(eq(MemberCards.userId, memberId.toString()))
        .execute();

    if (!existingCard.length) {
        try {
            await unlockAchievement({
                userId: memberId,
                achievementId: ACHIEVEMENTS.CREATED_MEMBER_CARD,
            });
        } catch (error) {
            console.error(
                "Error unlocking achievement: Maybe it was already unlocked?",
                error
            );
        }
    }
};

export const getUserAchievements = async (userId: number) => {
    return await client.query.UserAchievementsTable.findMany({
        where: eq(UserAchievementsTable.userId, userId),
    });
}

export const getDebateMessages = async () => {
    return await client.query.DebateAnonymousMessagesTable.findMany({
        with: {
            user: {
                columns: {
                    displayName: true,
                    avatar: true,
                }
            }
        }
    })
}