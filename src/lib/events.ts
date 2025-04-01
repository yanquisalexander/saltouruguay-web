import { EventAssistantsTable, EventsTable } from "@/db/schema";

import { client } from "@/db/client";
import { count, desc, eq } from "drizzle-orm";


export const getEvents = async (page: number, limit: number) => {
    const events = await client.query.EventsTable.findMany({
        with: {
            mainOrganizer: {
                columns: {
                    id: true,
                    displayName: true,
                    username: true,
                    avatar: true,
                }
            },
            assistants: {
                columns: {
                    id: true,

                }
            },
        },
        orderBy: [desc(EventsTable.startDate)],
        limit,
        offset: (page - 1) * limit
    });

    const hasMore = events.length > limit;
    return { events: events.slice(0, limit), hasMore };
};

export const getPaginatedEvents = async (page: number, limit: number) => {
    console.log(`Fetching events with page: ${page}, limit: ${limit}, offset: ${(page - 1) * limit}`);
    return await getEvents(page, limit);
};

export const getEventById = async (id: number) => {
    return await client
        .select()
        .from(EventsTable)
        .where(eq(EventsTable.id, id))
        .limit(1)
};

export const updateEvent = async (id: number, data: Partial<typeof EventsTable.$inferInsert>) => {
    return await client
        .update(EventsTable)
        .set(data)
        .where(eq(EventsTable.id, id))
        .returning()
        .then((res) => res[0]);
}

export const deleteEvent = async (id: number) => {
    return await client
        .delete(EventsTable)
        .where(eq(EventsTable.id, id))
        .returning()
        .then((res) => res[0]);
}

export const createEvent = async (data: typeof EventsTable.$inferInsert) => {
    return await client
        .insert(EventsTable)
        .values(data)
        .returning()
        .then((res) => res[0]);
}

export const confirmAssistanceToEvent = async (id: number, userId: number) => {
    return await client
        .insert(EventAssistantsTable)
        .values({
            eventId: id,
            userId
        })
        .onConflictDoNothing()
        .returning()
        .then((res) => res[0]);
}

export const getEventAssistants = async (eventId: number) => {
    return await client
        .query.EventAssistantsTable.findMany({
            where: eq(EventAssistantsTable.eventId, eventId),
            with: {
                user: {
                    columns: {
                        id: true,
                        displayName: true,
                        username: true,
                        avatar: true,
                    }
                }
            }
        })
};

export const getEventAssistantsCount = async (eventId: number) => {
    return await client
        .select({ value: count() })
        .from(EventAssistantsTable)
        .where(eq(EventAssistantsTable.eventId, eventId))
        .then((res) => res[0]?.value ?? 0);
}

