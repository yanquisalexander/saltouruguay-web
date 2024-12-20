/* This import is causing error on vercel build */
//import { PUSHER_APP_KEY } from "astro:env/client";
import { DateTime } from 'luxon';


export const VOTES_OPEN_TIMESTAMP = 1733022000000;

export const VOTES_CLOSE_TIMESTAMP = 1734666300000;

export const EVENT_TIMESTAMP = 1734737400000;

export const SALTO_BROADCASTER_ID = '238809411'

export const PUSHER_KEY = "mieit3wxzvktfm7gbxeq"

export const SALTO_DISCORD_GUILD_ID = '700185692826763264'



export const nowInUruguay = () => DateTime.now().setZone('America/Montevideo').toMillis();

export const IS_VOTES_OPEN = () => false// nowInUruguay() > VOTES_OPEN_TIMESTAMP && nowInUruguay() < VOTES_CLOSE_TIMESTAMP;

export const SITEMAP_EXCLUDED_PATHS = [
    '/admin',
    '/community/member-card',
]