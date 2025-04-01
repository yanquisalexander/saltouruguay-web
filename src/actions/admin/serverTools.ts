import { getPaginatedTwitchEvents } from "@/utils/site-admin";
import { getUsers } from "@/utils/user";
import { ActionError, defineAction } from "astro:actions";
import { z } from "astro:schema";
import { getSession } from "auth-astro/server";

export const serverTools = {
    getTwitchEvents: defineAction({
        input: z.object({
            page: z.number().optional().default(1),
            limit: z.number().optional().default(10)
        }),
        handler: async ({ page, limit }, { request }) => {
            const session = await getSession(request);

            if (!session?.user.isAdmin) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "No tienes permisos para ver los eventos de Twitch"
                });
            }

            const { events, hasMore } = await getPaginatedTwitchEvents(page, limit);

            return {
                events,
                hasMore,
            };
        }
    }),
    getUsers: defineAction({
        input: z.object({
            page: z.number().optional().default(1),
            limit: z.number().optional().default(10),
            search: z.string().optional().default("")
        }),
        handler: async ({ page, limit, search }, { request }) => {
            const session = await getSession(request);

            if (!session?.user.isAdmin) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "No tienes permisos para ver los usuarios"
                });
            }

            const { users, hasMore } = await getUsers({ page, limit, search });

            return {
                users,
                hasMore,
            };
        }
    }),
};
