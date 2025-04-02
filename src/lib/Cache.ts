import Redis from "ioredis";

type CacheOptions = {
    url?: string; // Para soportar REDIS_URL
    host?: string;
    port?: number;
    password?: string;
    db?: number;
    ttl?: number;
};

class Cache {
    private client: Redis;
    private defaultTTL?: number;

    constructor(options: CacheOptions = {}) {
        // Preferimos URL si está disponible
        if (options.url) {
            this.client = new Redis(options.url);
        } else {
            this.client = new Redis({
                host: options.host || import.meta.env.REDIS_HOST,
                port: options.port || 6379,
                password: options.password || import.meta.env.REDIS_PASSWORD,
                db: options.db || 0,
            });
        }

        this.defaultTTL = options.ttl;
        this.client.on("connect", () => { });
        this.client.on("error", (err: Error) => console.error("Redis error:", err));
    }

    /**
     * Sets a value in the cache.
     * @param key - The cache key.
     * @param value - The value to store. Can be any JSON-serializable data.
     * @param ttl - Optional TTL (time-to-live) in seconds.
     */
    async set<T>(key: string, value: T, ttl?: number): Promise<void> {
        try {
            const serializedValue = JSON.stringify(value);
            const expiry = ttl ?? this.defaultTTL;

            if (expiry) {
                await this.client.set(key, serializedValue, "EX", expiry);
            } else {
                await this.client.set(key, serializedValue);
            }
        } catch (err) {
            console.error(`Redis SET error for key "${key}":`, err);
        }
    }

    /**
     * Gets a value from the cache.
     * @param key - The cache key.
     * @returns The parsed value, or null if the key does not exist.
     */
    async get<T>(key: string): Promise<T | null> {
        try {
            const result = await this.client.get(key);
            return result ? JSON.parse(result) : null;
        } catch (err) {
            console.error(`Redis GET error for key "${key}":`, err);
            return null;
        }
    }

    /**
     * Deletes a key from the cache.
     * @param key - The cache key.
     */
    async delete(key: string): Promise<void> {
        try {
            await this.client.del(key);
        } catch (err) {
            console.error(`Redis DELETE error for key "${key}":`, err);
        }
    }

    /**
     * Closes the Redis connection.
     */
    async close(): Promise<void> {
        await this.client.quit();
    }
}

export default Cache;
