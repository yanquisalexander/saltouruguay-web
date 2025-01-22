import { client } from "@/db/client";
import { StreamerWarsInscriptionsTable } from "@/db/schema";
import cacheService from "@/services/cache";
import { eq, or } from "drizzle-orm";
import { pusher } from "./pusher";

const MEMORY_GAME_INITIAL_TIME = 120; // 2 minutes
const MEMORY_GAME_MIN_ROUND_TIME = 30; // 30 seconds
export interface MemoryGameGameState {
    actualPattern?: string;
    startedAt?: Date;
    currentRoundTimer?: number;
    completedPatternPlayersIds: number[];
}

export const getCurrentInscriptions = async () => {
    return await client.query.StreamerWarsInscriptionsTable.findMany({
        with: {
            user: {
                columns: {
                    displayName: true,
                    avatar: true,
                    discordId: true,
                }
            }
        }
    })
}



export const games = {
    memory: {
        getGameState: async () => {
            const cacheKey = "streamer-wars:memory:game-state";
            const cache = cacheService.create({ ttl: 60 * 60 * 48 });
            const cachedGameState = await cache.get<MemoryGameGameState>(cacheKey);

            if (cachedGameState) {
                return cachedGameState;
            }

            return {
                actualPattern: undefined,
                startedAt: undefined,
                currentRoundTimer: undefined,
                completedPatternPlayersIds: []
            }
        },
        generateNextPattern: async () => {
            const cacheKey = "streamer-wars:memory:game-state";
            const cache = cacheService.create({ ttl: 60 * 60 * 48 });
            const gameState = await games.memory.getGameState();

            const colors = ["red", "blue", "green", "yellow"] as const;
            const nextColor = colors[Math.floor(Math.random() * colors.length)];

            /* Por cada ronda (color), ir retirando 10 segundos, si es menor a 30, setearlo a 30 */
            const newRoundTimer = Math.max((gameState.currentRoundTimer ?? MEMORY_GAME_INITIAL_TIME) - 10, MEMORY_GAME_MIN_ROUND_TIME);

            const newGameState = {
                ...gameState,
                actualPattern: [...(gameState.actualPattern ?? []), nextColor],
                startedAt: new Date(),
                currentRoundTimer: newRoundTimer,
                completedPatternPlayersIds: []
            }

            await cache.set(cacheKey, newGameState);
            return newGameState.actualPattern;
        },
        startGame: async () => {

            const cacheKey = "streamer-wars:memory:game-state";
            const cache = cacheService.create({ ttl: 60 * 60 * 48 });
            const gameState = await games.memory.getGameState();

            const newGameState = {
                ...gameState,
                actualPattern: [],
                startedAt: new Date(),
                currentRoundTimer: MEMORY_GAME_INITIAL_TIME,
                completedPatternPlayersIds: []
            }
            await cache.set(cacheKey, newGameState);
            return newGameState;
        },
        completePattern: async (userId: number) => {
            const cacheKey = "streamer-wars:memory:game-state";
            const cache = cacheService.create({ ttl: 60 * 60 * 48 });
            const gameState = await games.memory.getGameState();

            const newGameState = {
                ...gameState,
                completedPatternPlayersIds: [...gameState.completedPatternPlayersIds, userId]
            }

            await cache.set(cacheKey, newGameState);
            return newGameState;
        },
        patternFailed: async (userId: number) => {
            /* 
                TODO: Eliminar al jugador en la base de datos (columna)
            */
            await pusher.trigger("streamer-wars:memory", "pattern-failed", {
                userId
            });
        }
    }
}
