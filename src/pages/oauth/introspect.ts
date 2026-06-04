import type { APIRoute } from "astro";
import { introspectToken } from "@/lib/oauth";

export const POST: APIRoute = async ({ request }) => {
    try {
        const formData = await request.formData();
        const token = formData.get("token")?.toString();

        if (!token) {
            return json({ active: false }, 200);
        }

        const result = await introspectToken(token);
        return json(result as Record<string, unknown>);
    } catch {
        return json({ active: false });
    }
};

function json(data: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}
