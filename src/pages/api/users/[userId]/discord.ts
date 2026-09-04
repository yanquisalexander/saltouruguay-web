import type { APIRoute } from "astro";
import { requireScope } from "@/lib/oauth/middleware";
import { client as db } from "@/db/client";
import { UsersTable, LinkedAccountsTable } from "@/db/schema";
import { and, eq } from "drizzle-orm";
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
            },
        });

        if (!user) {
            return json({ error: "user_not_found" }, 404);
        }

        const linkedDiscord = await db.query.LinkedAccountsTable.findFirst({
            where: and(
                eq(LinkedAccountsTable.userId, user.id),
                eq(LinkedAccountsTable.provider, "discord"),
            ),
            columns: {
                providerUserId: true,
            },
        });
        const effectiveDiscordId = linkedDiscord?.providerUserId ?? null;

        let discordUsername: string | null = null;
        if (effectiveDiscordId) {
            const discordUser = await getDiscordUser(effectiveDiscordId);
            if (discordUser) {
                discordUsername = discordUser.username;
            }
        }

        return json({
            discordId: effectiveDiscordId,
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
