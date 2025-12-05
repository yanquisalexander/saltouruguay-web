import { client as db } from '@/db/client';
import {
    PetsTable,
    PetHousesTable,
    PetItemsTable,
    PetInventoryTable,
    PetVisitsTable,
    PetMiniGameSessionsTable,
    PetMiniGameLimitsTable,
    UsersTable
} from '@/db/schema';
import { eq, and, desc, sql, gte } from 'drizzle-orm';
import { BancoSaltanoService } from './banco-saltano';

export type PetStage = 'egg' | 'baby' | 'child' | 'teen' | 'adult';
export type PetItemType = 'food' | 'decoration' | 'clothing' | 'accessory' | 'toy';

interface PetStats {
    hunger: number;
    happiness: number;
    energy: number;
    hygiene: number;
}

interface PetAppearance {
    color: string;
    shape: string;
    accessories: string[];
    clothing: string[];
}

const STAT_DECAY_RATE = {
    hunger: 1, // per hour
    happiness: 0.5,
    energy: 0.8,
    hygiene: 0.6,
};

const EXPERIENCE_THRESHOLDS = {
    egg: 0,
    baby: 100,
    child: 300,
    teen: 600,
    adult: 1000,
};

const MAX_DAILY_MINIGAME_PLAYS = 5;

export class PetService {
    /**
     * Get or create user's pet
     */
    static async getOrCreatePet(userId: number) {
        try {
            let pet = await db.query.PetsTable.findFirst({
                where: eq(PetsTable.ownerId, userId),
            });

            if (!pet) {
                // Create new pet with default values
                const [newPet] = await db.insert(PetsTable).values({
                    ownerId: userId,
                    name: 'Mi Saltana',
                    appearance: {
                        color: '#FF6B6B',
                        shape: 'round',
                        accessories: [],
                        clothing: []
                    },
                    stats: {
                        hunger: 100,
                        happiness: 100,
                        energy: 100,
                        hygiene: 100
                    },
                    stage: 'egg',
                    experience: 0,
                }).returning();

                pet = newPet;

                // Also create house for the pet
                await db.insert(PetHousesTable).values({
                    ownerId: userId,
                    layout: {
                        wallpaper: 'default',
                        flooring: 'default',
                        theme: 'default'
                    },
                    items: []
                });
            }

            return pet;
        } catch (error) {
            console.error('Error getting/creating pet:', error);
            throw new Error('Failed to access pet');
        }
    }

    /**
     * Update pet stats based on time passed
     */
    static async updatePetStats(userId: number) {
        try {
            const pet = await db.query.PetsTable.findFirst({
                where: eq(PetsTable.ownerId, userId),
            });

            if (!pet) {
                throw new Error('Pet not found');
            }

            const now = new Date();
            const lastUpdated = new Date(pet.lastUpdated);
            const hoursPassed = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);

            if (hoursPassed < 0.1) {
                // Less than 6 minutes, no update needed
                return pet;
            }

            const currentStats = pet.stats as PetStats;
            const newStats: PetStats = {
                hunger: Math.max(0, currentStats.hunger - (STAT_DECAY_RATE.hunger * hoursPassed)),
                happiness: Math.max(0, currentStats.happiness - (STAT_DECAY_RATE.happiness * hoursPassed)),
                energy: Math.max(0, currentStats.energy - (STAT_DECAY_RATE.energy * hoursPassed)),
                hygiene: Math.max(0, currentStats.hygiene - (STAT_DECAY_RATE.hygiene * hoursPassed)),
            };

            const [updatedPet] = await db.update(PetsTable)
                .set({
                    stats: newStats,
                    lastUpdated: now,
                    updatedAt: now,
                })
                .where(eq(PetsTable.ownerId, userId))
                .returning();

            return updatedPet;
        } catch (error) {
            console.error('Error updating pet stats:', error);
            throw error;
        }
    }

    /**
     * Feed the pet
     */
    static async feedPet(userId: number, itemId?: number) {
        try {
            await this.updatePetStats(userId);

            const pet = await db.query.PetsTable.findFirst({
                where: eq(PetsTable.ownerId, userId),
            });

            if (!pet) {
                throw new Error('Pet not found');
            }

            let hungerRestore = 20;
            let happinessBoost = 5;
            let experienceGain = 5;

            // If using specific food item
            if (itemId) {
                const inventoryItem = await db.query.PetInventoryTable.findFirst({
                    where: and(
                        eq(PetInventoryTable.userId, userId),
                        eq(PetInventoryTable.itemId, itemId)
                    ),
                    with: {
                        item: true,
                    },
                });

                if (!inventoryItem || inventoryItem.quantity < 1) {
                    throw new Error('Item not found in inventory');
                }

                if (inventoryItem.item.type !== 'food') {
                    throw new Error('This item is not food');
                }

                const metadata = inventoryItem.item.metadata as any;
                hungerRestore = metadata?.hungerRestore || 30;
                happinessBoost = metadata?.happinessBoost || 10;
                experienceGain = metadata?.experienceGain || 10;

                // Consume the item
                if (inventoryItem.quantity === 1) {
                    await db.delete(PetInventoryTable)
                        .where(eq(PetInventoryTable.id, inventoryItem.id));
                } else {
                    await db.update(PetInventoryTable)
                        .set({ quantity: inventoryItem.quantity - 1 })
                        .where(eq(PetInventoryTable.id, inventoryItem.id));
                }
            }

            const currentStats = pet.stats as PetStats;
            const newStats: PetStats = {
                ...currentStats,
                hunger: Math.min(100, currentStats.hunger + hungerRestore),
                happiness: Math.min(100, currentStats.happiness + happinessBoost),
            };

            const newExperience = pet.experience + experienceGain;
            const newStage = this.calculateStage(newExperience);

            const [updatedPet] = await db.update(PetsTable)
                .set({
                    stats: newStats,
                    experience: newExperience,
                    stage: newStage,
                    lastFed: new Date(),
                    lastUpdated: new Date(),
                    updatedAt: new Date(),
                })
                .where(eq(PetsTable.ownerId, userId))
                .returning();

            return updatedPet;
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
            await this.updatePetStats(userId);

            const pet = await db.query.PetsTable.findFirst({
                where: eq(PetsTable.ownerId, userId),
            });

            if (!pet) {
                throw new Error('Pet not found');
            }

            const currentStats = pet.stats as PetStats;
            const newStats: PetStats = {
                ...currentStats,
                hygiene: 100,
                happiness: Math.min(100, currentStats.happiness + 10),
            };

            const newExperience = pet.experience + 5;
            const newStage = this.calculateStage(newExperience);

            const [updatedPet] = await db.update(PetsTable)
                .set({
                    stats: newStats,
                    experience: newExperience,
                    stage: newStage,
                    lastCleaned: new Date(),
                    lastUpdated: new Date(),
                    updatedAt: new Date(),
                })
                .where(eq(PetsTable.ownerId, userId))
                .returning();

            return updatedPet;
        } catch (error) {
            console.error('Error cleaning pet:', error);
            throw error;
        }
    }

    /**
     * Put pet to sleep
     */
    static async sleepPet(userId: number) {
        try {
            await this.updatePetStats(userId);

            const pet = await db.query.PetsTable.findFirst({
                where: eq(PetsTable.ownerId, userId),
            });

            if (!pet) {
                throw new Error('Pet not found');
            }

            const currentStats = pet.stats as PetStats;
            const newStats: PetStats = {
                ...currentStats,
                energy: 100,
                happiness: Math.min(100, currentStats.happiness + 10),
            };

            const newExperience = pet.experience + 5;
            const newStage = this.calculateStage(newExperience);

            const [updatedPet] = await db.update(PetsTable)
                .set({
                    stats: newStats,
                    experience: newExperience,
                    stage: newStage,
                    lastSlept: new Date(),
                    lastUpdated: new Date(),
                    updatedAt: new Date(),
                })
                .where(eq(PetsTable.ownerId, userId))
                .returning();

            return updatedPet;
        } catch (error) {
            console.error('Error putting pet to sleep:', error);
            throw error;
        }
    }

    /**
     * Update pet appearance
     */
    static async updateAppearance(userId: number, appearance: Partial<PetAppearance>) {
        try {
            const pet = await db.query.PetsTable.findFirst({
                where: eq(PetsTable.ownerId, userId),
            });

            if (!pet) {
                throw new Error('Pet not found');
            }

            const currentAppearance = pet.appearance as PetAppearance;
            const newAppearance = {
                ...currentAppearance,
                ...appearance,
            };

            const [updatedPet] = await db.update(PetsTable)
                .set({
                    appearance: newAppearance,
                    updatedAt: new Date(),
                })
                .where(eq(PetsTable.ownerId, userId))
                .returning();

            return updatedPet;
        } catch (error) {
            console.error('Error updating pet appearance:', error);
            throw error;
        }
    }

    /**
     * Calculate pet stage based on experience
     */
    private static calculateStage(experience: number): PetStage {
        if (experience >= EXPERIENCE_THRESHOLDS.adult) return 'adult';
        if (experience >= EXPERIENCE_THRESHOLDS.teen) return 'teen';
        if (experience >= EXPERIENCE_THRESHOLDS.child) return 'child';
        if (experience >= EXPERIENCE_THRESHOLDS.baby) return 'baby';
        return 'egg';
    }

    /**
     * Get available pet items (shop)
     */
    static async getShopItems(type?: PetItemType) {
        try {
            const items = await db.query.PetItemsTable.findMany({
                where: type
                    ? and(
                        eq(PetItemsTable.type, type),
                        eq(PetItemsTable.isAvailable, true)
                    )
                    : eq(PetItemsTable.isAvailable, true),
                orderBy: [PetItemsTable.type, PetItemsTable.price],
            });

            return items;
        } catch (error) {
            console.error('Error getting shop items:', error);
            throw new Error('Failed to retrieve shop items');
        }
    }

    /**
     * Purchase pet item
     */
    static async purchaseItem(userId: number, itemId: number) {
        try {
            return await db.transaction(async (tx) => {
                // Get item details
                const item = await tx.query.PetItemsTable.findFirst({
                    where: eq(PetItemsTable.id, itemId),
                });

                if (!item) {
                    throw new Error('Item not found');
                }

                if (!item.isAvailable) {
                    throw new Error('Item not available');
                }

                // Process purchase through Banco Saltano
                await BancoSaltanoService.createTransaction({
                    userId,
                    type: 'purchase',
                    amount: item.price,
                    description: `Compra: ${item.name}`,
                    metadata: {
                        itemId: item.id,
                        itemName: item.name,
                        itemType: item.type,
                        source: 'pet_shop',
                    },
                });

                // Add to inventory
                const existingItem = await tx.query.PetInventoryTable.findFirst({
                    where: and(
                        eq(PetInventoryTable.userId, userId),
                        eq(PetInventoryTable.itemId, itemId)
                    ),
                });

                if (existingItem) {
                    await tx.update(PetInventoryTable)
                        .set({ quantity: existingItem.quantity + 1 })
                        .where(eq(PetInventoryTable.id, existingItem.id));
                } else {
                    await tx.insert(PetInventoryTable).values({
                        userId,
                        itemId,
                        quantity: 1,
                    });
                }

                return { success: true, item };
            });
        } catch (error) {
            console.error('Error purchasing item:', error);
            throw error;
        }
    }

    /**
     * Get user's pet inventory
     */
    static async getInventory(userId: number) {
        try {
            const inventory = await db.query.PetInventoryTable.findMany({
                where: eq(PetInventoryTable.userId, userId),
                with: {
                    item: true,
                },
                orderBy: [desc(PetInventoryTable.purchasedAt)],
            });

            return inventory;
        } catch (error) {
            console.error('Error getting inventory:', error);
            throw new Error('Failed to retrieve inventory');
        }
    }

    /**
     * Get or create pet house
     */
    static async getOrCreateHouse(userId: number) {
        try {
            let house = await db.query.PetHousesTable.findFirst({
                where: eq(PetHousesTable.ownerId, userId),
            });

            if (!house) {
                const [newHouse] = await db.insert(PetHousesTable).values({
                    ownerId: userId,
                    layout: {
                        wallpaper: 'default',
                        flooring: 'default',
                        theme: 'default'
                    },
                    items: []
                }).returning();

                house = newHouse;
            }

            return house;
        } catch (error) {
            console.error('Error getting/creating house:', error);
            throw new Error('Failed to access house');
        }
    }

    /**
     * Update house layout and items
     */
    static async updateHouse(userId: number, layout?: any, items?: any[]) {
        try {
            const house = await db.query.PetHousesTable.findFirst({
                where: eq(PetHousesTable.ownerId, userId),
            });

            if (!house) {
                throw new Error('House not found');
            }

            const updateData: any = {
                updatedAt: new Date(),
            };

            if (layout) {
                updateData.layout = { ...house.layout, ...layout };
            }

            if (items !== undefined) {
                updateData.items = items;
            }

            const [updatedHouse] = await db.update(PetHousesTable)
                .set(updateData)
                .where(eq(PetHousesTable.ownerId, userId))
                .returning();

            return updatedHouse;
        } catch (error) {
            console.error('Error updating house:', error);
            throw error;
        }
    }

    /**
     * Visit another user's pet
     */
    static async visitPet(visitorId: number, ownerId: number) {
        try {
            const owner = await db.query.UsersTable.findFirst({
                where: eq(UsersTable.id, ownerId),
            });

            if (!owner) {
                throw new Error('User not found');
            }

            const pet = await this.getOrCreatePet(ownerId);
            const house = await this.getOrCreateHouse(ownerId);

            // Record visit
            await db.insert(PetVisitsTable).values({
                visitorId,
                ownerId,
                likeGiven: false,
            });

            return { pet, house, owner };
        } catch (error) {
            console.error('Error visiting pet:', error);
            throw error;
        }
    }

    /**
     * Leave a like on a pet
     */
    static async leaveLike(visitorId: number, ownerId: number) {
        try {
            // Check if already liked recently (last 24 hours)
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            const recentVisit = await db.query.PetVisitsTable.findFirst({
                where: and(
                    eq(PetVisitsTable.visitorId, visitorId),
                    eq(PetVisitsTable.ownerId, ownerId),
                    eq(PetVisitsTable.likeGiven, true),
                    gte(PetVisitsTable.createdAt, yesterday)
                ),
            });

            if (recentVisit) {
                throw new Error('Already liked this pet today');
            }

            await db.insert(PetVisitsTable).values({
                visitorId,
                ownerId,
                likeGiven: true,
            });

            // Give small reward to owner
            await BancoSaltanoService.createTransaction({
                userId: ownerId,
                type: 'game_reward',
                amount: 5,
                description: 'Like recibido en tu Mascota Saltana',
                metadata: { source: 'pet_like', visitorId },
            });

            return { success: true };
        } catch (error) {
            console.error('Error leaving like:', error);
            throw error;
        }
    }

    /**
     * Check minigame daily limit
     */
    static async canPlayMinigame(userId: number, gameName: string) {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            let limit = await db.query.PetMiniGameLimitsTable.findFirst({
                where: and(
                    eq(PetMiniGameLimitsTable.userId, userId),
                    eq(PetMiniGameLimitsTable.gameName, gameName)
                ),
            });

            if (!limit) {
                // Create new limit record
                await db.insert(PetMiniGameLimitsTable).values({
                    userId,
                    gameName,
                    playsToday: 0,
                    lastPlayDate: today,
                });
                return { canPlay: true, playsRemaining: MAX_DAILY_MINIGAME_PLAYS };
            }

            const lastPlayDate = new Date(limit.lastPlayDate);
            lastPlayDate.setHours(0, 0, 0, 0);

            // Reset if it's a new day
            if (lastPlayDate < today) {
                await db.update(PetMiniGameLimitsTable)
                    .set({
                        playsToday: 0,
                        lastPlayDate: today,
                        updatedAt: new Date(),
                    })
                    .where(eq(PetMiniGameLimitsTable.id, limit.id));
                return { canPlay: true, playsRemaining: MAX_DAILY_MINIGAME_PLAYS };
            }

            const playsRemaining = MAX_DAILY_MINIGAME_PLAYS - limit.playsToday;
            return {
                canPlay: playsRemaining > 0,
                playsRemaining: Math.max(0, playsRemaining),
            };
        } catch (error) {
            console.error('Error checking minigame limit:', error);
            throw error;
        }
    }

    /**
     * Record minigame session and reward
     */
    static async recordMinigameSession(userId: number, gameName: string, score: number) {
        try {
            const limitCheck = await this.canPlayMinigame(userId, gameName);
            
            if (!limitCheck.canPlay) {
                throw new Error('Daily limit reached for this game');
            }

            // Calculate reward based on score
            const coinsEarned = Math.min(50, Math.floor(score / 10));

            return await db.transaction(async (tx) => {
                // Record session
                await tx.insert(PetMiniGameSessionsTable).values({
                    userId,
                    gameName,
                    score,
                    coinsEarned,
                });

                // Update play limit
                await tx
                    .update(PetMiniGameLimitsTable)
                    .set({
                        playsToday: sql`${PetMiniGameLimitsTable.playsToday} + 1`,
                        updatedAt: new Date(),
                    })
                    .where(and(
                        eq(PetMiniGameLimitsTable.userId, userId),
                        eq(PetMiniGameLimitsTable.gameName, gameName)
                    ));

                // Award coins if earned
                if (coinsEarned > 0) {
                    await BancoSaltanoService.createTransaction({
                        userId,
                        type: 'game_reward',
                        amount: coinsEarned,
                        description: `Recompensa de ${gameName}`,
                        metadata: {
                            source: 'pet_minigame',
                            gameName,
                            score,
                        },
                    });
                }

                // Add experience to pet
                const pet = await tx.query.PetsTable.findFirst({
                    where: eq(PetsTable.ownerId, userId),
                });

                if (pet) {
                    const newExperience = pet.experience + Math.floor(score / 20);
                    const newStage = this.calculateStage(newExperience);

                    await tx.update(PetsTable)
                        .set({
                            experience: newExperience,
                            stage: newStage,
                            updatedAt: new Date(),
                        })
                        .where(eq(PetsTable.ownerId, userId));
                }

                return { coinsEarned, playsRemaining: limitCheck.playsRemaining - 1 };
            });
        } catch (error) {
            console.error('Error recording minigame session:', error);
            throw error;
        }
    }

    /**
     * Get pet stats summary
     */
    static async getPetSummary(userId: number) {
        try {
            const pet = await this.getOrCreatePet(userId);
            await this.updatePetStats(userId);
            
            const updatedPet = await db.query.PetsTable.findFirst({
                where: eq(PetsTable.ownerId, userId),
            });

            const house = await this.getOrCreateHouse(userId);
            const inventory = await this.getInventory(userId);

            return {
                pet: updatedPet,
                house,
                inventoryCount: inventory.length,
            };
        } catch (error) {
            console.error('Error getting pet summary:', error);
            throw error;
        }
    }
}
