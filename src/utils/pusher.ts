import Pusher from 'pusher';
import {
    PUSHER_APP_SECRET,
} from 'astro:env/server'
import { PUSHER_APP_CLUSTER, PUSHER_APP_ID, PUSHER_APP_KEY } from "astro:env/client";

const host = /* import.meta.env.DEV ? 'localhost' :  */`saltosoketi2.holy.gg`;
const port = import.meta.env.DEV ? "6001" : "6002";



export const pusher = new Pusher({
    host,
    port,
    appId: PUSHER_APP_ID,
    key: PUSHER_APP_KEY,
    secret: PUSHER_APP_SECRET,
    cluster: PUSHER_APP_CLUSTER,
    useTLS: import.meta.env.PROD,
});