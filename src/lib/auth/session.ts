import { getSession } from "auth-astro/server";
import { client } from "@/db/client";
import { UsersTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { validateAccessToken } from "@/lib/oauth";

export type AuthResult = {
    user: typeof UsersTable.$inferSelect;
    type: "session" | "oauth";
    scopes: string[];
    tokenId?: string;
    clientId?: string;
};

export type ServiceAuthResult = {
    user?: never;
    type: "service";
    scopes: string[];
    clientId: string;
    tokenId: string;
};

export type AnyAuthResult = AuthResult | ServiceAuthResult;

/** Type guard: narrows to user-backed auth (session or oauth), excluding service tokens. */
export function isUserAuth(auth: AnyAuthResult | null | undefined): auth is AuthResult {
    return auth != null && auth.type !== "service" && "user" in auth && auth.user != null;
}

export async function getAuthenticatedUser(request: Request): Promise<AnyAuthResult | null> {
    // 1. Try OAuth Bearer token
    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.slice(7);
        try {
            const payload = await validateAccessToken(token);

            // Service tokens have no user
            if (payload.type === "service") {
                return {
                    type: "service",
                    scopes: payload.scopes,
                    clientId: payload.clientId,
                    tokenId: payload.tokenId,
                };
            }

            const user = await client.query.UsersTable.findFirst({
                where: eq(UsersTable.id, payload.userId),
            });
            if (user) {
                return {
                    user,
                    type: "oauth",
                    scopes: payload.scopes,
                    tokenId: payload.tokenId,
                    clientId: payload.clientId,
                };
            }
        } catch {
            // Invalid token, fall through to session
        }
    }

    // 2. Try Auth.js session cookie
    try {
        const session = await getSession(request);
        if (session?.user?.email) {
            const user = await client.query.UsersTable.findFirst({
                where: eq(UsersTable.email, session.user.email),
            });
            if (user) {
                return { user, type: "session", scopes: ["*"] };
            }
        }
    } catch {
        // Ignore session errors
    }

    return null;
}

/**
 * Same as getAuthenticatedUser but only resolves user-backed auth
 * (session cookie or user OAuth token). Service tokens resolve to null.
 * Use this in Astro actions / pages that need a DB user — the result
 * narrows to AuthResult so `auth.user.id` is type-safe after a null check.
 */
export async function getAuthenticatedDbUser(request: Request): Promise<AuthResult | null> {
    const auth = await getAuthenticatedUser(request);
    return isUserAuth(auth) ? auth : null;
}

/**
 * Like getAuthenticatedDbUser but throws when there is no user.
 * Useful for API routes that require a logged-in user (not a service token).
 */
export async function requireUserAuth(request: Request): Promise<AuthResult> {
    const auth = await getAuthenticatedDbUser(request);
    if (!auth) {
        throw new Error("Unauthorized");
    }
    return auth;
}
