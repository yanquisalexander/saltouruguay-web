import { AppDataSource } from "../db/data-source";

export default function migrateDatabaseIntegration() {
    return {
        name: "migrate-database-integration",
        hooks: {
            "astro:build:done": async () => {
                try {
                    console.log("Starting TypeORM database initialization...");
                    if (!AppDataSource.isInitialized) {
                        await AppDataSource.initialize();
                    }
                    // TypeORM with synchronize: true will automatically sync the schema
                    console.log("Database initialized successfully.");
                } catch (error) {
                    console.error("Error during database initialization:", error);
                    throw error; // Re-throw the error if you want to fail the build process
                }
            },
        },
    };
}