import type { APIRoute } from "astro";
import { revokeToken, getApprovedClient } from "@/lib/oauth";

export const POST: APIRoute = async ({ request }) => {
    try {
        // Require HTTP Basic Auth (client_id:client_secret)
        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Basic ")) {
            return json({ error: "invalid_client" }, 401);
        }
        const decoded = atob(authHeader.slice(6));
        const colonIdx = decoded.indexOf(":");
        if (colonIdx === -1) {
            return json({ error: "invalid_client" }, 401);
        }
        const clientId = decoded.slice(0, colonIdx);
        const clientSecret = decoded.slice(colonIdx + 1);
        const client = await getApprovedClient(clientId);
        if (!client || client.clientSecret !== clientSecret) {
            return json({ error: "invalid_client" }, 401);
        }

        const formData = await request.formData();
        const token = formData.get("token")?.toString();

        if (!token) {
            return json({ error: "invalid_request" }, 400);
        }

        await revokeToken(token);
        return json({});
    } catch {
        return json({ error: "server_error" }, 500);
    }
};

function json(data: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}
