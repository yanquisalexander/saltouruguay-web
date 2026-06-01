import { getSession } from "auth-astro/server";
import { client } from "@/db/client";
import { UsersTable } from "@/db/schema";
import { eq } from "drizzle-orm";

export type AuthResult = {
    user: typeof UsersTable.$inferSelect;
    type: 'session';
    scopes: string[];
};

export async function getAuthenticatedUser(request: Request): Promise<AuthResult | null> {
    try {
        const session = await getSession(request);
        if (session?.user?.email) {
            const user = await client.query.UsersTable.findFirst({
                where: eq(UsersTable.email, session.user.email)
            });
            if (user) return { user, type: 'session', scopes: ['*'] };
        }
    } catch (e) {
        // Ignore session errors
    }

    return null;
}
