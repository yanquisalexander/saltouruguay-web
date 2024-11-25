import Pusher from 'pusher';
import {
    PUSHER_APP_ID,
    PUSHER_APP_KEY,
    PUSHER_APP_SECRET,
    PUSHER_APP_CLUSTER
} from 'astro:env/server'

const host = import.meta.env.DEV ? 'localhost' : `api-${PUSHER_APP_CLUSTER}.pusher.com`;
const port = (import.meta.env.DEV ? 6001 : 443).toString();

const pusherConfig = {
    wsHost: host,
    wsPort: port,
    forceTLS: port === '443',
    cluster: PUSHER_APP_CLUSTER,
};

export const pusher = new Pusher({
    host,
    port,
    appId: PUSHER_APP_ID,
    key: PUSHER_APP_KEY,
    secret: PUSHER_APP_SECRET,
    cluster: PUSHER_APP_CLUSTER,
    useTLS: !import.meta.env.DEV,
});