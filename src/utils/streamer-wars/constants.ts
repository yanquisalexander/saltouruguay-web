/**
 * Streamer Wars - Constants
 * Centralized constants for the Streamer Wars system
 */

// Pusher channels
export const PRESENCE_CHANNEL = "presence-streamer-wars";

// Cache keys
export const CACHE_KEY_SIMON_SAYS = "streamer-wars.simon-says";
export const CACHE_KEY_DALGONA = "streamer-wars.dalgona:game-state";
export const CACHE_KEY_TUG_OF_WAR = "streamer-wars.tug-of-war:game-state";
export const CACHE_KEY_BOMB = "streamer-wars.bomb:game-state";

// Game settings
export const COLORS = ["red", "blue", "green", "yellow"];
export const COOLDOWN_MS = 1500; // 1.5 seconds cooldown per player
export const MAX_CHALLENGES = 5;
export const MAX_ERRORS = 3;
