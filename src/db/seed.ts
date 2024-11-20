import { ACHIEVEMENTS } from "../consts/Achievements";
import { client } from "./client";
import { AchievementsTable } from "./schema";

export const seed = async () => {
    console.log('Seeding database...');

    const achievements = Object.values(ACHIEVEMENTS);

    for (const achievement of achievements) {
        await client.insert(AchievementsTable).values({
            achievementId: achievement,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }).onConflictDoNothing();
    }

}
