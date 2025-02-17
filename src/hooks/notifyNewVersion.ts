import { pusher } from "../utils/pusher";

export default function notifyNewVersion() {
    return {
        name: "notify-new-version",
        hooks: {
            "astro:build:done": async () => {
                try {
                    await pusher.trigger("streamer-wars", "new-version", null);
                } catch (error) {

                }
            },
        },
    };
}