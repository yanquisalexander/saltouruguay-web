import { CATEGORIES } from "@/awards/Categories";
import { NOMINEES } from "@/awards/Nominees";
import cacheService from "@/services/cache";
import { calculateVotes, createGroupedVotes } from "@/utils/awards-vote-system";
import type { APIContext } from "astro";
import { CRON_SECRET } from "astro:env/server";

/* 
    This is an Endpoint called by http-cron to execute "cron jobs" on the server.
*/

export const POST = async ({ request }: APIContext) => {
    const TASKS = [
        "calculate-votes",
        "update-pet-stats",
    ] as const;

    try {
        // Parse the request JSON
        const { secret, task } = await request.json() as {
            secret: string | undefined;
            task: typeof TASKS[number] | undefined;
        };

        // Validate the secret
        if (secret !== CRON_SECRET) {
            return new Response("Cannot execute cron jobs: invalid secret", { status: 400 });
        }

        // Validate the task
        if (!task) {
            return new Response("Cannot execute cron jobs: missing task", { status: 400 });
        }

        if (!TASKS.includes(task)) {
            return new Response("Cannot execute cron jobs: invalid task", { status: 400 });
        }

        switch (task) {
            case "calculate-votes":
                console.log("Calculating votes...");

                // Execute vote calculation
                const calculatedVotes = await calculateVotes();

                const groupedVotes = createGroupedVotes({ calculatedVotes });


                const cache = cacheService.create({ ttl: 60 * 60 * 48 /* 48 hours */ });
                await cache.delete("calculatedVotes"); // Clear the cache before setting the new value

                await cache.set("calculatedVotes", groupedVotes);

                break;

            case "update-pet-stats":
                console.log("Updating pet stats...");
                
                // Import PetService dynamically to avoid circular dependencies
                const { PetService } = await import("@/services/pet-service");
                const { client } = await import("@/db/client");
                const { PetsTable } = await import("@/db/schema");
                
                // Get all pets
                const pets = await client.query.PetsTable.findMany();
                
                let updatedCount = 0;
                for (const pet of pets) {
                    try {
                        await PetService.updatePetStats(pet.ownerId);
                        updatedCount++;
                    } catch (error) {
                        console.error(`Error updating pet stats for user ${pet.ownerId}:`, error);
                    }
                }
                
                console.log(`Updated stats for ${updatedCount} pets`);
                break;

            default:
                return new Response(`Task "${task}" not implemented`, { status: 400 });
        }

        return new Response("OK", { status: 200 });

    } catch (error) {
        console.error("Error executing cron job:", error);
        return new Response("Internal server error", { status: 500 });
    }
};
