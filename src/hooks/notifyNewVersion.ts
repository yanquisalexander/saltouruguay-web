import Pusher from 'pusher';
const { PUSHER_APP_CLUSTER, PUSHER_APP_ID, PUSHER_APP_KEY, PUSHER_APP_SECRET } = import.meta.env;

const host = /* import.meta.env.DEV ? 'localhost' :  */`soketi.saltouruguayserver.com`;


export default function notifyNewVersion() {
    return {
        name: "notify-new-version",
        hooks: {
            "astro:build:done": async () => {
                try {
                    const pusher = new Pusher({
                        host,
                        port: "443",
                        appId: PUSHER_APP_ID,
                        key: PUSHER_APP_KEY,
                        secret: PUSHER_APP_SECRET,
                        cluster: PUSHER_APP_CLUSTER,
                        useTLS: true
                    });
                    await pusher.trigger("streamer-wars", "new-version", null);
                } catch (error) {

                }
            },
        },
    };
}