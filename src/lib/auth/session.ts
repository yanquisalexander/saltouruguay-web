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

export async function getAuthenticatedUser(request: Request): Promise<AuthResult | null> {
    // 1. Try OAuth Bearer token
    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.slice(7);
        try {
            const payload = await validateAccessToken(token);
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
