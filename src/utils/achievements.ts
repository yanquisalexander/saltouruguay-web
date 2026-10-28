import { ACHIEVEMENTS_TEXTS, type AchievementId, type AchievementEvent } from "@/consts/Achievements"
import { client } from "@/db/client"
import { AchievementsTable, UserAchievementsTable } from "@/db/schema"
import { createNotificationsForUsers } from "@/services/push"
import { pusher } from "./pusher"

/** Group unlocks per operation and notify only rows actually inserted. */
export const unlockAchievements = async ({ userId, achievementIds }: { userId: number; achievementIds: AchievementId[] }) => {
    const ids = [...new Set(achievementIds)]
    if (!ids.length) return []
    // Register definitions before inserting rows referencing them; no manual seed needed.
    await client.insert(AchievementsTable).values(ids.map(achievementId => ({ achievementId }))).onConflictDoNothing()
    const inserted = await client.insert(UserAchievementsTable)
        .values(ids.map(achievementId => ({ userId, achievementId, unlockedAt: new Date() })))
        .onConflictDoNothing().returning()
    const achievements = inserted.flatMap(row => {
        const definition = ACHIEVEMENTS_TEXTS.find(a => a.id === row.achievementId)
        return definition ? [{ id: definition.id, title: definition.title, rarity: definition.rarity }] : []
    })
    if (!achievements.length) return []
    const title = achievements.length === 1 ? '¡Has desbloqueado un logro!' : '¡Has desbloqueado ' + achievements.length + ' logros!'
    const results = await Promise.allSettled([
        createNotificationsForUsers([userId], {
            title, message: achievements.map(a => a.title).join(', '),
            type: 'achievement', link: '/comunidad/logros',
        }),
        pusher.trigger('user-' + userId + '-achievements', 'achievement-unlocked', {
            ...(achievements.length === 1 ? achievements[0] : {}), achievements, count: achievements.length,
        }),
    ])
    for (const result of results) {
        if (result.status === 'rejected') console.error('Achievement notification failed:', result.reason)
    }
    return achievements
}

export const unlockAchievement = async ({ userId, achievementId }: { userId: number; achievementId: AchievementId }) =>
    (await unlockAchievements({ userId, achievementIds: [achievementId] })).length > 0

/** Absolute totals award previous milestones together, without counting webhook deliveries. */
export const evaluateAchievementEvent = async (userId: number, event: AchievementEvent) => {
    if (!Number.isSafeInteger(event.months) || event.months < 1) return []
    return unlockAchievements({ userId, achievementIds: ACHIEVEMENTS_TEXTS
        .filter(a => a.condition?.event === event.type && event.months >= a.condition.minMonths)
        .map(a => a.id) })
}
