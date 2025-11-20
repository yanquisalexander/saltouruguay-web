/**
 * Streamer Wars - Simon Says Minigame
 * Complete logic for the Simon Says minigame
 */

import { client } from "@/db/client";
import { pusher } from "@/utils/pusher";
import { LOGS_CHANNEL_WEBHOOK_ID, sendWebhookMessage } from "@/services/discord";
import { SALTO_DISCORD_GUILD_ID } from "@/config";
import { DISCORD_LOGS_WEBHOOK_TOKEN } from "astro:env/server";
import { getTranslation } from "@/utils/translate";

import type { SimonSaysGameState } from "../types";
import { CACHE_KEY_SIMON_SAYS, COLORS } from "../constants";
import { createCache } from "../cache";
import { getRandomItem } from "../utils";

// Forward declaration for eliminatePlayer - will be imported from eliminations module
let eliminatePlayer: (playerNumber: number) => Promise<void>;

/**
 * Set the eliminatePlayer function (dependency injection)
 */
export const setEliminatePlayer = (fn: (playerNumber: number) => Promise<void>) => {
    eliminatePlayer = fn;
};

/**
 * Get the current game state
 */
export const getGameState = async (): Promise<SimonSaysGameState> => {
    const cache = createCache();
    return (
        (await cache.get<SimonSaysGameState>(CACHE_KEY_SIMON_SAYS)) ?? {
            teams: {},
            currentRound: 0,
            currentPlayers: {},
            pattern: [],
            eliminatedPlayers: [],
            status: "waiting",
            completedPlayers: [],
            playerWhoAlreadyPlayed: [],
        }
    );
};

/**
 * Generate the next pattern by adding a random color
 */
export const generateNextPattern = async (): Promise<string[]> => {
    const gameState = await getGameState();
    const nextColor = getRandomItem(COLORS);
    return [...gameState.pattern, nextColor];
};

/**
 * Start a new Simon Says game
 */
export const startGame = async (teams: Record<string, { players: number[] }>) => {
    const cache = createCache();

    const currentPlayers = Object.fromEntries(
        Object.entries(teams)
            .map(([team, data]) => {
                const chosenPlayer = data.players.length > 0 ? getRandomItem(data.players) : null;
                return [team, chosenPlayer];
            })
            .filter(([, chosenPlayer]) => chosenPlayer !== null)
    );

    const patternFirstColor = getRandomItem(COLORS);

    const newGameState: SimonSaysGameState = {
        teams,
        currentRound: 1,
        currentPlayers,
        pattern: [patternFirstColor],
        eliminatedPlayers: [],
        status: "playing",
        completedPlayers: [],
        playerWhoAlreadyPlayed: [],
    };

    await cache.set(CACHE_KEY_SIMON_SAYS, newGameState);
    await pusher.trigger("streamer-wars.simon-says", "game-state", newGameState);
    return newGameState;
};

/**
 * Mark a player as having completed the current pattern
 */
export const completePattern = async (playerNumber: number) => {
    const cache = createCache();
    const gameState = await getGameState();

    const newCompletedPlayers = Array.from(
        new Set([...gameState.completedPlayers, playerNumber])
    );

    const newGameState: SimonSaysGameState = {
        ...gameState,
        completedPlayers: newCompletedPlayers,
    };

    const allCompleted = Object.values(gameState.currentPlayers).every(
        (player) => player === null || newCompletedPlayers.includes(player)
    );

    await cache.set(CACHE_KEY_SIMON_SAYS, newGameState);

    await pusher.trigger("streamer-wars.simon-says", "completed-pattern", {
        playerNumber,
    });

    if (allCompleted) {
        await advanceToNextRoundForCurrentPlayers();
    }

    try {
        await sendWebhookMessage(LOGS_CHANNEL_WEBHOOK_ID, DISCORD_LOGS_WEBHOOK_TOKEN, {
            content: null,
            embeds: [
                {
                    title: "Patrón completado",
                    description: `El jugador **#${playerNumber}** ha completado el patrón de Simon Says.`,
                    color: 0x00ff00,
                    fields: [
                        {
                            name: "Equipo",
                            value: getTranslation(Object.entries(gameState.currentPlayers).find(([team, player]) => player === playerNumber)?.[0]!) ?? "Sin equipo",
                            inline: true,
                        },
                        {
                            name: "Ronda",
                            value: gameState.currentRound.toString(),
                            inline: true,
                        },
                        {
                            name: "Completaron",
                            value: `${newCompletedPlayers.length} de ${Object.values(gameState.currentPlayers).filter(player => player !== null).length}`,
                            inline: true,
                        }
                    ],
                },
            ],
        });
    } catch (error) {
        console.error("Error sending Discord webhook:", error);
    }
};

/**
 * Handle pattern failure - eliminate player
 */
export const patternFailed = async (playerNumber: number) => {
    const cache = createCache();
    const gameState = await getGameState();

    const newEliminatedPlayers = Array.from(
        new Set([...gameState.eliminatedPlayers, playerNumber])
    );

    const newPlayerWhoAlreadyPlayed = Array.from(
        new Set([
            ...gameState.playerWhoAlreadyPlayed,
            ...Object.values(gameState.currentPlayers).filter((player) => player !== null),
        ])
    );

    const newGameState: SimonSaysGameState = {
        ...gameState,
        status: "waiting",
        eliminatedPlayers: newEliminatedPlayers,
        playerWhoAlreadyPlayed: newPlayerWhoAlreadyPlayed,
    };

    await cache.set(CACHE_KEY_SIMON_SAYS, newGameState);
    await pusher.trigger("streamer-wars.simon-says", "pattern-failed", {
        playerNumber,
    });
    await pusher.trigger("streamer-wars.simon-says", "game-state", newGameState);

    try {
        await sendWebhookMessage(LOGS_CHANNEL_WEBHOOK_ID, DISCORD_LOGS_WEBHOOK_TOKEN, {
            content: null,
            embeds: [
                {
                    title: "Patrón fallado",
                    description: `El jugador ${playerNumber} ha fallado el patrón de Simon Says y ha sido eliminado.`,
                    color: 0xff0000,
                },
            ],
        });
    } catch (error) {
        console.error("Error sending Discord webhook:", error);
    }

    await eliminatePlayer(playerNumber);
    return newGameState;
};

/**
 * Advance to the next round with the same players
 */
export const advanceToNextRoundForCurrentPlayers = async () => {
    const cache = createCache();
    const gameState = await getGameState();

    const pattern = await generateNextPattern();

    const newGameState: SimonSaysGameState = {
        ...gameState,
        currentRound: gameState.currentRound + 1,
        pattern,
        completedPlayers: [],
        status: "playing",
    };

    await cache.set(CACHE_KEY_SIMON_SAYS, newGameState);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await pusher.trigger("streamer-wars.simon-says", "game-state", newGameState);

    try {
        await sendWebhookMessage(LOGS_CHANNEL_WEBHOOK_ID, DISCORD_LOGS_WEBHOOK_TOKEN, {
            content: null,
            embeds: [
                {
                    title: "Siguiente ronda",
                    description: `Se ha avanzado a la ronda ${newGameState.currentRound} de Simón Dice.`,
                    color: 15267327,
                },
            ],
        });
    } catch (error) {
        console.error("Error sending Discord webhook:", error);
    }
    return newGameState;
};

/**
 * Start a new round with different players
 */
export const nextRoundWithOtherPlayers = async () => {
    const cache = createCache();
    const gameState = await getGameState();

    const newCurrentPlayers = Object.fromEntries(
        Object.entries(gameState.teams)
            .map(([team, data]) => {
                const availablePlayers = data.players.filter(
                    (player) =>
                        !gameState.playerWhoAlreadyPlayed.includes(player) &&
                        !gameState.eliminatedPlayers.includes(player)
                );
                return availablePlayers.length > 0 ? [team, getRandomItem(availablePlayers)] : null;
            })
            .filter((entry): entry is [string, number] => entry !== null)
    ) as Record<string, number>;

    const newPattern = [getRandomItem(COLORS)];

    const newGameState: SimonSaysGameState = {
        ...gameState,
        currentRound: 1,
        currentPlayers: newCurrentPlayers,
        pattern: newPattern,
        completedPlayers: [],
        status: "playing",
    };

    await cache.set(CACHE_KEY_SIMON_SAYS, newGameState);
    await pusher.trigger("streamer-wars.simon-says", "game-state", newGameState);
    return newGameState;
};
