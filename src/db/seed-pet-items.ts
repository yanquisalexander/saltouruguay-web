import { client as db } from './client';
import { PetItemsTable } from './schema';
import { petItemsSeeds } from './seeds/pet-items';

async function seedPetItems() {
    try {
        console.log('🌱 Seeding pet items...');

        // Check if items already exist
        const existingItems = await db.query.PetItemsTable.findMany();
        
        if (existingItems.length > 0) {
            console.log('⚠️  Pet items already seeded. Skipping...');
            return;
        }

        // Insert all pet items
        await db.insert(PetItemsTable).values(petItemsSeeds);

        console.log(`✅ Successfully seeded ${petItemsSeeds.length} pet items`);
    } catch (error) {
        console.error('❌ Error seeding pet items:', error);
        throw error;
    } finally {
        process.exit(0);
    }
}

seedPetItems();
