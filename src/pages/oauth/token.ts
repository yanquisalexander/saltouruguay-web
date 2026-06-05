import type { APIRoute } from "astro";
import { and, eq } from "drizzle-orm";
import { client } from "@/db/client";
import { SUSOAuthAuthorizationCodesTable } from "@/db/schema";
import { consumeAuthCode, generateTokens, generateServiceToken, refreshTokens, getApprovedClient, getClientRedirectUris, validateRedirectUri } from "@/lib/oauth";

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.text();
        const params = new URLSearchParams(body);
        const grantType = params.get("grant_type");

        // client_id/client_secret pueden venir en el body (public client) o en
        // Authorization: Basic (confidential client con oauth4webapi)
        let clientId = params.get("client_id");
        let clientSecret = params.get("client_secret");

        if (!clientId) {
            const authHeader = request.headers.get("authorization");
            if (authHeader?.startsWith("Basic ")) {
                const decoded = atob(authHeader.slice(6));
                const colonIndex = decoded.indexOf(":");
                clientId = colonIndex > 0 ? decoded.slice(0, colonIndex) : decoded;
                clientSecret = colonIndex > 0 ? decoded.slice(colonIndex + 1) : undefined;
            }
        }

        if (!clientId) {
            return json({ error: "invalid_client" }, 401);
        }

        const client = await getApprovedClient(clientId);
        if (!client) {
            return json({ error: "invalid_client" }, 401);
        }

        if (grantType === "authorization_code") {
            const code = params.get("code");
            const rawRedirectUri = params.get("redirect_uri") || "";
            // Decode por si el cliente envía URL-encoded (ej: oauthdebugger.com)
            const redirectUri = tryDecodeURI(rawRedirectUri);
            const codeVerifier = params.get("code_verifier");

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

            const scopeParam = params.get("scope");
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
            const refreshTokenValue = params.get("refresh_token");

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
        console.error("Token endpoint error:", e instanceof Error ? e.message : e, e instanceof Error ? e.stack : "");
        return json({ error: "server_error", error_description: e instanceof Error ? e.message : "Unknown error" }, 500);
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
