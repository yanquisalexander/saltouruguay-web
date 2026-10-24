import type { APIRoute } from "astro";
import redis from "@/lib/redis";
import { overlayStateKey, overlayVersionKey, parseOverlayState, DEFAULT_OVERLAY_STATE } from "@/lib/tournament-overlay";

const readState = async (id: number) => {
    const [raw, versionRaw] = await Promise.all([
        redis.get(overlayStateKey(id)),
        redis.get(overlayVersionKey(id)),
    ]);
    const version = parseInt(versionRaw || "0") || 0;
    let state = DEFAULT_OVERLAY_STATE;
    if (raw) {
        try {
            state = parseOverlayState(JSON.parse(raw));
        } catch {
            /* estado corrupto: caer al default */
        }
    }
    return { state, version };
};

export const GET: APIRoute = async ({ params, request }) => {
    const id = Number(params.id);
    if (!Number.isSafeInteger(id) || id < 1) {
        return new Response(JSON.stringify({ error: "Invalid tournament id" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const url = new URL(request.url);
    const hasClientVersion = url.searchParams.has("lastVersion");
    const clientVersion = parseInt(url.searchParams.get("lastVersion") || "0") || 0;
    const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });

    // Sin lastVersion: respuesta inmediata (estado inicial en SSR / montaje del panel admin).
    if (!hasClientVersion) return json(await readState(id));

    // Respuesta inmediata si ya hay cambios.
    let result = await readState(id);
    if (result.version > clientVersion) return json(result);

    // Long polling (25s, chequeo cada 500ms) — mismo patrón que /api/overlay/state.
    const timeout = 25000;
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
        await new Promise(resolve => setTimeout(resolve, 500));
        const version = parseInt((await redis.get(overlayVersionKey(id))) || "0") || 0;
        if (version > clientVersion) return json(await readState(id));
    }

    return json(result);
};
