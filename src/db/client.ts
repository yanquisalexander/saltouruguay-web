import "dotenv/config";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

const {
    DB_HOST,
    DB_PORT = "5432",
    DB_USER,
    DB_PASSWORD = "",
    DB_NAME,
    DB_SSL,
} = process.env;

const sslMode = DB_SSL === "true" ? "require" : "disable";

const DATABASE_URL =
    process.env.DATABASE_URL ??
    `postgresql://${encodeURIComponent(process.env.DB_USER!)}:${encodeURIComponent(process.env.DB_PASSWORD ?? "")}@${process.env.DB_HOST}:${process.env.DB_PORT ?? "5432"}/${process.env.DB_NAME}?sslmode=${process.env.DB_SSL === "true" ? "require" : "disable"}`;

const sql = neon(DATABASE_URL);

export const client = drizzle(sql, { schema });