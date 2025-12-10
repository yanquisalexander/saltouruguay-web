import { defineAction, ActionError } from "astro:actions";
import { z } from "astro:schema";
import { getAuthenticatedUser } from "@/lib/auth";
import { client } from "@/db/client";
import { NotificationsTable, PushSubscriptionsTable } from "@/db/schema";
import { eq, and, desc, lt, count } from "drizzle-orm";
import webpush from "web-push";

// Configure Web Push
// In production, these should be environment variables
const VAPID_PUBLIC_KEY = import.meta.env.VAPID_PUBLIC_KEY || "BKP_123...";
const VAPID_PRIVATE_KEY = import.meta.env.VAPID_PRIVATE_KEY || "PRIV_123...";
const VAPID_SUBJECT = "mailto:admin@saltouruguay.com";

if (import.meta.env.VAPID_PUBLIC_KEY && import.meta.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        VAPID_SUBJECT,
        import.meta.env.VAPID_PUBLIC_KEY,
        import.meta.env.VAPID_PRIVATE_KEY
    );
}

export const notifications = {
    get: defineAction({
        handler: async (_, { request }) => {
            const auth = await getAuthenticatedUser(request);
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
            const auth = await getAuthenticatedUser(request);
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
            const auth = await getAuthenticatedUser(request);
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

    getUnreadCount: defineAction({
        handler: async (_, { request }) => {
            const auth = await getAuthenticatedUser(request);
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
    // 1. Save to DB
    const [notification] = await client.insert(NotificationsTable)
        .values({
            userId,
            ...data
        })
        .returning();

    // 2. Send Push Notification
    if (import.meta.env.VAPID_PUBLIC_KEY && import.meta.env.VAPID_PRIVATE_KEY) {
        try {
            const subscriptions = await client.query.PushSubscriptionsTable.findMany({
                where: eq(PushSubscriptionsTable.userId, userId)
            });

            const payload = JSON.stringify({
                title: data.title,
                body: data.message,
                icon: data.image || "/android-chrome-192x192.png",
                url: data.link || "/",
                data: {
                    url: data.link || "/"
                }
            });

            const promises = subscriptions.map(sub =>
                webpush.sendNotification({
                    endpoint: sub.endpoint,
                    keys: {
                        p256dh: sub.p256dh,
                        auth: sub.auth
                    }
                }, payload).catch(async err => {
                    if (err.statusCode === 410 || err.statusCode === 404) {
                        // Subscription expired or invalid
                        await client.delete(PushSubscriptionsTable)
                            .where(eq(PushSubscriptionsTable.endpoint, sub.endpoint));
                    }
                    console.error("Error sending push:", err);
                })
            );

            await Promise.all(promises);
        } catch (e) {
            console.error("Error in push notification process:", e);
        }
    }

    return notification;
}
