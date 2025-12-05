import { client } from '../client';
import { PetItemsTable } from '../schema';

/**
 * Seed initial pet items for the store
 */
export async function seedPetItems() {
    console.log('Seeding pet items...');

    const items = [
        // Food items
        {
            name: 'Manzana',
            description: 'Una manzana fresca y jugosa',
            category: 'food' as const,
            rarity: 'common' as const,
            price: 10,
            effectValue: 15,
            isConsumable: true,
            isAvailable: true,
        },
        {
            name: 'Sandwich',
            description: 'Un delicioso sandwich',
            category: 'food' as const,
            rarity: 'common' as const,
            price: 20,
            effectValue: 25,
            isConsumable: true,
            isAvailable: true,
        },
        {
            name: 'Pizza',
            description: 'Una pizza con mucho queso',
            category: 'food' as const,
            rarity: 'uncommon' as const,
            price: 50,
            effectValue: 40,
            isConsumable: true,
            isAvailable: true,
        },
        {
            name: 'Asado Completo',
            description: 'El mejor asado uruguayo',
            category: 'food' as const,
            rarity: 'rare' as const,
            price: 100,
            effectValue: 60,
            isConsumable: true,
            isAvailable: true,
        },
        {
            name: 'Chivito',
            description: 'El chivito más grande que jamás hayas visto',
            category: 'food' as const,
            rarity: 'epic' as const,
            price: 200,
            effectValue: 80,
            isConsumable: true,
            isAvailable: true,
        },

        // Toy items
        {
            name: 'Pelota',
            description: 'Una pelota para jugar',
            category: 'toy' as const,
            rarity: 'common' as const,
            price: 30,
            effectValue: 10,
            isConsumable: false,
            isAvailable: true,
        },
        {
            name: 'Frisbee',
            description: 'Un frisbee volador',
            category: 'toy' as const,
            rarity: 'uncommon' as const,
            price: 60,
            effectValue: 15,
            isConsumable: false,
            isAvailable: true,
        },
        {
            name: 'Consola de Videojuegos',
            description: 'Para jugar a los mejores juegos',
            category: 'toy' as const,
            rarity: 'rare' as const,
            price: 150,
            effectValue: 25,
            isConsumable: false,
            isAvailable: true,
        },

        // Furniture items
        {
            name: 'Silla',
            description: 'Una silla cómoda',
            category: 'furniture' as const,
            rarity: 'common' as const,
            price: 40,
            effectValue: 0,
            isConsumable: false,
            isAvailable: true,
        },
        {
            name: 'Mesa',
            description: 'Una mesa de madera',
            category: 'furniture' as const,
            rarity: 'common' as const,
            price: 60,
            effectValue: 0,
            isConsumable: false,
            isAvailable: true,
        },
        {
            name: 'Sofá',
            description: 'Un sofá muy cómodo',
            category: 'furniture' as const,
            rarity: 'uncommon' as const,
            price: 120,
            effectValue: 0,
            isConsumable: false,
            isAvailable: true,
        },
        {
            name: 'TV Plasma',
            description: 'Una TV de última generación',
            category: 'furniture' as const,
            rarity: 'rare' as const,
            price: 250,
            effectValue: 0,
            isConsumable: false,
            isAvailable: true,
        },

        // Clothing items
        {
            name: 'Camiseta Salto',
            description: 'La camiseta oficial de Salto',
            category: 'clothing' as const,
            rarity: 'uncommon' as const,
            price: 100,
            effectValue: 0,
            isConsumable: false,
            isAvailable: true,
        },
        {
            name: 'Traje de Gala',
            description: 'Para las ocasiones especiales',
            category: 'clothing' as const,
            rarity: 'epic' as const,
            price: 300,
            effectValue: 0,
            isConsumable: false,
            isAvailable: true,
        },

        // Accessory items
        {
            name: 'Gorra',
            description: 'Una gorra cool',
            category: 'accessory' as const,
            rarity: 'common' as const,
            price: 50,
            effectValue: 0,
            isConsumable: false,
            isAvailable: true,
        },
        {
            name: 'Lentes de Sol',
            description: 'Para lucir con estilo',
            category: 'accessory' as const,
            rarity: 'uncommon' as const,
            price: 80,
            effectValue: 0,
            isConsumable: false,
            isAvailable: true,
        },
        {
            name: 'Corona Dorada',
            description: 'Solo para los más pudientes',
            category: 'accessory' as const,
            rarity: 'legendary' as const,
            price: 500,
            effectValue: 0,
            isConsumable: false,
            isAvailable: true,
        },
    ];

    try {
        for (const item of items) {
            await client.insert(PetItemsTable).values(item).onConflictDoNothing();
        }
        console.log(`✅ Seeded ${items.length} pet items`);
    } catch (error) {
        console.error('Error seeding pet items:', error);
        throw error;
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    seedPetItems()
        .then(() => {
            console.log('✅ Pet items seeded successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Failed to seed pet items:', error);
            process.exit(1);
        });
}
