/**
 * Streamer Wars - Constants
 * Centralized constants for the Streamer Wars system
 */

import { PUSHER_CHANNELS, CACHE_KEYS } from "@/consts/pusher";

// Pusher channels (re-exported from central constants)
export const PRESENCE_CHANNEL = PUSHER_CHANNELS.PRESENCE;

// Cache keys (re-exported from central constants)
export const CACHE_KEY_SIMON_SAYS = CACHE_KEYS.SIMON_SAYS;
export const CACHE_KEY_DALGONA = CACHE_KEYS.DALGONA;
export const CACHE_KEY_TUG_OF_WAR = CACHE_KEYS.TUG_OF_WAR;
export const CACHE_KEY_BOMB = CACHE_KEYS.BOMB;
export const CACHE_KEY_FISHING = CACHE_KEYS.FISHING;
export const CACHE_KEY_FISHING_ELIMINATED = CACHE_KEYS.FISHING_ELIMINATED;

// Game settings
export const COLORS = ["red", "blue", "green", "yellow"];
export const COOLDOWN_MS = 1500; // 1.5 seconds cooldown per player
export const MAX_CHALLENGES = 5;
export const MAX_ERRORS = 3;

// Fishing game valid keys (letters that can be used for the minigame)
export const FISHING_VALID_KEYS = [
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
    'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'
];
