import { getUsers } from "@/utils/user";
import { ActionError, defineAction } from "astro:actions";
import { z } from "astro:schema";
import { getSession } from "auth-astro/server";

export const users = {
    getUsers: defineAction({
        input: z.object({
            page: z.number().optional(),
            search: z.string().optional(),
            limit: z.number().optional().default(15)
        }),
        handler: async ({ page, search, limit }, { request }) => {
            const session = await getSession(request);
            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Debes iniciar sesión para ver los usuarios"
                })
            }

            if (!session.user.isAdmin) {
                throw new ActionError({
                    code: "FORBIDDEN",
                    message: "No tienes permisos para ver los usuarios"
                })
            }

            const users = await getUsers({ page, search, limit });
            return users;
        }
    }),
}