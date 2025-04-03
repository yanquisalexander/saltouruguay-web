// File: src/pages/api/oauth/userinfo.ts
import type { APIRoute } from 'astro';
import { validateAccessToken } from '@/lib/saltoplay/oauth';
import { client as db } from '@/db/client';
import { UsersTable } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const GET: APIRoute = async ({ request }) => {
    // Extract the Bearer token from Authorization header
    const authHeader = request.headers.get('Authorization');
    const clientId = request.headers.get('X-Client-ID');

    if (!authHeader || !clientId) {
        return new Response(JSON.stringify({ error: 'invalid_request' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const match = authHeader.match(/^Bearer (.+)$/);
    if (!match) {
        return new Response(JSON.stringify({ error: 'invalid_token' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const accessToken = match[1];

    try {
        // Validate the access token
        const { userId, scopes } = await validateAccessToken(accessToken, clientId);

        // Get user details from database
        const user = await db.query.UsersTable.findFirst({
            where: eq(UsersTable.id, userId),
            columns: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
                email: true,
            },
            with: {
            }
        });

        if (!user) {
            return new Response(JSON.stringify({ error: 'user_not_found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Build response based on requested scopes
        const response: Record<string, any> = {
            sub: user.id.toString()
        };

        if (scopes.includes('profile')) {
            response.username = user.username;
            response.displayName = user.displayName;
            response.avatar = user.avatar;
        }

        if (scopes.includes('email')) {
            response.email = user.email;
        }

        /*  if (scopes.includes('saltotag:read')) {
             response.saltoTag = user.saltoTag;
         } */

        return new Response(JSON.stringify(response), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error: any) {
        return new Response(JSON.stringify({ error: 'invalid_token', error_description: error.message }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};