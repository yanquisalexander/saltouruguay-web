import "reflect-metadata";
import { DataSource } from "typeorm";
import "dotenv/config";

export const AppDataSource = new DataSource({
    type: "postgres",
    url: process.env.DATABASE_URL,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === "true" ? true : false,
    entities: [__dirname + "/entities/*.{ts,js}"],
    synchronize: true,
    logging: false,
});
