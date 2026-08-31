import { client } from "@/db/client";
import { BirthdayMessagesTable, UsersTable } from "@/db/schema";
import { ActionError, defineAction } from "astro:actions";
import { z } from "astro:schema";
import { getSession } from "auth-astro/server";
import { desc, eq, isNull, isNotNull, count } from "drizzle-orm";

export const cumple = {
    sendMessage: defineAction({
        input: z.object({
            message: z.string().min(1).max(500),
        }),
        handler: async ({ message }, { request }) => {
            const session = await getSession(request);

            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Debes iniciar sesión para enviar tu mensaje",
                });
            }

            try {
                await client
                    .insert(BirthdayMessagesTable)
                    .values({ userId: session.user.id, message })
                    .execute();

                return { success: true };
            } catch (error) {
                throw new ActionError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Error al enviar el mensaje",
                });
            }
        },
    }),

    getApprovedMessages: defineAction({
        handler: async () => {
            try {
                const messages = await client
                    .select({
                        id: BirthdayMessagesTable.id,
                        message: BirthdayMessagesTable.message,
                        createdAt: BirthdayMessagesTable.createdAt,
                        userId: BirthdayMessagesTable.userId,
                        username: UsersTable.username,
                        displayName: UsersTable.displayName,
                        avatar: UsersTable.avatar,
                    })
                    .from(BirthdayMessagesTable)
                    .innerJoin(UsersTable, eq(BirthdayMessagesTable.userId, UsersTable.id))
                    .where(isNotNull(BirthdayMessagesTable.approvedAt))
                    .orderBy(desc(BirthdayMessagesTable.createdAt))
                    .execute();

                return { messages };
            } catch (error) {
                throw new ActionError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Error al obtener los mensajes",
                });
            }
        },
    }),

    getPendingMessages: defineAction({
        input: z.object({}),
        handler: async (_, { request }) => {
            const session = await getSession(request);

            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Debes iniciar sesión",
                });
            }

            if (!session.user.isAdmin) {
                throw new ActionError({
                    code: "FORBIDDEN",
                    message: "No tienes permisos para ver mensajes pendientes",
                });
            }

            try {
                const messages = await client
                    .select({
                        id: BirthdayMessagesTable.id,
                        message: BirthdayMessagesTable.message,
                        createdAt: BirthdayMessagesTable.createdAt,
                        userId: BirthdayMessagesTable.userId,
                        username: UsersTable.username,
                        displayName: UsersTable.displayName,
                        avatar: UsersTable.avatar,
                    })
                    .from(BirthdayMessagesTable)
                    .innerJoin(UsersTable, eq(BirthdayMessagesTable.userId, UsersTable.id))
                    .where(isNull(BirthdayMessagesTable.approvedAt))
                    .orderBy(desc(BirthdayMessagesTable.createdAt))
                    .execute();

                return { messages };
            } catch (error) {
                throw new ActionError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Error al obtener los mensajes pendientes",
                });
            }
        },
    }),

    approveMessage: defineAction({
        input: z.object({
            messageId: z.number(),
        }),
        handler: async ({ messageId }, { request }) => {
            const session = await getSession(request);

            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Debes iniciar sesión",
                });
            }

            if (!session.user.isAdmin) {
                throw new ActionError({
                    code: "FORBIDDEN",
                    message: "No tienes permisos para aprobar mensajes",
                });
            }

            try {
                await client
                    .update(BirthdayMessagesTable)
                    .set({ approvedAt: new Date() })
                    .where(eq(BirthdayMessagesTable.id, messageId))
                    .execute();

                return { success: true };
            } catch (error) {
                throw new ActionError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Error al aprobar el mensaje",
                });
            }
        },
    }),

    deleteMessage: defineAction({
        input: z.object({
            messageId: z.number(),
        }),
        handler: async ({ messageId }, { request }) => {
            const session = await getSession(request);

            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Debes iniciar sesión",
                });
            }

            if (!session.user.isAdmin) {
                throw new ActionError({
                    code: "FORBIDDEN",
                    message: "No tienes permisos para eliminar mensajes",
                });
            }

            try {
                await client
                    .delete(BirthdayMessagesTable)
                    .where(eq(BirthdayMessagesTable.id, messageId))
                    .execute();

                return { success: true };
            } catch (error) {
                throw new ActionError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Error al eliminar el mensaje",
                });
            }
        },
    }),

    getPendingCount: defineAction({
        input: z.object({}),
        handler: async (_, { request }) => {
            const session = await getSession(request);

            if (!session?.user?.isAdmin) {
                return { count: 0 };
            }

            try {
                const result = await client
                    .select({ count: count() })
                    .from(BirthdayMessagesTable)
                    .where(isNull(BirthdayMessagesTable.approvedAt))
                    .execute();

                return { count: result[0]?.count ?? 0 };
            } catch (error) {
                return { count: 0 };
            }
        },
    }),
};
