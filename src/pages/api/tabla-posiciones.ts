import type { APIRoute, APIContext } from "astro";
import redis from "@/lib/redis";
import { getSession } from "auth-astro/server";

const REDIS_KEY = "tournament:rocket-league:tabla-posiciones";

export const GET: APIRoute = async () => {
    try {
        const raw = await redis.get(REDIS_KEY);
        if (raw) {
            return new Response(raw, {
                headers: { "Content-Type": "application/json" },
            });
        }
    } catch (err) {
        console.error("Error reading tabla posiciones from Redis", err);
    }
    // default structure ensures groups exist
    return new Response(JSON.stringify({ A: [], B: [], C: [], D: [] }), {
        headers: { "Content-Type": "application/json" },
    });
};

export const POST: APIRoute = async (context: APIContext) => {
    const session = await getSession(context.request);
    if (!session || !session.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    try {
        const payload = await context.request.json();
        // optionally validate payload shape here
        await redis.set(REDIS_KEY, JSON.stringify(payload));
        return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json" },
        });
    } catch (err) {
        console.error("Error saving tabla posiciones to Redis", err);
        return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
    }
};
