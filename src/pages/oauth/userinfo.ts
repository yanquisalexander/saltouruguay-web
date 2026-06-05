import type { APIRoute } from "astro";
import { validateAccessToken } from "@/lib/oauth";
import { client } from "@/db/client";
import { UsersTable, SaltoTagsTable } from "@/db/schema";
import { eq } from "drizzle-orm";

export const GET: APIRoute = async ({ request }) => {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
        return json({ error: "invalid_request" }, 400);
    }

    const accessToken = authHeader.slice(7);

    try {
        const { userId, scopes } = await validateAccessToken(accessToken);

        const user = await client.query.UsersTable.findFirst({
            where: eq(UsersTable.id, userId),
            columns: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
                email: true,
            },
        });

        if (!user) {
            return json({ error: "user_not_found" }, 404);
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

        if (scopes.includes("saltotag:read")) {
            const saltoTag = await client.query.SaltoTagsTable.findFirst({
                where: eq(SaltoTagsTable.userId, userId),
                columns: { saltoTag: true, discriminator: true, totalXP: true },
            });
            if (saltoTag) {
                response.saltoTag = saltoTag.saltoTag;
                response.saltoTagDiscriminator = saltoTag.discriminator;
                response.saltoTagXP = saltoTag.totalXP;
            }
        }

        return json(response, 200);
    } catch (e: any) {
        return json({ error: "invalid_token", error_description: e.message }, 401);
    }
};

function json(data: Record<string, unknown>, status: number) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}
