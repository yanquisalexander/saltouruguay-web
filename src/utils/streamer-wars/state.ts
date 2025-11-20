/**
 * Streamer Wars - State Management
 * Manages game state across the system
 */

import cacheService from "@/services/cache";

/**
 * Get the current game state
 */
export const getGameState = async () => {
    const cache = cacheService.create({ ttl: 60 * 60 * 24 });
    return await cache.get("streamer-wars-gamestate") as any;
};

/**
 * Set the game state
 */
export const setGameState = async (gameState: any) => {
    const cache = cacheService.create({ ttl: 60 * 60 * 24 });
    await cache.set("streamer-wars-gamestate", gameState);
};

/**
 * Clear the game state
 */
export const clearGameState = async () => {
    const cache = cacheService.create({ ttl: 60 * 60 * 24 });
    await cache.set("streamer-wars-gamestate", null);
};

/**
 * Get today's eliminated players
 */
export const getTodayEliminatedPlayers = async (): Promise<number[]> => {
    const cache = cacheService.create({ ttl: 60 * 60 * 48 });
    return await cache.get("streamer-wars-today-eliminateds") as number[] ?? [];
};

/**
 * Get auto-eliminated players
 */
export const getAutoEliminatedPlayers = async (): Promise<number[]> => {
    const cache = cacheService.create({ ttl: 60 * 60 * 48 });
    return await cache.get("streamer-wars-auto-eliminateds") as number[] ?? [];
};

/**
 * Get current timer
 */
export const getCurrentTimer = async (): Promise<{ startedAt: number; duration: number } | null> => {
    const cache = cacheService.create({ ttl: 60 * 60 * 48 });
    const timerData = await cache.get<{ startedAt: number; duration: number }>("streamer-wars-timer");
    if (!timerData) return null;
    const elapsed = Date.now() - timerData.startedAt;
    const totalDurationMs = timerData.duration * 1000;
    if (elapsed >= totalDurationMs) {
        // Timer expired, clean up
        await cache.delete("streamer-wars-timer");
        return null;
    }
    return timerData;
};
