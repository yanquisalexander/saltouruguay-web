import { createEvent, getPaginatedEvents, updateEvent } from "@/lib/events";
import { ActionError, defineAction } from "astro:actions";
import { z } from "astro:schema";
import { getSession } from "auth-astro/server";

export const events = {
    getEvents: defineAction({
        input: z.object({
            page: z.number().optional().default(1),
            limit: z.number().optional().default(10),
        }),
        handler: async ({ page, limit }, { request }) => {
            const session = await getSession(request);

            if (!session?.user.isAdmin) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "No tienes permisos para ver los eventos"
                });
            }

            const { events, hasMore } = await getPaginatedEvents(page, limit);

            return {
                events,
                hasMore,
            };
        },
    }),
    updateEvent: defineAction({
        input: z.object({
            id: z.number(),
            name: z.string(),
            description: z.string(),
            location: z.string().optional(),
            startDate: z.string(),
            endDate: z.string().optional(),
            cover: z.string().optional(),
            featured: z.boolean().optional(),
        }),
        handler: async ({ id, name, description, startDate, endDate, location, cover, featured }, { request }) => {
            const session = await getSession(request);

            if (!session?.user.isAdmin) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "No tienes permisos para editar eventos"
                });
            }

            const event = await updateEvent(id, {
                name,
                description,
                location,
                startDate: new Date(startDate),
                endDate: endDate ? new Date(endDate) : undefined,
                cover,
                featured,
            });

            if (!event) {
                throw new ActionError({
                    code: "NOT_FOUND",
                    message: "Evento no encontrado"
                });
            }

            return {
                event,
            };
        }
    }),
    createEvent: defineAction({
        input: z.object({
            name: z.string(),
            description: z.string(),
            startDate: z.string(),
            endDate: z.string().optional(),
            location: z.string().optional(),
            cover: z.string().optional(),
            featured: z.boolean().optional(),
        }),
        handler: async ({ name, description, startDate, endDate, location, cover, featured }, { request }) => {
            const session = await getSession(request);

            if (!session?.user.isAdmin) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "No tienes permisos para crear eventos"
                });
            }

            const event = await createEvent({
                name,
                description,
                startDate: new Date(startDate),
                endDate: endDate ? new Date(endDate) : undefined,
                location,
                mainOrganizerId: session.user.id,
                cover,
                featured: featured || false,
            });

            if (!event) {
                throw new ActionError({
                    code: "NOT_FOUND",
                    message: "Evento no encontrado"
                });
            }

            return {
                event,
            };
        }
    }),
}