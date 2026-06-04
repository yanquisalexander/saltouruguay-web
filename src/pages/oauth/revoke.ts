import type { APIRoute } from "astro";
import { revokeToken } from "@/lib/oauth";

export const POST: APIRoute = async ({ request }) => {
    try {
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
