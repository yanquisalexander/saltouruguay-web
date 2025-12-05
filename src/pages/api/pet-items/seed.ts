import { client as db } from "@/db/client";
import { PetItemsTable } from "@/db/schema";
import { petItemsSeeds } from "@/db/seeds/pet-items";
import type { APIContext } from "astro";
import { CRON_SECRET } from "astro:env/server";

/**
 * API endpoint to seed pet items
 * This can be called by an admin or via cron
 */
export const POST = async ({ request }: APIContext) => {
    try {
        const { secret } = await request.json() as { secret?: string };

        // Validate secret
        if (secret !== CRON_SECRET) {
            return new Response(
                JSON.stringify({ error: "Invalid secret" }),
                { status: 403 }
            );
        }

        // Check if items already exist
        const existingItems = await db.query.PetItemsTable.findMany();

        if (existingItems.length > 0) {
            return new Response(
                JSON.stringify({ 
                    message: "Pet items already seeded", 
                    count: existingItems.length 
                }),
                { 
                    status: 200,
                    headers: { "Content-Type": "application/json" }
                }
            );
        }

        // Insert all pet items
        await db.insert(PetItemsTable).values(petItemsSeeds);

        return new Response(
            JSON.stringify({ 
                message: "Pet items seeded successfully", 
                count: petItemsSeeds.length 
            }),
            { 
                status: 200,
                headers: { "Content-Type": "application/json" }
            }
        );
    } catch (error) {
        console.error("Error seeding pet items:", error);
        return new Response(
            JSON.stringify({ error: "Internal server error" }),
            { 
                status: 500,
                headers: { "Content-Type": "application/json" }
            }
        );
    }
};

/**
 * GET endpoint to check seed status
 */
export const GET = async () => {
    try {
        const items = await db.query.PetItemsTable.findMany();

        return new Response(
            JSON.stringify({ 
                itemsCount: items.length,
                seeded: items.length > 0 
            }),
            { 
                status: 200,
                headers: { "Content-Type": "application/json" }
            }
        );
    } catch (error) {
        console.error("Error checking pet items:", error);
        return new Response(
            JSON.stringify({ error: "Internal server error" }),
            { 
                status: 500,
                headers: { "Content-Type": "application/json" }
            }
        );
    }
};
