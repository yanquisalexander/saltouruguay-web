import type { APIRoute } from "astro";
import redis from "@/lib/redis";
import type { APIContext } from "astro";
import { getSession } from "auth-astro/server";

export const POST: APIRoute = async (context: APIContext) => {
    const session = await getSession(context.request);

    // Basic security check - assume admin check is handled or we add it here
    if (!session || !session.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    // OPTIONAL: Add actual admin role check here if logical

    try {
        const body = await context.request.json();
        const { mode, categoryId, visibleNominees, winnerId } = body;

        const newState = {
            mode: mode || "hidden", // 'hidden', 'category', 'nominees', 'winner', 'paused'
            categoryId,
            visibleNominees: visibleNominees || [], // IDs to show
            winnerId,
            timestamp: Date.now(),
            nonce: Math.floor(Math.random() * 1000000000)
        };

        // Update Redis
        await redis.set("overlay:state", JSON.stringify(newState));
        await redis.incr("overlay:version");

        // Determine new version
        const newVersion = await redis.get("overlay:version");

        // Publish event (optional, if we used pub/sub in reader)
        await redis.publish("overlay:update", newVersion || "0");

        return new Response(JSON.stringify({ success: true, state: newState, version: newVersion }), {
            headers: { "Content-Type": "application/json" },
        });

    } catch (err) {
        console.error(err);
        return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
    }
};
