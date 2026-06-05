import type { APIRoute } from "astro";
import { and, eq } from "drizzle-orm";
import { client } from "@/db/client";
import { SUSOAuthAuthorizationCodesTable } from "@/db/schema";
import { consumeAuthCode, generateTokens, generateServiceToken, refreshTokens, getApprovedClient, getClientRedirectUris, validateRedirectUri } from "@/lib/oauth";

export const POST: APIRoute = async ({ request }) => {
    const log = (msg: string, data?: unknown) =>
        console.log(`[TOKEN] ${msg}`, data !== undefined ? data : "");

    try {
        const body = await request.text();
        log("body received", body);

        const params = new URLSearchParams(body);
        const grantType = params.get("grant_type");
        log("grant_type", grantType);

        // client_id/client_secret pueden venir en el body (public client) o en
        // Authorization: Basic (confidential client con oauth4webapi)
        let clientId = params.get("client_id");
        let clientSecret = params.get("client_secret");
        log("from body - clientId", clientId);

        if (!clientId) {
            const authHeader = request.headers.get("authorization");
            log("authHeader present", !!authHeader);
            if (authHeader?.startsWith("Basic ")) {
                const raw = authHeader.slice(6);
                const decoded = atob(raw);
                log("Basic decoded", decoded);
                const colonIndex = decoded.indexOf(":");
                clientId = colonIndex > 0 ? decoded.slice(0, colonIndex) : decoded;
                clientSecret = colonIndex > 0 ? decoded.slice(colonIndex + 1) : undefined;
                log("from Basic - clientId", clientId);
            }
        }

        if (!clientId) {
            log("no clientId found, returning invalid_client");
            return json({ error: "invalid_client" }, 401);
        }

        log("looking up approved client", clientId);
        const client = await getApprovedClient(clientId);
        if (!client) {
            log("client not found in DB");
            return json({ error: "invalid_client" }, 401);
        }
        log("client found", { id: client.id, name: "name" in client ? (client as any).name : "(unknown)" });

        if (grantType === "authorization_code") {
            const code = params.get("code");
            const rawRedirectUri = params.get("redirect_uri") || "";
            const redirectUri = tryDecodeURI(rawRedirectUri);
            const codeVerifier = params.get("code_verifier");
            log("authorization_code flow", { code: code?.slice(0, 8) + "...", redirectUri, hasCodeVerifier: !!codeVerifier });

            if (!code || !redirectUri) {
                log("missing code or redirect_uri");
                return json({ error: "invalid_request" }, 400);
            }

            // Validate redirect URI
            const allowedUris = await getClientRedirectUris(client.id);
            log("allowed redirect URIs", allowedUris);
            if (!validateRedirectUri(redirectUri, allowedUris)) {
                log("redirect URI not allowed");
                return json({ error: "invalid_grant", error_description: "Invalid redirect URI" }, 400);
            }

            // PKCE: if code challenge was used, no client_secret required
            // Otherwise, validate client_secret
            const authCodeRecord = await getAuthCodeRecord(code, clientId);
            log("authCodeRecord", { found: !!authCodeRecord, hasChallenge: !!authCodeRecord?.codeChallenge });
            if (authCodeRecord?.codeChallenge) {
                // Public client: no secret needed, PKCE handles it
            } else {
                if (!clientSecret || client.clientSecret !== clientSecret) {
                    log("client_secret validation failed", { provided: !!clientSecret });
                    return json({ error: "invalid_client" }, 401);
                }
                log("client_secret validated");
            }

            try {
                log("consuming auth code...");
                const { userId, scopes } = await consumeAuthCode({
                    code,
                    clientId,
                    redirectUri,
                    codeVerifier,
                });
                log("auth code consumed", { userId, scopes });

                log("generating tokens...");
                const tokens = await generateTokens({ clientId, userId, scopes });
                log("tokens generated");

                return json({
                    access_token: tokens.accessToken,
                    token_type: "Bearer",
                    expires_in: tokens.expiresIn,
                    refresh_token: tokens.refreshToken,
                    scope: scopes.join(" "),
                });
            } catch (e: any) {
                log("consumeAuthCode/generateTokens error", { message: e.message, stack: e.stack });
                return json({ error: "invalid_grant", error_description: e.message }, 400);
            }
        } else if (grantType === "client_credentials") {
            log("client_credentials flow");
            if (!clientSecret || client.clientSecret !== clientSecret) {
                log("client_secret validation failed in client_credentials");
                return json({ error: "invalid_client" }, 401);
            }

            const scopeParam = params.get("scope");
            const scopes = scopeParam ? scopeParam.split(" ").filter(Boolean) : [];
            log("requested scopes", scopes);

            const invalidScopes = scopes.filter(s => !client.allowedScopes.includes(s));
            if (invalidScopes.length > 0) {
                log("invalid scopes requested", invalidScopes);
                return json({ error: "invalid_scope", error_description: `Scopes not allowed: ${invalidScopes.join(", ")}` }, 400);
            }

            try {
                log("generating service token...");
                const tokens = await generateServiceToken({ clientId, scopes });
                log("service token generated");
                return json({
                    access_token: tokens.accessToken,
                    token_type: "Bearer",
                    expires_in: tokens.expiresIn,
                    scope: scopes.join(" "),
                });
            } catch (e: any) {
                log("generateServiceToken error", { message: e.message, stack: e.stack });
                return json({ error: "invalid_grant", error_description: e.message }, 400);
            }
        } else if (grantType === "refresh_token") {
            const refreshTokenValue = params.get("refresh_token");
            log("refresh_token flow", { hasRefreshToken: !!refreshTokenValue });

            if (!refreshTokenValue) {
                return json({ error: "invalid_request" }, 400);
            }

            if (!clientSecret || client.clientSecret !== clientSecret) {
                log("client_secret validation failed in refresh_token");
                return json({ error: "invalid_client" }, 401);
            }

            try {
                log("refreshing tokens...");
                const tokens = await refreshTokens(refreshTokenValue);
                log("tokens refreshed");
                return json({
                    access_token: tokens.accessToken,
                    token_type: "Bearer",
                    expires_in: tokens.expiresIn,
                    refresh_token: tokens.refreshToken,
                });
            } catch (e: any) {
                log("refreshTokens error", { message: e.message, stack: e.stack });
                return json({ error: "invalid_grant", error_description: e.message }, 400);
            }
        } else {
            log("unsupported grant_type", grantType);
            return json({ error: "unsupported_grant_type" }, 400);
        }
    } catch (e) {
        console.error("[TOKEN] Unhandled exception:", e instanceof Error ? e.message : e, e instanceof Error ? e.stack : "");
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
