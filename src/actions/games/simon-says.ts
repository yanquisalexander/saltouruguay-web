import { games, getPlayersTeams } from "@/utils/streamer-wars";
import { ActionError, defineAction } from "astro:actions";
import { z } from "astro:schema";
import { getSession } from "auth-astro/server";

export const simonSays = {
    getGameState: defineAction({
        async handler() {
            const gameState = await games.simonSays.getGameState();
            return { gameState };
        },
    }),
    startGame: defineAction({
        async handler(_, { request }) {
            const session = await getSession(request);

            if (!session?.user.isAdmin) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "No tienes permisos para iniciar el juego",
                });
            }

            const teams = await getPlayersTeams();

            console.log(teams); // Verifica qué datos devuelve getPlayersTeams()

            const mappedTeams = Object.keys(teams.playersTeams).reduce((acc, team) => {
                // Si playersTeams[team] es un array de jugadores, extraemos solo los playerNumber
                acc[team] = {
                    players: teams.playersTeams[team].map(player => player.playerNumber) // Extrae playerNumber
                };
                return acc;
            }, {} as Record<string, { players: number[] }>);


            const gameState = await games.simonSays.startGame(mappedTeams);
            return { gameState };
        },
    }),
    generateNextPattern: defineAction({
        async handler() {
            const newPattern = await games.simonSays.generateNextPattern();
            return { pattern: newPattern };
        },
    }),
    completePattern: defineAction({

        async handler(_, { request }) {
            const session = await getSession(request);

            if (!session?.user.streamerWarsPlayerNumber) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "No puedes completar un patrón si no estás en el juego",
                });
            }

            const playerNumber = session.user.streamerWarsPlayerNumber;
            const gameState = await games.simonSays.completePattern(playerNumber);
            return { gameState };
        },
    }),
    patternFailed: defineAction({

        async handler(_, { request }) {
            const session = await getSession(request);

            if (!session?.user.streamerWarsPlayerNumber) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "No puedes fallar un patrón si no estás en el juego",
                });
            }

            const playerNumber = session.user.streamerWarsPlayerNumber;
            const gameState = await games.simonSays.patternFailed(playerNumber);
            return { gameState };
        },
    }),
    nextRound: defineAction({
        async handler(_, { request }) {
            const session = await getSession(request);

            if (!session?.user.isAdmin) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Solo un administrador puede pasar a la siguiente ronda",
                });
            }

            const gameState = await games.simonSays.nextRound();
            return { gameState };
        },
    }),
};
