import { sql } from "drizzle-orm";
import { boolean, integer, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";

export const UsersTable = pgTable("users", {
    id: serial("id").primaryKey(),
    email: varchar("email").unique().notNull(),
    twitchId: varchar("twitch_id").unique(),
    displayName: varchar("display_name").notNull(),
    username: varchar("username").notNull(),
    avatar: varchar("avatar"),
    twitchTier: integer("twitch_tier"),
    admin: boolean("admin").notNull().default(false),
    createdAt: timestamp("created_at")
        .notNull()
        .default(sql`current_timestamp`),
    updatedAt: timestamp("updated_at")
        .notNull()
        .default(sql`current_timestamp`),
});

