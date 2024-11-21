import { SALTO_DISCORD_GUILD_ID } from "@/config";
import { client } from "@/db/client";
import { UsersTable } from "@/db/schema";
import type { APIContext } from "astro";
import { getSession } from "auth-astro/server";
import { eq } from "drizzle-orm";

export const GET = async ({ request, site }: APIContext) => {
    const code = new URL(request.url).searchParams.get("code");

    if (!code) {
        return new Response(JSON.stringify({ error: "Missing code parameter" }), { status: 400 });
    }

    const clientId = import.meta.env.DISCORD_CLIENT_ID;
    const clientSecret = import.meta.env.DISCORD_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        return new Response(JSON.stringify({ error: "Missing Discord credentials on server" }), { status: 500 });
    }

    const session = await getSession(request)

    if (!session) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const baseUrl = new URL(request.url).origin;
    const discordUrl = new URL("https://discord.com/api/oauth2/token");

    const body = new URLSearchParams();
    body.append("client_id", clientId);
    body.append("client_secret", clientSecret);
    body.append("code", code);
    body.append("grant_type", "authorization_code");
    body.append("redirect_uri", `${baseUrl}/api/discord/link-callback`);

    const tokenResponse = await fetch(discordUrl.toString(), {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
    });

    if (!tokenResponse.ok) {
        console.error(await tokenResponse.text());
        return new Response(null, { status: 500 });
    }

    const tokenData = await tokenResponse.json();



    const userResponse = await fetch("https://discord.com/api/users/@me", {
        headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
        },
    });

    if (!userResponse.ok) {
        console.error(await userResponse.text());
        return new Response(null, { status: 500 });
    }

    const userData = await userResponse.json();

    // If user is not in the guild, return an error

    const guildResponse = await fetch(`https://discord.com/api/users/@me/guilds`, {
        headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
        },
    });

    if (!guildResponse.ok) {
        console.error(await guildResponse.text());
        return new Response(null, { status: 500 });
    }

    const guilds = await guildResponse.json();


    const isMember = guilds.some((guild: { id: string }) => guild.id === SALTO_DISCORD_GUILD_ID);

    if (!isMember) {
        return new Response(JSON.stringify({ error: `Para vincular tu cuenta de Discord, debes ser miembro del servidor de SaltoUruguayServer` }), { status: 403 });
    }

    try {
        const res = await client.update(UsersTable).set({
            discordId: userData.id,
        }).where(eq(UsersTable.id, session.user.id));

        return new Response(null, {
            status: 302,
            headers: {
                Location: "/?discordLinked=true",
            },
        });

    } catch (error) {
        console.error(error)
        return new Response(null, { status: 500 });
    }

}    