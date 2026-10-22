import "dotenv/config";
import { spawnSync } from "node:child_process";
import { seed } from "./seed";

function runDrizzleMigrate() {
  const result = spawnSync("drizzle-kit", ["migrate"], {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });

  if (result.status !== 0) {
    throw new Error(
      "drizzle-kit migrate fallo con codigo " + (result.status ?? "desconocido")
    );
  }
}

export const migrateDatabase = async () => {
  runDrizzleMigrate();

  try {
    await seed();
  } catch (error) {
    console.error("Error seeding database", error);
  }
};

migrateDatabase()
  .then(() => {
    console.log("Database migrated successfully");
  })
  .catch((err) => {
    console.error("Error migrating database", err);
    process.exit(1);
  });