/**
 * Streamer Wars - Minigames Module
 * Aggregates all minigame exports
 */

import * as simonSaysGame from './simon-says';
import * as bombChallenges from './bomb-challenges';

// Re-export challenge generators
export * from './bomb-challenges';

// Export namespaced minigame APIs
export const simonSays = simonSaysGame;

// Note: Other minigames (dalgona, tugOfWar, bomb, fishing) are defined in the main 
// streamer-wars.ts file for backward compatibility
