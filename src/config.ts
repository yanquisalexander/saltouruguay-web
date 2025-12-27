import { DateTime } from 'luxon';



export const VOTES_OPEN_TIMESTAMP = 1764716400000;

export const VOTES_CLOSE_TIMESTAMP = 1766372399000;

export const EVENT_TIMESTAMP = 1766446200000;

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

export const CHRISTMAS_MODE = true;
export const LAST_EDITION_VOD_URL = 'https://www.twitch.tv/videos/2650701140';