import type { APIContext } from "astro";

export const GET = async ({ request, site }: APIContext) => {
    const baseUrl = new URL(request.url).origin;
    const url = `https://id.twitch.tv/oauth2/authorize?client_id=${import.meta.env.TWITCH_CLIENT_ID}&redirect_uri=${baseUrl}/api/twitch/link-callback&response_type=code&scope=user:read:email`;

    return new Response(null, {
        headers: {
            Location: url
        },
        status: 302
    });
};
