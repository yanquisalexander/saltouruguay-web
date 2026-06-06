import { client } from "@/db/client";
import { RuletaLocaGameSessionsTable, RuletaLocaPhrasesTable, RuletaLocaPlayerStatsTable, UsersTable } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { WHEEL_SEGMENTS, type WheelSegment } from "./wheel-segments";

function generateRoomCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "RL-";
    for (let i = 0; i < 4; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

function makeScoresObj(scores: unknown): Record<number, number> {
    if (scores && typeof scores === 'object' && !Array.isArray(scores)) {
        const out: Record<number, number> = {};
        for (const [k, v] of Object.entries(scores)) {
            out[Number(k)] = Number(v) || 0;
        }
        return out;
    }
    return {};
}

/**
 * Spin the wheel and return a random segment
 */
export function spinWheel(): WheelSegment {
    const randomIndex = Math.floor(Math.random() * WHEEL_SEGMENTS.length);
    return WHEEL_SEGMENTS[randomIndex];
}

/**
 * Get a random phrase from the database
 */
export async function getRandomPhrase() {
    const phrases = await client
        .select()
        .from(RuletaLocaPhrasesTable)
        .where(eq(RuletaLocaPhrasesTable.active, true))
        .execute();

    if (phrases.length === 0) {
        throw new Error("No hay frases disponibles");
    }

    const randomIndex = Math.floor(Math.random() * phrases.length);
    return phrases[randomIndex];
}

/**
 * Create a new game session
 */
export async function createGameSession(userId: number) {
    const phrase = await getRandomPhrase();

    const [session] = await client
        .insert(RuletaLocaGameSessionsTable)
        .values({
            userId,
            phraseId: phrase.id,
            currentScore: 0,
            wheelValue: 0,
            revealedLetters: [],
            guessedLetters: [],
            status: "playing",
        })
        .returning()
        .execute();

    return { session, phrase };
}

/**
 * Get current game session for a user
 */
export async function getCurrentGameSession(userId: number) {
    const [session] = await client
        .select()
        .from(RuletaLocaGameSessionsTable)
        .where(
            and(
                eq(RuletaLocaGameSessionsTable.userId, userId),
                eq(RuletaLocaGameSessionsTable.status, "playing")
            )
        )
        .orderBy(sql`${RuletaLocaGameSessionsTable.createdAt} DESC`)
        .limit(1)
        .execute();

    if (!session) return null;

    const [phrase] = await client
        .select()
        .from(RuletaLocaPhrasesTable)
        .where(eq(RuletaLocaPhrasesTable.id, session.phraseId))
        .execute();

    return { session, phrase };
}

/**
 * Normalize a letter (remove accents and convert to uppercase)
 */
export function normalizeLetter(letter: string): string {
    return letter
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase();
}

/**
 * Check if a letter is in the phrase
 */
export function checkLetter(phrase: string, letter: string): { found: boolean; positions: number[] } {
    const normalizedPhrase = normalizeLetter(phrase);
    const normalizedLetter = normalizeLetter(letter);
    const positions: number[] = [];

    for (let i = 0; i < normalizedPhrase.length; i++) {
        if (normalizedPhrase[i] === normalizedLetter) {
            positions.push(i);
        }
    }

    return { found: positions.length > 0, positions };
}

/**
 * Guess a letter and update the game session
 */
export async function guessLetter(sessionId: number, letter: string, wheelValue: number) {
    const [session] = await client
        .select()
        .from(RuletaLocaGameSessionsTable)
        .where(eq(RuletaLocaGameSessionsTable.id, sessionId))
        .execute();

    if (!session || session.status !== "playing") {
        throw new Error("Sesión de juego inválida");
    }

    const [phrase] = await client
        .select()
        .from(RuletaLocaPhrasesTable)
        .where(eq(RuletaLocaPhrasesTable.id, session.phraseId))
        .execute();

    const normalizedLetter = normalizeLetter(letter);

    // Check if letter was already guessed
    if (session.guessedLetters?.includes(normalizedLetter)) {
        return {
            success: false,
            error: "Esta letra ya fue usada",
            session,
        };
    }

    const { found, positions } = checkLetter(phrase.phrase, letter);

    // Update guessed letters
    const newGuessedLetters = [...(session.guessedLetters || []), normalizedLetter];

    let newScore = session.currentScore;
    let newRevealedLetters = session.revealedLetters || [];

    if (found) {
        // Add points for each occurrence of the letter
        newScore += wheelValue * positions.length;

        // Note: revealedLetters is not actually used in the current implementation
        // The puzzle state is determined by comparing guessedLetters with the phrase
        // Keeping this for potential future use
        newRevealedLetters = [...newRevealedLetters, normalizedLetter];
    }

    // Update session
    const [updatedSession] = await client
        .update(RuletaLocaGameSessionsTable)
        .set({
            guessedLetters: newGuessedLetters,
            revealedLetters: newRevealedLetters,
            currentScore: newScore,
            wheelValue,
            updatedAt: new Date(),
        })
        .where(eq(RuletaLocaGameSessionsTable.id, sessionId))
        .returning()
        .execute();

    return {
        success: true,
        found,
        positions,
        session: updatedSession,
    };
}

/**
 * Check if the puzzle is solved
 * Note: guessedLetters are already normalized when stored
 */
export function isPuzzleSolved(phrase: string, guessedLetters: string[]): boolean {
    const normalizedPhrase = normalizeLetter(phrase);

    for (let i = 0; i < normalizedPhrase.length; i++) {
        const char = normalizedPhrase[i];
        // Skip spaces and punctuation
        if (/[A-Z]/.test(char)) {
            // guessedLetters are already normalized, so we don't normalize them again
            if (!guessedLetters.includes(char)) {
                return false;
            }
        }
    }

    return true;
}

/**
 * Complete the game (win or lose)
 */
export async function completeGame(sessionId: number, status: "won" | "lost") {
    const [session] = await client
        .select()
        .from(RuletaLocaGameSessionsTable)
        .where(eq(RuletaLocaGameSessionsTable.id, sessionId))
        .execute();

    if (!session || session.status !== "playing") {
        throw new Error("Sesión de juego inválida");
    }

    // Update session status
    const [updatedSession] = await client
        .update(RuletaLocaGameSessionsTable)
        .set({
            status,
            completedAt: new Date(),
            updatedAt: new Date(),
        })
        .where(eq(RuletaLocaGameSessionsTable.id, sessionId))
        .returning()
        .execute();

    // Update player stats
    const [stats] = await client
        .select()
        .from(RuletaLocaPlayerStatsTable)
        .where(eq(RuletaLocaPlayerStatsTable.userId, session.userId))
        .execute();

    const coinsEarned = status === "won" ? session.currentScore : 0;

    if (stats) {
        await client
            .update(RuletaLocaPlayerStatsTable)
            .set({
                gamesPlayed: stats.gamesPlayed + 1,
                gamesWon: status === "won" ? stats.gamesWon + 1 : stats.gamesWon,
                totalCoinsEarned: stats.totalCoinsEarned + coinsEarned,
                totalScore: stats.totalScore + session.currentScore,
                highestScore: Math.max(stats.highestScore, session.currentScore),
                updatedAt: new Date(),
            })
            .where(eq(RuletaLocaPlayerStatsTable.id, stats.id))
            .execute();
    } else {
        await client
            .insert(RuletaLocaPlayerStatsTable)
            .values({
                userId: session.userId,
                gamesPlayed: 1,
                gamesWon: status === "won" ? 1 : 0,
                totalCoinsEarned: coinsEarned,
                totalScore: session.currentScore,
                highestScore: session.currentScore,
            })
            .execute();
    }

    // Update user coins and create transaction in Banco Saltano if won
    if (status === "won" && coinsEarned > 0) {
        // Import BancoSaltano service dynamically to avoid circular dependencies
        const { BancoSaltanoService } = await import("@/services/banco-saltano");

        // Ensure account exists
        await BancoSaltanoService.getOrCreateAccount(session.userId);

        // Create game reward transaction
        await BancoSaltanoService.addGameReward(
            session.userId,
            coinsEarned,
            "Ruleta Loca",
            {
                sessionId: session.id,
                score: session.currentScore,
                phraseId: session.phraseId,
            }
        );
    }

    return { session: updatedSession, coinsEarned };
}

/**
 * Get player statistics
 */
export async function getPlayerStats(userId: number) {
    const [stats] = await client
        .select()
        .from(RuletaLocaPlayerStatsTable)
        .where(eq(RuletaLocaPlayerStatsTable.userId, userId))
        .execute();

    return stats || {
        gamesPlayed: 0,
        gamesWon: 0,
        totalCoinsEarned: 0,
        totalScore: 0,
        highestScore: 0,
    };
}

/**
 * Reset the current score of a session (e.g. Bankrupt)
 */
export async function resetSessionScore(sessionId: number) {
    const [updatedSession] = await client
        .update(RuletaLocaGameSessionsTable)
        .set({
            currentScore: 0,
            updatedAt: new Date(),
        })
        .where(eq(RuletaLocaGameSessionsTable.id, sessionId))
        .returning()
        .execute();

    return updatedSession;
}

/**
 * Attempt to solve the puzzle directly
 */
export async function solvePuzzle(sessionId: number, guess: string) {
    const [session] = await client
        .select()
        .from(RuletaLocaGameSessionsTable)
        .where(eq(RuletaLocaGameSessionsTable.id, sessionId))
        .execute();

    if (!session || session.status !== "playing") {
        throw new Error("Sesión de juego inválida");
    }

    const [phrase] = await client
        .select()
        .from(RuletaLocaPhrasesTable)
        .where(eq(RuletaLocaPhrasesTable.id, session.phraseId))
        .execute();

    const normalizedPhrase = normalizeLetter(phrase.phrase);
    const normalizedGuess = normalizeLetter(guess);

    // Remove spaces from both for comparison to be lenient
    const cleanPhrase = normalizedPhrase.replace(/\s/g, "");
    const cleanGuess = normalizedGuess.replace(/\s/g, "");

    if (cleanPhrase === cleanGuess) {
        // Correct!
        const { coinsEarned, session: completedSession } = await completeGame(sessionId, "won");
        return {
            success: true,
            coinsEarned,
            session: completedSession,
        };
    } else {
        // Incorrect
        return {
            success: false,
            session,
        };
    }
}

// ─── MULTIPLAYER ROOM FUNCTIONS ───

export async function createMultiplayerRoom(userId: number, maxPlayers = 4) {
    let roomCode: string;
    let existing;

    do {
        roomCode = generateRoomCode();
        [existing] = await client
            .select({ id: RuletaLocaGameSessionsTable.id })
            .from(RuletaLocaGameSessionsTable)
            .where(eq(RuletaLocaGameSessionsTable.roomCode, roomCode))
            .execute();
    } while (existing);

    const [session] = await client
        .insert(RuletaLocaGameSessionsTable)
        .values({
            userId,
            ownerId: userId,
            roomCode,
            phraseId: 1,
            playerIds: [userId],
            turnOrder: [userId],
            currentTurnIdx: 0,
            maxPlayers,
            scores: sql`'{}'::jsonb`,
            gameMode: 'multi',
            status: 'waiting',
        })
        .returning()
        .execute();

    return { session, roomCode };
}

export async function getRoomByCode(roomCode: string) {
    const clean = roomCode.toUpperCase().trim();
    const [session] = await client
        .select()
        .from(RuletaLocaGameSessionsTable)
        .where(eq(RuletaLocaGameSessionsTable.roomCode, clean))
        .execute();

    if (!session) return null;

    const players: { id: number; username: string; avatar: string | null }[] = [];
    if (session.playerIds?.length) {
        const pids = `{${session.playerIds.join(',')}}`;
        const rows = await client
            .select({
                id: UsersTable.id,
                username: UsersTable.username,
                avatar: UsersTable.avatar,
            })
            .from(UsersTable)
            .where(sql`${UsersTable.id} = ANY(${pids}::int[])`)
            .execute();
        players.push(...rows);
    }

    return { session, players };
}

export async function joinRoomByCode(roomCode: string, userId: number) {
    const room = await getRoomByCode(roomCode);
    if (!room) throw new Error("Sala no encontrada");
    if (room.session.status !== "waiting") throw new Error("La sala ya comenzó");

    const playerIds = room.session.playerIds || [];
    if (playerIds.includes(userId)) return room;
    if (playerIds.length >= (room.session.maxPlayers || 4)) throw new Error("Sala llena");

    const newPlayerIds = [...playerIds, userId];
    const newTurnOrder = [...(room.session.turnOrder || []), userId];

    const [updated] = await client
        .update(RuletaLocaGameSessionsTable)
        .set({
            playerIds: newPlayerIds,
            turnOrder: newTurnOrder,
            updatedAt: new Date(),
        })
        .where(eq(RuletaLocaGameSessionsTable.id, room.session.id))
        .returning()
        .execute();

    const idsStr = `{${newPlayerIds.join(',')}}`;
    const rows = await client
        .select({
            id: UsersTable.id,
            username: UsersTable.username,
            avatar: UsersTable.avatar,
        })
        .from(UsersTable)
        .where(sql`${UsersTable.id} = ANY(${idsStr}::int[])`)
        .execute();

    return { session: updated, players: rows };
}

export async function leaveRoomByCode(roomCode: string, userId: number) {
    const room = await getRoomByCode(roomCode);
    if (!room) throw new Error("Sala no encontrada");

    const playerIds = room.session.playerIds || [];
    const newPlayerIds = playerIds.filter(id => id !== userId);
    const newTurnOrder = (room.session.turnOrder || []).filter(id => id !== userId);

    let ownerId = room.session.ownerId;
    if (ownerId === userId && newPlayerIds.length > 0) {
        ownerId = newPlayerIds[0];
    }

    if (newPlayerIds.length === 0) {
        await client
            .delete(RuletaLocaGameSessionsTable)
            .where(eq(RuletaLocaGameSessionsTable.id, room.session.id))
            .execute();
        return null;
    }

    const [updated] = await client
        .update(RuletaLocaGameSessionsTable)
        .set({
            playerIds: newPlayerIds,
            turnOrder: newTurnOrder,
            ownerId,
            updatedAt: new Date(),
        })
        .where(eq(RuletaLocaGameSessionsTable.id, room.session.id))
        .returning()
        .execute();

    const rows = await client
        .select({
            id: UsersTable.id,
            username: UsersTable.username,
            avatar: UsersTable.image,
        })
        .from(UsersTable)
        .where(sql`${UsersTable.id} = ANY(${newPlayerIds}::int[])`)
        .execute();

    return { session: updated, players: rows };
}

export async function startMultiplayerGame(roomCode: string, userId: number) {
    const room = await getRoomByCode(roomCode);
    if (!room) throw new Error("Sala no encontrada");
    if (room.session.ownerId !== userId) throw new Error("Solo el anfitrión puede iniciar");
    if (room.session.status !== "waiting") throw new Error("La sala ya comenzó");

    const playerIds = room.session.playerIds || [];
    if (playerIds.length < 2) throw new Error("Se necesitan al menos 2 jugadores");

    const phrase = await getRandomPhrase();
    const scores: Record<string, number> = {};
    for (const id of playerIds) scores[String(id)] = 0;

    const [updated] = await client
        .update(RuletaLocaGameSessionsTable)
        .set({
            phraseId: phrase.id,
            status: "playing",
            currentScore: 0,
            currentTurnIdx: 0,
            scores: sql`${JSON.stringify(scores)}::jsonb`,
            guessedLetters: [],
            revealedLetters: [],
            updatedAt: new Date(),
        })
        .where(eq(RuletaLocaGameSessionsTable.id, room.session.id))
        .returning()
        .execute();

    return { session: updated, phrase };
}

export async function advanceTurn(sessionId: number) {
    const [session] = await client
        .select()
        .from(RuletaLocaGameSessionsTable)
        .where(eq(RuletaLocaGameSessionsTable.id, sessionId))
        .execute();

    if (!session || session.gameMode !== "multi") return session;

    const turnOrder = session.turnOrder || [];
    if (turnOrder.length === 0) return session;

    const nextIdx = (session.currentTurnIdx + 1) % turnOrder.length;
    const currentPlayerId = turnOrder[session.currentTurnIdx];

    const scores = makeScoresObj(session.scores);
    scores[currentPlayerId] = session.currentScore;

    const [updated] = await client
        .update(RuletaLocaGameSessionsTable)
        .set({
            currentTurnIdx: nextIdx,
            currentScore: 0,
            scores: sql`${JSON.stringify(scores)}::jsonb`,
            updatedAt: new Date(),
        })
        .where(eq(RuletaLocaGameSessionsTable.id, sessionId))
        .returning()
        .execute();

    return updated;
}

export async function getCurrentRoomSession(userId: number) {
    const [session] = await client
        .select()
        .from(RuletaLocaGameSessionsTable)
        .where(
            and(
                sql`${userId} = ANY(${RuletaLocaGameSessionsTable.playerIds}::int[])`,
                sql`${RuletaLocaGameSessionsTable.status}::text IN ('waiting', 'playing')`
            )
        )
        .orderBy(sql`${RuletaLocaGameSessionsTable.createdAt} DESC`)
        .limit(1)
        .execute();

    if (!session) return null;

    const players: { id: number; username: string; avatar: string | null }[] = [];
    if (session.playerIds?.length) {
        const pids = `{${session.playerIds.join(',')}}`;
        const rows = await client
            .select({
                id: UsersTable.id,
                username: UsersTable.username,
                avatar: UsersTable.avatar,
            })
            .from(UsersTable)
            .where(sql`${UsersTable.id} = ANY(${pids}::int[])`)
            .execute();
        players.push(...rows);
    }

    let phrase = null;
    if (session.phraseId) {
        [phrase] = await client
            .select()
            .from(RuletaLocaPhrasesTable)
            .where(eq(RuletaLocaPhrasesTable.id, session.phraseId))
            .execute();
    }

    return { session, players, phrase };
}

export async function completeMultiplayerGame(sessionId: number, winnerId: number) {
    const [session] = await client
        .select()
        .from(RuletaLocaGameSessionsTable)
        .where(eq(RuletaLocaGameSessionsTable.id, sessionId))
        .execute();

    if (!session || session.status !== "playing") throw new Error("Sesión inválida");

    const scores = makeScoresObj(session.scores);
    scores[winnerId] = session.currentScore;

    const [updated] = await client
        .update(RuletaLocaGameSessionsTable)
        .set({
            status: "won",
            scores: sql`${JSON.stringify(scores)}::jsonb`,
            completedAt: new Date(),
            updatedAt: new Date(),
        })
        .where(eq(RuletaLocaGameSessionsTable.id, sessionId))
        .returning()
        .execute();

    const coinsEarned = scores[winnerId] || 0;

    const { BancoSaltanoService } = await import("@/services/banco-saltano");
    await BancoSaltanoService.getOrCreateAccount(winnerId);
    await BancoSaltanoService.addGameReward(winnerId, coinsEarned, "Ruleta Loca", {
        sessionId,
        score: coinsEarned,
        multiplayer: true,
    });

    for (const pid of (session.playerIds || [])) {
        const [stats] = await client
            .select()
            .from(RuletaLocaPlayerStatsTable)
            .where(eq(RuletaLocaPlayerStatsTable.userId, pid))
            .execute();

        const playerScore = scores[pid] || 0;
        const won = pid === winnerId;

        if (stats) {
            await client
                .update(RuletaLocaPlayerStatsTable)
                .set({
                    gamesPlayed: stats.gamesPlayed + 1,
                    gamesWon: won ? stats.gamesWon + 1 : stats.gamesWon,
                    totalCoinsEarned: won ? stats.totalCoinsEarned + coinsEarned : stats.totalCoinsEarned,
                    totalScore: stats.totalScore + playerScore,
                    highestScore: Math.max(stats.highestScore, playerScore),
                    updatedAt: new Date(),
                })
                .where(eq(RuletaLocaPlayerStatsTable.id, stats.id))
                .execute();
        } else {
            await client
                .insert(RuletaLocaPlayerStatsTable)
                .values({
                    userId: pid,
                    gamesPlayed: 1,
                    gamesWon: won ? 1 : 0,
                    totalCoinsEarned: won ? coinsEarned : 0,
                    totalScore: playerScore,
                    highestScore: playerScore,
                })
                .execute();
        }
    }

    return { session: updated, coinsEarned, winnerId, scores };
}
