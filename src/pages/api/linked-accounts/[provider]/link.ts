import type { APIRoute } from "astro";
import { getSession } from "auth-astro/server";
import { getProvider } from "@/lib/linked-accounts";
import { randomBytes } from "node:crypto";

export const GET: APIRoute = async ({ params, request, cookies, redirect }) => {
    const providerName = params.provider;
    if (!providerName) {
        return new Response("Provider not specified", { status: 400 });
    }

    const provider = getProvider(providerName);
    if (!provider) {
        return new Response(`Provider "${providerName}" not supported`, { status: 404 });
    }

    const session = await getSession(request);
    if (!session) {
        return redirect(`/?loginRequired=${providerName}`);
    }

    const baseUrl = new URL(request.url).origin;
    const callbackUrl = `${baseUrl}/api/linked-accounts/${providerName}/callback`;
    const state = randomBytes(16).toString("hex");

    cookies.set("linked_account_state", state, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 10,
        secure: import.meta.env.PROD,
    });

    const authUrl = provider.getAuthorizationUrl(state, callbackUrl);
    return redirect(authUrl.toString());
};
