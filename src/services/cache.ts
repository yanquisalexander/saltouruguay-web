import Cache from "@/lib/Cache";

const cacheService = {
    create(options?: { ttl?: number }): Cache {
        return new Cache({
            url: import.meta.env.REDIS_URL, // Prioridad a REDIS_URL
            ttl: options?.ttl,
        });
    },
};

export default cacheService;
