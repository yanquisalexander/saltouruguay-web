import { ActionError, defineAction } from "astro:actions";
import { z } from "astro:schema";
import { getSession } from "auth-astro/server";
import { PACK_PRICES, type PackTier } from "@/consts/Figuritas";
import { getAlbum, getPackHistory, getUnopenedPacks, grantPack, openPack } from "@/utils/album";
import { AlbumPusher } from "@/services/album-pusher";
import { BancoSaltanoService } from "@/services/banco-saltano";

const PackTierSchema = z.enum(["comun", "raro", "epico", "legendario"]);

export const album = {
    /** Álbum del usuario logueado (progreso + cantidades). */
    getAlbum: defineAction({
        handler: async (_, { request }) => {
            const session = await getSession(request);
            if (!session) throw new ActionError({ code: "UNAUTHORIZED", message: "Debes iniciar sesión" });
            return await getAlbum(parseInt(session.user.id));
        },
    }),

    /** Sobres sin abrir del usuario logueado. */
    getPacks: defineAction({
        handler: async (_, { request }) => {
            const session = await getSession(request);
            if (!session) throw new ActionError({ code: "UNAUTHORIZED", message: "Debes iniciar sesión" });
            return await getUnopenedPacks(parseInt(session.user.id));
        },
    }),

    /** Historial reciente de sobres. */
    getPackHistory: defineAction({
        handler: async (_, { request }) => {
            const session = await getSession(request);
            if (!session) throw new ActionError({ code: "UNAUTHORIZED", message: "Debes iniciar sesión" });
            return await getPackHistory(parseInt(session.user.id));
        },
    }),

    /** Abre un sobre propio (idempotente). */
    openPack: defineAction({
        input: z.object({ packId: z.number() }),
        handler: async ({ packId }, { request }) => {
            const session = await getSession(request);
            if (!session) throw new ActionError({ code: "UNAUTHORIZED", message: "Debes iniciar sesión" });
            const userId = parseInt(session.user.id);

            try {
                const result = await openPack(packId, userId);
                if (!result.alreadyOpened) {
                    try {
                        await AlbumPusher.packOpened(userId, packId, result.cards);
                    } catch {
                        // best-effort
                    }
                }
                return result;
            } catch {
                throw new ActionError({ code: "BAD_REQUEST", message: "No se pudo abrir el sobre" });
            }
        },
    }),

    /** Compra un sobre con coins del Banco Saltano. */
    buyPack: defineAction({
        input: z.object({ tier: PackTierSchema }),
        handler: async ({ tier }, { request }) => {
            const session = await getSession(request);
            if (!session) throw new ActionError({ code: "UNAUTHORIZED", message: "Debes iniciar sesión" });
            const userId = parseInt(session.user.id);
            const packTier = tier as PackTier;
            const price = PACK_PRICES[packTier];

            try {
                await BancoSaltanoService.getOrCreateAccount(userId);
            } catch {
                throw new ActionError({ code: "INTERNAL_SERVER_ERROR", message: "No se pudo acceder a tu cuenta" });
            }

            try {
                await BancoSaltanoService.createTransaction({
                    userId,
                    type: "purchase",
                    amount: price,
                    description: `Sobre ${packTier} del álbum`,
                    metadata: { source: "album_shop", packTier },
                });
            } catch {
                throw new ActionError({ code: "BAD_REQUEST", message: "No tienes suficientes coins" });
            }

            const pack = await grantPack(userId, packTier, "purchase");
            try {
                await AlbumPusher.packReceived(userId, pack.id, packTier, "purchase");
            } catch {
                // best-effort
            }
            return { pack };
        },
    }),
};
