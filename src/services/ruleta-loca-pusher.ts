import { pusher } from "@/utils/pusher";
import {
    PUSHER_CHANNELS_RULETA,
    PUSHER_EVENTS_RULETA,
} from "@/consts/pusher";

type RoomEvent = (typeof PUSHER_EVENTS_RULETA)[keyof typeof PUSHER_EVENTS_RULETA];

function channel(roomCode: string): string {
    return PUSHER_CHANNELS_RULETA.ROOM(roomCode);
}

async function trigger(roomCode: string, event: RoomEvent, data: Record<string, unknown>) {
    await pusher.trigger(channel(roomCode), event, data);
}

export const RuletaLocaPusher = {
    playerJoined(roomCode: string, userId: number, username: string, avatar: string | null) {
        return trigger(roomCode, PUSHER_EVENTS_RULETA.ROOM_PLAYER_JOINED, { userId, username, avatar });
    },

    playerLeft(roomCode: string, userId: number) {
        return trigger(roomCode, PUSHER_EVENTS_RULETA.ROOM_PLAYER_LEFT, { userId });
    },

    gameStarting(roomCode: string, phrase: { phrase: string; category: string }, turnOrder: number[]) {
        return trigger(roomCode, PUSHER_EVENTS_RULETA.ROOM_GAME_STARTING, {
            phrase,
            turnOrder,
        });
    },

    stateUpdate(roomCode: string, data: {
        guessedLetters: string[];
        scores: Record<number, number>;
        currentTurnUserId: number;
        phrase: string;
        category: string;
    }) {
        return trigger(roomCode, PUSHER_EVENTS_RULETA.GAME_STATE_UPDATE, data);
    },

    wheelSpun(roomCode: string, userId: number, segment: { value: number; label: string; type: string }) {
        return trigger(roomCode, PUSHER_EVENTS_RULETA.GAME_WHEEL_SPUN, { userId, segment });
    },

    letterGuessed(roomCode: string, userId: number, letter: string, found: boolean, positions: number[], currentScore: number, guessedLetters: string[]) {
        return trigger(roomCode, PUSHER_EVENTS_RULETA.GAME_LETTER_GUESSED, {
            userId, letter, found, positions, currentScore, guessedLetters,
        });
    },

    puzzleSolved(roomCode: string, userId: number, coinsEarned: number, guessedLetters: string[]) {
        return trigger(roomCode, PUSHER_EVENTS_RULETA.GAME_PUZZLE_SOLVED, {
            userId, coinsEarned, guessedLetters,
        });
    },

    turnChanged(roomCode: string, currentTurnUserId: number) {
        return trigger(roomCode, PUSHER_EVENTS_RULETA.GAME_TURN_CHANGED, { currentTurnUserId });
    },

    playerForfeit(roomCode: string, userId: number) {
        return trigger(roomCode, PUSHER_EVENTS_RULETA.GAME_PLAYER_FORFEIT, { userId });
    },

    gameEnded(roomCode: string, winnerId: number, finalScores: Record<number, number>) {
        return trigger(roomCode, PUSHER_EVENTS_RULETA.ROOM_GAME_ENDED, {
            winnerId,
            finalScores,
        });
    },
};
