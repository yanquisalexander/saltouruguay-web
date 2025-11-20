/**
 * Streamer Wars - Utility Functions
 * Shared utility functions used across the Streamer Wars system
 */

/**
 * Get a random item from an array
 */
export const getRandomItem = <T>(array: T[]): T =>
    array[Math.floor(Math.random() * array.length)];

/**
 * Shuffle an array using Fisher-Yates algorithm
 */
export const shuffleArray = <T>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};
