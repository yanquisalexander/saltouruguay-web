import "dotenv/config";
import { client, pool } from "./client";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { seed } from "./seed";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const migrateDatabase = async () => {
  await migrate(client, {
    migrationsFolder: resolve(__dirname, "./migrations"),
  });

  try {
    await seed();
  } catch (error) {
    console.error("Error seeding database", error);
  }
};

// Permite ejecutar el script con: node, yarn node, npm run, pnpm exec, etc.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  migrateDatabase()
    .then(() => {
      console.log("Database migrated successfully");
      pool.end();
    })
    .catch((err) => {
      console.error("Error migrating database", err);
      pool.end();
    });
}