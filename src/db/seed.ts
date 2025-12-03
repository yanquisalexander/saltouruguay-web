import { TEAMS } from "../consts/Teams";
import { ACHIEVEMENTS } from "../consts/Achievements";
import { client } from "./client";
import { AchievementsTable, StreamerWarsTeamsTable } from "./schema";
import { seedRuletaLocaPhrases } from "./seeds/ruleta-loca-phrases";

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

    try {
        await seedRuletaLocaPhrases();
    } catch (error) {
        console.error("Error seeding Ruleta Loca phrases:", error)
    }



}
