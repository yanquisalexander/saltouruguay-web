import { sql } from "drizzle-orm";
import { boolean, integer, pgEnum, pgTable, serial, text, timestamp, unique, varchar } from "drizzle-orm/pg-core";

export const UsersTable = pgTable("users", {
    id: serial("id").primaryKey(),
    email: varchar("email").unique().notNull(),
    twitchId: varchar("twitch_id").unique(),
    displayName: varchar("display_name").notNull(),
    username: varchar("username").notNull(),
    avatar: varchar("avatar"),
    twitchTier: integer("twitch_tier"),
    discordId: varchar("discord_id").unique(),
    admin: boolean("admin").notNull().default(false),
    playedSystemCinematics: text("played_system_cinematics").array().default([]),
    coins: integer("coins").notNull().default(0),
    createdAt: timestamp("created_at")
        .notNull()
        .default(sql`current_timestamp`),
    updatedAt: timestamp("updated_at")
        .notNull()
        .default(sql`current_timestamp`),
});

export const VotesTable = pgTable("votes", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => UsersTable.id),
    nomineeId: text("nominee_id").notNull(),
    categoryId: text("category_id").notNull(),
    ranking: integer("ranking").notNull(),
    createdAt: timestamp("created_at")
        .notNull()
        .default(sql`current_timestamp`),
    updatedAt: timestamp("updated_at")
        .notNull()
        .default(sql`current_timestamp`),
}, (t) => ({
    uniqueUserIdNomineeIdCategoryId: unique().on(t.userId, t.nomineeId, t.categoryId),
})
)

export const MemberCards = pgTable("member_cards", {
    userId: varchar("user_id").primaryKey(),
    stickers: text("stickers").array().notNull(),
    skin: varchar("skin").notNull().default("classic"),
    updatedAt: timestamp("updated_at")
        .notNull()
        .default(sql`current_timestamp`),
});

export const AchievementsTable = pgTable('achievements', {
    achievementId: text('achievement_id').primaryKey(),
    createdAt: text('created_at'),
    updatedAt: text('updated_at'),

})

export const UserAchievementsTable = pgTable('user_achievements', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => UsersTable.id),
    achievementId: text('achievement_id').references(() => AchievementsTable.achievementId),
    unlockedAt: timestamp('unlocked_at').notNull().default(sql`current_timestamp`),
}, (t) => ({
    uniqueUserAchievement: unique().on(t.userId, t.achievementId)
}));

export const LOANS_STATUS = pgEnum('status', ['pending', 'repaid', 'defaulted'])

export const LoansTable = pgTable('loans', {
    id: serial('id').primaryKey(),
    lenderId: integer('lender_id').references(() => UsersTable.id),
    borrowerId: integer('borrower_id').references(() => UsersTable.id),
    amount: integer('amount').notNull(),
    dueDate: timestamp('due_date').notNull(),
    status: LOANS_STATUS('status').notNull().default('pending'),
    createdAt: timestamp('created_at').notNull().default(sql`current_timestamp`),
    updatedAt: timestamp('updated_at').notNull().default(sql`current_timestamp`),
})