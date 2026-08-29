import cacheService from "@/services/cache";
import { CACHE_KEYS, PUSHER_CHANNELS_BOTON, PUSHER_EVENTS_BOTON } from "@/consts/pusher";
import { pusher } from "@/utils/pusher";
import { ActionError, defineAction } from "astro:actions";
import { getSession } from "auth-astro/server";

interface BotonState {
    userId: string;
    username: string;
    image: string | null;
    pressedAt: number;
}

function getCache() {
    return cacheService.create({ ttl: 300 });
}

export const boton = {
    press: defineAction({
        handler: async (_, { request }) => {
            const session = await getSession(request);
            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Debes iniciar sesión para presionar el botón",
                });
            }

            const cache = getCache();
            const current = await cache.get<BotonState>(CACHE_KEYS.BOTON);

            if (current) {
                throw new ActionError({
                    code: "CONFLICT",
                    message: "Alguien ya presionó el botón",
                });
            }

            const state: BotonState = {
                userId: session.user.id,
                username: session.user.name || session.user.username || "Anónimo",
                image: session.user.image || null,
                pressedAt: Date.now(),
            };

            await cache.set(CACHE_KEYS.BOTON, state);

            await pusher.trigger(PUSHER_CHANNELS_BOTON.GAME, PUSHER_EVENTS_BOTON.BUTTON_PRESSED, state);

            return { success: true, state };
        },
    }),

    clean: defineAction({
        handler: async (_, { request }) => {
            const session = await getSession(request);
            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Debes iniciar sesión",
                });
            }

            if (!session.user.isAdmin) {
                throw new ActionError({
                    code: "FORBIDDEN",
                    message: "Solo los admins pueden limpiar el botón",
                });
            }

            const cache = getCache();
            await cache.delete(CACHE_KEYS.BOTON);

            await pusher.trigger(PUSHER_CHANNELS_BOTON.GAME, PUSHER_EVENTS_BOTON.BUTTON_CLEANED, {});

            return { success: true };
        },
    }),

    getState: defineAction({
        handler: async () => {
            const cache = getCache();
            const state = await cache.get<BotonState>(CACHE_KEYS.BOTON);
            return { state: state || null };
        },
    }),
};
