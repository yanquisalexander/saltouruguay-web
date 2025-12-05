import { ActionError, defineAction } from "astro:actions";
import { z } from "astro:schema";
import { getSession } from "auth-astro/server";
import { PetService } from "@/services/pet-service";

export const pets = {
    /**
     * Get or create user's pet
     */
    getPet: defineAction({
        handler: async (_, { request }) => {
            const session = await getSession(request);

            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Debes iniciar sesión para ver tu mascota",
                });
            }

            const pet = await PetService.getOrCreatePet(session.user.id);
            await PetService.updatePetStats(session.user.id);
            
            const updatedPet = await PetService.getOrCreatePet(session.user.id);

            return { pet: updatedPet };
        },
    }),

    /**
     * Get pet summary with house and inventory
     */
    getPetSummary: defineAction({
        handler: async (_, { request }) => {
            const session = await getSession(request);

            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Debes iniciar sesión para ver tu mascota",
                });
            }

            const summary = await PetService.getPetSummary(session.user.id);
            return summary;
        },
    }),

    /**
     * Feed the pet
     */
    feedPet: defineAction({
        input: z.object({
            itemId: z.number().optional(),
        }),
        handler: async ({ itemId }, { request }) => {
            const session = await getSession(request);

            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Debes iniciar sesión para alimentar a tu mascota",
                });
            }

            try {
                const updatedPet = await PetService.feedPet(session.user.id, itemId);
                return { success: true, pet: updatedPet };
            } catch (error: any) {
                throw new ActionError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: error.message || "Error al alimentar a la mascota",
                });
            }
        },
    }),

    /**
     * Clean the pet
     */
    cleanPet: defineAction({
        handler: async (_, { request }) => {
            const session = await getSession(request);

            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Debes iniciar sesión para limpiar a tu mascota",
                });
            }

            try {
                const updatedPet = await PetService.cleanPet(session.user.id);
                return { success: true, pet: updatedPet };
            } catch (error: any) {
                throw new ActionError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: error.message || "Error al limpiar la mascota",
                });
            }
        },
    }),

    /**
     * Put pet to sleep
     */
    sleepPet: defineAction({
        handler: async (_, { request }) => {
            const session = await getSession(request);

            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Debes iniciar sesión para dormir a tu mascota",
                });
            }

            try {
                const updatedPet = await PetService.sleepPet(session.user.id);
                return { success: true, pet: updatedPet };
            } catch (error: any) {
                throw new ActionError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: error.message || "Error al dormir la mascota",
                });
            }
        },
    }),

    /**
     * Update pet appearance
     */
    updateAppearance: defineAction({
        input: z.object({
            color: z.string().optional(),
            shape: z.string().optional(),
            accessories: z.array(z.string()).optional(),
            clothing: z.array(z.string()).optional(),
        }),
        handler: async ({ color, shape, accessories, clothing }, { request }) => {
            const session = await getSession(request);

            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Debes iniciar sesión para personalizar tu mascota",
                });
            }

            try {
                const appearance: any = {};
                if (color) appearance.color = color;
                if (shape) appearance.shape = shape;
                if (accessories) appearance.accessories = accessories;
                if (clothing) appearance.clothing = clothing;

                const updatedPet = await PetService.updateAppearance(session.user.id, appearance);
                return { success: true, pet: updatedPet };
            } catch (error: any) {
                throw new ActionError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: error.message || "Error al actualizar apariencia",
                });
            }
        },
    }),

    /**
     * Get shop items
     */
    getShopItems: defineAction({
        input: z.object({
            type: z.enum(['food', 'decoration', 'clothing', 'accessory', 'toy']).optional(),
        }),
        handler: async ({ type }, { request }) => {
            const session = await getSession(request);

            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Debes iniciar sesión para ver la tienda",
                });
            }

            const items = await PetService.getShopItems(type);
            return { items };
        },
    }),

    /**
     * Purchase item
     */
    purchaseItem: defineAction({
        input: z.object({
            itemId: z.number(),
        }),
        handler: async ({ itemId }, { request }) => {
            const session = await getSession(request);

            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Debes iniciar sesión para comprar",
                });
            }

            try {
                const result = await PetService.purchaseItem(session.user.id, itemId);
                return result;
            } catch (error: any) {
                throw new ActionError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: error.message || "Error al comprar el item",
                });
            }
        },
    }),

    /**
     * Get user inventory
     */
    getInventory: defineAction({
        handler: async (_, { request }) => {
            const session = await getSession(request);

            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Debes iniciar sesión para ver tu inventario",
                });
            }

            const inventory = await PetService.getInventory(session.user.id);
            return { inventory };
        },
    }),

    /**
     * Get pet house
     */
    getHouse: defineAction({
        handler: async (_, { request }) => {
            const session = await getSession(request);

            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Debes iniciar sesión para ver tu casa",
                });
            }

            const house = await PetService.getOrCreateHouse(session.user.id);
            return { house };
        },
    }),

    /**
     * Update house
     */
    updateHouse: defineAction({
        input: z.object({
            layout: z.object({
                wallpaper: z.string().optional(),
                flooring: z.string().optional(),
                theme: z.string().optional(),
            }).optional(),
            items: z.array(z.object({
                itemId: z.number(),
                x: z.number(),
                y: z.number(),
                rotation: z.number().optional(),
            })).optional(),
        }),
        handler: async ({ layout, items }, { request }) => {
            const session = await getSession(request);

            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Debes iniciar sesión para decorar tu casa",
                });
            }

            try {
                const updatedHouse = await PetService.updateHouse(session.user.id, layout, items);
                return { success: true, house: updatedHouse };
            } catch (error: any) {
                throw new ActionError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: error.message || "Error al actualizar la casa",
                });
            }
        },
    }),

    /**
     * Visit another user's pet
     */
    visitPet: defineAction({
        input: z.object({
            ownerId: z.number(),
        }),
        handler: async ({ ownerId }, { request }) => {
            const session = await getSession(request);

            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Debes iniciar sesión para visitar mascotas",
                });
            }

            try {
                const visit = await PetService.visitPet(session.user.id, ownerId);
                return visit;
            } catch (error: any) {
                throw new ActionError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: error.message || "Error al visitar la mascota",
                });
            }
        },
    }),

    /**
     * Leave a like
     */
    leaveLike: defineAction({
        input: z.object({
            ownerId: z.number(),
        }),
        handler: async ({ ownerId }, { request }) => {
            const session = await getSession(request);

            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Debes iniciar sesión para dejar likes",
                });
            }

            try {
                const result = await PetService.leaveLike(session.user.id, ownerId);
                return result;
            } catch (error: any) {
                throw new ActionError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: error.message || "Error al dejar like",
                });
            }
        },
    }),

    /**
     * Check if can play minigame
     */
    canPlayMinigame: defineAction({
        input: z.object({
            gameName: z.string(),
        }),
        handler: async ({ gameName }, { request }) => {
            const session = await getSession(request);

            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Debes iniciar sesión para jugar",
                });
            }

            const result = await PetService.canPlayMinigame(session.user.id, gameName);
            return result;
        },
    }),

    /**
     * Record minigame session
     */
    recordMinigameSession: defineAction({
        input: z.object({
            gameName: z.string(),
            score: z.number(),
        }),
        handler: async ({ gameName, score }, { request }) => {
            const session = await getSession(request);

            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Debes iniciar sesión para jugar",
                });
            }

            try {
                const result = await PetService.recordMinigameSession(
                    session.user.id,
                    gameName,
                    score
                );
                return result;
            } catch (error: any) {
                throw new ActionError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: error.message || "Error al guardar sesión de juego",
                });
            }
        },
    }),
};
