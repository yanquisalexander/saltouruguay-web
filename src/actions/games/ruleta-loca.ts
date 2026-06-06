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
    buyVowel,
    normalizeLetter,
    createMultiplayerRoom,
    joinRoomByCode,
    leaveRoomByCode,
    getCurrentRoomSession,
    startMultiplayerGame,
    advanceTurn,
    completeMultiplayerGame,
} from "@/utils/games/ruleta-loca";
import { RuletaLocaPusher } from "@/services/ruleta-loca-pusher";

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

    // ─── MULTIPLAYER ROOM ACTIONS ───

    createRoom: defineAction({
        handler: async (_, { request }) => {
            const s = await getSession(request);
            if (!s) throw new ActionError({ code: "UNAUTHORIZED", message: "Debes iniciar sesión" });

            const result = await createMultiplayerRoom(parseInt(s.user.id));
            return result;
        },
    }),

    joinRoom: defineAction({
        input: z.object({ roomCode: z.string() }),
        handler: async ({ roomCode }, { request }) => {
            const s = await getSession(request);
            if (!s) throw new ActionError({ code: "UNAUTHORIZED", message: "Debes iniciar sesión" });

            const result = await joinRoomByCode(roomCode, parseInt(s.user.id));

            await RuletaLocaPusher.playerJoined(
                roomCode,
                parseInt(s.user.id),
                s.user.name || "Anónimo",
                s.user.image || null
            );

            return result;
        },
    }),

    leaveRoom: defineAction({
        handler: async (_, { request }) => {
            const s = await getSession(request);
            if (!s) throw new ActionError({ code: "UNAUTHORIZED", message: "Debes iniciar sesión" });

            const room = await getCurrentRoomSession(parseInt(s.user.id));
            if (!room?.session.roomCode) throw new ActionError({ code: "BAD_REQUEST", message: "No estás en ninguna sala" });

            await RuletaLocaPusher.playerLeft(room.session.roomCode, parseInt(s.user.id));

            return await leaveRoomByCode(room.session.roomCode, parseInt(s.user.id));
        },
    }),

    startMultiplayerGame: defineAction({
        handler: async (_, { request }) => {
            const s = await getSession(request);
            if (!s) throw new ActionError({ code: "UNAUTHORIZED", message: "Debes iniciar sesión" });

            const room = await getCurrentRoomSession(parseInt(s.user.id));
            if (!room?.session.roomCode) throw new ActionError({ code: "BAD_REQUEST", message: "No estás en ninguna sala" });

            const result = await startMultiplayerGame(room.session.roomCode, parseInt(s.user.id));

            await RuletaLocaPusher.gameStarting(room.session.roomCode, result.phrase, result.session.turnOrder || []);
            await RuletaLocaPusher.turnChanged(room.session.roomCode, (result.session.turnOrder || [])[0]);

            return result;
        },
    }),

    getRoomState: defineAction({
        handler: async (_, { request }) => {
            const s = await getSession(request);
            if (!s) throw new ActionError({ code: "UNAUTHORIZED", message: "Debes iniciar sesión" });

            return await getCurrentRoomSession(parseInt(s.user.id));
        },
    }),

    spinWheelMulti: defineAction({
        handler: async (_, { request }) => {
            const s = await getSession(request);
            if (!s) throw new ActionError({ code: "UNAUTHORIZED", message: "Debes iniciar sesión" });

            const userId = parseInt(s.user.id);
            const room = await getCurrentRoomSession(userId);
            if (!room?.session.roomCode) throw new ActionError({ code: "BAD_REQUEST", message: "No estás en una sala" });
            if (room.session.status !== "playing") throw new ActionError({ code: "BAD_REQUEST", message: "El juego no está activo" });

            const turnOrder = room.session.turnOrder || [];
            const currentPlayer = turnOrder[room.session.currentTurnIdx];
            if (currentPlayer !== userId) throw new ActionError({ code: "BAD_REQUEST", message: "No es tu turno" });

            const segment = spinWheel();
            let updatedSession = room.session;

            if (segment.type === "bankrupt") {
                updatedSession = await resetSessionScore(room.session.id);
            }

            await RuletaLocaPusher.wheelSpun(room.session.roomCode, userId, segment);

            if (segment.type === "lose_turn" || segment.type === "bankrupt") {
                const advanced = await advanceTurn(room.session.id);
                const nextPlayer = (advanced?.turnOrder || [])[advanced?.currentTurnIdx || 0];
                await RuletaLocaPusher.turnChanged(room.session.roomCode, nextPlayer);
                return { segment, session: advanced, turnChanged: true };
            }

            return { segment, session: updatedSession, turnChanged: false };
        },
    }),

    guessLetterMulti: defineAction({
        input: z.object({ letter: z.string().length(1), wheelValue: z.number() }),
        handler: async ({ letter, wheelValue }, { request }) => {
            const s = await getSession(request);
            if (!s) throw new ActionError({ code: "UNAUTHORIZED", message: "Debes iniciar sesión" });

            const userId = parseInt(s.user.id);
            const room = await getCurrentRoomSession(userId);
            if (!room?.session.roomCode) throw new ActionError({ code: "BAD_REQUEST", message: "No estás en una sala" });
            if (room.session.status !== "playing") throw new ActionError({ code: "BAD_REQUEST", message: "El juego no está activo" });

            const turnOrder = room.session.turnOrder || [];
            const currentPlayer = turnOrder[room.session.currentTurnIdx];
            if (currentPlayer !== userId) throw new ActionError({ code: "BAD_REQUEST", message: "No es tu turno" });

            const result = await guessLetter(room.session.id, letter, wheelValue);
            if (!result.success) throw new ActionError({ code: "BAD_REQUEST", message: result.error || "Error" });

            const phrase = room.phrase;
            const solved = phrase ? isPuzzleSolved(phrase.phrase, result.session.guessedLetters || []) : false;

            if (solved) {
                const completed = await completeMultiplayerGame(room.session.id, userId);
                await RuletaLocaPusher.puzzleSolved(room.session.roomCode, userId, completed.coinsEarned, result.session.guessedLetters || []);
                await RuletaLocaPusher.gameEnded(room.session.roomCode, userId, completed.scores);

                return {
                    ...result,
                    puzzleSolved: true,
                    coinsEarned: completed.coinsEarned,
                    session: completed.session,
                };
            }

            await RuletaLocaPusher.letterGuessed(
                room.session.roomCode, userId, letter,
                result.found, result.positions,
                result.session.currentScore, result.session.guessedLetters || []
            );

            if (!result.found) {
                const advanced = await advanceTurn(room.session.id);
                const nextPlayer = (advanced?.turnOrder || [])[advanced?.currentTurnIdx || 0];
                await RuletaLocaPusher.turnChanged(room.session.roomCode, nextPlayer);

                return { ...result, puzzleSolved: false, turnChanged: true, session: advanced };
            }

            return { ...result, puzzleSolved: false, turnChanged: false };
        },
    }),

    solvePuzzleMulti: defineAction({
        input: z.object({ guess: z.string() }),
        handler: async ({ guess }, { request }) => {
            const s = await getSession(request);
            if (!s) throw new ActionError({ code: "UNAUTHORIZED", message: "Debes iniciar sesión" });

            const userId = parseInt(s.user.id);
            const room = await getCurrentRoomSession(userId);
            if (!room?.session.roomCode) throw new ActionError({ code: "BAD_REQUEST", message: "No estás en una sala" });
            if (room.session.status !== "playing") throw new ActionError({ code: "BAD_REQUEST", message: "El juego no está activo" });

            const turnOrder = room.session.turnOrder || [];
            const currentPlayer = turnOrder[room.session.currentTurnIdx];
            if (currentPlayer !== userId) throw new ActionError({ code: "BAD_REQUEST", message: "No es tu turno" });

            // Inline comparison (don't use shared solvePuzzle which calls single-player completeGame)
            const normalizedPhrase = normalizeLetter(room.phrase.phrase);
            const normalizedGuess = normalizeLetter(guess);
            const cleanPhrase = normalizedPhrase.replace(/\s/g, "");
            const cleanGuess = normalizedGuess.replace(/\s/g, "");

            if (cleanPhrase === cleanGuess) {
                const completed = await completeMultiplayerGame(room.session.id, userId);

                await RuletaLocaPusher.puzzleSolved(room.session.roomCode, userId, completed.coinsEarned, []);
                await RuletaLocaPusher.gameEnded(room.session.roomCode, userId, completed.scores);

                return { success: true, session: completed.session, coinsEarned: completed.coinsEarned };
            }

            const advanced = await advanceTurn(room.session.id);
            const nextPlayer = (advanced?.turnOrder || [])[advanced?.currentTurnIdx || 0];
            await RuletaLocaPusher.turnChanged(room.session.roomCode, nextPlayer);

            return { success: false, session: advanced, turnChanged: true };
        },
    }),

    forfeitMulti: defineAction({
        handler: async (_, { request }) => {
            const s = await getSession(request);
            if (!s) throw new ActionError({ code: "UNAUTHORIZED", message: "Debes iniciar sesión" });

            const userId = parseInt(s.user.id);
            const room = await getCurrentRoomSession(userId);
            if (!room?.session.roomCode) throw new ActionError({ code: "BAD_REQUEST", message: "No estás en una sala" });

            await RuletaLocaPusher.playerForfeit(room.session.roomCode, userId);

            return await leaveRoomByCode(room.session.roomCode, userId);
        },
    }),

    buyVowel: defineAction({
        input: z.object({ sessionId: z.number(), letter: z.string().length(1) }),
        handler: async ({ sessionId, letter }) => {
            const result = await buyVowel(sessionId, letter, 0);
            return result;
        },
    }),

    buyVowelMulti: defineAction({
        input: z.object({ letter: z.string().length(1) }),
        handler: async ({ letter }, { request }) => {
            const s = await getSession(request);
            if (!s) throw new ActionError({ code: "UNAUTHORIZED", message: "Debes iniciar sesión" });

            const userId = parseInt(s.user.id);
            const room = await getCurrentRoomSession(userId);
            if (!room?.session.roomCode) throw new ActionError({ code: "BAD_REQUEST", message: "No estás en una sala" });

            const result = await buyVowel(room.session.id, letter, userId);
            if (!result.found) {
                throw new ActionError({ code: "BAD_REQUEST", message: "Esa vocal no está en la frase" });
            }

            await RuletaLocaPusher.vowelBought(
                room.session.roomCode,
                userId,
                letter,
                result.positions,
                result.session.guessedLetters || [],
                result.session.currentScore,
            );

            return result;
        },
    }),
};
