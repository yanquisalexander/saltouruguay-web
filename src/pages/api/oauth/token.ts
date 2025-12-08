import type { APIRoute } from "astro";
import { client } from "@/db/client";
import { OAuthCodesTable, OAuthTokensTable, OAuthApplicationsTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createHash, randomBytes } from "node:crypto";

export const POST: APIRoute = async ({ request }) => {
    try {
        const formData = await request.formData();
        const grantType = formData.get("grant_type");
        const code = formData.get("code")?.toString();
        const redirectUri = formData.get("redirect_uri")?.toString();
        const clientId = formData.get("client_id")?.toString();
        const clientSecret = formData.get("client_secret")?.toString();
        const codeVerifier = formData.get("code_verifier")?.toString();

        if (grantType !== "authorization_code") {
            return new Response(JSON.stringify({ error: "unsupported_grant_type" }), { status: 400 });
        }

        if (!code || !redirectUri || !clientId || !codeVerifier) {
            return new Response(JSON.stringify({ error: "invalid_request" }), { status: 400 });
        }

        // 1. Verify Client (Optional for public clients with PKCE, but good if secret provided)
        const app = await client.query.OAuthApplicationsTable.findFirst({
            where: eq(OAuthApplicationsTable.clientId, clientId)
        });

        if (!app) {
            return new Response(JSON.stringify({ error: "invalid_client" }), { status: 401 });
        }

        if (clientSecret && app.clientSecret !== clientSecret) {
            return new Response(JSON.stringify({ error: "invalid_client" }), { status: 401 });
        }

        // 2. Verify Code
        const authCode = await client.query.OAuthCodesTable.findFirst({
            where: eq(OAuthCodesTable.code, code)
        });

        if (!authCode) {
            return new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 });
        }

        if (authCode.expiresAt < new Date()) {
            await client.delete(OAuthCodesTable).where(eq(OAuthCodesTable.code, code));
            return new Response(JSON.stringify({ error: "invalid_grant", error_description: "Code expired" }), { status: 400 });
        }

        if (authCode.clientId !== clientId) {
            return new Response(JSON.stringify({ error: "invalid_grant", error_description: "Client mismatch" }), { status: 400 });
        }

        if (authCode.redirectUri !== redirectUri) {
            return new Response(JSON.stringify({ error: "invalid_grant", error_description: "Redirect URI mismatch" }), { status: 400 });
        }

        // 3. Verify PKCE
        if (!authCode.codeChallenge) {
            // If code was issued without challenge, but verifier is present (or vice versa), that's an issue depending on strictness.
            // But our authorize endpoint enforces challenge.
            return new Response(JSON.stringify({ error: "invalid_grant", error_description: "Missing code challenge" }), { status: 400 });
        }

        let calculatedChallenge = "";
        if (authCode.codeChallengeMethod === "S256") {
            const hash = createHash("sha256").update(codeVerifier).digest("base64");
            // Convert to Base64URL
            calculatedChallenge = hash.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
        } else {
            calculatedChallenge = codeVerifier;
        }

        if (calculatedChallenge !== authCode.codeChallenge) {
            return new Response(JSON.stringify({ error: "invalid_grant", error_description: "PKCE verification failed" }), { status: 400 });
        }

        // 4. Issue Tokens
        const accessToken = randomBytes(32).toString("hex");
        const refreshToken = randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour

        await client.insert(OAuthTokensTable).values({
            accessToken,
            refreshToken,
            clientId,
            userId: authCode.userId,
            expiresAt,
            scopes: authCode.scopes,
        });

        // 5. Delete Code (Single Use)
        await client.delete(OAuthCodesTable).where(eq(OAuthCodesTable.code, code));

        return new Response(JSON.stringify({
            access_token: accessToken,
            token_type: "Bearer",
            expires_in: 3600,
            refresh_token: refreshToken,
            scope: authCode.scopes?.join(" "),
        }), {
            headers: { "Content-Type": "application/json" }
        });

    } catch (e) {
        console.error(e);
        return new Response(JSON.stringify({ error: "server_error" }), { status: 500 });
    }
};
