import { ACHIEVEMENTS, ACHIEVEMENTS_TEXTS } from "@/consts/Achievements"
import { client } from "@/db/client"
import { UserAchievement } from "@/db/entities/UserAchievement"
import { pusher } from "./pusher"


export const unlockAchievement = async ({ userId, achievementId }: { userId: number, achievementId: typeof ACHIEVEMENTS[keyof typeof ACHIEVEMENTS] }) => {
    try {
        const userAchievement = client.getRepository(UserAchievement).create({
            userId,
            achievementId,
            unlockedAt: new Date()
        });
        await client.getRepository(UserAchievement).save(userAchievement);

        console.log(`Logro desbloqueado para el usuario ${userId}:`, achievementId);
        try {
            pusher.trigger(`user-${userId}-achievements`, 'achievement-unlocked', { id: achievementId, title: ACHIEVEMENTS_TEXTS.find(achievement => achievement.id === achievementId)?.title })
        } catch (error) {
            console.error("Pusher error:", error);
        }
        return true;
    } catch (error) {
        console.error("Error unlocking achievement:", error);
        return false;
    }
}
