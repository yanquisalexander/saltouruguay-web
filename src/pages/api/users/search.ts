import type { APIRoute } from "astro";
import { client } from "@/db/client";
import { UsersTable } from "@/db/schema";
import { ilike, or, and, not, eq } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/auth";

export const GET: APIRoute = async ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get("q");
    const auth = await getAuthenticatedUser(request);

    if (!auth) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    if (!query || query.length < 2) {
        return new Response(JSON.stringify([]), { status: 200 });
    }

    try {
        const users = await client
            .select({
                id: UsersTable.id,
                username: UsersTable.username,
                displayName: UsersTable.displayName,
                avatar: UsersTable.avatar,
            })
            .from(UsersTable)
            .where(
                and(
                    or(
                        ilike(UsersTable.username, `%${query}%`),
                        ilike(UsersTable.displayName, `%${query}%`)
                    ),
                    not(eq(UsersTable.id, auth.user.id)) // Exclude self
                )
            )
            .limit(10);

        return new Response(JSON.stringify(users), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    } catch (error) {
        console.error("Error searching users:", error);
        return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
    }
};
