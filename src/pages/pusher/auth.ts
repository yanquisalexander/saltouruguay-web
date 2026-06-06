import { pusher } from "@/utils/pusher";
import { PUSHER_CHANNELS_RULETA } from "@/consts/pusher";
import { client } from "@/db/client";
import { RuletaLocaGameSessionsTable } from "@/db/schema";
import { sql, eq } from "drizzle-orm";
import type { Session } from "@auth/core/types";
import type { APIContext } from "astro";
import { getSession } from "auth-astro/server";

const RULETA_PREFIX = "presence-ruleta-";

export const POST = async ({ params, request }: APIContext) => {
    const session = await getSession(request) as Session;

    if (!session || !session.user) {
        return new Response("Unauthorized", {
            status: 401,
        });
    }

    const form = await request.formData();

    const socketId = form.get("socket_id") as string;
    const channelName = form.get("channel_name") as string;

    // Validate presence-ruleta-* channel membership
    if (channelName.startsWith(RULETA_PREFIX)) {
        const roomCode = channelName.slice(RULETA_PREFIX.length);
        const userId = parseInt(session.user.id);

        const [existing] = await client
            .select({ id: RuletaLocaGameSessionsTable.id })
            .from(RuletaLocaGameSessionsTable)
            .where(
                sql`${RuletaLocaGameSessionsTable.roomCode} = ${roomCode} AND ${userId} = ANY(${RuletaLocaGameSessionsTable.playerIds}::int[])`
            )
            .execute();

        if (!existing) {
            return new Response("Forbidden: not a room member", {
                status: 403,
            });
        }
    }

    const auth = pusher.authorizeChannel(socketId, channelName, {
        user_id: session.user?.id as string,
        user_info: {
            id: session.user?.id,
            name: session.user.name || session.user.username,
            avatar: session.user.image,
            admin: session.user.isAdmin,
            playerNumber: session.user.streamerWarsPlayerNumber,
        },
    });

    return new Response(JSON.stringify(auth), {
        headers: {
            "Content-Type": "application/json",
        },
    });
}