import { getSession } from "auth-astro/server";
import { client } from "@/db/client";
import { OAuthTokensTable, UsersTable } from "@/db/schema";
import { eq } from "drizzle-orm";

export type AuthResult = {
    user: typeof UsersTable.$inferSelect;
    type: 'session' | 'oauth';
    scopes: string[];
};

export async function getAuthenticatedUser(request: Request): Promise<AuthResult | null> {
    // 1. Try Cookie Session (Auth.js)
    try {
        const session = await getSession(request);
        if (session?.user?.email) {
            const user = await client.query.UsersTable.findFirst({
                where: eq(UsersTable.email, session.user.email)
            });
            // Session users have full access implicitly, or we can define default scopes
            if (user) return { user, type: 'session', scopes: ['*'] };
        }
    } catch (e) {
        // Ignore session errors (e.g. if not running in a context where session is available)
    }

    // 2. Try Bearer Token (OAuth)
    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.substring(7);

        const oauthToken = await client.query.OAuthTokensTable.findFirst({
            where: eq(OAuthTokensTable.accessToken, token)
        });

        if (oauthToken && oauthToken.expiresAt > new Date()) {
            const user = await client.query.UsersTable.findFirst({
                where: eq(UsersTable.id, oauthToken.userId)
            });

            if (user) {
                return {
                    user,
                    type: 'oauth',
                    scopes: oauthToken.scopes || []
                };
            }
        }
    }

    return null;
}
