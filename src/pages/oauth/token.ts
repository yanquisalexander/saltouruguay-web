import type { APIRoute } from "astro";
import { and, eq } from "drizzle-orm";
import { client } from "@/db/client";
import { SUSOAuthAuthorizationCodesTable } from "@/db/schema";
import { consumeAuthCode, generateTokens, generateServiceToken, refreshTokens, getApprovedClient, getClientRedirectUris, validateRedirectUri } from "@/lib/oauth";

export const POST: APIRoute = async ({ request }) => {
    try {
        const formData = await request.formData();
        const grantType = formData.get("grant_type")?.toString();
        const clientId = formData.get("client_id")?.toString();
        const clientSecret = formData.get("client_secret")?.toString();

        if (!clientId) {
            return json({ error: "invalid_client" }, 401);
        }

        const client = await getApprovedClient(clientId);
        if (!client) {
            return json({ error: "invalid_client" }, 401);
        }

        if (grantType === "authorization_code") {
            const code = formData.get("code")?.toString();
            const rawRedirectUri = formData.get("redirect_uri")?.toString() || "";
            // Decode por si el cliente envía URL-encoded (ej: oauthdebugger.com)
            const redirectUri = tryDecodeURI(rawRedirectUri);
            const codeVerifier = formData.get("code_verifier")?.toString();

            if (!code || !redirectUri) {
                return json({ error: "invalid_request" }, 400);
            }

            // Validate redirect URI
            const allowedUris = await getClientRedirectUris(client.id);
            if (!validateRedirectUri(redirectUri, allowedUris)) {
                return json({ error: "invalid_grant", error_description: "Invalid redirect URI" }, 400);
            }

            // PKCE: if code challenge was used, no client_secret required
            // Otherwise, validate client_secret
            const authCodeRecord = await getAuthCodeRecord(code, clientId);
            if (authCodeRecord?.codeChallenge) {
                // Public client: no secret needed, PKCE handles it
            } else {
                // Confidential client: validate secret
                if (!clientSecret || client.clientSecret !== clientSecret) {
                    return json({ error: "invalid_client" }, 401);
                }
            }

            try {
                const { userId, scopes } = await consumeAuthCode({
                    code,
                    clientId,
                    redirectUri,
                    codeVerifier,
                });

                const tokens = await generateTokens({ clientId, userId, scopes });

                return json({
                    access_token: tokens.accessToken,
                    token_type: "Bearer",
                    expires_in: tokens.expiresIn,
                    refresh_token: tokens.refreshToken,
                    scope: scopes.join(" "),
                });
            } catch (e: any) {
                return json({ error: "invalid_grant", error_description: e.message }, 400);
            }
        } else if (grantType === "client_credentials") {
            // Validate client_secret
            if (!clientSecret || client.clientSecret !== clientSecret) {
                return json({ error: "invalid_client" }, 401);
            }

            const scopeParam = formData.get("scope")?.toString();
            const scopes = scopeParam ? scopeParam.split(" ").filter(Boolean) : [];

            // Validate requested scopes are allowed for this client
            const invalidScopes = scopes.filter(s => !client.allowedScopes.includes(s));
            if (invalidScopes.length > 0) {
                return json({ error: "invalid_scope", error_description: `Scopes not allowed: ${invalidScopes.join(", ")}` }, 400);
            }

            try {
                const tokens = await generateServiceToken({ clientId, scopes });
                return json({
                    access_token: tokens.accessToken,
                    token_type: "Bearer",
                    expires_in: tokens.expiresIn,
                    scope: scopes.join(" "),
                });
            } catch (e: any) {
                return json({ error: "invalid_grant", error_description: e.message }, 400);
            }
        } else if (grantType === "refresh_token") {
            const refreshTokenValue = formData.get("refresh_token")?.toString();

            if (!refreshTokenValue) {
                return json({ error: "invalid_request" }, 400);
            }

            // Validate client_secret for refresh
            if (!clientSecret || client.clientSecret !== clientSecret) {
                return json({ error: "invalid_client" }, 401);
            }

            try {
                const tokens = await refreshTokens(refreshTokenValue);
                return json({
                    access_token: tokens.accessToken,
                    token_type: "Bearer",
                    expires_in: tokens.expiresIn,
                    refresh_token: tokens.refreshToken,
                });
            } catch (e: any) {
                return json({ error: "invalid_grant", error_description: e.message }, 400);
            }
        } else {
            return json({ error: "unsupported_grant_type" }, 400);
        }
    } catch (e) {
        console.error("Token endpoint error:", e);
        return json({ error: "server_error" }, 500);
    }
};

function json(data: Record<string, unknown>, status: number) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

async function getAuthCodeRecord(code: string, clientId: string) {
    return client.query.SUSOAuthAuthorizationCodesTable.findFirst({
        where: and(
            eq(SUSOAuthAuthorizationCodesTable.code, code),
            eq(SUSOAuthAuthorizationCodesTable.clientId, clientId),
        ),
        columns: { codeChallenge: true },
    });
}

function tryDecodeURI(value: string): string {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}
