import type { APIContext } from "astro";

export const GET = async ({ request, site }: APIContext) => {
    const baseUrl = new URL(request.url).origin;
    const discordUrl = new URL('https://discord.com/api/oauth2/authorize');
    discordUrl.searchParams.append('client_id', import.meta.env.DISCORD_CLIENT_ID);
    discordUrl.searchParams.append('redirect_uri', `${baseUrl}/api/discord/link-callback`);
    discordUrl.searchParams.append('response_type', 'code');
    discordUrl.searchParams.append('scope', 'identify guilds openid');


    return new Response(null, {
        headers: {
            Location: discordUrl.toString()
        },
        status: 302
    });
};
