import { games } from "@/utils/streamer-wars";
import { ActionError, defineAction } from "astro:actions";
import { getSession } from "auth-astro/server";

export const tugOfWar = {
    getGameState: defineAction({
        async handler() {
            const gameState = await games.tugOfWar.getGameState();
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

            const gameState = await games.tugOfWar.startGame();
            return { gameState };
        },
    }),

    handlePlayerClick: defineAction({
        async handler(_, { request }) {
            const session = await getSession(request);

            if (!session?.user.streamerWarsPlayerNumber) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "No puedes participar si no estás en el juego",
                });
            }

            const playerNumber = session.user.streamerWarsPlayerNumber;
            const result = await games.tugOfWar.handlePlayerClick(playerNumber);
            
            if (!result.success) {
                throw new ActionError({
                    code: "BAD_REQUEST",
                    message: result.error || "Error al procesar tu acción",
                });
            }

            return { gameState: result.gameState };
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

            const result = await games.tugOfWar.endGame();
            
            if (!result.success) {
                throw new ActionError({
                    code: "BAD_REQUEST",
                    message: result.error || "Error al finalizar el juego",
                });
            }

            return { gameState: result.gameState };
        },
    }),
};
