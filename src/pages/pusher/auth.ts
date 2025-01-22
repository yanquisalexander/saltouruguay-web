import { pusher } from "@/utils/pusher";
import type { Session } from "@auth/core/types";
import type { APIContext } from "astro";
import { getSession } from "auth-astro/server";

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

    const auth = pusher.authorizeChannel(socketId, channelName, {
        user_id: session.user?.id as string,
        user_info: {
            id: session.user?.id,
            name: session.user.name || session.user.username,
            avatar: session.user.image,
            admin: session.user.isAdmin,
        },
    });

    return new Response(JSON.stringify(auth), {
        headers: {
            "Content-Type": "application/json",
        },
    });
}