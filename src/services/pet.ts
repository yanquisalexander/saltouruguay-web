import { client as db } from '@/db/client';
import {
    PetsTable,
    PetItemsTable,
    PetUserInventoryTable,
    PetHousesTable,
    PetMinigameScoresTable,
    UsersTable
} from '@/db/schema';
import { eq, and, desc, sql, gte } from 'drizzle-orm';
import { BancoSaltanoService } from './banco-saltano';

// Decay rates per hour (serverless lazy evaluation)
const DECAY_RATES = {
    hunger: 5,    // -5 per hour
    energy: 3,    // -3 per hour
    hygiene: 4,   // -4 per hour
    happiness: 2, // -2 per hour
};

// Maximum stats
const MAX_STAT = 100;
const MIN_STAT = 0;

interface PetStats {
    hunger: number;
    energy: number;
    hygiene: number;
    happiness: number;
}

interface PetAppearance {
    color: string;
    skinId: string | null;
    hatId: string | null;
    accessoryId: string | null;
}

export class PetService {
    /**
     * Calculate current stats based on time elapsed (Lazy Evaluation)
     */
    static calculateCurrentStats(
        savedStats: PetStats,
        lastInteraction: Date
    ): PetStats {
        const now = new Date();
        const hoursElapsed = (now.getTime() - new Date(lastInteraction).getTime()) / (1000 * 60 * 60);

        return {
            hunger: Math.max(MIN_STAT, Math.min(MAX_STAT, savedStats.hunger - (DECAY_RATES.hunger * hoursElapsed))),
            energy: Math.max(MIN_STAT, Math.min(MAX_STAT, savedStats.energy - (DECAY_RATES.energy * hoursElapsed))),
            hygiene: Math.max(MIN_STAT, Math.min(MAX_STAT, savedStats.hygiene - (DECAY_RATES.hygiene * hoursElapsed))),
            happiness: Math.max(MIN_STAT, Math.min(MAX_STAT, savedStats.happiness - (DECAY_RATES.happiness * hoursElapsed))),
        };
    }

    /**
     * Create a new pet for a user
     */
    static async createPet(userId: number, petName: string) {
        try {
            // Check if user already has a pet
            const existingPet = await db.query.PetsTable.findFirst({
                where: eq(PetsTable.ownerId, userId),
            });

            if (existingPet) {
                throw new Error('User already has a pet');
            }

            // Validate pet name
            if (!petName || petName.trim().length === 0) {
                throw new Error('Pet name is required');
            }

            if (petName.length > 50) {
                throw new Error('Pet name is too long (max 50 characters)');
            }

            // Create pet with default stats
            const [pet] = await db.insert(PetsTable).values({
                ownerId: userId,
                name: petName.trim(),
                hunger: 100,
                energy: 100,
                hygiene: 100,
                happiness: 100,
            }).returning();

            // Create default house for the pet
            await db.insert(PetHousesTable).values({
                ownerId: userId,
                backgroundId: 'default',
                layout: [],
            });

            return pet;
        } catch (error) {
            console.error('Error creating pet:', error);
            throw error;
        }
    }

    /**
     * Get pet with calculated current stats
     */
    static async getPet(userId: number) {
        try {
            const pet = await db.query.PetsTable.findFirst({
                where: eq(PetsTable.ownerId, userId),
            });

            if (!pet) {
                return null;
            }

            // Calculate current stats based on time elapsed
            const currentStats = this.calculateCurrentStats(
                {
                    hunger: pet.hunger,
                    energy: pet.energy,
                    hygiene: pet.hygiene,
                    happiness: pet.happiness,
                },
                pet.lastInteraction
            );

            return {
                ...pet,
                currentStats,
                savedStats: {
                    hunger: pet.hunger,
                    energy: pet.energy,
                    hygiene: pet.hygiene,
                    happiness: pet.happiness,
                },
            };
        } catch (error) {
            console.error('Error getting pet:', error);
            throw new Error('Failed to retrieve pet');
        }
    }

    /**
     * Feed the pet with an item
     */
    static async feedPet(userId: number, itemId: number) {
        try {
            return await db.transaction(async (tx) => {
                // Get pet
                const pet = await tx.query.PetsTable.findFirst({
                    where: eq(PetsTable.ownerId, userId),
                });

                if (!pet) {
                    throw new Error('Pet not found');
                }

                // Get item
                const item = await tx.query.PetItemsTable.findFirst({
                    where: eq(PetItemsTable.id, itemId),
                });

                if (!item || item.category !== 'food') {
                    throw new Error('Invalid food item');
                }

                // Check inventory
                const inventoryItem = await tx.query.PetUserInventoryTable.findFirst({
                    where: and(
                        eq(PetUserInventoryTable.userId, userId),
                        eq(PetUserInventoryTable.itemId, itemId)
                    ),
                });

                if (!inventoryItem || inventoryItem.quantity < 1) {
                    throw new Error('Item not in inventory');
                }

                // Calculate current stats
                const currentStats = this.calculateCurrentStats(
                    {
                        hunger: pet.hunger,
                        energy: pet.energy,
                        hygiene: pet.hygiene,
                        happiness: pet.happiness,
                    },
                    pet.lastInteraction
                );

                // Apply item effect
                const newHunger = Math.min(MAX_STAT, currentStats.hunger + item.effectValue);
                const newHappiness = Math.min(MAX_STAT, currentStats.happiness + 5); // Bonus happiness for feeding

                // Update pet stats
                await tx.update(PetsTable)
                    .set({
                        hunger: newHunger,
                        energy: currentStats.energy,
                        hygiene: currentStats.hygiene,
                        happiness: newHappiness,
                        lastInteraction: sql`current_timestamp`,
                        updatedAt: sql`current_timestamp`,
                    })
                    .where(eq(PetsTable.ownerId, userId));

                // Decrease item quantity or remove if consumable
                if (item.isConsumable) {
                    if (inventoryItem.quantity > 1) {
                        await tx.update(PetUserInventoryTable)
                            .set({
                                quantity: inventoryItem.quantity - 1,
                            })
                            .where(eq(PetUserInventoryTable.id, inventoryItem.id));
                    } else {
                        await tx.delete(PetUserInventoryTable)
                            .where(eq(PetUserInventoryTable.id, inventoryItem.id));
                    }
                }

                return {
                    success: true,
                    newStats: {
                        hunger: newHunger,
                        energy: currentStats.energy,
                        hygiene: currentStats.hygiene,
                        happiness: newHappiness,
                    },
                };
            });
        } catch (error) {
            console.error('Error feeding pet:', error);
            throw error;
        }
    }

    /**
     * Clean the pet
     */
    static async cleanPet(userId: number) {
        try {
            return await db.transaction(async (tx) => {
                const pet = await tx.query.PetsTable.findFirst({
                    where: eq(PetsTable.ownerId, userId),
                });

                if (!pet) {
                    throw new Error('Pet not found');
                }

                const currentStats = this.calculateCurrentStats(
                    {
                        hunger: pet.hunger,
                        energy: pet.energy,
                        hygiene: pet.hygiene,
                        happiness: pet.happiness,
                    },
                    pet.lastInteraction
                );

                // Improve hygiene and happiness
                const newHygiene = Math.min(MAX_STAT, currentStats.hygiene + 30);
                const newHappiness = Math.min(MAX_STAT, currentStats.happiness + 10);

                await tx.update(PetsTable)
                    .set({
                        hunger: currentStats.hunger,
                        energy: currentStats.energy,
                        hygiene: newHygiene,
                        happiness: newHappiness,
                        lastInteraction: sql`current_timestamp`,
                        updatedAt: sql`current_timestamp`,
                    })
                    .where(eq(PetsTable.ownerId, userId));

                return {
                    success: true,
                    newStats: {
                        hunger: currentStats.hunger,
                        energy: currentStats.energy,
                        hygiene: newHygiene,
                        happiness: newHappiness,
                    },
                };
            });
        } catch (error) {
            console.error('Error cleaning pet:', error);
            throw error;
        }
    }

    /**
     * Play with the pet
     */
    static async playWithPet(userId: number, itemId?: number) {
        try {
            return await db.transaction(async (tx) => {
                const pet = await tx.query.PetsTable.findFirst({
                    where: eq(PetsTable.ownerId, userId),
                });

                if (!pet) {
                    throw new Error('Pet not found');
                }

                const currentStats = this.calculateCurrentStats(
                    {
                        hunger: pet.hunger,
                        energy: pet.energy,
                        hygiene: pet.hygiene,
                        happiness: pet.happiness,
                    },
                    pet.lastInteraction
                );

                let happinessBonus = 15;
                let energyCost = 10;

                // If using a toy item, increase effects
                if (itemId) {
                    const item = await tx.query.PetItemsTable.findFirst({
                        where: eq(PetItemsTable.id, itemId),
                    });

                    if (item && item.category === 'toy') {
                        const inventoryItem = await tx.query.PetUserInventoryTable.findFirst({
                            where: and(
                                eq(PetUserInventoryTable.userId, userId),
                                eq(PetUserInventoryTable.itemId, itemId)
                            ),
                        });

                        if (!inventoryItem || inventoryItem.quantity < 1) {
                            throw new Error('Toy not in inventory');
                        }

                        happinessBonus += item.effectValue;

                        // Consume toy if consumable
                        if (item.isConsumable) {
                            if (inventoryItem.quantity > 1) {
                                await tx.update(PetUserInventoryTable)
                                    .set({
                                        quantity: inventoryItem.quantity - 1,
                                    })
                                    .where(eq(PetUserInventoryTable.id, inventoryItem.id));
                            } else {
                                await tx.delete(PetUserInventoryTable)
                                    .where(eq(PetUserInventoryTable.id, inventoryItem.id));
                            }
                        }
                    }
                }

                // Check if pet has enough energy
                if (currentStats.energy < energyCost) {
                    throw new Error('Pet is too tired to play');
                }

                const newHappiness = Math.min(MAX_STAT, currentStats.happiness + happinessBonus);
                const newEnergy = Math.max(MIN_STAT, currentStats.energy - energyCost);

                await tx.update(PetsTable)
                    .set({
                        hunger: currentStats.hunger,
                        energy: newEnergy,
                        hygiene: currentStats.hygiene,
                        happiness: newHappiness,
                        lastInteraction: sql`current_timestamp`,
                        updatedAt: sql`current_timestamp`,
                    })
                    .where(eq(PetsTable.ownerId, userId));

                return {
                    success: true,
                    newStats: {
                        hunger: currentStats.hunger,
                        energy: newEnergy,
                        hygiene: currentStats.hygiene,
                        happiness: newHappiness,
                    },
                };
            });
        } catch (error) {
            console.error('Error playing with pet:', error);
            throw error;
        }
    }

    /**
     * Put pet to sleep
     */
    static async putPetToSleep(userId: number) {
        try {
            return await db.transaction(async (tx) => {
                const pet = await tx.query.PetsTable.findFirst({
                    where: eq(PetsTable.ownerId, userId),
                });

                if (!pet) {
                    throw new Error('Pet not found');
                }

                const currentStats = this.calculateCurrentStats(
                    {
                        hunger: pet.hunger,
                        energy: pet.energy,
                        hygiene: pet.hygiene,
                        happiness: pet.happiness,
                    },
                    pet.lastInteraction
                );

                // Restore energy
                const newEnergy = Math.min(MAX_STAT, currentStats.energy + 40);

                await tx.update(PetsTable)
                    .set({
                        hunger: currentStats.hunger,
                        energy: newEnergy,
                        hygiene: currentStats.hygiene,
                        happiness: currentStats.happiness,
                        lastInteraction: sql`current_timestamp`,
                        updatedAt: sql`current_timestamp`,
                    })
                    .where(eq(PetsTable.ownerId, userId));

                return {
                    success: true,
                    newStats: {
                        hunger: currentStats.hunger,
                        energy: newEnergy,
                        hygiene: currentStats.hygiene,
                        happiness: currentStats.happiness,
                    },
                };
            });
        } catch (error) {
            console.error('Error putting pet to sleep:', error);
            throw error;
        }
    }

    /**
     * Purchase item from pet store
     */
    static async purchaseItem(userId: number, itemId: number, quantity: number = 1) {
        try {
            return await db.transaction(async (tx) => {
                // Get item
                const item = await tx.query.PetItemsTable.findFirst({
                    where: eq(PetItemsTable.id, itemId),
                });

                if (!item) {
                    throw new Error('Item not found');
                }

                if (!item.isAvailable) {
                    throw new Error('Item is not available for purchase');
                }

                const totalCost = item.price * quantity;

                // Check user balance via BancoSaltanoService
                const account = await BancoSaltanoService.getOrCreateAccount(userId);
                if (account.balance < totalCost) {
                    throw new Error('Insufficient balance');
                }

                // Create purchase transaction
                await BancoSaltanoService.createTransaction({
                    userId,
                    type: 'purchase',
                    amount: totalCost,
                    description: `Compra Tienda Mascotas: ${item.name} x${quantity}`,
                    metadata: {
                        itemId: item.id,
                        itemName: item.name,
                        quantity,
                        source: 'pet_store',
                    },
                });

                // Add to inventory
                const existingInventory = await tx.query.PetUserInventoryTable.findFirst({
                    where: and(
                        eq(PetUserInventoryTable.userId, userId),
                        eq(PetUserInventoryTable.itemId, itemId)
                    ),
                });

                if (existingInventory) {
                    await tx.update(PetUserInventoryTable)
                        .set({
                            quantity: existingInventory.quantity + quantity,
                        })
                        .where(eq(PetUserInventoryTable.id, existingInventory.id));
                } else {
                    await tx.insert(PetUserInventoryTable).values({
                        userId,
                        itemId,
                        quantity,
                    });
                }

                return {
                    success: true,
                    item,
                    quantity,
                    totalCost,
                };
            });
        } catch (error) {
            console.error('Error purchasing item:', error);
            throw error;
        }
    }

    /**
     * Get user's inventory
     */
    static async getUserInventory(userId: number) {
        try {
            const inventory = await db.query.PetUserInventoryTable.findMany({
                where: eq(PetUserInventoryTable.userId, userId),
                with: {
                    item: true,
                },
            });

            return inventory;
        } catch (error) {
            console.error('Error getting user inventory:', error);
            throw new Error('Failed to retrieve inventory');
        }
    }

    /**
     * Get all available items in the store
     */
    static async getStoreItems(category?: 'food' | 'toy' | 'furniture' | 'clothing' | 'accessory') {
        try {
            const whereCondition = category
                ? and(
                    eq(PetItemsTable.isAvailable, true),
                    eq(PetItemsTable.category, category)
                )
                : eq(PetItemsTable.isAvailable, true);

            const items = await db
                .select()
                .from(PetItemsTable)
                .where(whereCondition)
                .orderBy(PetItemsTable.category, PetItemsTable.price);

            return items;
        } catch (error) {
            console.error('Error getting store items:', error);
            throw new Error('Failed to retrieve store items');
        }
    }

    /**
     * Get pet house
     */
    static async getPetHouse(userId: number) {
        try {
            const house = await db.query.PetHousesTable.findFirst({
                where: eq(PetHousesTable.ownerId, userId),
            });

            return house || null;
        } catch (error) {
            console.error('Error getting pet house:', error);
            throw new Error('Failed to retrieve pet house');
        }
    }

    /**
     * Update pet house layout
     */
    static async updateHouseLayout(
        userId: number, 
        layout: Array<{ item_id: string; position_x: number; position_y: number; rotation: number }>, 
        backgroundId?: string
    ) {
        try {
            const house = await db.query.PetHousesTable.findFirst({
                where: eq(PetHousesTable.ownerId, userId),
            });

            if (!house) {
                throw new Error('Pet house not found');
            }

            const updateData: {
                layout: typeof layout;
                backgroundId?: string;
                updatedAt: any;
            } = {
                layout,
                updatedAt: sql`current_timestamp`,
            };

            if (backgroundId) {
                updateData.backgroundId = backgroundId;
            }

            await db.update(PetHousesTable)
                .set(updateData)
                .where(eq(PetHousesTable.ownerId, userId));

            return { success: true };
        } catch (error) {
            console.error('Error updating house layout:', error);
            throw error;
        }
    }
}
