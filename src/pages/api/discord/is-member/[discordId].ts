import type { APIRoute } from "astro";
import { requireScope } from "@/lib/oauth/middleware";
import { getGuildMember } from "@/services/discord";
import { SALTO_DISCORD_GUILD_ID } from "@/config";

export const GET: APIRoute = async ({ request, params }) => {
    const discordId = params.discordId;
    if (!discordId) {
        return json({ error: "discordId requerido" }, 400);
    }

    try {
        await requireScope(request, "service:api");
    } catch {
        return json({ error: "unauthorized" }, 401);
    }

    try {
        const member = await getGuildMember(SALTO_DISCORD_GUILD_ID, discordId);
        return json({ isMember: Boolean(member) }, 200);
    } catch {
        return json({ isMember: false }, 200);
    }
};

function json(data: Record<string, unknown>, status: number) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}
