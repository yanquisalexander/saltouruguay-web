import type { APIRoute } from "astro";
import redis from "@/lib/redis";
import { getSession } from "auth-astro/server";
import { client as db } from "@/db/client";
import { UsersTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
    overlayStateKey,
    overlayVersionKey,
    parseOverlayState,
    mergeOverlayState,
    DEFAULT_OVERLAY_STATE,
} from "@/lib/tournament-overlay";

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

export const POST: APIRoute = async ({ params, request }) => {
    const id = Number(params.id);
    if (!Number.isSafeInteger(id) || id < 1) return json({ error: "Invalid tournament id" }, 400);

    const session = await getSession(request);
    if (!session?.user?.id) return json({ error: "Unauthorized" }, 401);

    const user = await db.query.UsersTable.findFirst({
        where: eq(UsersTable.id, Number(session.user.id)),
        columns: { admin: true },
    });
    if (user?.admin !== true) return json({ error: "Forbidden" }, 403);

    try {
        const body = (await request.json()) as Record<string, unknown> | null;
        if (!body || typeof body !== "object") return json({ error: "Invalid payload" }, 400);

        const raw = await redis.get(overlayStateKey(id));
        let base = DEFAULT_OVERLAY_STATE;
        if (raw) {
            try {
                base = parseOverlayState(JSON.parse(raw));
            } catch {
                /* reset al default */
            }
        }

        const bumpRefresh = body.refresh === true || body.bumpRefresh === true;
        const nextState = mergeOverlayState(base, body, bumpRefresh);

        await redis.set(overlayStateKey(id), JSON.stringify(nextState));
        const version = await redis.incr(overlayVersionKey(id));

        return json({ success: true, state: nextState, version: Number(version) || 0 });
    } catch (err) {
        console.error("tournament overlay update error:", err);
        return json({ error: "Internal Server Error" }, 500);
    }
};
