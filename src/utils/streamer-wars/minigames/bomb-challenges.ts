/**
 * Streamer Wars - Bomb Challenge Generators
 * Generates challenges for the Bomb minigame with multiple-choice options
 */

import type { BombChallenge, BombChallengeType } from "../types";
import { getRandomItem, shuffleArray } from "../utils";
import { MAX_CHALLENGES } from "../constants";

const pickN = <T>(arr: T[], n: number): T[] => shuffleArray([...arr]).slice(0, n);
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const withOptions = (challenge: BombChallenge, distractors: string[]): BombChallenge => {
    const all = shuffleArray([challenge.correctAnswer, ...distractors]);
    // Ensure no duplicate options
    const deduped = [...new Set(all)];
    return { ...challenge, options: deduped.length >= 2 ? deduped : [...deduped, ...distractors].slice(0, 4) };
};

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
        num1 = randInt(10, 50);
        num2 = randInt(10, 50);
        answer = num1 + num2;
    } else if (op.type === 'sub') {
        num1 = randInt(20, 70);
        num2 = randInt(5, num1 - 10);
        answer = num1 - num2;
    } else {
        num1 = randInt(2, 12);
        num2 = randInt(2, 12);
        answer = num1 * num2;
    }

    const distractors = new Set<number>();
    while (distractors.size < 3) {
        const offset = randInt(1, 15);
        distractors.add(Math.max(1, answer + offset));
        distractors.add(Math.max(1, answer - offset));
    }
    const filtered = [...distractors].filter(n => n !== answer).slice(0, 3);

    return withOptions(
        { type: 'math', question: `¿Cuánto es ${num1} ${op.symbol} ${num2}?`, correctAnswer: answer.toString() },
        filtered.map(String)
    );
};

/**
 * Generate a logic challenge
 */
export const generateLogicChallenge = (): BombChallenge => {
    const challenges = [
        {
            question: "¿Qué viene primero, el huevo o la gallina?",
            answer: "huevo",
            distractors: ["gallina", "ambos", "ninguno"]
        },
        {
            question: "¿Cuántos meses tienen 28 días?",
            answer: "todos",
            distractors: ["uno", "ninguno", "solo febrero"]
        },
        {
            question: "¿Qué es lo que se rompe sin tocarlo?",
            answer: "promesa",
            distractors: ["vaso", "corazón", "record"]
        },
        {
            question: "¿Qué pesa más, un kilo de plumas o un kilo de hierro?",
            answer: "igual",
            distractors: ["plumas", "hierro", "depende"]
        }
    ];

    const selected = getRandomItem(challenges);
    return withOptions(
        { type: 'logic', question: selected.question, correctAnswer: selected.answer.toLowerCase() },
        selected.distractors
    );
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

    const lettersToRemove = Math.floor(Math.random() * 2) + 2;
    const removedIndices = new Set<number>();
    while (removedIndices.size < lettersToRemove) {
        removedIndices.add(Math.floor(Math.random() * word.length));
    }

    const incomplete = word.split('').map((letter, idx) =>
        removedIndices.has(idx) ? '_' : letter
    ).join('');

    const distractors = words
        .filter(w => w.word !== word)
        .map(w => w.word.toLowerCase())
        .slice(0, 3);

    return withOptions(
        {
            type: 'word',
            question: `Completa la palabra: ${incomplete} (Pista: ${selected.hint})`,
            correctAnswer: word.toLowerCase(),
        },
        distractors.length >= 2 ? distractors : ["programar", "desafio", "victoria"].filter(d => d !== word.toLowerCase())
    );
};

/**
 * Generate a sequence challenge
 */
export const generateSequenceChallenge = (): BombChallenge => {
    const sequences = [
        { sequence: [2, 4, 6, 8], next: 10, rule: "números pares" },
        { sequence: [1, 3, 5, 7], next: 9, rule: "números impares" },
        { sequence: [5, 10, 15, 20], next: 25, rule: "múltiplos de 5" },
        { sequence: [1, 2, 4, 8], next: 16, rule: "potencias de 2" },
        { sequence: [10, 20, 30, 40], next: 50, rule: "múltiplos de 10" }
    ];

    const selected = getRandomItem(sequences);
    const answer = selected.next;

    const distractors = new Set<number>();
    while (distractors.size < 3) {
        const offset = randInt(1, 12);
        distractors.add(Math.max(1, answer + offset));
        distractors.add(Math.max(1, answer - offset));
    }
    const filtered = [...distractors].filter(n => n !== answer).slice(0, 3);

    return withOptions(
        {
            type: 'sequence',
            question: `¿Qué número sigue en la secuencia: ${selected.sequence.join(', ')}, ?`,
            correctAnswer: answer.toString(),
        },
        filtered.map(String)
    );
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
