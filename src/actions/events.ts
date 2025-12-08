import { cancelAssistanceToEvent, confirmAssistanceToEvent } from "@/lib/events";
import { ActionError, defineAction } from "astro:actions";
import { z } from "astro:schema";
import { getSession } from "auth-astro/server";
import { client } from "@/db/client";
import { EventsTable } from "@/db/schema";
import { gt, asc, or, isNotNull, and } from "drizzle-orm";

export const events = {
    getUpcoming: defineAction({
        handler: async () => {
            const events = await client.query.EventsTable.findMany({
                where: or(
                    gt(EventsTable.startDate, new Date()),
                    and(isNotNull(EventsTable.endDate), gt(EventsTable.endDate, new Date()))
                ),
                orderBy: [asc(EventsTable.startDate)],
                limit: 10,
                columns: {
                    id: true,
                    name: true,
                    startDate: true,
                    cover: true
                }
            });
            return { events };
        }
    }),
    assistToEvent: defineAction({
        input: z.object({
            eventId: z.number(),
        }),
        async handler({ eventId }, { request }) {
            const session = await getSession(request);
            if (!session) throw new ActionError({
                code: "UNAUTHORIZED",
                message: "No tienes permiso para realizar esta acción.",
            })

            try {
                await confirmAssistanceToEvent(eventId, session.user.id);
                return {
                    success: true,
                    message: "Asistencia confirmada",
                }
            } catch (error) {
                console.error(error);
                throw new ActionError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Error al confirmar asistencia",
                })
            }
        }
    }),
    cancelAssistanceToEvent: defineAction({
        input: z.object({
            eventId: z.number(),
        }),
        async handler({ eventId }, { request }) {
            const session = await getSession(request);
            if (!session) throw new ActionError({
                code: "UNAUTHORIZED",
                message: "No tienes permiso para realizar esta acción.",
            })

            try {
                await cancelAssistanceToEvent(eventId, session.user.id);
                return {
                    success: true,
                    message: "Asistencia cancelada",
                }
            } catch (error) {
                console.error(error);
                throw new ActionError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Error al cancelar asistencia",
                })
            }
        }
    })
}