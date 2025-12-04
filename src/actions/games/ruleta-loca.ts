import { ActionError, defineAction } from "astro:actions";
import { z } from "astro:schema";
import { getSession } from "auth-astro/server";
import {
    createGameSession,
    getCurrentGameSession,
    spinWheel,
    guessLetter,
    isPuzzleSolved,
    completeGame,
    getPlayerStats,
    resetSessionScore,
    solvePuzzle,
} from "@/utils/games/ruleta-loca";

export const ruletaLoca = {
    /**
     * Start a new game session
     */
    startGame: defineAction({
        handler: async (_, { request }) => {
            const session = await getSession(request);

            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Debes iniciar sesión para jugar",
                });
            }

            // Check if there's already an active game
            const currentGame = await getCurrentGameSession(session.user.id);
            if (currentGame) {
                return {
                    sessionId: currentGame.session.id,
                    phrase: currentGame.phrase,
                    session: currentGame.session,
                };
            }

            const { session: gameSession, phrase } = await createGameSession(session.user.id);

            return {
                sessionId: gameSession.id,
                phrase,
                session: gameSession,
            };
        },
    }),

    /**
     * Get current game state
     */
    getGameState: defineAction({
        handler: async (_, { request }) => {
            const session = await getSession(request);

            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Debes iniciar sesión para ver el estado del juego",
                });
            }

            const currentGame = await getCurrentGameSession(session.user.id);

            if (!currentGame) {
                return { hasActiveGame: false };
            }

            return {
                hasActiveGame: true,
                sessionId: currentGame.session.id,
                phrase: currentGame.phrase,
                session: currentGame.session,
            };
        },
    }),

    /**
     * Spin the wheel
     */
    spinWheel: defineAction({
        handler: async (_, { request }) => {
            const session = await getSession(request);

            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Debes iniciar sesión para girar la ruleta",
                });
            }

            const currentGame = await getCurrentGameSession(session.user.id);

            if (!currentGame || currentGame.session.status !== "playing") {
                throw new ActionError({
                    code: "BAD_REQUEST",
                    message: "No tienes un juego activo",
                });
            }

            const segment = spinWheel();
            let updatedSession = currentGame.session;

            if (segment.type === "bankrupt") {
                updatedSession = await resetSessionScore(currentGame.session.id);
            }

            return {
                segment,
                session: updatedSession,
            };
        },
    }),

    /**
     * Guess a letter
     */
    guessLetter: defineAction({
        input: z.object({
            sessionId: z.number(),
            letter: z.string().length(1),
            wheelValue: z.number(),
        }),
        handler: async ({ sessionId, letter, wheelValue }, { request }) => {
            const session = await getSession(request);

            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Debes iniciar sesión para adivinar letras",
                });
            }

            const result = await guessLetter(sessionId, letter, wheelValue);

            if (!result.success) {
                throw new ActionError({
                    code: "BAD_REQUEST",
                    message: result.error || "Error al adivinar la letra",
                });
            }

            // Check if puzzle is solved
            const currentGame = await getCurrentGameSession(session.user.id);
            if (currentGame) {
                const solved = isPuzzleSolved(
                    currentGame.phrase.phrase,
                    currentGame.session.guessedLetters || []
                );

                if (solved) {
                    const { coinsEarned } = await completeGame(sessionId, "won");
                    return {
                        ...result,
                        puzzleSolved: true,
                        coinsEarned,
                    };
                }
            }

            return {
                ...result,
                puzzleSolved: false,
            };
        },
    }),

    /**
     * Solve the puzzle directly
     */
    solvePuzzle: defineAction({
        input: z.object({
            sessionId: z.number(),
            guess: z.string(),
        }),
        handler: async ({ sessionId, guess }, { request }) => {
            const session = await getSession(request);

            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Debes iniciar sesión para resolver el panel",
                });
            }

            const result = await solvePuzzle(sessionId, guess);

            return result;
        },
    }),

    /**
     * Forfeit the game
     */
    forfeitGame: defineAction({
        input: z.object({
            sessionId: z.number(),
        }),
        handler: async ({ sessionId }, { request }) => {
            const session = await getSession(request);

            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Debes iniciar sesión para rendirte",
                });
            }

            const result = await completeGame(sessionId, "lost");

            return {
                success: true,
                ...result,
            };
        },
    }),

    /**
     * Get player statistics
     */
    getStats: defineAction({
        handler: async (_, { request }) => {
            const session = await getSession(request);

            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Debes iniciar sesión para ver tus estadísticas",
                });
            }

            const stats = await getPlayerStats(session.user.id);

            return { stats };
        },
    }),
};
