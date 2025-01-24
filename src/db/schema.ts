import { relations, sql } from "drizzle-orm";
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

/* 
    Tabla para mensajes anónimos de debate
    Hecho exclusivamente para el debate SaltoAwards del día Jueves 5 de Diciembre de 2024

    Se liga a la tabla de usuarios únicamente
    para posible limitación de mensajes por usuario
*/

export const DebateAnonymousMessagesTable = pgTable('debate_anonymous_messages', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => UsersTable.id),
    message: text('message').notNull(),
    approvedAt: timestamp('approved_at'),
    createdAt: timestamp('created_at').notNull().default(sql`current_timestamp`),
    updatedAt: timestamp('updated_at').notNull().default(sql`current_timestamp`),
})

export const debateMessagesUserRelation = relations(DebateAnonymousMessagesTable, ({ one, many }) => ({
    user: one(UsersTable, {
        fields: [DebateAnonymousMessagesTable.userId],
        references: [UsersTable.id],
    })
}))

export const userRelations = relations(UsersTable, ({ one, many }) => ({
    debateMessages: many(DebateAnonymousMessagesTable),
    streamerWarsPlayer: one(StreamerWarsPlayersTable, {
        fields: [UsersTable.id],
        references: [StreamerWarsPlayersTable.userId],
    }),
}))

export const StreamerWarsInscriptionsTable = pgTable('streamer_wars_inscriptions', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => UsersTable.id),
    discordUsername: varchar('discord_username'),
    acceptedTerms: boolean('accepted_terms').notNull().default(false),
    createdAt: timestamp('created_at').notNull().default(sql`current_timestamp`),
    updatedAt: timestamp('updated_at').notNull().default(sql`current_timestamp`),
}, (t) => ({
    uniqueUserId: unique().on(t.userId)
}))

export const streamerWarsRelations = relations(StreamerWarsInscriptionsTable, ({ one }) => ({
    user: one(UsersTable, {
        fields: [StreamerWarsInscriptionsTable.userId],
        references: [UsersTable.id],
    })
}))

export const StreamerWarsPlayersTable = pgTable('streamer_wars_players', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => UsersTable.id),
    playerNumber: integer('player_number').notNull(),
    eliminated: boolean('eliminated').notNull().default(false),
    createdAt: timestamp('created_at').notNull().default(sql`current_timestamp`),
    updatedAt: timestamp('updated_at').notNull().default(sql`current_timestamp`),
}, (t) => ({
    uniqueUserIdStreamerId: unique().on(t.userId, t.playerNumber)
}))

export const streamerWarsPlayersRelations = relations(StreamerWarsPlayersTable, ({ one }) => ({
    user: one(UsersTable, {
        fields: [StreamerWarsPlayersTable.userId],
        references: [UsersTable.id],
    })
}))

