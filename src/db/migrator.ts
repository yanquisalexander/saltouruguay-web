import "dotenv/config";
import { client, pool } from "./client";
import { resolve } from "node:path";
import { migrate } from "drizzle-orm/postgres-js/migrator";

const __dirname = resolve();

export const migrateDatabase = async () => {
    await migrate(client, {
        migrationsFolder: resolve(__dirname, "./src/db/migrations"),
    });

    /* try {
      await seed();
    } catch (error) {
      console.error("Error seeding database", error);
    } */
};

/* 
  If executed as a script, this file will migrate the database. (ECMAScript module)
  Remember: require() is not available in ES modules.
*/

if (import.meta.url === `file://${process.argv[1]}`) {
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