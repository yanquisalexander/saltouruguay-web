import { DateTime } from 'luxon';



export const VOTES_OPEN_TIMESTAMP = 1764633600000;

export const VOTES_CLOSE_TIMESTAMP = 1766199600000;

export const EVENT_TIMESTAMP = 1766271600000;

export const SALTO_BROADCASTER_ID = '238809411'


export const SALTO_DISCORD_GUILD_ID = '700185692826763264'

export const CINEMATICS_CDN_PREFIX = 'https://cdn.saltouruguayserver.com/cinematics'

export const GLOBAL_CDN_PREFIX = 'https://cdn.saltouruguayserver.com'


export const nowInUruguay = () => DateTime.now().setZone('America/Montevideo').toMillis();

export const IS_VOTES_OPEN = () => nowInUruguay() > VOTES_OPEN_TIMESTAMP && nowInUruguay() < VOTES_CLOSE_TIMESTAMP;

export const SITEMAP_EXCLUDED_PATHS = [
    '/admin',
    '/community/member-card',
]

export const PUSHER_KEY = 'app-key';