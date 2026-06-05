import type { APIRoute } from "astro";
import { validateAccessToken } from "@/lib/oauth";
import { client as db } from "@/db/client";
import { UsersTable } from "@/db/schema";
import { eq } from "drizzle-orm";

export const GET: APIRoute = async ({ request }) => {
    const authHeader = request.headers.get("Authorization");

    if (!authHeader) {
        return new Response(JSON.stringify({ error: "invalid_request" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }

    const match = authHeader.match(/^Bearer (.+)$/);
    if (!match) {
        return new Response(JSON.stringify({ error: "invalid_token" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
        });
    }

    const accessToken = match[1];

    try {
        const { userId, scopes } = await validateAccessToken(accessToken);

        const user = await db.query.UsersTable.findFirst({
            where: eq(UsersTable.id, userId),
            columns: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
                email: true,
                admin: true,
            },
        });

        if (!user) {
            return new Response(JSON.stringify({ error: "user_not_found" }), {
                status: 404,
                headers: { "Content-Type": "application/json" },
            });
        }

        const response: Record<string, unknown> = {
            sub: user.id.toString(),
        };

        if (scopes.includes("profile")) {
            response.username = user.username;
            response.displayName = user.displayName;
            response.avatar = user.avatar;
        }

        if (scopes.includes("email")) {
            response.email = user.email;
        }

        response.is_admin = user.admin;

        return new Response(JSON.stringify(response), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error: any) {
        return new Response(
            JSON.stringify({
                error: "invalid_token",
                error_description: error.message,
            }),
            {
                status: 401,
                headers: { "Content-Type": "application/json" },
            },
        );
    }
};
