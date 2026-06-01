import Pusher from 'pusher';
import { PUSHER_CHANNELS, PUSHER_EVENTS } from "../consts/pusher";
const { PUSHER_APP_CLUSTER, PUSHER_APP_ID, PUSHER_APP_KEY, PUSHER_APP_SECRET } = import.meta.env;


export default function notifyNewVersion() {
    return {
        name: "notify-new-version",
        hooks: {
            "astro:build:done": async () => {
                try {
                    const pusher = new Pusher({
                        port: "443",
                        appId: PUSHER_APP_ID,
                        key: PUSHER_APP_KEY,
                        secret: PUSHER_APP_SECRET,
                        cluster: PUSHER_APP_CLUSTER,
                        useTLS: true
                    });
                    await pusher.trigger(PUSHER_CHANNELS.GLOBAL, PUSHER_EVENTS.NEW_VERSION, null);
                } catch (error) {

                }
            },
        },
    };
}