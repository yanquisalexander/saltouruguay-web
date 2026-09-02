import type { APIRoute } from "astro";
import { requireScope } from "@/lib/oauth/middleware";
import { client as db } from "@/db/client";
import { UsersTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getDiscordUser } from "@/services/discord";

export const GET: APIRoute = async ({ request, params }) => {
    const userId = params.userId;
    if (!userId) {
        return json({ error: "userId requerido" }, 400);
    }

    try {
        await requireScope(request, "service:api");
    } catch {
        return json({ error: "unauthorized" }, 401);
    }

    try {
        const user = await db.query.UsersTable.findFirst({
            where: eq(UsersTable.id, Number(userId)),
            columns: {
                id: true,
                discordId: true,
            },
        });

        if (!user) {
            return json({ error: "user_not_found" }, 404);
        }

        let discordUsername: string | null = null;
        if (user.discordId) {
            const discordUser = await getDiscordUser(user.discordId);
            if (discordUser) {
                discordUsername = discordUser.username;
            }
        }

        return json({
            discordId: user.discordId,
            discordUsername,
        }, 200);
    } catch {
        return json({ error: "internal_error" }, 500);
    }
};

function json(data: Record<string, unknown>, status: number) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}
