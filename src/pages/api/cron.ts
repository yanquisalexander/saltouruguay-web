import { CATEGORIES } from "@/awards/Categories";
import { NOMINEES } from "@/awards/Nominees";
import cacheService from "@/services/cache";
import { calculateVotes, createGroupedVotes } from "@/utils/awards-vote-system";
import type { APIContext } from "astro";
import { CRON_SECRET } from "astro:env/server";
import { SALTO_BROADCASTER_ID } from "@/config";
import { appApiClient } from "@/lib/Twitch";
import { getLiveStream } from "@/utils/twitch-runtime";
import { currentDropWindowKey, runStreamDrop } from "@/utils/album";
import { client } from "@/db/client";
import { UsersTable } from "@/db/schema";
import { AlbumPusher } from "@/services/album-pusher";
import { inArray } from "drizzle-orm";

/* 
    This is an Endpoint called by http-cron to execute "cron jobs" on the server.
*/

export const POST = async ({ request }: APIContext) => {
    const TASKS = [
        "calculate-votes",
        "drop-sticker-packs",
    ] as const;

    try {
        // Parse the request JSON
        const { secret, task } = await request.json() as {
            secret: string | undefined;
            task: typeof TASKS[number] | undefined;
        };

        // Validate the secret
        if (secret !== CRON_SECRET) {
            return new Response("Cannot execute cron jobs: invalid secret", { status: 400 });
        }

        // Validate the task
        if (!task) {
            return new Response("Cannot execute cron jobs: missing task", { status: 400 });
        }

        if (!TASKS.includes(task)) {
            return new Response("Cannot execute cron jobs: invalid task", { status: 400 });
        }

        switch (task) {
            case "calculate-votes":
                console.log("Calculating votes...");

                // Execute vote calculation
                const calculatedVotes = await calculateVotes();

                const groupedVotes = createGroupedVotes({ calculatedVotes });


                const cache = cacheService.create({ ttl: 60 * 60 * 48 /* 48 hours */ });
                await cache.delete("calculatedVotes"); // Clear the cache before setting the new value

                await cache.set("calculatedVotes", groupedVotes);

                break;

            case "drop-sticker-packs": {
                // Solo otorga si el directo está en vivo
                const stream = await getLiveStream(SALTO_BROADCASTER_ID).catch((e) => {
                    console.error("drop-sticker-packs: getLiveStream failed", e);
                    return null;
                });
                if (!stream) {
                    console.log("drop-sticker-packs: stream offline, skipping");
                    break;
                }

                // Viewers de Twitch (chatters) → twitchIds
                let twitchIds: string[] = [];
                try {
                    const res: any = await (appApiClient as any).chat.getChatters(
                        SALTO_BROADCASTER_ID,
                        SALTO_BROADCASTER_ID,
                    );
                    const list = Array.isArray(res) ? res : (res?.data ?? []);
                    twitchIds = list
                        .map((c: any) => String(c.userId ?? c.user_id ?? c.id ?? ""))
                        .filter(Boolean);
                } catch (e) {
                    console.error("drop-sticker-packs: getChatters failed (scopes?)", e);
                    break;
                }

                if (twitchIds.length === 0) {
                    console.log("drop-sticker-packs: no chatters found");
                    break;
                }

                // Mapear twitchId → userId (solo cuentas vinculadas cobran)
                const dbUsers = await client
                    .select({ id: UsersTable.id })
                    .from(UsersTable)
                    .where(inArray(UsersTable.twitchId, twitchIds))
                    .execute();

                const windowKey = currentDropWindowKey();
                const result = await runStreamDrop(
                    windowKey,
                    dbUsers.map((u) => u.id),
                    (stream as any)?.id ? String((stream as any).id) : undefined,
                );

                console.log(
                    `drop-sticker-packs: window=${windowKey} skipped=${result.skipped} granted=${result.granted}`,
                );

                // Notificar en realtime (best-effort, no falla el cron)
                for (const p of result.packs) {
                    try {
                        await AlbumPusher.packReceived(p.userId, p.packId, p.tier, "stream_drop");
                    } catch (e) {
                        console.error("drop-sticker-packs: pusher notify failed", e);
                    }
                }
                break;
            }

            default:
                return new Response(`Task "${task}" not implemented`, { status: 400 });
        }

        return new Response("OK", { status: 200 });

    } catch (error) {
        console.error("Error executing cron job:", error);
        return new Response("Internal server error", { status: 500 });
    }
};
