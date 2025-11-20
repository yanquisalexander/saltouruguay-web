/**
 * Streamer Wars - Bomb Challenge Generators
 * Generates challenges for the Bomb minigame
 */

import type { BombChallenge, BombChallengeType } from "../types";
import { getRandomItem, shuffleArray } from "../utils";
import { MAX_CHALLENGES } from "../constants";

/**
 * Generate a math challenge
 */
export const generateMathChallenge = (): BombChallenge => {
    const operations = [
        { type: 'sum', symbol: '+' },
        { type: 'sub', symbol: '-' },
        { type: 'mul', symbol: '×' }
    ];
    const op = getRandomItem(operations);

    let num1: number, num2: number, answer: number;

    if (op.type === 'sum') {
        num1 = Math.floor(Math.random() * 50) + 10;
        num2 = Math.floor(Math.random() * 50) + 10;
        answer = num1 + num2;
    } else if (op.type === 'sub') {
        num1 = Math.floor(Math.random() * 50) + 20;
        num2 = Math.floor(Math.random() * (num1 - 10)) + 5;
        answer = num1 - num2;
    } else {
        num1 = Math.floor(Math.random() * 12) + 2;
        num2 = Math.floor(Math.random() * 12) + 2;
        answer = num1 * num2;
    }

    return {
        type: 'math',
        question: `¿Cuánto es ${num1} ${op.symbol} ${num2}?`,
        correctAnswer: answer.toString(),
    };
};

/**
 * Generate a logic challenge
 */
export const generateLogicChallenge = (): BombChallenge => {
    const challenges = [
        {
            question: "¿Qué viene primero, el huevo o la gallina?",
            answer: "huevo"
        },
        {
            question: "¿Cuántos meses tienen 28 días?",
            answer: "todos"
        },
        {
            question: "¿Qué es lo que se rompe sin tocarlo?",
            answer: "promesa"
        },
        {
            question: "¿Qué pesa más, un kilo de plumas o un kilo de hierro?",
            answer: "igual"
        }
    ];

    const selected = getRandomItem(challenges);
    return {
        type: 'logic',
        question: selected.question,
        correctAnswer: selected.answer.toLowerCase(),
    };
};

/**
 * Generate a word challenge
 */
export const generateWordChallenge = (): BombChallenge => {
    const words = [
        { word: "PROGRAMAR", hint: "Escribir código" },
        { word: "STREAMER", hint: "Persona que transmite en vivo" },
        { word: "DESAFIO", hint: "Reto o prueba" },
        { word: "VICTORIA", hint: "Ganar una competencia" },
        { word: "BOMBA", hint: "Dispositivo explosivo" }
    ];

    const selected = getRandomItem(words);
    const word = selected.word;

    // Remove 2-3 random letters
    const lettersToRemove = Math.floor(Math.random() * 2) + 2;
    let incomplete = word;
    const removedIndices = new Set<number>();

    while (removedIndices.size < lettersToRemove) {
        const idx = Math.floor(Math.random() * word.length);
        removedIndices.add(idx);
    }

    incomplete = word.split('').map((letter, idx) =>
        removedIndices.has(idx) ? '_' : letter
    ).join('');

    return {
        type: 'word',
        question: `Completa la palabra: ${incomplete} (Pista: ${selected.hint})`,
        correctAnswer: word.toLowerCase(),
    };
};

/**
 * Generate a sequence challenge
 */
export const generateSequenceChallenge = (): BombChallenge => {
    const sequences = [
        {
            sequence: [2, 4, 6, 8],
            next: 10,
            rule: "números pares"
        },
        {
            sequence: [1, 3, 5, 7],
            next: 9,
            rule: "números impares"
        },
        {
            sequence: [5, 10, 15, 20],
            next: 25,
            rule: "múltiplos de 5"
        },
        {
            sequence: [1, 2, 4, 8],
            next: 16,
            rule: "potencias de 2"
        },
        {
            sequence: [10, 20, 30, 40],
            next: 50,
            rule: "múltiplos de 10"
        }
    ];

    const selected = getRandomItem(sequences);
    return {
        type: 'sequence',
        question: `¿Qué número sigue en la secuencia: ${selected.sequence.join(', ')}, ?`,
        correctAnswer: selected.next.toString(),
    };
};

/**
 * Generate a challenge of a specific type or random type
 */
export const generateChallenge = (type?: BombChallengeType): BombChallenge => {
    if (!type) {
        const types: BombChallengeType[] = ['math', 'logic', 'word', 'sequence'];
        type = getRandomItem(types);
    }

    switch (type) {
        case 'math':
            return generateMathChallenge();
        case 'logic':
            return generateLogicChallenge();
        case 'word':
            return generateWordChallenge();
        case 'sequence':
            return generateSequenceChallenge();
        default:
            return generateMathChallenge();
    }
};

/**
 * Generate a set of challenges for a player
 */
export const generatePlayerChallenges = (): BombChallenge[] => {
    const challenges: BombChallenge[] = [];
    const types: BombChallengeType[] = ['math', 'logic', 'word', 'sequence'];

    // Ensure at least one of each type
    for (const type of types) {
        challenges.push(generateChallenge(type));
    }

    // Add one more random challenge to make 5
    challenges.push(generateChallenge());

    // Shuffle challenges
    return shuffleArray(challenges);
};
