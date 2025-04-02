import { client } from "@/db/client";
import { getNewSignupsLastWeek, getTotalOfUsers } from "./user";
import { TwitchProcessedEventsTable } from "@/db/schema";
import { count, desc } from "drizzle-orm";
import { getEventsCount } from "@/lib/events";

export const getSiteStats = async () => {
    const [totalUsers, newSignupsWeek, activeEvents] = await Promise.all([
        getTotalOfUsers(),
        getNewSignupsLastWeek(),
        getEventsCount()
    ]);

    return { totalUsers, newSignupsWeek, activeEvents };
};



export const getTwitchEvents = async (page: number, limit: number) => {
    const events = await client
        .select()
        .from(TwitchProcessedEventsTable)
        .orderBy(desc(TwitchProcessedEventsTable.processedAt))
        .limit(limit + 1)
        .offset((page - 1) * limit);

    console.log("Events: ", events);
    const hasMore = events.length > limit;
    return { events: events.slice(0, limit), hasMore };
};



export const getPaginatedTwitchEvents = async (page: number, limit: number) => {
    console.log(`Fetching events with page: ${page}, limit: ${limit}, offset: ${(page - 1) * limit}`);
    return await getTwitchEvents(page, limit);
};
