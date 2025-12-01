/**
 * Streamer Wars - Minigames Module
 * Aggregates all minigame exports
 */

import * as simonSaysGame from './simon-says';
import * as bombChallenges from './bomb-challenges';
import * as fishingGame from './fishing';

// Re-export challenge generators
export * from './bomb-challenges';

// Export namespaced minigame APIs
export const simonSays = simonSaysGame;
export const fishing = fishingGame;

// Note: Other minigames (dalgona, tugOfWar, bomb) will be added here
// as they are extracted from the main file
