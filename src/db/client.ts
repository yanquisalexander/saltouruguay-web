import "reflect-metadata";
import "dotenv/config";
import { AppDataSource } from "./data-source";

// Initialize the TypeORM data source
let isInitialized = false;

export const initializeDatabase = async () => {
    if (!isInitialized) {
        await AppDataSource.initialize();
        isInitialized = true;
        console.log("Database connection initialized");
    }
    return AppDataSource;
};

// Export AppDataSource as client for compatibility
export const client = AppDataSource;

// Auto-initialize when importing
initializeDatabase().catch(console.error);