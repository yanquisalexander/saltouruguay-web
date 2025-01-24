import { TEAMS } from "../consts/Teams";
import { ACHIEVEMENTS } from "../consts/Achievements";
import { client } from "./client";
import { AchievementsTable, StreamerWarsTeamsTable } from "./schema";

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

    const teams = Object.values(TEAMS);

    for (const team of teams) {
        await client
            .insert(StreamerWarsTeamsTable)
            .values({
                color: team,
            })
            .onConflictDoNothing();
    }


}
