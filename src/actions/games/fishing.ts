import { fishing } from "@/utils/streamer-wars/minigames";
import { ActionError, defineAction } from "astro:actions";
import { getSession } from "auth-astro/server";

export const fishingGame = {
    getGameState: defineAction({
        async handler() {
            const gameState = await fishing.getGameState();
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

            const gameState = await fishing.startGame();
            return { gameState };
        },
    }),

    recordElimination: defineAction({
        async handler(_, { request }) {
            const session = await getSession(request);

            if (!session?.user.streamerWarsPlayerNumber) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "No puedes participar si no estás en el juego",
                });
            }

            const playerNumber = session.user.streamerWarsPlayerNumber;
            const result = await fishing.recordElimination(playerNumber);

            if (!result.success) {
                throw new ActionError({
                    code: "BAD_REQUEST",
                    message: result.error || "Error al registrar la eliminación",
                });
            }

            return { success: true };
        },
    }),

    endGame: defineAction({
        async handler(_, { request }) {
            const session = await getSession(request);

            if (!session?.user.isAdmin) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Solo un administrador puede finalizar el juego",
                });
            }

            const result = await fishing.endGame();

            if (!result.success) {
                throw new ActionError({
                    code: "BAD_REQUEST",
                    message: result.error || "Error al finalizar el juego",
                });
            }

            return { eliminatedPlayers: result.eliminatedPlayers };
        },
    }),

    resetGame: defineAction({
        async handler(_, { request }) {
            const session = await getSession(request);

            if (!session?.user.isAdmin) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Solo un administrador puede reiniciar el juego",
                });
            }

            const gameState = await fishing.resetGame();
            return { gameState };
        },
    }),

    isEliminated: defineAction({
        async handler(_, { request }) {
            const session = await getSession(request);

            if (!session?.user.streamerWarsPlayerNumber) {
                return { eliminated: false };
            }

            const playerNumber = session.user.streamerWarsPlayerNumber;
            const eliminated = await fishing.isPlayerEliminated(playerNumber);
            return { eliminated };
        },
    }),
};
