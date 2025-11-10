import { ACHIEVEMENTS, ACHIEVEMENTS_TEXTS } from "@/consts/Achievements"
import { client } from "@/db/client"
import { AchievementsTable, UserAchievementsTable } from "@/db/schema"
import { pusher } from "./pusher"


export const unlockAchievement = async ({ userId, achievementId }: { userId: number, achievementId: typeof ACHIEVEMENTS[keyof typeof ACHIEVEMENTS] }) => {
    const result = await client.insert(UserAchievementsTable)
        .values({
            userId,
            achievementId,
            unlockedAt: new Date()
        })
        .execute()

    if (result.rowCount === 1) {
        console.log(`Logro desbloqueado para el usuario ${userId}:`, achievementId);
        try {
            pusher.trigger(`user-${userId}-achievements`, 'achievement-unlocked', { id: achievementId, title: ACHIEVEMENTS_TEXTS.find(achievement => achievement.id === achievementId)?.title })
        } catch (error) {
            console.error("Pusher error:", error);
        } return true
    }

    return false
}
