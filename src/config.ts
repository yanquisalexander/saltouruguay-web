import { DateTime } from 'luxon';


export const VOTES_OPEN_TIMESTAMP = 1733022000000;

export const EVENT_TIMESTAMP = 1734737400000;

export const SALTO_BROADCASTER_ID = '238809411'

export const PUSHER_KEY = "15af022785152446b456"


const VOTES_CLOSE_TIMESTAMP = DateTime.fromMillis(EVENT_TIMESTAMP, { zone: 'America/Montevideo' })
    .minus({ days: 1 })
    .set({ hour: 19, minute: 0, second: 0, millisecond: 0 })
    .toMillis();

const nowInUruguay = DateTime.now().setZone('America/Montevideo').toMillis();

export const IS_VOTES_OPEN = nowInUruguay > VOTES_OPEN_TIMESTAMP && nowInUruguay < VOTES_CLOSE_TIMESTAMP;
