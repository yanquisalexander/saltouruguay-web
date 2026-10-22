import { client } from "@/db/client";
import { UsersTable } from "@/db/schema";
import { createNotificationsForUsers } from "@/services/push";
import { ActionError, defineAction } from "astro:actions";
import { z } from "astro:schema";
import { getSession } from "auth-astro/server";
import { count as sqlCount, inArray } from "drizzle-orm";

const notificationInput = z.object({
    title: z.string().trim().min(1).max(120),
    message: z.string().trim().min(1).max(500),
    type: z.enum(["info", "success", "warning", "error", "announcement"]).default("info"),
    link: z.string().trim().max(500).optional(),
    image: z.string().trim().max(500).optional(),
    target: z.enum(["all", "selected"]).default("all"),
    userIds: z.array(z.number().int().positive()).max(500).optional(),
});

export const notifications = {
    send: defineAction({
        input: notificationInput,
        handler: async ({ title, message, type, link, image, target, userIds }, { request }) => {
            const session = await getSession(request);

            if (!session?.user.isAdmin) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "No tienes permisos para enviar notificaciones",
                });
            }

            let recipients: number[] = [];

            if (target === "all") {
                const users = await client.select({ id: UsersTable.id }).from(UsersTable);
                recipients = users.map((user) => user.id);
            } else {
                if (!userIds || userIds.length === 0) {
                    throw new ActionError({
                        code: "BAD_REQUEST",
                        message: "Selecciona al menos un usuario",
                    });
                }

                const users = await client
                    .select({ id: UsersTable.id })
                    .from(UsersTable)
                    .where(inArray(UsersTable.id, userIds));

                recipients = users.map((user) => user.id);
            }

            if (recipients.length === 0) {
                throw new ActionError({
                    code: "NOT_FOUND",
                    message: "No se encontraron destinatarios",
                });
            }

            const count = await createNotificationsForUsers(recipients, {
                title,
                message,
                type,
                link: link || undefined,
                image: image || undefined,
            });

            return {
                success: true,
                count,
                target,
            };
        },
    }),

    getAudienceCount: defineAction({
        handler: async (_, { request }) => {
            const session = await getSession(request);

            if (!session?.user.isAdmin) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "No tienes permisos para ver los destinatarios",
                });
            }

            const [total] = await client
                .select({ count: sqlCount() })
                .from(UsersTable);

            return { total: total?.count ?? 0 };
        },
    }),
};
