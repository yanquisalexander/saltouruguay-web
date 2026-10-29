import { migrateDatabase } from "../db/migrator";

export default function migrateDatabaseIntegration() {
    return {
        name: "migrate-database-integration",
        hooks: {
            "astro:build:done": async () => {
                if (import.meta.env.DEV) {
                    console.log("Skipping database migration in development mode.");
                    return;
                }
                try {
                    console.log("Starting database migration...");
                    await migrateDatabase();
                    console.log("Database migration completed successfully.");
                } catch (error) {
                    console.error("Error during database migration:", error);
                    throw error; // Re-throw the error if you want to fail the build process
                }
            },
        },
    };
}