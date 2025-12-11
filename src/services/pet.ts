import { client as db } from '@/db/client';
import {
    PetsTable,
    PetUserInventoryTable,
    PetHousesTable,
    PetMinigameScoresTable,
    UsersTable
} from '@/db/schema';
import { eq, and, desc, sql, gte } from 'drizzle-orm';
import { BancoSaltanoService } from './banco-saltano';
import { PET_ITEMS_CATALOG, type PetItemCategory, type PetItemCatalogEntry } from '@/consts/petItemsCatalog';

// Decay rates per hour (serverless lazy evaluation)
const DECAY_RATES = {
    hunger: 8,    // -8 per hour (approx 12.5h to starve)
    energy: 10,    // -10 per hour (10h to sleep)
    hygiene: 8,    // -8 per hour (12.5h to dirty)
    happiness: 10, // -10 per hour (10h to sad)
};

const SLEEP_RECOVERY_RATE = 30; // +30 energy per hour while sleeping
const SLEEP_DECAY_MULTIPLIER = 0.5; // Stats decay 50% slower while sleeping

// Maximum stats
const MAX_STAT = 100;
const MIN_STAT = 0;
const DEATH_THRESHOLD = -20; // Pet dies if hunger reaches this value

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
    eyesId: string | null;
    mouthId: string | null;
}

export class PetService {
    /**
     * Calculate current stats based on time elapsed (Lazy Evaluation)
     */
    static calculateCurrentStats(
        savedStats: PetStats,
        lastInteraction: Date,
        sleepingSince: Date | null = null
    ): PetStats {
        const now = new Date();

        // If sleeping, calculate with recovery and slower decay
        if (sleepingSince) {
            // Use sleepingSince as the start point, but ensure we don't go back in time before lastInteraction if that happened
            // In practice, putPetToSleep updates both, so they are close.
            // We use sleepingSince to be precise about when sleep started.
            const sleepStart = new Date(sleepingSince).getTime();
            const hoursSleeping = (now.getTime() - sleepStart) / (1000 * 60 * 60);

            // If for some reason hours is negative (clock skew), treat as 0
            const safeHours = Math.max(0, hoursSleeping);

            // Energy recovers, others decay slower
            const energyRecovered = safeHours * SLEEP_RECOVERY_RATE;

            return {
                hunger: Math.round(Math.max(DEATH_THRESHOLD, Math.min(MAX_STAT, savedStats.hunger - (DECAY_RATES.hunger * SLEEP_DECAY_MULTIPLIER * safeHours)))),
                energy: Math.round(Math.max(MIN_STAT, Math.min(MAX_STAT, savedStats.energy + energyRecovered))),
                hygiene: Math.round(Math.max(MIN_STAT, Math.min(MAX_STAT, savedStats.hygiene - (DECAY_RATES.hygiene * SLEEP_DECAY_MULTIPLIER * safeHours)))),
                happiness: Math.round(Math.max(MIN_STAT, Math.min(MAX_STAT, savedStats.happiness - (DECAY_RATES.happiness * SLEEP_DECAY_MULTIPLIER * safeHours)))),
            };
        }

        const hoursElapsed = (now.getTime() - new Date(lastInteraction).getTime()) / (1000 * 60 * 60);

        return {
            hunger: Math.round(Math.max(DEATH_THRESHOLD, Math.min(MAX_STAT, savedStats.hunger - (DECAY_RATES.hunger * hoursElapsed)))),
            energy: Math.round(Math.max(MIN_STAT, Math.min(MAX_STAT, savedStats.energy - (DECAY_RATES.energy * hoursElapsed)))),
            hygiene: Math.round(Math.max(MIN_STAT, Math.min(MAX_STAT, savedStats.hygiene - (DECAY_RATES.hygiene * hoursElapsed)))),
            happiness: Math.round(Math.max(MIN_STAT, Math.min(MAX_STAT, savedStats.happiness - (DECAY_RATES.happiness * hoursElapsed)))),
        };
    }

    /**
     * Create a new pet for a user
     */
    static async createPet(userId: number, petName: string, appearance?: { color: string; skinId: string }) {
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
                throw new Error('Pet name is too long');
            }

            // Create pet with default stats
            const [pet] = await db.insert(PetsTable).values({
                ownerId: userId,
                name: petName.trim(),
                appearance: {
                    color: appearance?.color || 'blue',
                    skinId: appearance?.skinId || 'A',
                    hatId: null,
                    accessoryId: null,
                },
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
                pet.lastInteraction,
                pet.sleepingSince
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
                isDead: currentStats.hunger <= DEATH_THRESHOLD,
                isStarving: currentStats.hunger <= 0,
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

                if (pet.sleepingSince) {
                    throw new Error('Tu mascota está durmiendo. Despiértala para alimentarla.');
                }

                // Get item from catalog
                const item = PET_ITEMS_CATALOG.find(i => i.id === itemId);

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

                if (currentStats.hunger <= DEATH_THRESHOLD) {
                    throw new Error('Tu mascota ha fallecido :(');
                }

                if (currentStats.hunger >= MAX_STAT) {
                    throw new Error('Tu mascota está llena, no tiene hambre.');
                }

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

                if (pet.sleepingSince) {
                    throw new Error('Tu mascota está durmiendo. Despiértala para limpiarla.');
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

                if (currentStats.hunger <= DEATH_THRESHOLD) {
                    throw new Error('Tu mascota ha fallecido :(');
                }

                if (currentStats.hygiene >= MAX_STAT) {
                    throw new Error('Tu mascota ya está limpia y reluciente.');
                }

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

                if (pet.sleepingSince) {
                    throw new Error('Tu mascota está durmiendo. Despiértala para jugar.');
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

                if (currentStats.hunger <= DEATH_THRESHOLD) {
                    throw new Error('Tu mascota ha fallecido :(');
                }

                let happinessBonus = 15;
                let energyCost = 10;

                // If using a toy item, increase effects
                if (itemId) {
                    const item = PET_ITEMS_CATALOG.find(i => i.id === itemId);

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

                if (pet.sleepingSince) {
                    throw new Error('Tu mascota ya está durmiendo.');
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

                if (currentStats.hunger <= DEATH_THRESHOLD) {
                    throw new Error('Tu mascota ha fallecido :(');
                }

                if (currentStats.energy >= MAX_STAT) {
                    throw new Error('Tu mascota no tiene sueño, ¡quiere jugar!');
                }

                // Start sleeping
                await tx.update(PetsTable)
                    .set({
                        hunger: currentStats.hunger,
                        energy: currentStats.energy,
                        hygiene: currentStats.hygiene,
                        happiness: currentStats.happiness,
                        lastInteraction: sql`current_timestamp`,
                        sleepingSince: sql`current_timestamp`,
                        updatedAt: sql`current_timestamp`,
                    })
                    .where(eq(PetsTable.ownerId, userId));

                return {
                    success: true,
                    newStats: {
                        hunger: currentStats.hunger,
                        energy: currentStats.energy,
                        hygiene: currentStats.hygiene,
                        happiness: currentStats.happiness,
                    },
                    isSleeping: true
                };
            });
        } catch (error) {
            console.error('Error putting pet to sleep:', error);
            throw error;
        }
    }

    /**
     * Wake up pet
     */
    static async wakePet(userId: number) {
        try {
            return await db.transaction(async (tx) => {
                const pet = await tx.query.PetsTable.findFirst({
                    where: eq(PetsTable.ownerId, userId),
                });

                if (!pet) {
                    throw new Error('Pet not found');
                }

                if (!pet.sleepingSince) {
                    throw new Error('Tu mascota ya está despierta.');
                }

                // Calculate stats including sleep recovery
                const currentStats = this.calculateCurrentStats(
                    {
                        hunger: pet.hunger,
                        energy: pet.energy,
                        hygiene: pet.hygiene,
                        happiness: pet.happiness,
                    },
                    pet.lastInteraction,
                    pet.sleepingSince
                );

                // Wake up
                await tx.update(PetsTable)
                    .set({
                        hunger: currentStats.hunger,
                        energy: currentStats.energy,
                        hygiene: currentStats.hygiene,
                        happiness: currentStats.happiness,
                        lastInteraction: sql`current_timestamp`,
                        sleepingSince: null, // Clear sleeping status
                        updatedAt: sql`current_timestamp`,
                    })
                    .where(eq(PetsTable.ownerId, userId));

                return {
                    success: true,
                    newStats: {
                        hunger: currentStats.hunger,
                        energy: currentStats.energy,
                        hygiene: currentStats.hygiene,
                        happiness: currentStats.happiness,
                    },
                    isSleeping: false
                };
            });
        } catch (error) {
            console.error('Error waking pet:', error);
            throw error;
        }
    }

    /**
     * Purchase item from pet store
     */
    static async purchaseItem(userId: number, itemId: number, quantity: number = 1) {
        try {
            return await db.transaction(async (tx) => {
                // Get item from catalog
                const item = PET_ITEMS_CATALOG.find(i => i.id === itemId);

                if (!item) {
                    throw new Error('Item not found');
                }

                if (!item.isAvailable) {
                    throw new Error('Item is not available for purchase');
                }

                // Check if user already has the item if it's not consumable
                if (!item.isConsumable) {
                    const existingItem = await tx.query.PetUserInventoryTable.findFirst({
                        where: and(
                            eq(PetUserInventoryTable.userId, userId),
                            eq(PetUserInventoryTable.itemId, itemId)
                        ),
                    });

                    if (existingItem && existingItem.quantity > 0) {
                        throw new Error('Ya tienes este artículo cosmético');
                    }
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
            });

            // Manually join with the catalog
            const inventoryWithDetails = inventory.map(invItem => {
                const itemDetails = PET_ITEMS_CATALOG.find(catItem => catItem.id === invItem.itemId);
                return {
                    ...invItem,
                    item: itemDetails,
                };
            }).filter(invItem => invItem.item); // Filter out items that might not be in the catalog anymore

            return inventoryWithDetails;
        } catch (error) {
            console.error('Error getting user inventory:', error);
            throw new Error('Failed to retrieve inventory');
        }
    }

    /**
     * Get all available items in the store
     */
    static async getStoreItems(category?: PetItemCategory) {
        try {
            let items = PET_ITEMS_CATALOG.filter(item => item.isAvailable);

            if (category) {
                items = items.filter(item => item.category === category);
            }

            return items.sort((a, b) => {
                if (a.category < b.category) return -1;
                if (a.category > b.category) return 1;
                if (a.price < b.price) return -1;
                if (a.price > b.price) return 1;
                return 0;
            });
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

    /**
     * Equip an item (cosmetic)
     */
    static async equipItem(userId: number, itemId: number) {
        try {
            return await db.transaction(async (tx) => {
                // 1. Get item from catalog
                const item = PET_ITEMS_CATALOG.find(i => i.id === itemId);
                if (!item) {
                    throw new Error('Item not found in catalog');
                }

                // 2. Check if user owns the item
                const inventoryItem = await tx.query.PetUserInventoryTable.findFirst({
                    where: and(
                        eq(PetUserInventoryTable.userId, userId),
                        eq(PetUserInventoryTable.itemId, itemId)
                    ),
                });

                if (!inventoryItem || inventoryItem.quantity < 1) {
                    throw new Error('No tienes este item');
                }

                // 3. Check if item is equippable
                const equippableCategories: PetItemCategory[] = ['clothing', 'accessory', 'eyes', 'mouth', 'skin'];
                if (!equippableCategories.includes(item.category)) {
                    throw new Error('Este item no se puede equipar');
                }

                // 4. Get current pet
                const pet = await tx.query.PetsTable.findFirst({
                    where: eq(PetsTable.ownerId, userId),
                });

                if (!pet) {
                    throw new Error('Mascota no encontrada');
                }

                // 5. Update appearance
                const currentAppearance = pet.appearance as PetAppearance;
                const newAppearance = { ...currentAppearance };

                // Map category to appearance field
                // We assume item.iconUrl holds the sprite identifier or value
                switch (item.category) {
                    case 'clothing':
                        // Clothing changes color for now
                        if (item.iconUrl) newAppearance.color = item.iconUrl;
                        break;
                    case 'skin':
                        // Skin changes body shape (A, B, C, D, E, F)
                        if (item.iconUrl) newAppearance.skinId = item.iconUrl;
                        break;
                    case 'eyes':
                        if (item.iconUrl) newAppearance.eyesId = item.iconUrl;
                        break;
                    case 'mouth':
                        if (item.iconUrl) newAppearance.mouthId = item.iconUrl;
                        break;
                    case 'accessory':
                        // Check if it's a hat or general accessory
                        if (item.name.toLowerCase().includes('gorra') || item.name.toLowerCase().includes('sombrero') || item.name.toLowerCase().includes('corona')) {
                            newAppearance.hatId = item.iconUrl;
                        } else {
                            newAppearance.accessoryId = item.iconUrl;
                        }
                        break;
                }

                await tx.update(PetsTable)
                    .set({
                        appearance: newAppearance,
                        updatedAt: new Date(),
                    })
                    .where(eq(PetsTable.ownerId, userId));

                return { success: true, appearance: newAppearance };
            });
        } catch (error) {
            console.error('Error equipping item:', error);
            throw error;
        }
    }

    /**
     * Delete pet (bury)
     */
    static async deletePet(userId: number) {
        try {
            await db.delete(PetsTable).where(eq(PetsTable.ownerId, userId));
            // Also delete house
            await db.delete(PetHousesTable).where(eq(PetHousesTable.ownerId, userId));

            return { success: true };
        } catch (error) {
            console.error('Error deleting pet:', error);
            throw error;
        }
    }
}
