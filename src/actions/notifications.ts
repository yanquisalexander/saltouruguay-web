import { defineAction, ActionError } from "astro:actions";
import { z } from "astro:schema";
import { getAuthenticatedDbUser } from "@/lib/auth";
import { client } from "@/db/client";
import { ExpoPushTokensTable, NotificationsTable, PushSubscriptionsTable } from "@/db/schema";
import { eq, and, desc, count } from "drizzle-orm";
import { sendPushToUser } from "@/services/push";

export const notifications = {
    get: defineAction({
        handler: async (_, { request }) => {
            const auth = await getAuthenticatedDbUser(request);
            if (!auth) return { notifications: [] };

            const userId = auth.user.id;

            const notifications = await client.query.NotificationsTable.findMany({
                where: eq(NotificationsTable.userId, userId),
                orderBy: [desc(NotificationsTable.createdAt)],
                limit: 50
            });

            return { notifications };
        }
    }),

    markRead: defineAction({
        input: z.object({
            notificationIds: z.array(z.number()).optional(), // If empty, mark all
        }),
        handler: async ({ notificationIds }, { request }) => {
            const auth = await getAuthenticatedDbUser(request);
            if (!auth) throw new ActionError({ code: "UNAUTHORIZED", message: "Unauthorized" });

            const userId = auth.user.id;

            if (notificationIds && notificationIds.length > 0) {
                // Mark specific
                for (const id of notificationIds) {
                    await client.update(NotificationsTable)
                        .set({ read: true })
                        .where(and(
                            eq(NotificationsTable.id, id),
                            eq(NotificationsTable.userId, userId)
                        ));
                }
            } else {
                // Mark all
                await client.update(NotificationsTable)
                    .set({ read: true })
                    .where(eq(NotificationsTable.userId, userId));
            }

            return { success: true };
        }
    }),

    subscribe: defineAction({
        input: z.object({
            endpoint: z.string(),
            keys: z.object({
                p256dh: z.string(),
                auth: z.string(),
            }),
        }),
        handler: async ({ endpoint, keys }, { request }) => {
            const auth = await getAuthenticatedDbUser(request);
            if (!auth) throw new ActionError({ code: "UNAUTHORIZED", message: "Unauthorized" });

            const userId = auth.user.id;

            await client.insert(PushSubscriptionsTable)
                .values({
                    userId,
                    endpoint,
                    p256dh: keys.p256dh,
                    auth: keys.auth,
                })
                .onConflictDoUpdate({
                    target: PushSubscriptionsTable.endpoint,
                    set: {
                        userId, // Update user if endpoint exists (e.g. different user on same browser)
                        p256dh: keys.p256dh,
                        auth: keys.auth,
                    }
                });

            return { success: true };
        }
    }),

    registerExpoToken: defineAction({
        input: z.object({
            token: z.string().regex(/^Expo(nent)?PushToken\[[^\]]+\]$/, "Token de Expo inválido"),
            platform: z.enum(["ios", "android"]).optional(),
            deviceName: z.string().max(255).optional(),
        }),
        handler: async ({ token, platform, deviceName }, { request }) => {
            const auth = await getAuthenticatedDbUser(request);
            if (!auth) throw new ActionError({ code: "UNAUTHORIZED", message: "Unauthorized" });

            await client.insert(ExpoPushTokensTable)
                .values({
                    userId: auth.user.id,
                    token,
                    platform: platform ?? null,
                    deviceName: deviceName ?? null,
                    updatedAt: new Date(),
                })
                .onConflictDoUpdate({
                    target: ExpoPushTokensTable.token,
                    set: {
                        userId: auth.user.id,
                        platform: platform ?? null,
                        deviceName: deviceName ?? null,
                        updatedAt: new Date(),
                    }
                });

            return { success: true };
        }
    }),

    unregisterExpoToken: defineAction({
        input: z.object({
            token: z.string().min(1),
        }),
        handler: async ({ token }, { request }) => {
            const auth = await getAuthenticatedDbUser(request);
            if (!auth) throw new ActionError({ code: "UNAUTHORIZED", message: "Unauthorized" });

            await client.delete(ExpoPushTokensTable)
                .where(and(
                    eq(ExpoPushTokensTable.token, token),
                    eq(ExpoPushTokensTable.userId, auth.user.id)
                ));

            return { success: true };
        }
    }),

    getUnreadCount: defineAction({
        handler: async (_, { request }) => {
            const auth = await getAuthenticatedDbUser(request);
            if (!auth) return { count: 0 };

            const userId = auth.user.id;

            const [result] = await client
                .select({ count: count() })
                .from(NotificationsTable)
                .where(
                    and(
                        eq(NotificationsTable.userId, userId),
                        eq(NotificationsTable.read, false)
                    )
                );

            return { count: result?.count ?? 0 };
        }
    }),

    // Internal helper to send notification
    // This is not an action exposed to client directly, but we export it for use in other actions
};

export async function createNotification(userId: number, data: {
    title: string;
    message: string;
    type: string;
    link?: string;
    image?: string;
}) {
    const [notification] = await client.insert(NotificationsTable)
        .values({
            userId,
            ...data
        })
        .returning();

    await sendPushToUser(userId, {
        ...data,
        notificationId: notification.id
    });

    return notification;
}
