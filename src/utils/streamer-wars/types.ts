/**
 * Streamer Wars - Type Definitions
 * Centralized type definitions for the Streamer Wars system
 */

import type { DalgonaShape, DalgonaShapeData } from "@/services/dalgona-image-generator";

// Simon Says Game Types
export interface SimonSaysGameState {
    teams: Record<
        string,
        {
            players: number[];
        }
    >;
    currentRound: number;
    currentPlayers: Record<string, number | null>; // null si no hay jugador disponible
    completedPlayers: number[]; // Jugadores que han completado el patrón actual
    pattern: string[];
    eliminatedPlayers: number[]; // Jugadores eliminados
    status: "playing" | "waiting";
    playerWhoAlreadyPlayed: number[]; // Jugadores que ya han jugado en rondas anteriores
}

// Dalgona Game Types
export interface DalgonaPlayerState {
    playerNumber: number;
    teamId: number;
    shape: DalgonaShapeData;
    imageUrl: string;
    lives: number; // Changed from attemptsLeft to lives (3 lives system)
    status: 'playing' | 'completed' | 'failed';
}

export interface DalgonaGameState {
    players: Record<number, DalgonaPlayerState>;
    status: 'waiting' | 'active' | 'completed';
    startedAt?: number;
}

// Tug of War Game Types
export interface TugOfWarGameState {
    teams: {
        teamA: { id: number; color: string; name: string; playerCount: number };
        teamB: { id: number; color: string; name: string; playerCount: number };
    };
    players: { teamA: number[]; teamB: number[] };
    progress: number; // -100 to +100 (-100 = Team B wins, +100 = Team A wins)
    status: 'waiting' | 'playing' | 'finished';
    winner?: 'teamA' | 'teamB';
    playedTeams: number[]; // IDs of teams that have already played
    playerCooldowns: Record<number, number>; // playerNumber -> timestamp when they can click again
}

// Bomb Game Types
export type BombChallengeType = 'math' | 'logic' | 'word' | 'sequence';

export interface BombChallenge {
    type: BombChallengeType;
    question: string;
    correctAnswer: string;
    options?: string[]; // For multiple choice
}

export interface BombPlayerState {
    playerNumber: number;
    userId: number;
    challengesCompleted: number;
    errorsCount: number;
    status: 'playing' | 'completed' | 'failed';
    currentChallenge?: BombChallenge;
    challenges: BombChallenge[]; // All 5 challenges
}

export interface BombGameState {
    players: Record<number, BombPlayerState>;
    status: 'waiting' | 'active' | 'completed';
    startedAt?: number;
}

// Team to shape mapping based on difficulty
export const TEAM_SHAPE_MAP: Record<number, DalgonaShape> = {
    1: DalgonaShape.Circle,    // Circle (Easy)
    2: DalgonaShape.Triangle,  // Triangle (Easy)
    3: DalgonaShape.Star,      // Star (Medium)
    4: DalgonaShape.Umbrella,  // Umbrella (Hard)
};

// Fishing Game Types
export interface FishingGameState {
    status: 'waiting' | 'active' | 'ended';
    eliminatedPlayers: number[]; // Player numbers that have been eliminated
    startedAt?: number;
}
