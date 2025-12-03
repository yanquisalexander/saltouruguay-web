import { client } from "@/db/client";
import { RuletaLocaGameSessionsTable, RuletaLocaPhrasesTable, RuletaLocaPlayerStatsTable, UsersTable } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

// Wheel segment values (inspired by classic Wheel of Fortune)
export const WHEEL_SEGMENTS = [
    { value: 100, label: "100", type: "coins" },
    { value: 200, label: "200", type: "coins" },
    { value: 300, label: "300", type: "coins" },
    { value: 500, label: "500", type: "coins" },
    { value: 750, label: "750", type: "coins" },
    { value: 1000, label: "1000", type: "coins" },
    { value: 0, label: "Pierde Turno", type: "lose_turn" },
    { value: 0, label: "Bancarrota", type: "bankrupt" },
] as const;

export type WheelSegment = typeof WHEEL_SEGMENTS[number];

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

    // Update user coins if won
    if (status === "won" && coinsEarned > 0) {
        await client
            .update(UsersTable)
            .set({
                coins: sql`${UsersTable.coins} + ${coinsEarned}`,
                updatedAt: new Date(),
            })
            .where(eq(UsersTable.id, session.userId))
            .execute();
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
