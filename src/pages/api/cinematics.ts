const CINEMATICS = {
    community: {
        url: 'https://cdn.saltouruguayserver.com/cinematics/comunidad_salto.mp4',
    },
    awards: {
        url: 'https://cdn.saltouruguayserver.com/cinematics/que-es-salto-awards.mp4',
    },
} as const;


import { client } from "@/db/client";
import { UsersTable } from "@/db/schema";
import { pusher } from "@/utils/pusher";
import type { APIContext } from "astro";
import { getSession } from "auth-astro/server";
import { eq } from "drizzle-orm";

export const GET = async ({ request, site }: APIContext) => {
    const session = await getSession(request);

    if (!session) {
        return new Response(null, { status: 401 });
    }

    const { user } = session;

    if (!user) {
        return new Response(null, { status: 401 });
    }

    const results = await client.select({
        played_system_cinematics: UsersTable.playedSystemCinematics,
    }).from(UsersTable).where(eq(UsersTable.id, user.id))

    const playedSystemCinematics = results[0]?.played_system_cinematics || [];

    const query = new URL(request.url).searchParams

    const requestedCinematic = query.get('name') as keyof typeof CINEMATICS;

    if (!requestedCinematic) {
        return new Response(null, { status: 400 });
    }

    /* 
        Si el usuario ya vio la cinematica solicitada , retornamos un 204
    */

    if (playedSystemCinematics.includes(requestedCinematic)) {
        return new Response(null, { status: 204 });
    }

    /* 
        Si la cinematica solicitada no existe en la lista de cinematicas
        retornamos un 404
    */

    if (!CINEMATICS[requestedCinematic]) {
        return new Response(null, { status: 404 });
    }

    /* 
        Si el usuario no vio la cinematica solicitada , la agregamos a la lista
        de cinematicas vistas por el usuario
    */

    await client.update(UsersTable).set({
        playedSystemCinematics: [...playedSystemCinematics, requestedCinematic]
    }).where(eq(UsersTable.id, user.id))

    await pusher.trigger('cinematic-player', 'new-event', {
        targetUsers: [user.id],
        videoUrl: CINEMATICS[requestedCinematic].url
    })

    return new Response(null, { status: 204 });
}