import "dotenv/config";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq } from "drizzle-orm";

import { client } from "@/db/client";
import { UsersTable } from "@/db/schema";
import { getUserSubscription, saveSession, destroySession } from "@/utils/user";

/**
 * Twitch OAuth scopes required by the application.
 * Defined here to avoid importing from @/lib/Twitch which uses astro:env/server
 * at module level and would break the better-auth CLI tool.
 */
const TWITCH_SCOPES = ["openid", "user:read:email", "user:read:subscriptions"];

export const auth = betterAuth({
    database: drizzleAdapter(client, {
        provider: "pg",
    }),

    secret: process.env.AUTH_SECRET,

    /*
     * better-auth needs a baseURL to build OAuth redirect URIs.
     * Set BETTER_AUTH_URL in production (e.g. https://saltouruguayserver.com).
     * Falls back to AUTH_URL for compatibility with existing deployments.
     */
    baseURL: process.env.BETTER_AUTH_URL ?? process.env.AUTH_URL,

    socialProviders: {
        twitch: {
            clientId: process.env.TWITCH_CLIENT_ID!,
            clientSecret: process.env.TWITCH_CLIENT_SECRET!,
            scope: TWITCH_SCOPES,
        },
    },

    /*
     * Override redirect URI for environments that need an explicit path.
     * better-auth's default callback path is /api/auth/callback/twitch
     */
    advanced: {
        crossSubdomainCookies: {
            enabled: false,
        },
    },

    /*
     * ─────────────────────────────────────────────────────────────────────────
     * DATABASE HOOKS
     * These hooks replicate the logic previously inside auth.config.mjs
     * callbacks (jwt / session / signOut).
     * ─────────────────────────────────────────────────────────────────────────
     */
    databaseHooks: {
        /**
         * user.create.before — rejects sign-in when Twitch did not provide an
         * email address (mirrors the original `signIn` callback check).
         */
        user: {
            create: {
                before: async (user) => {
                    if (!user.email) {
                        // Returning false prevents the user from being created
                        // and aborts the sign-in flow.
                        return false;
                    }
                },
            },
        },

        /**
         * account.create / account.update — fires when a Twitch account is
         * linked for the first time (create) or when the user signs in again
         * and better-auth refreshes the stored access-token (update).
         *
         * Both hooks run syncTwitchUser which:
         *  1. Fetches the current Twitch subscription tier.
         *  2. Upserts the user into our custom `UsersTable`.
         *  3. Registers the Twitch EventSub webhook (non-blocking).
         */
        account: {
            create: {
                after: async (account, context) => {
                    if (account.providerId !== "twitch") return;
                    await syncTwitchUser(account, context);
                },
            },
            update: {
                after: async (account, context) => {
                    if (account.providerId !== "twitch") return;
                    // Only run when an access-token is available so we can
                    // fetch the subscription tier.
                    if (!account.accessToken) return;
                    await syncTwitchUser(account, context);
                },
            },
        },

        /**
         * session.create — called after every new browser session is created.
         * Saves the session to our custom `SessionsTable` so the rest of the
         * app can continue to look up session data via `getSessionById`.
         */
        session: {
            create: {
                after: async (session, context) => {
                    await syncBetterAuthSession(session, context);
                },
            },

            /**
             * session.delete — called when better-auth destroys a session
             * (e.g. sign-out).  Mirrors the original `signOut` event handler
             * that called `destroySession`.
             */
            delete: {
                after: async (session) => {
                    if (session.token) {
                        destroySession(session.token).catch((err) =>
                            console.error("[better-auth] Error destroying session:", err)
                        );
                    }
                },
            },
        },
    },
});

// ─────────────────────────────────────────────────────────────────────────────
// Helper functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Upserts the authenticated Twitch user into our custom `UsersTable` and
 * registers the EventSub webhook.
 *
 * Called from both `account.create.after` and `account.update.after` so it
 * runs on every sign-in (new user or returning user).
 */
async function syncTwitchUser(
    account: {
        providerId: string;
        accountId: string;
        userId: string;
        accessToken?: string | null;
    },
    context: any
) {
    const twitchId = account.accountId;
    const accessToken = account.accessToken ?? null;

    // 1. Fetch Twitch subscription tier (gracefully falls back to null)
    const twitchTier = accessToken
        ? await getUserSubscription(twitchId, accessToken)
        : null;

    // 2. Retrieve user display info from better-auth's own `user` table
    let username = twitchId;
    let displayName = twitchId;
    let email: string | undefined;
    let avatar: string | null = null;

    if (context?.context?.adapter) {
        const baUser = await context.context.adapter
            .findOne({ model: "user", where: [{ field: "id", value: account.userId }] })
            .catch(() => null);

        if (baUser) {
            username = (baUser.name as string | undefined)?.toLowerCase() ?? twitchId;
            displayName = (baUser.name as string | undefined) ?? twitchId;
            email = baUser.email as string | undefined;
            avatar = (baUser.image as string | null | undefined) ?? null;
        }
    }

    if (!email) {
        console.warn(
            `[better-auth] Twitch user ${twitchId} has no email — skipping UsersTable upsert`
        );
        return;
    }

    // 3. Upsert into our custom UsersTable
    await client
        .insert(UsersTable)
        .values({
            twitchId,
            email,
            username,
            displayName,
            avatar,
            twitchTier,
            updatedAt: new Date(),
        })
        .onConflictDoUpdate({
            target: UsersTable.twitchId,
            set: {
                username,
                displayName,
                avatar,
                twitchTier,
                updatedAt: new Date(),
                // Note: email is intentionally excluded from the update set to
                // avoid security conflicts (same as original jwt callback).
            },
        })
        .catch((err) => console.error("[better-auth] Error upserting user:", err));

    // 4. Register Twitch EventSub webhook (non-blocking, best-effort)
    (async () => {
        try {
            // Lazy import to avoid loading astro:env/server at module initialisation
            // time (which would break the better-auth CLI tool).
            const { createTwitchEventsInstance } = await import("@/lib/Twitch");
            const eventSub = createTwitchEventsInstance();
            await eventSub.registerUserEventSub(twitchId);
            console.log(`[better-auth] Registered EventSub for user ${twitchId}`);
        } catch (e) {
            console.error("[better-auth] Error registering EventSub:", e);
        }
    })();
}

/**
 * Persists a new better-auth session into our custom `SessionsTable`.
 *
 * better-auth's session `token` field is used as the `sessionId` so that the
 * rest of the application (which calls `getSessionById(sessionId)`) continues
 * to work without changes.
 */
async function syncBetterAuthSession(session: any, context: any) {
    if (!context?.context?.adapter) return;

    // Find the Twitch account linked to this better-auth user
    const account = await context.context.adapter
        .findOne({
            model: "account",
            where: [
                { field: "userId", value: session.userId },
                { field: "providerId", value: "twitch" },
            ],
        })
        .catch(() => null);

    if (!account?.accountId) return;

    // Resolve the integer user ID from our UsersTable
    const appUser = await client.query.UsersTable.findFirst({
        where: eq(UsersTable.twitchId, account.accountId as string),
        columns: { id: true },
    }).catch(() => null);

    if (!appUser) return;

    // Save to our SessionsTable using the better-auth session token as the
    // sessionId so existing code (`getSessionById`, middleware, etc.) works.
    await saveSession(
        appUser.id,
        session.token as string,
        (session.userAgent as string | null) ?? "Unknown",
        (session.ipAddress as string | null) ?? "Unknown"
    ).catch((err) => console.error("[better-auth] Error saving session:", err));
}
