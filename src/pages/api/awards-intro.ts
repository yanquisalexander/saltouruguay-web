import { client } from "@/db/client";
import { UsersTable } from "@/db/schema";
import type { APIContext } from "astro";
import { getSession } from "auth-astro/server";
import { eq } from "drizzle-orm";

export const GET = async ({ request }: APIContext) => {
    const session = await getSession(request);

    if (!session) {
        return new Response(JSON.stringify({ shown: true }), { status: 200 });
    }

    const { user } = session;

    if (!user) {
        return new Response(JSON.stringify({ shown: true }), { status: 200 });
    }

    const results = await client.select({
        playedSystemCinematics: UsersTable.playedSystemCinematics,
    }).from(UsersTable).where(eq(UsersTable.id, user.id))

    const playedSystemCinematics = results[0]?.playedSystemCinematics || [];

    const query = new URL(request.url).searchParams
    const requestedIntro = query.get('check');

    if (!requestedIntro) {
        return new Response(JSON.stringify({ shown: true }), { status: 400 });
    }

    const shown = playedSystemCinematics.includes(requestedIntro);

    return new Response(JSON.stringify({ shown }), { status: 200 });
}

export const POST = async ({ request }: APIContext) => {
    const session = await getSession(request);

    if (!session) {
        return new Response(null, { status: 401 });
    }

    const { user } = session;

    if (!user) {
        return new Response(null, { status: 401 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name) {
        return new Response(null, { status: 400 });
    }

    const results = await client.select({
        playedSystemCinematics: UsersTable.playedSystemCinematics,
    }).from(UsersTable).where(eq(UsersTable.id, user.id))

    const playedSystemCinematics = results[0]?.playedSystemCinematics || [];

    if (!playedSystemCinematics.includes(name)) {
        await client.update(UsersTable).set({
            playedSystemCinematics: [...playedSystemCinematics, name]
        }).where(eq(UsersTable.id, user.id))
    }

    return new Response(null, { status: 204 });
}