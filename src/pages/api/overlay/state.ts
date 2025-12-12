import type { APIRoute } from "astro";
import redis from "@/lib/redis";

export const GET: APIRoute = async ({ request }) => {
    const url = new URL(request.url);
    const clientVersion = parseInt(url.searchParams.get("lastVersion") || "0");

    // Timeout for long polling (e.g., 25 seconds) to avoid gateway timeouts
    const timeout = 25000;
    const startTime = Date.now();

    // Helper to get current state
    const getState = async () => {
        const rawState = await redis.get("overlay:state");
        const version = parseInt((await redis.get("overlay:version")) || "0");
        return {
            state: rawState ? JSON.parse(rawState) : null,
            version
        };
    };

    // Immediate check
    let { state, version } = await getState();

    if (version > clientVersion) {
        return new Response(JSON.stringify({ state, version }), {
            headers: { "Content-Type": "application/json" },
        });
    }

    // Long polling loop
    // We use a simple subscriber for efficient waiting if possible, but 
    // for simplicity/robustness in serverless/mixed envs, we might check periodically 
    // or use a blocking pop if we redesigned queues. 
    // However, Redis Pub/Sub is better for "event" but doesn't hold connection well in all serverless.
    // Given we are receiving 'ioredis' which supports blocking, we can use a subscriber client.

    // BUT: duplicating connection for every request might be heavy.
    // Efficient Approach: Loop with delay.

    while (Date.now() - startTime < timeout) {
        // Wait 500ms
        await new Promise(resolve => setTimeout(resolve, 500));

        // Check version again
        const currentVerStr = await redis.get("overlay:version");
        const currentVer = parseInt(currentVerStr || "0");

        if (currentVer > clientVersion) {
            const rawState = await redis.get("overlay:state");
            return new Response(JSON.stringify({
                state: rawState ? JSON.parse(rawState) : null,
                version: currentVer
            }), {
                headers: { "Content-Type": "application/json" },
            });
        }
    }

    // Timeout reached, return current state (no change) or signal no content
    return new Response(JSON.stringify({ state, version }), {
        headers: { "Content-Type": "application/json" },
    });
};
