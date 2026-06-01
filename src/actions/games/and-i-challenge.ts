import { games } from "@/utils/streamer-wars";
import { pusher } from "@/utils/pusher";
import { PUSHER_CHANNELS, PUSHER_EVENTS_ANDI } from "@/consts/pusher";
import { ActionError, defineAction } from "astro:actions";
import { getSession } from "auth-astro/server";
import { z } from "astro:schema";


export const andIChallenge = {
    getGameState: defineAction({
        async handler() {
            const gameState = await games.andiChallenge.getGameState();
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

            const gameState = await games.andiChallenge.startGame();
            return { gameState };
        },
    }),

    recordTap: defineAction({
        input: z.object({
            ms: z.number(), // milliseconds difference from target (negative = early)
        }),
        async handler(input, { request }) {
            const session = await getSession(request);

            if (!session?.user.streamerWarsPlayerNumber) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "No puedes participar si no estás en el juego",
                });
            }

            const playerNumber = session.user.streamerWarsPlayerNumber;
            const { result, gameState } = await games.andiChallenge.recordResult(playerNumber, input.ms);

            return { result, gameState };
        },
    }),

    nextTurn: defineAction({
        async handler(_, { request }) {
            const session = await getSession(request);

            if (!session?.user.isAdmin) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "No tienes permisos",
                });
            }

            const { nextPlayer } = await games.andiChallenge.nextTurn();
            return { nextPlayer };
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

            const result = await games.andiChallenge.endGame();
            return result;
        },
    }),

    broadcastAudioStart: defineAction({
        input: z.object({
            startedAt: z.number(),
        }),
        async handler(input, { request }) {
            const session = await getSession(request);

            if (!session?.user.streamerWarsPlayerNumber) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "No puedes hacer esto si no estás en el juego",
                });
            }

            await pusher.trigger(PUSHER_CHANNELS.GLOBAL, PUSHER_EVENTS_ANDI.AUDIO_START, {
                startedAt: input.startedAt,
            });

            return { success: true };
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

            const gameState = await games.andiChallenge.resetGame();
            return { gameState };
        },
    }),
};
