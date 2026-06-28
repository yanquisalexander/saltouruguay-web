import "dotenv/config";

import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;
const isNeon = !!process.env.DATABASE_URL;

const sql = isNeon
    ? neon(process.env.DATABASE_URL!)
    : undefined;

const pool = !isNeon
    ? new Pool({
        host: process.env.DB_HOST || "localhost",
        port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD || "postgres",
        database: process.env.DB_NAME || "postgres",
        ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
    })
    : undefined;

export const client = isNeon
    ? drizzleNeon(sql!, { schema })
    : drizzlePg(pool!, { schema });