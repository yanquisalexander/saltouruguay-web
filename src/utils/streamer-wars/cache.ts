/**
 * Streamer Wars - Cache Management
 * Handles cache operations for the Streamer Wars system
 */

import cacheService from "@/services/cache";

/**
 * Create a cache instance with default TTL of 48 hours
 */
export const createCache = () => cacheService.create({ ttl: 60 * 60 * 48 });
