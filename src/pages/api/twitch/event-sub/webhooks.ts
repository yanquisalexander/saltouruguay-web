import { createTwitchEventsInstance, setupEventSub } from "@/lib/Twitch";
import type { APIContext } from "astro";

export const POST = async ({ request }: APIContext) => {
    try {
        const eventSub = createTwitchEventsInstance();

        return await eventSub.handleEvent(request);
    } catch (e) {
        console.error(e);
        return new Response("Error", { status: 500 });
    }
};

/* export const GET = async ({ request }: APIContext) => {
    try {
        await setupEventSub();
        return new Response("OK", { status: 200 });
    } catch (e) {
        console.error(e);
        return new Response("Error", { status: 500 });
    }
} */