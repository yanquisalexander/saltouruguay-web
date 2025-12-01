/**
 * Streamer Wars - Fishing Minigame
 * Backend logic for the "Vamos a Pescar" minigame
 * 
 * This game runs primarily client-side. The backend only:
 * - Tracks eliminated players
 * - Handles game start/end state
 */

import { pusher } from "@/utils/pusher";
import type { FishingGameState } from "../types";
import { CACHE_KEY_FISHING, CACHE_KEY_FISHING_ELIMINATED } from "../constants";
import { createCache } from "../cache";

// Forward declaration for eliminatePlayer - will be imported from eliminations module
let eliminatePlayer: (playerNumber: number) => Promise<void>;

/**
 * Set the eliminatePlayer function (dependency injection)
 */
export const setEliminatePlayer = (fn: (playerNumber: number) => Promise<void>) => {
    eliminatePlayer = fn;
};

/**
 * Get the current game state
 */
export const getGameState = async (): Promise<FishingGameState> => {
    const cache = createCache();
    return (
        (await cache.get<FishingGameState>(CACHE_KEY_FISHING)) ?? {
            status: 'waiting',
            eliminatedPlayers: [],
        }
    );
};

/**
 * Start the fishing game
 */
export const startGame = async (): Promise<FishingGameState> => {
    const cache = createCache();
    
    const newGameState: FishingGameState = {
        status: 'active',
        eliminatedPlayers: [],
        startedAt: Date.now(),
    };

    await cache.set(CACHE_KEY_FISHING, newGameState);
    await cache.set(CACHE_KEY_FISHING_ELIMINATED, []);
    
    await pusher.trigger("streamer-wars", "fishing:game-started", newGameState);
    
    return newGameState;
};

/**
 * Record a player elimination (called when a player fails)
 */
export const recordElimination = async (playerNumber: number): Promise<{ success: boolean; error?: string }> => {
    const cache = createCache();
    const gameState = await getGameState();

    if (gameState.status !== 'active') {
        return { success: false, error: 'El juego no está activo' };
    }

    // Get current eliminated players array
    let eliminatedPlayers = await cache.get<number[]>(CACHE_KEY_FISHING_ELIMINATED) ?? [];
    
    // Check if player is already eliminated
    if (eliminatedPlayers.includes(playerNumber)) {
        return { success: false, error: 'Ya estás eliminado' };
    }

    // Add player to eliminated list
    eliminatedPlayers = [...eliminatedPlayers, playerNumber];
    await cache.set(CACHE_KEY_FISHING_ELIMINATED, eliminatedPlayers);

    // Update game state
    const newGameState: FishingGameState = {
        ...gameState,
        eliminatedPlayers,
    };
    await cache.set(CACHE_KEY_FISHING, newGameState);

    // Notify about elimination
    await pusher.trigger("streamer-wars", "fishing:player-eliminated", {
        playerNumber,
    });

    return { success: true };
};

/**
 * End the fishing game and process eliminations
 */
export const endGame = async (): Promise<{ success: boolean; eliminatedPlayers: number[]; error?: string }> => {
    const cache = createCache();
    const gameState = await getGameState();

    if (gameState.status !== 'active') {
        return { success: false, eliminatedPlayers: [], error: 'El juego no está activo' };
    }

    // Get all eliminated players
    const eliminatedPlayers = await cache.get<number[]>(CACHE_KEY_FISHING_ELIMINATED) ?? [];

    // Update game state to ended
    const newGameState: FishingGameState = {
        ...gameState,
        status: 'ended',
        eliminatedPlayers,
    };
    await cache.set(CACHE_KEY_FISHING, newGameState);

    // Broadcast game end
    await pusher.trigger("streamer-wars", "fishing:game-ended", {
        eliminatedPlayers,
    });

    // Process eliminations through the elimination system
    if (eliminatePlayer) {
        for (const playerNumber of eliminatedPlayers) {
            try {
                await eliminatePlayer(playerNumber);
            } catch (error) {
                console.error(`Error eliminating player ${playerNumber}:`, error);
            }
        }
    }

    return { success: true, eliminatedPlayers };
};

/**
 * Get the list of eliminated players
 */
export const getEliminatedPlayers = async (): Promise<number[]> => {
    const cache = createCache();
    return await cache.get<number[]>(CACHE_KEY_FISHING_ELIMINATED) ?? [];
};

/**
 * Check if a player is eliminated
 */
export const isPlayerEliminated = async (playerNumber: number): Promise<boolean> => {
    const eliminatedPlayers = await getEliminatedPlayers();
    return eliminatedPlayers.includes(playerNumber);
};

/**
 * Reset the game state (for admin use)
 */
export const resetGame = async (): Promise<FishingGameState> => {
    const cache = createCache();
    
    const newGameState: FishingGameState = {
        status: 'waiting',
        eliminatedPlayers: [],
    };

    await cache.set(CACHE_KEY_FISHING, newGameState);
    await cache.set(CACHE_KEY_FISHING_ELIMINATED, []);
    
    await pusher.trigger("streamer-wars", "fishing:game-reset", {});
    
    return newGameState;
};
