import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

declare global {
    var redis: Redis | undefined;
}

const redis = global.redis || new Redis(REDIS_URL);

if (process.env.NODE_ENV !== 'production') {
    global.redis = redis;
}

export default redis;
