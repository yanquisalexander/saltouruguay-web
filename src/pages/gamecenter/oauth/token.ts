// File: src/pages/api/oauth/token.ts
import type { APIRoute } from 'astro';
import {
    validateAuthorizationCode,
    generateTokens,
    refreshAccessToken,
    getOauthClient
} from '@/lib/saltoplay/oauth';

export const POST: APIRoute = async ({ request }) => {
    try {
        const formData = await request.formData();
        const grantType = formData.get('grant_type')?.toString();
        const clientId = formData.get('client_id')?.toString();
        const clientSecret = formData.get('client_secret')?.toString();

        // Validate client credentials
        if (!clientId || !clientSecret) {
            return new Response(JSON.stringify({ error: 'invalid_client' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const client = await getOauthClient(clientId);
        if (!client || client.clientSecret !== clientSecret) {
            return new Response(JSON.stringify({ error: 'invalid_client' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (grantType === 'authorization_code') {
            const code = formData.get('code')?.toString();
            const redirectUri = formData.get('redirect_uri')?.toString();

            if (!code || !redirectUri) {
                return new Response(JSON.stringify({ error: 'invalid_request' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            try {
                // Validate and consume the authorization code
                const { userId, scopes } = await validateAuthorizationCode(code, clientId, redirectUri);

                // Generate tokens
                const tokens = await generateTokens(clientId, userId, scopes);

                return new Response(JSON.stringify({
                    access_token: tokens.accessToken,
                    token_type: 'Bearer',
                    expires_in: 3600, // 1 hour
                    refresh_token: tokens.refreshToken,
                    scope: scopes.join(' ')
                }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            } catch (error: any) {
                return new Response(JSON.stringify({ error: 'invalid_grant', error_description: error.message }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        } else if (grantType === 'refresh_token') {
            const refreshToken = formData.get('refresh_token')?.toString();

            if (!refreshToken) {
                return new Response(JSON.stringify({ error: 'invalid_request' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            try {
                // Refresh the access token
                const tokens = await refreshAccessToken(refreshToken, clientId);

                return new Response(JSON.stringify({
                    access_token: tokens.accessToken,
                    token_type: 'Bearer',
                    expires_in: 3600, // 1 hour
                    refresh_token: tokens.refreshToken
                }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            } catch (error: any) {
                return new Response(JSON.stringify({ error: 'invalid_grant', error_description: error.message }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        } else {
            return new Response(JSON.stringify({ error: 'unsupported_grant_type' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    } catch (error) {
        console.error('Error processing token request:', error);
        return new Response(JSON.stringify({ error: 'server_error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};