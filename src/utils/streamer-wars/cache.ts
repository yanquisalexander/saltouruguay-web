/**
 * Streamer Wars - Cache Management
 * Handles cache operations for the Streamer Wars system
 */

import Cache from "@/lib/Cache";
import cacheService from "@/services/cache";

let cacheInstance: Cache | null = null;

/**
 * Create a cache instance with default TTL of 48 hours.
 * Uses a singleton pattern to reuse the Redis connection across calls.
 */
export const createCache = () => {
    if (!cacheInstance) {
        cacheInstance = cacheService.create({ ttl: 60 * 60 * 48 });
    }
    return cacheInstance;
};
