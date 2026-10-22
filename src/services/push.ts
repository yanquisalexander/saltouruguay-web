import webpush from "web-push";
import { eq, inArray } from "drizzle-orm";
import { client } from "@/db/client";
import { ExpoPushTokensTable, NotificationsTable, PushSubscriptionsTable } from "@/db/schema";

export type PushPayload = {
    title: string;
    message: string;
    type: string;
    link?: string;
    image?: string;
    notificationId?: number;
};

type ExpoTicket = {
    status: "ok" | "error";
    message?: string;
    details?: {
        error?: string;
    };
};

type ExpoTokenEntry = {
    token: string;
    userId: number;
};

const SITE_URL = "https://saltouruguayserver.com";
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_TOKEN_REGEX = /^Expo(nent)?PushToken\[[^\]]+\]$/;
const EXPO_BATCH_SIZE = 100;
const DB_BATCH_SIZE = 200;

const VAPID_PUBLIC_KEY = import.meta.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = import.meta.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = import.meta.env.VAPID_SUBJECT || "mailto:admin@saltouruguay.com";
const WEB_PUSH_ENABLED = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

function chunk<T>(items: T[], size: number) {
    const result: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
        result.push(items.slice(i, i + size));
    }
    return result;
}

function toAbsoluteUrl(path?: string) {
    if (!path) return SITE_URL;
    if (/^https?:\/\//i.test(path)) return path;
    return `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

function buildWebPayload(data: PushPayload, notificationId?: number) {
    const url = toAbsoluteUrl(data.link);
    return JSON.stringify({
        title: data.title,
        body: data.message,
        icon: toAbsoluteUrl("/android-chrome-192x192.png"),
        image: data.image ? toAbsoluteUrl(data.image) : undefined,
        url,
        data: {
            url,
            type: data.type,
            notificationId
        }
    });
}

function buildExpoMessage(entry: ExpoTokenEntry, data: PushPayload, notificationIds: Map<number, number>) {
    const url = toAbsoluteUrl(data.link);
    return {
        to: entry.token,
        title: data.title,
        body: data.message,
        sound: "default",
        priority: "high",
        data: {
            url,
            type: data.type,
            notificationId: notificationIds.get(entry.userId)
        }
    };
}

async function sendWebPushToSubscriptions(
    subscriptions: { endpoint: string; p256dh: string; auth: string; userId: number }[],
    data: PushPayload,
    notificationIds: Map<number, number>
) {
    await Promise.all(subscriptions.map(async (subscription) => {
        try {
            await webpush.sendNotification({
                endpoint: subscription.endpoint,
                keys: {
                    p256dh: subscription.p256dh,
                    auth: subscription.auth
                }
            }, buildWebPayload(data, notificationIds.get(subscription.userId)));
        } catch (error) {
            const statusCode = (error as { statusCode?: number }).statusCode;
            if (statusCode === 404 || statusCode === 410) {
                await client.delete(PushSubscriptionsTable)
                    .where(eq(PushSubscriptionsTable.endpoint, subscription.endpoint));
            }
            console.error("Error sending web push:", error);
        }
    }));
}

async function sendExpoPushToTokens(
    entries: ExpoTokenEntry[],
    data: PushPayload,
    notificationIds: Map<number, number>
) {
    if (entries.length === 0) return;

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Accept-Encoding": "gzip, deflate"
    };

    if (import.meta.env.EXPO_ACCESS_TOKEN) {
        headers.Authorization = `Bearer ${import.meta.env.EXPO_ACCESS_TOKEN}`;
    }

    for (const batch of chunk(entries, EXPO_BATCH_SIZE)) {
        const messages = batch.map((entry) => buildExpoMessage(entry, data, notificationIds));

        try {
            const response = await fetch(EXPO_PUSH_URL, {
                method: "POST",
                headers,
                body: JSON.stringify(messages)
            });

            if (!response.ok) {
                console.error("Error sending Expo push:", response.status, await response.text());
                continue;
            }

            const result = await response.json() as { data?: ExpoTicket[] };
            const tickets = result.data ?? [];
            const invalidTokens: string[] = [];

            tickets.forEach((ticket, index) => {
                if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
                    const token = batch[index]?.token;
                    if (token) invalidTokens.push(token);
                }
            });

            if (invalidTokens.length > 0) {
                await client.delete(ExpoPushTokensTable)
                    .where(inArray(ExpoPushTokensTable.token, invalidTokens));
            }
        } catch (error) {
            console.error("Error sending Expo push:", error);
        }
    }
}

async function sendWebPushToIds(userIds: number[], data: PushPayload, notificationIds: Map<number, number>) {
    if (!WEB_PUSH_ENABLED) return;

    for (const batch of chunk(userIds, DB_BATCH_SIZE)) {
        const subscriptions = await client.query.PushSubscriptionsTable.findMany({
            where: inArray(PushSubscriptionsTable.userId, batch)
        });
        await sendWebPushToSubscriptions(subscriptions, data, notificationIds);
    }
}

async function sendExpoPushToIds(userIds: number[], data: PushPayload, notificationIds: Map<number, number>) {
    for (const batch of chunk(userIds, DB_BATCH_SIZE)) {
        const tokens = await client.query.ExpoPushTokensTable.findMany({
            where: inArray(ExpoPushTokensTable.userId, batch)
        });
        const validTokens = tokens.filter((entry) => EXPO_TOKEN_REGEX.test(entry.token));
        await sendExpoPushToTokens(validTokens, data, notificationIds);
    }
}

export async function sendWebPushToUser(userId: number, data: PushPayload) {
    if (!WEB_PUSH_ENABLED) return;

    const subscriptions = await client.query.PushSubscriptionsTable.findMany({
        where: eq(PushSubscriptionsTable.userId, userId)
    });

    await sendWebPushToSubscriptions(subscriptions, data, new Map([[userId, data.notificationId ?? 0]]));
}

export async function sendExpoPushToUser(userId: number, data: PushPayload) {
    const tokens = await client.query.ExpoPushTokensTable.findMany({
        where: eq(ExpoPushTokensTable.userId, userId)
    });

    const validTokens = tokens.filter((entry) => EXPO_TOKEN_REGEX.test(entry.token));
    await sendExpoPushToTokens(validTokens, data, new Map([[userId, data.notificationId ?? 0]]));
}

export async function sendPushToUser(userId: number, data: PushPayload) {
    const results = await Promise.allSettled([
        sendWebPushToUser(userId, data),
        sendExpoPushToUser(userId, data)
    ]);

    for (const result of results) {
        if (result.status === "rejected") {
            console.error("Error in push notification process:", result.reason);
        }
    }
}

export async function createNotificationsForUsers(userIds: number[], data: PushPayload) {
    const uniqueIds = Array.from(new Set(userIds));
    if (uniqueIds.length === 0) return 0;

    const notificationIds = new Map<number, number>();

    for (const batch of chunk(uniqueIds, DB_BATCH_SIZE)) {
        const inserted = await client.insert(NotificationsTable)
            .values(batch.map((userId) => ({
                userId,
                title: data.title,
                message: data.message,
                type: data.type,
                link: data.link,
                image: data.image
            })))
            .returning();

        for (const row of inserted) {
            notificationIds.set(row.userId, row.id);
        }
    }

    const results = await Promise.allSettled([
        sendWebPushToIds(uniqueIds, data, notificationIds),
        sendExpoPushToIds(uniqueIds, data, notificationIds)
    ]);

    for (const result of results) {
        if (result.status === "rejected") {
            console.error("Error in push notification process:", result.reason);
        }
    }

    return uniqueIds.length;
}
