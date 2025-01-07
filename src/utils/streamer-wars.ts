import { client } from "@/db/client";
import { StreamerWarsInscriptionsTable } from "@/db/schema";
import { eq, or } from "drizzle-orm";

export const getCurrentInscriptions = async () => {
    return await client.query.StreamerWarsInscriptionsTable.findMany({
        with: {
            user: {
                columns: {
                    displayName: true,
                    avatar: true,
                    discordId: true,
                }
            }
        }
    })
}