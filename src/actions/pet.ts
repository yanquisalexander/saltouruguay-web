import { ActionError, defineAction } from 'astro:actions';
import { z } from 'astro:schema';
import { PetService } from '@/services/pet';
import { getSession } from "auth-astro/server";

export const pet = {
    /**
     * Create a new pet
     */
    createPet: defineAction({
        input: z.object({
            name: z.string().min(1).max(50),
        }),
        handler: async (input, context) => {
            const session = await getSession(context.request);
            if (!session?.user?.id) {
                throw new ActionError({
                    code: 'UNAUTHORIZED',
                    message: 'Debes iniciar sesión para adoptar una mascota',
                });
            }

            try {
                const pet = await PetService.createPet(session.user.id, input.name);
                return {
                    success: true,
                    pet,
                };
            } catch (error: any) {
                if (error.message === 'User already has a pet') {
                    throw new ActionError({
                        code: 'BAD_REQUEST',
                        message: 'Ya tienes una mascota',
                    });
                }
                throw new ActionError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: error.message || 'Error al crear la mascota',
                });
            }
        },
    }),

    /**
     * Get pet with current stats
     */
    getPet: defineAction({
        handler: async (_, context) => {
            const session = await getSession(context.request);
            if (!session?.user?.id) {
                throw new ActionError({
                    code: 'UNAUTHORIZED',
                    message: 'Debes iniciar sesión para ver tu mascota',
                });
            }

            try {
                const pet = await PetService.getPet(session.user.id);
                return pet;
            } catch (error: any) {
                throw new ActionError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: error.message || 'Error al obtener la mascota',
                });
            }
        },
    }),

    /**
     * Feed the pet
     */
    feedPet: defineAction({
        input: z.object({
            itemId: z.number(),
        }),
        handler: async (input, context) => {
            const session = await getSession(context.request);
            if (!session?.user?.id) {
                throw new ActionError({
                    code: 'UNAUTHORIZED',
                    message: 'Debes iniciar sesión para alimentar tu mascota',
                });
            }

            try {
                const result = await PetService.feedPet(session.user.id, input.itemId);
                return result;
            } catch (error: any) {
                throw new ActionError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: error.message || 'Error al alimentar la mascota',
                });
            }
        },
    }),

    /**
     * Clean the pet
     */
    cleanPet: defineAction({
        handler: async (_, context) => {
            const session = await getSession(context.request);
            if (!session?.user?.id) {
                throw new ActionError({
                    code: 'UNAUTHORIZED',
                    message: 'Debes iniciar sesión para limpiar tu mascota',
                });
            }

            try {
                const result = await PetService.cleanPet(session.user.id);
                return result;
            } catch (error: any) {
                throw new ActionError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: error.message || 'Error al limpiar la mascota',
                });
            }
        },
    }),

    /**
     * Play with the pet
     */
    playWithPet: defineAction({
        input: z.object({
            itemId: z.number().optional(),
        }),
        handler: async (input, context) => {
            const session = await getSession(context.request);
            if (!session?.user?.id) {
                throw new ActionError({
                    code: 'UNAUTHORIZED',
                    message: 'Debes iniciar sesión para jugar con tu mascota',
                });
            }

            try {
                const result = await PetService.playWithPet(session.user.id, input.itemId);
                return result;
            } catch (error: any) {
                throw new ActionError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: error.message || 'Error al jugar con la mascota',
                });
            }
        },
    }),

    /**
     * Put pet to sleep
     */
    putPetToSleep: defineAction({
        handler: async (_, context) => {
            const session = await getSession(context.request);
            if (!session?.user?.id) {
                throw new ActionError({
                    code: 'UNAUTHORIZED',
                    message: 'Debes iniciar sesión para dormir tu mascota',
                });
            }

            try {
                const result = await PetService.putPetToSleep(session.user.id);
                return result;
            } catch (error: any) {
                throw new ActionError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: error.message || 'Error al dormir la mascota',
                });
            }
        },
    }),

    /**
     * Purchase item from store
     */
    purchaseItem: defineAction({
        input: z.object({
            itemId: z.number(),
            quantity: z.number().min(1).default(1),
        }),
        handler: async (input, context) => {
            const session = await getSession(context.request);
            if (!session?.user?.id) {
                throw new ActionError({
                    code: 'UNAUTHORIZED',
                    message: 'Debes iniciar sesión para comprar items',
                });
            }

            try {
                const result = await PetService.purchaseItem(
                    session.user.id,
                    input.itemId,
                    input.quantity
                );
                return result;
            } catch (error: any) {
                if (error.message === 'Insufficient balance') {
                    throw new ActionError({
                        code: 'BAD_REQUEST',
                        message: 'Saldo insuficiente',
                    });
                }
                throw new ActionError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: error.message || 'Error al comprar el item',
                });
            }
        },
    }),

    /**
     * Get user inventory
     */
    getUserInventory: defineAction({
        handler: async (_, context) => {
            const session = await getSession(context.request);
            if (!session?.user?.id) {
                throw new ActionError({
                    code: 'UNAUTHORIZED',
                    message: 'Debes iniciar sesión para ver tu inventario',
                });
            }

            try {
                const inventory = await PetService.getUserInventory(session.user.id);
                return inventory;
            } catch (error: any) {
                throw new ActionError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: error.message || 'Error al obtener el inventario',
                });
            }
        },
    }),

    /**
     * Get store items
     */
    getStoreItems: defineAction({
        input: z.object({
            category: z.string().optional(),
        }),
        handler: async (input, context) => {
            const session = await getSession(context.request);
            if (!session?.user?.id) {
                throw new ActionError({
                    code: 'UNAUTHORIZED',
                    message: 'Debes iniciar sesión para ver la tienda',
                });
            }

            try {
                const items = await PetService.getStoreItems(input.category);
                return items;
            } catch (error: any) {
                throw new ActionError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: error.message || 'Error al obtener los items',
                });
            }
        },
    }),

    /**
     * Get pet house
     */
    getPetHouse: defineAction({
        handler: async (_, context) => {
            const session = await getSession(context.request);
            if (!session?.user?.id) {
                throw new ActionError({
                    code: 'UNAUTHORIZED',
                    message: 'Debes iniciar sesión para ver la casa',
                });
            }

            try {
                const house = await PetService.getPetHouse(session.user.id);
                return house;
            } catch (error: any) {
                throw new ActionError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: error.message || 'Error al obtener la casa',
                });
            }
        },
    }),

    /**
     * Update house layout
     */
    updateHouseLayout: defineAction({
        input: z.object({
            layout: z.array(z.object({
                item_id: z.string(),
                position_x: z.number(),
                position_y: z.number(),
                rotation: z.number(),
            })),
            backgroundId: z.string().optional(),
        }),
        handler: async (input, context) => {
            const session = await getSession(context.request);
            if (!session?.user?.id) {
                throw new ActionError({
                    code: 'UNAUTHORIZED',
                    message: 'Debes iniciar sesión para actualizar la casa',
                });
            }

            try {
                const result = await PetService.updateHouseLayout(
                    session.user.id,
                    input.layout,
                    input.backgroundId
                );
                return result;
            } catch (error: any) {
                throw new ActionError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: error.message || 'Error al actualizar la casa',
                });
            }
        },
    }),

    /**
     * Wake up pet
     */
    wakePet: defineAction({
        handler: async (_, context) => {
            const session = await getSession(context.request);
            if (!session?.user?.id) {
                throw new ActionError({
                    code: 'UNAUTHORIZED',
                    message: 'Debes iniciar sesión para despertar tu mascota',
                });
            }

            try {
                const result = await PetService.wakePet(session.user.id);
                return result;
            } catch (error: any) {
                throw new ActionError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: error.message || 'Error al despertar la mascota',
                });
            }
        },
    }),
};
