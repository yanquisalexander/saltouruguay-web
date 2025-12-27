import { TournamentMatchStatus, TournamentParticipantStatus, TournamentStatus, TournamentType } from "../consts/Torneos";
import { relations, sql } from "drizzle-orm";
import { boolean, integer, jsonb, pgEnum, pgTable, serial, text, timestamp, unique, uuid, varchar, type AnyPgColumn } from "drizzle-orm/pg-core";

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
    twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
    twoFactorSecret: varchar("two_factor_secret"),
    twoFactorRecoveryCodes: text("two_factor_recovery_codes").array(),
    createdAt: timestamp("created_at")
        .notNull()
        .default(sql`current_timestamp`),
    updatedAt: timestamp("updated_at")
        .notNull()
        .default(sql`current_timestamp`),
});

export const UserSuspensionsTable = pgTable("user_suspensions", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => UsersTable.id),
    reason: text("reason").notNull(),
    startDate: timestamp("start_date").notNull().default(sql`current_timestamp`),
    endDate: timestamp("end_date"),
    appealDate: timestamp("appeal_date"),
    appealMessage: text("appeal_message"),
    status: text("status").notNull().default("active"),
}, (t) => ({
    uniqueUserId: unique().on(t.userId)
}))

export const SessionsTable = pgTable("sessions", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => UsersTable.id),
    sessionId: varchar("session_id").notNull().unique(),
    userAgent: text("user_agent").notNull(),
    ip: text("ip").notNull(),
    lastActivity: timestamp("last_activity"),
    twoFactorVerified: boolean("two_factor_verified").notNull().default(false),
    createdAt: timestamp("created_at")
        .notNull()
        .default(sql`current_timestamp`),
    updatedAt: timestamp("updated_at")
        .notNull()
        .default(sql`current_timestamp`),
});

export const SaltoTagsTable = pgTable("salto_tags", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => UsersTable.id, { onDelete: "cascade" }),
    saltoTag: varchar("salto_tag").unique().notNull(), // El nombre del SaltoTag
    discriminator: varchar("discriminator").notNull(), // El número del SaltoTag
    /* alexitoo_uy#5190 for example */
    avatar: varchar("avatar"), // Avatar de la plataforma (opcional)
    totalXP: integer("total_xp").notNull().default(0),
    createdAt: timestamp("created_at").notNull().default(sql`current_timestamp`),
    updatedAt: timestamp("updated_at").notNull().default(sql`current_timestamp`),
});

export const SaltoPlayDevelopersTable = pgTable("salto_play_developers", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: integer("user_id")
        .notNull()
        .unique()
        .references(() => UsersTable.id, { onDelete: "cascade" }),
    developerName: varchar("developer_name").notNull(),
    developerUrl: varchar("developer_url").notNull(),
    createdAt: timestamp("created_at").notNull().default(sql`current_timestamp`),
    updatedAt: timestamp("updated_at").notNull().default(sql`current_timestamp`),
});

export const SaltoPlayGamesTable = pgTable("salto_play_games", {
    /* 
        id is the client id for the game
    */
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name").unique().notNull(),
    description: text("description"),
    developerId: uuid("developer_id")
        .notNull()
        .references(() => SaltoPlayDevelopersTable.id, { onDelete: "cascade" }),
    icon: varchar("icon"),
    url: varchar("url"),
    status: varchar("status", { enum: ["pending", "approved", "banned"] }).notNull().default("pending"),
    clientSecret: varchar("client_secret").notNull(),
    redirectUri: varchar("redirect_uri").notNull(),
    createdAt: timestamp("created_at").notNull().default(sql`current_timestamp`),
    updatedAt: timestamp("updated_at").notNull().default(sql`current_timestamp`),
});

export const SaltoPlayGameTokensTable = pgTable("salto_play_game_tokens", {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
        .notNull()
        .references(() => SaltoPlayGamesTable.id, { onDelete: "cascade" }),
    userId: integer("user_id")
        .notNull()
        .references(() => UsersTable.id, { onDelete: "cascade" }),
    accessToken: varchar("access_token").notNull().unique(), // Se almacena cifrado
    refreshToken: varchar("refresh_token").notNull().unique(), // Se almacena cifrado
    scopes: varchar("scopes").notNull(), // Lista de permisos asignados al token
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().default(sql`current_timestamp`),
    updatedAt: timestamp("updated_at").notNull().default(sql`current_timestamp`),
}, (table) => {
    return {
        gameIndex: unique("game_user_idx").on(table.gameId, table.userId),
    };
});

export const SaltoPlayAuthorizationCodesTable = pgTable("salto_play_authorization_codes", {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
        .notNull()
        .references(() => SaltoPlayGamesTable.id, { onDelete: "cascade" }),
    userId: integer("user_id")
        .notNull()
        .references(() => UsersTable.id, { onDelete: "cascade" }),
    code: varchar("code").unique().notNull(),
    scopes: varchar("scopes").notNull(),
    redirectUri: varchar("redirect_uri").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().default(sql`current_timestamp`),
});

export const SaltoPlayAchievementsTable = pgTable("salto_play_achievements", {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
        .notNull()
        .references(() => SaltoPlayGamesTable.id, { onDelete: "cascade" }),
    name: varchar("name").notNull(),
    description: text("description"),
    icon: varchar("icon"),
    xpReward: integer("xp_reward").notNull().default(100),
    createdAt: timestamp("created_at").notNull().default(sql`current_timestamp`),
    updatedAt: timestamp("updated_at").notNull().default(sql`current_timestamp`),
});

export const SaltoTagAchievementsTable = pgTable("salto_tag_achievements", {
    id: uuid("id").primaryKey().defaultRandom(),
    saltoTagId: integer("salto_tag_id")
        .notNull()
        .references(() => SaltoTagsTable.id, { onDelete: "cascade" }),
    achievementId: uuid("achievement_id")
        .notNull()
        .references(() => SaltoPlayAchievementsTable.id, { onDelete: "cascade" }),
    unlockedAt: timestamp("unlocked_at").notNull().default(sql`current_timestamp`),
});

/* 
    SaltoPlay Relations
*/

export const saltoPlayGameTokensRelations = relations(SaltoPlayGameTokensTable, ({ one }) => ({
    game: one(SaltoPlayGamesTable, {
        fields: [SaltoPlayGameTokensTable.gameId],
        references: [SaltoPlayGamesTable.id],
    }),
    user: one(UsersTable, {
        fields: [SaltoPlayGameTokensTable.userId],
        references: [UsersTable.id],
    }),
}));

export const saltoPlayGamesRelations = relations(SaltoPlayGamesTable, ({ one, many }) => ({
    developer: one(SaltoPlayDevelopersTable, {
        fields: [SaltoPlayGamesTable.developerId],
        references: [SaltoPlayDevelopersTable.id],
    }),
    tokens: many(SaltoPlayGameTokensTable),
    achievements: many(SaltoPlayAchievementsTable),
}));

export const saltoPlayDevelopersRelations = relations(SaltoPlayDevelopersTable, ({ one, many }) => ({
    user: one(UsersTable, {
        fields: [SaltoPlayDevelopersTable.userId],
        references: [UsersTable.id],
    }),
    games: many(SaltoPlayGamesTable),
}));

export const saltoPlayAchievementsRelations = relations(SaltoPlayAchievementsTable, ({ one }) => ({
    game: one(SaltoPlayGamesTable, {
        fields: [SaltoPlayAchievementsTable.gameId],
        references: [SaltoPlayGamesTable.id],
    }),
}));

export const saltoTagAchievementsRelations = relations(SaltoTagAchievementsTable, ({ one }) => ({
    saltoTag: one(SaltoTagsTable, {
        fields: [SaltoTagAchievementsTable.saltoTagId],
        references: [SaltoTagsTable.id],
    }),
    achievement: one(SaltoPlayAchievementsTable, {
        fields: [SaltoTagAchievementsTable.achievementId],
        references: [SaltoPlayAchievementsTable.id],
    }),
}));

export const saltoTagsRelations = relations(SaltoTagsTable, ({ one, many }) => ({
    user: one(UsersTable, {
        fields: [SaltoTagsTable.userId],
        references: [UsersTable.id],
    }),
    achievements: many(SaltoTagAchievementsTable),
}));



export const TwitchProcessedEventsTable = pgTable("twitch_processed_events", {
    messageId: text("message_id").primaryKey(),
    eventType: text("event_type").notNull(),
    processedAt: timestamp("processed_at").notNull().default(sql`current_timestamp`),
    userId: integer("user_id"),
    eventData: text("event_data"),
});

/* 
    Custom pages (all on the prefix /content/)
    Se pueden crear páginas personalizadas para el sitio

    Probablemente se utilizará EditorJS o similar para la edición de contenido
    de forma visual
*/

export const CustomPagesTable = pgTable("custom_pages", {
    id: serial("id").primaryKey(),
    title: varchar("title").notNull(),
    slug: varchar("slug").notNull().unique(),
    permalink: varchar("permalink").notNull().unique(),
    content: text("content").notNull(), // JSON del editor
    cookedHtml: text("cooked_html"), // HTML generado y almacenado
    isPublic: boolean("is_public").notNull().default(false),
    isDraft: boolean("is_draft").notNull().default(true),
    authorId: integer("author_id").notNull().references(() => UsersTable.id),
    lastEditorId: integer("last_editor_id").references(() => UsersTable.id),
    createdAt: timestamp("created_at").notNull().default(sql`current_timestamp`),
    updatedAt: timestamp("updated_at").notNull().default(sql`current_timestamp`),
}, (t) => ({
    uniqueSlug: unique("slug").on(t.slug),
    uniquePermalink: unique("permalink").on(t.permalink),
}))
// Historial de versiones de páginas personalizadas
export const CustomPageHistoryTable = pgTable("custom_page_history", {
    id: serial("id").primaryKey(),
    pageId: integer("page_id").notNull().references(() => CustomPagesTable.id, { onDelete: "cascade" }),
    title: varchar("title").notNull(),
    slug: varchar("slug").notNull(),
    permalink: varchar("permalink").notNull(),
    content: text("content").notNull(),
    cookedHtml: text("cooked_html"),
    editorId: integer("editor_id").notNull().references(() => UsersTable.id),
    createdAt: timestamp("created_at").notNull().default(sql`current_timestamp`),
})



/* 
    Eventos
*/

export const EventsTable = pgTable("events", {
    id: serial("id").primaryKey(),
    name: varchar("name").notNull(),
    description: text("description"),
    cover: varchar("cover"),
    tags: varchar("tags", { enum: ["special-event", "beneficial", "collab", "presential", "premiere", "other"] }).array(),
    mainOrganizerId: integer("main_organizer_id").notNull().references(() => UsersTable.id),
    featured: boolean("featured").notNull().default(false),
    location: varchar("location"),
    platform: varchar("platform", { enum: ["twitch", "youtube", "other"] }),
    url: varchar("url"),
    importantInfo: text("important_info"),
    startDate: timestamp("start_date").notNull(),
    endDate: timestamp("end_date"),
    createdAt: timestamp("created_at")
        .notNull()
        .default(sql`current_timestamp`),
    updatedAt: timestamp("updated_at")
        .notNull()
        .default(sql`current_timestamp`),
})


/* Additional organizers */
export const EventOrganizersTable = pgTable("event_organizers", {
    id: serial("id").primaryKey(),
    eventId: integer("event_id").notNull().references(() => EventsTable.id),
    userId: integer("user_id").notNull().references(() => UsersTable.id),
    createdAt: timestamp("created_at")
        .notNull()
        .default(sql`current_timestamp`),
}, (t) => ({
    uniqueEventUser: unique().on(t.eventId, t.userId),
}))



export const EventAssistantsTable = pgTable("event_assistants", {
    id: serial("id").primaryKey(),
    eventId: integer("event_id").notNull().references(() => EventsTable.id),
    userId: integer("user_id").notNull().references(() => UsersTable.id),
    createdAt: timestamp("created_at")
        .notNull()
        .default(sql`current_timestamp`),
}, (t) => ({
    uniqueEventUser: unique().on(t.eventId, t.userId),
}))

export const EventRelations = relations(EventsTable, ({ one, many }) => ({
    mainOrganizer: one(UsersTable, {
        fields: [EventsTable.mainOrganizerId],
        references: [UsersTable.id],
    }),
    additionalOrganizers: many(EventOrganizersTable),
    assistants: many(EventAssistantsTable),
}));

export const EventOrganizersRelations = relations(EventOrganizersTable, ({ one }) => ({
    event: one(EventsTable, {
        fields: [EventOrganizersTable.eventId],
        references: [EventsTable.id],
    }),
    user: one(UsersTable, {
        fields: [EventOrganizersTable.userId],
        references: [UsersTable.id],
    }),
}));

export const EventAssistantsRelations = relations(EventAssistantsTable, ({ one }) => ({
    event: one(EventsTable, {
        fields: [EventAssistantsTable.eventId],
        references: [EventsTable.id],
    }),
    user: one(UsersTable, {
        fields: [EventAssistantsTable.userId],
        references: [UsersTable.id],
    }),
}));





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

export const SaltoCraftExtremo3InscriptionsTable = pgTable('salto_craft_extremo3_inscriptions', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => UsersTable.id),
    discordUsername: varchar('discord_username'),
    acceptedTerms: boolean('accepted_terms').notNull().default(false),
    instagram: varchar('instagram'),
    participated_sc: varchar('participated_sc'),
    minecraft_username: varchar('minecraft_username'),
    team_status: varchar('team_status'),
    content_channel: varchar('content_channel'),
    createdAt: timestamp('created_at').notNull().default(sql`current_timestamp`),
    updatedAt: timestamp('updated_at').notNull().default(sql`current_timestamp`),
}, (t) => ({
    uniqueUserId: unique().on(t.userId)
}))

export const Extremo3PlayersTable = pgTable('extremo3_players', {
    id: serial('id').primaryKey(),
    inscriptionId: integer('inscription_id').references(() => SaltoCraftExtremo3InscriptionsTable.id),
    isConfirmedPlayer: boolean('is_confirmed_player').notNull().default(false),
    isRepechaje: boolean('is_repechaje').notNull().default(false),
    livesCount: integer('lives_count').notNull().default(3),
    createdAt: timestamp('created_at').notNull().default(sql`current_timestamp`),
    updatedAt: timestamp('updated_at').notNull().default(sql`current_timestamp`),
}, (t) => ({
    uniqueInscriptionId: unique().on(t.inscriptionId)
}))



export const Extremo3RepechajeVotesTable = pgTable('extremo3_repechaje_votes', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull().references(() => UsersTable.id),
    playerId: integer('player_id').notNull().references(() => Extremo3PlayersTable.id),
    createdAt: timestamp('created_at').notNull().default(sql`current_timestamp`),
}, (t) => ({
    uniqueUserPlayer: unique().on(t.userId, t.playerId)
}))

export const extremo3PlayersRelations = relations(Extremo3PlayersTable, ({ one, many }) => ({
    user: one(UsersTable, {
        fields: [Extremo3PlayersTable.id],
        references: [UsersTable.id],
    }),
    inscription: one(SaltoCraftExtremo3InscriptionsTable, {
        fields: [Extremo3PlayersTable.inscriptionId],
        references: [SaltoCraftExtremo3InscriptionsTable.id],
    }),
    repechajeVotes: many(Extremo3RepechajeVotesTable),
}));

export const saltoCraftExtremo3InscriptionsRelations = relations(SaltoCraftExtremo3InscriptionsTable, ({ one, many }) => ({
    user: one(UsersTable, {
        fields: [SaltoCraftExtremo3InscriptionsTable.userId],
        references: [UsersTable.id],
    }),
    players: many(Extremo3PlayersTable),
}));

export const extremo3RepechajeVotesRelations = relations(Extremo3RepechajeVotesTable, ({ one }) => ({
    user: one(UsersTable, {
        fields: [Extremo3RepechajeVotesTable.userId],
        references: [UsersTable.id],
    }),
    player: one(Extremo3PlayersTable, {
        fields: [Extremo3RepechajeVotesTable.playerId],
        references: [Extremo3PlayersTable.id],
    }),
}));

export const DebateAnonymousMessagesRelations = relations(DebateAnonymousMessagesTable, ({ one, many }) => ({
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
    suspensions: many(UserSuspensionsTable),
    sessions: many(SessionsTable),
    extremo3RepechajeVotes: many(Extremo3RepechajeVotesTable),
}))

export const sessionsRelations = relations(SessionsTable, ({ one }) => ({
    user: one(UsersTable, {
        fields: [SessionsTable.userId],
        references: [UsersTable.id],
    }),
}))

export const suspensionsRelations = relations(UserSuspensionsTable, ({ one }) => ({
    user: one(UsersTable, {
        fields: [UserSuspensionsTable.userId],
        references: [UsersTable.id],
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
    userId: integer('user_id').references(() => UsersTable.id, { onDelete: 'cascade' }),
    playerNumber: integer('player_number').notNull().unique(),
    eliminated: boolean('eliminated').notNull().default(false),
    aislated: boolean('aislated').notNull().default(false),
    createdAt: timestamp('created_at').notNull().default(sql`current_timestamp`),
    updatedAt: timestamp('updated_at').notNull().default(sql`current_timestamp`),
}, (t) => ({
    uniqueUserIdStreamerId: unique().on(t.userId, t.playerNumber)
}))

export const streamerWarsPlayersRelations = relations(StreamerWarsPlayersTable, ({ one, many }) => ({
    user: one(UsersTable, {
        fields: [StreamerWarsPlayersTable.userId],
        references: [UsersTable.id],
    }),
    messages: many(StreamerWarsChatMessagesTable),
    teamPlayer: one(StreamerWarsTeamPlayersTable, {
        fields: [StreamerWarsPlayersTable.playerNumber],
        references: [StreamerWarsTeamPlayersTable.playerNumber],
    })
}))

export const StreamerWarsChatMessagesTable = pgTable('streamer_wars_chat_messages', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => UsersTable.id, { onDelete: 'cascade' }),
    message: text('message').notNull(),
    isAnnouncement: boolean('is_announcement').notNull().default(false),
    createdAt: timestamp('created_at').notNull().default(sql`current_timestamp`),
    updatedAt: timestamp('updated_at').notNull().default(sql`current_timestamp`),
})

export const StreamerWarsTeamsTable = pgTable('streamer_wars_teams', {
    id: serial('id').primaryKey(),
    color: varchar('color').notNull().unique(),
})

export const StreamerWarsTeamPlayersTable = pgTable('streamer_wars_team_players', {
    id: serial('id').primaryKey(),
    teamId: integer('team_id').references(() => StreamerWarsTeamsTable.id),
    playerNumber: integer('player_number').references(() => StreamerWarsPlayersTable.playerNumber, { onDelete: 'cascade' }),
    isCaptain: boolean('is_captain').notNull().default(false),
})

export const streamerWarsChatMessagesRelations = relations(StreamerWarsChatMessagesTable, ({ one }) => ({
    user: one(UsersTable, {
        fields: [StreamerWarsChatMessagesTable.userId],
        references: [UsersTable.id],
    })
}))

export const streamerWarsTeamsRelations = relations(StreamerWarsTeamsTable, ({ one, many }) => ({
    players: many(StreamerWarsTeamPlayersTable),
}))

export const streamerWarsTeamPlayersRelations = relations(StreamerWarsTeamPlayersTable, ({ one }) => ({
    team: one(StreamerWarsTeamsTable, {
        fields: [StreamerWarsTeamPlayersTable.teamId],
        references: [StreamerWarsTeamsTable.id],
    }),
    player: one(StreamerWarsPlayersTable, {
        fields: [StreamerWarsTeamPlayersTable.playerNumber],
        references: [StreamerWarsPlayersTable.playerNumber],
    })
}))

export const NegativeVotesStreamersTable = pgTable('negative_votes_streamers', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => UsersTable.id, { onDelete: 'cascade' }),
    playerNumber: integer('player_number').references(() => StreamerWarsPlayersTable.playerNumber, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().default(sql`current_timestamp`),
    updatedAt: timestamp('updated_at').notNull().default(sql`current_timestamp`),
}, (t) => ({
    uniqueUserIdPlayerNumber: unique().on(t.userId, t.playerNumber)
}))

/* 
    Ruleta Loca Game Tables
*/

export const RuletaLocaPhrasesTable = pgTable('ruleta_loca_phrases', {
    id: serial('id').primaryKey(),
    phrase: text('phrase').notNull(),
    category: varchar('category', { length: 100 }).notNull(),
    difficulty: varchar('difficulty', { enum: ['easy', 'medium', 'hard'] }).notNull().default('medium'),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().default(sql`current_timestamp`),
    updatedAt: timestamp('updated_at').notNull().default(sql`current_timestamp`),
})

export const RuletaLocaGameSessionsTable = pgTable('ruleta_loca_game_sessions', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull().references(() => UsersTable.id, { onDelete: 'cascade' }),
    phraseId: integer('phrase_id').notNull().references(() => RuletaLocaPhrasesTable.id),
    currentScore: integer('current_score').notNull().default(0),
    wheelValue: integer('wheel_value').notNull().default(0),
    revealedLetters: text('revealed_letters').array().default([]),
    guessedLetters: text('guessed_letters').array().default([]),
    status: varchar('status', { enum: ['playing', 'won', 'lost'] }).notNull().default('playing'),
    completedAt: timestamp('completed_at'),
    createdAt: timestamp('created_at').notNull().default(sql`current_timestamp`),
    updatedAt: timestamp('updated_at').notNull().default(sql`current_timestamp`),
})

export const RuletaLocaPlayerStatsTable = pgTable('ruleta_loca_player_stats', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull().unique().references(() => UsersTable.id, { onDelete: 'cascade' }),
    gamesPlayed: integer('games_played').notNull().default(0),
    gamesWon: integer('games_won').notNull().default(0),
    totalCoinsEarned: integer('total_coins_earned').notNull().default(0),
    totalScore: integer('total_score').notNull().default(0),
    highestScore: integer('highest_score').notNull().default(0),
    createdAt: timestamp('created_at').notNull().default(sql`current_timestamp`),
    updatedAt: timestamp('updated_at').notNull().default(sql`current_timestamp`),
})

export const ruletaLocaGameSessionsRelations = relations(RuletaLocaGameSessionsTable, ({ one }) => ({
    user: one(UsersTable, {
        fields: [RuletaLocaGameSessionsTable.userId],
        references: [UsersTable.id],
    }),
    phrase: one(RuletaLocaPhrasesTable, {
        fields: [RuletaLocaGameSessionsTable.phraseId],
        references: [RuletaLocaPhrasesTable.id],
    }),
}))

export const ruletaLocaPlayerStatsRelations = relations(RuletaLocaPlayerStatsTable, ({ one }) => ({
    user: one(UsersTable, {
        fields: [RuletaLocaPlayerStatsTable.userId],
        references: [UsersTable.id],
    }),
}))

/*
    Banco Saltano Tables
    Virtual economy system for the community
*/

// Transaction types enum
export const transactionTypeEnum = pgEnum('transaction_type', [
    'deposit',
    'withdrawal',
    'transfer',
    'game_reward',
    'daily_bonus',
    'purchase',
    'refund'
]);

// Transaction status enum
export const transactionStatusEnum = pgEnum('transaction_status', [
    'pending',
    'completed',
    'failed',
    'cancelled'
]);

// User bank accounts - automatically created for each user
export const BancoSaltanoAccountsTable = pgTable('banco_saltano_accounts', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull().unique().references(() => UsersTable.id, { onDelete: 'cascade' }),
    balance: integer('balance').notNull().default(0), // Current balance (synced with users.coins)
    totalDeposits: integer('total_deposits').notNull().default(0),
    totalWithdrawals: integer('total_withdrawals').notNull().default(0),
    totalTransfers: integer('total_transfers').notNull().default(0),
    lastDailyBonus: timestamp('last_daily_bonus'),
    createdAt: timestamp('created_at').notNull().default(sql`current_timestamp`),
    updatedAt: timestamp('updated_at').notNull().default(sql`current_timestamp`),
});

// Transaction history
export const BancoSaltanoTransactionsTable = pgTable('banco_saltano_transactions', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull().references(() => UsersTable.id, { onDelete: 'cascade' }),
    type: transactionTypeEnum('type').notNull(),
    status: transactionStatusEnum('status').notNull().default('completed'),
    amount: integer('amount').notNull(),
    balanceBefore: integer('balance_before').notNull(),
    balanceAfter: integer('balance_after').notNull(),
    description: text('description'),
    metadata: jsonb('metadata').default({}), // For storing game info, source, etc.
    fromUserId: integer('from_user_id').references(() => UsersTable.id),
    toUserId: integer('to_user_id').references(() => UsersTable.id),
    createdAt: timestamp('created_at').notNull().default(sql`current_timestamp`),
});

// Daily rewards tracking
export const BancoSaltanoDailyRewardsTable = pgTable('banco_saltano_daily_rewards', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull().references(() => UsersTable.id, { onDelete: 'cascade' }),
    rewardDate: timestamp('reward_date').notNull().default(sql`current_date`),
    amount: integer('amount').notNull(),
    streak: integer('streak').notNull().default(1), // Consecutive days
    claimed: boolean('claimed').notNull().default(true),
    createdAt: timestamp('created_at').notNull().default(sql`current_timestamp`),
}, (t) => ({
    uniqueUserDate: unique('user_reward_date_idx').on(t.userId, t.rewardDate),
}));

// Relations
export const bancoSaltanoAccountsRelations = relations(BancoSaltanoAccountsTable, ({ one, many }) => ({
    user: one(UsersTable, {
        fields: [BancoSaltanoAccountsTable.userId],
        references: [UsersTable.id],
    }),
    transactions: many(BancoSaltanoTransactionsTable),
    dailyRewards: many(BancoSaltanoDailyRewardsTable),
}));

export const bancoSaltanoTransactionsRelations = relations(BancoSaltanoTransactionsTable, ({ one }) => ({
    user: one(UsersTable, {
        fields: [BancoSaltanoTransactionsTable.userId],
        references: [UsersTable.id],
    }),
    fromUser: one(UsersTable, {
        fields: [BancoSaltanoTransactionsTable.fromUserId],
        references: [UsersTable.id],
    }),
    toUser: one(UsersTable, {
        fields: [BancoSaltanoTransactionsTable.toUserId],
        references: [UsersTable.id],
    }),
}));

export const bancoSaltanoDailyRewardsRelations = relations(BancoSaltanoDailyRewardsTable, ({ one }) => ({
    user: one(UsersTable, {
        fields: [BancoSaltanoDailyRewardsTable.userId],
        references: [UsersTable.id],
    }),
}));

/* 
    Mascota Saltana (Pet System)
    Tamagotchi-style virtual pet with economy integration
*/

// User's pet
export const PetsTable = pgTable('pets', {
    id: serial('id').primaryKey(),
    ownerId: integer('owner_id').notNull().unique().references(() => UsersTable.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 50 }).notNull(),
    // Appearance stored as JSON
    appearance: jsonb('appearance').notNull().default({
        color: '#FFD700',
        skinId: null,
        hatId: null,
        accessoryId: null,
        eyesId: null,
        mouthId: null,
    }),
    // Stats (0-100 scale)
    hunger: integer('hunger').notNull().default(100),
    energy: integer('energy').notNull().default(100),
    hygiene: integer('hygiene').notNull().default(100),
    happiness: integer('happiness').notNull().default(100),
    // Crucial for serverless lazy evaluation
    lastInteraction: timestamp('last_interaction').notNull().default(sql`current_timestamp`),
    sleepingSince: timestamp('sleeping_since'),
    createdAt: timestamp('created_at').notNull().default(sql`current_timestamp`),
    updatedAt: timestamp('updated_at').notNull().default(sql`current_timestamp`),
});

// User's inventory of purchased items
export const PetUserInventoryTable = pgTable('pet_user_inventory', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull().references(() => UsersTable.id, { onDelete: 'cascade' }),
    itemId: integer('item_id').notNull(),
    quantity: integer('quantity').notNull().default(1),
    acquiredAt: timestamp('acquired_at').notNull().default(sql`current_timestamp`),
}, (t) => ({
    uniqueUserItem: unique('user_item_idx').on(t.userId, t.itemId),
}));

// Pet house decoration layout
export const PetHousesTable = pgTable('pet_houses', {
    id: serial('id').primaryKey(),
    ownerId: integer('owner_id').notNull().unique().references(() => UsersTable.id, { onDelete: 'cascade' }),
    backgroundId: varchar('background_id').notNull().default('default'), // Wall/floor theme
    layout: jsonb('layout').notNull().default([]), // Array of placed furniture items with positions
    createdAt: timestamp('created_at').notNull().default(sql`current_timestamp`),
    updatedAt: timestamp('updated_at').notNull().default(sql`current_timestamp`),
});

// Pet minigame scores and rewards tracking
export const PetMinigameScoresTable = pgTable('pet_minigame_scores', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull().references(() => UsersTable.id, { onDelete: 'cascade' }),
    gameName: varchar('game_name', { length: 50 }).notNull(), // e.g., 'catch_the_coin'
    score: integer('score').notNull(),
    coinsEarned: integer('coins_earned').notNull().default(0),
    playedAt: timestamp('played_at').notNull().default(sql`current_timestamp`),
});

// Pet Relations
export const petsRelations = relations(PetsTable, ({ one }) => ({
    owner: one(UsersTable, {
        fields: [PetsTable.ownerId],
        references: [UsersTable.id],
    }),
}));

export const petUserInventoryRelations = relations(PetUserInventoryTable, ({ one }) => ({
    user: one(UsersTable, {
        fields: [PetUserInventoryTable.userId],
        references: [UsersTable.id],
    }),
}));

export const petHousesRelations = relations(PetHousesTable, ({ one }) => ({
    owner: one(UsersTable, {
        fields: [PetHousesTable.ownerId],
        references: [UsersTable.id],
    }),
}));

export const petMinigameScoresRelations = relations(PetMinigameScoresTable, ({ one }) => ({
    user: one(UsersTable, {
        fields: [PetMinigameScoresTable.userId],
        references: [UsersTable.id],
    }),
}));

/* 
    Saltogram - Social Module
*/

export const SaltogramPostsTable = pgTable("saltogram_posts", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => UsersTable.id, { onDelete: "cascade" }),
    text: text("text"),
    imageUrl: varchar("image_url"),
    isPinned: boolean("is_pinned").notNull().default(false),
    isFeatured: boolean("is_featured").notNull().default(false),
    featuredUntil: timestamp("featured_until", { withTimezone: true }),
    isHidden: boolean("is_hidden").notNull().default(false),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`current_timestamp`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`current_timestamp`),
});

export const SaltogramReactionsTable = pgTable("saltogram_reactions", {
    id: serial("id").primaryKey(),
    postId: integer("post_id").notNull().references(() => SaltogramPostsTable.id, { onDelete: "cascade" }),
    userId: integer("user_id").notNull().references(() => UsersTable.id, { onDelete: "cascade" }),
    emoji: varchar("emoji", { length: 10 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`current_timestamp`),
}, (t) => ({
    uniqueUserPostEmoji: unique("unique_user_post_emoji").on(t.postId, t.userId, t.emoji),
}));

export const SaltogramCommentsTable = pgTable("saltogram_comments", {
    id: serial("id").primaryKey(),
    postId: integer("post_id").notNull().references(() => SaltogramPostsTable.id, { onDelete: "cascade" }),
    userId: integer("user_id").notNull().references(() => UsersTable.id, { onDelete: "cascade" }),
    parentId: integer("parent_id").references((): AnyPgColumn => SaltogramCommentsTable.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`current_timestamp`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`current_timestamp`),
});

export const SaltogramCommentReactionsTable = pgTable("saltogram_comment_reactions", {
    id: serial("id").primaryKey(),
    commentId: integer("comment_id").notNull().references(() => SaltogramCommentsTable.id, { onDelete: "cascade" }),
    userId: integer("user_id").notNull().references(() => UsersTable.id, { onDelete: "cascade" }),
    emoji: varchar("emoji", { length: 10 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`current_timestamp`),
}, (t) => ({
    uniqueUserCommentEmoji: unique("unique_user_comment_emoji").on(t.commentId, t.userId, t.emoji),
}));

export const SaltogramReportsTable = pgTable("saltogram_reports", {
    id: serial("id").primaryKey(),
    postId: integer("post_id").notNull().references(() => SaltogramPostsTable.id, { onDelete: "cascade" }),
    reporterId: integer("reporter_id").notNull().references(() => UsersTable.id, { onDelete: "cascade" }),
    reason: text("reason").notNull(),
    status: varchar("status", { enum: ["pending", "reviewed", "dismissed"] }).notNull().default("pending"),
    reviewedBy: integer("reviewed_by").references(() => UsersTable.id),
    reviewedAt: timestamp("reviewed_at"),
    createdAt: timestamp("created_at").notNull().default(sql`current_timestamp`),
});

export const SaltogramStoriesTable = pgTable("saltogram_stories", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => UsersTable.id, { onDelete: "cascade" }),
    mediaUrl: varchar("media_url").notNull(),
    mediaType: varchar("media_type", { enum: ["image", "video"] }).notNull(),
    duration: integer("duration").default(5), // Seconds
    metadata: jsonb("metadata").default({}), // Stickers, text, etc.
    visibility: varchar("visibility", { enum: ["public", "friends", "vip"] }).notNull().default("public"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`current_timestamp`),
});

export const SaltogramMessagesTable = pgTable("saltogram_messages", {
    id: serial("id").primaryKey(),
    senderId: integer("sender_id").notNull().references(() => UsersTable.id, { onDelete: "cascade" }),
    receiverId: integer("receiver_id").notNull().references(() => UsersTable.id, { onDelete: "cascade" }),
    content: text("content"),
    storyId: integer("story_id").references(() => SaltogramStoriesTable.id, { onDelete: "set null" }),
    reaction: varchar("reaction"), // For quick reactions like emojis
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`current_timestamp`),
});

export const SaltogramVipListTable = pgTable("saltogram_vip_list", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => UsersTable.id, { onDelete: "cascade" }),
    friendId: integer("friend_id").notNull().references(() => UsersTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().default(sql`current_timestamp`),
}, (t) => ({
    uniqueVip: unique("unique_vip").on(t.userId, t.friendId),
}));

export const SaltogramStoryViewsTable = pgTable("saltogram_story_views", {
    id: serial("id").primaryKey(),
    storyId: integer("story_id").notNull().references(() => SaltogramStoriesTable.id, { onDelete: "cascade" }),
    userId: integer("user_id").notNull().references(() => UsersTable.id, { onDelete: "cascade" }),
    viewedAt: timestamp("viewed_at").notNull().default(sql`current_timestamp`),
}, (t) => ({
    uniqueStoryView: unique("unique_story_view").on(t.storyId, t.userId),
}));

export const SaltogramStoryLikesTable = pgTable("saltogram_story_likes", {
    id: serial("id").primaryKey(),
    storyId: integer("story_id").notNull().references(() => SaltogramStoriesTable.id, { onDelete: "cascade" }),
    userId: integer("user_id").notNull().references(() => UsersTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().default(sql`current_timestamp`),
}, (t) => ({
    uniqueStoryLike: unique("unique_story_like").on(t.storyId, t.userId),
}));

export const SaltogramNotesTable = pgTable("saltogram_notes", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => UsersTable.id, { onDelete: "cascade" }),
    text: varchar("text", { length: 60 }),
    musicUrl: text("music_url"),
    musicTrackId: text("music_track_id"),
    musicTitle: text("music_title"),
    musicArtist: text("music_artist"),
    musicCover: text("music_cover"),
    visibility: varchar("visibility", { enum: ["public", "friends", "vip"] }).notNull().default("public"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`current_timestamp`),
});

/* 
    Saltogram Relations
*/


export const FriendsTable = pgTable("friends", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => UsersTable.id, { onDelete: "cascade" }),
    friendId: integer("friend_id").notNull().references(() => UsersTable.id, { onDelete: "cascade" }),
    status: varchar("status", { enum: ["pending", "accepted", "blocked"] }).notNull().default("pending"),
    createdAt: timestamp("created_at").notNull().default(sql`current_timestamp`),
    updatedAt: timestamp("updated_at").notNull().default(sql`current_timestamp`),
}, (t) => ({
    uniqueFriendship: unique("unique_friendship").on(t.userId, t.friendId),
}));

/* 
    Saltogram Relations
*/

export const friendsRelations = relations(FriendsTable, ({ one }) => ({
    user: one(UsersTable, {
        fields: [FriendsTable.userId],
        references: [UsersTable.id],
        relationName: "userFriends"
    }),
    friend: one(UsersTable, {
        fields: [FriendsTable.friendId],
        references: [UsersTable.id],
        relationName: "friendUsers"
    }),
}));

export const saltogramPostsRelations = relations(SaltogramPostsTable, ({ one, many }) => ({
    user: one(UsersTable, {
        fields: [SaltogramPostsTable.userId],
        references: [UsersTable.id],
    }),
    reactions: many(SaltogramReactionsTable),
    comments: many(SaltogramCommentsTable),
    reports: many(SaltogramReportsTable),
}));

export const saltogramReactionsRelations = relations(SaltogramReactionsTable, ({ one }) => ({
    post: one(SaltogramPostsTable, {
        fields: [SaltogramReactionsTable.postId],
        references: [SaltogramPostsTable.id],
    }),
    user: one(UsersTable, {
        fields: [SaltogramReactionsTable.userId],
        references: [UsersTable.id],
    }),
}));

export const saltogramCommentsRelations = relations(SaltogramCommentsTable, ({ one }) => ({
    post: one(SaltogramPostsTable, {
        fields: [SaltogramCommentsTable.postId],
        references: [SaltogramPostsTable.id],
    }),
    user: one(UsersTable, {
        fields: [SaltogramCommentsTable.userId],
        references: [UsersTable.id],
    }),
}));

export const saltogramReportsRelations = relations(SaltogramReportsTable, ({ one }) => ({
    post: one(SaltogramPostsTable, {
        fields: [SaltogramReportsTable.postId],
        references: [SaltogramPostsTable.id],
    }),
    reporter: one(UsersTable, {
        fields: [SaltogramReportsTable.reporterId],
        references: [UsersTable.id],
    }),
    reviewer: one(UsersTable, {
        fields: [SaltogramReportsTable.reviewedBy],
        references: [UsersTable.id],
    }),
}));

export const saltogramStoriesRelations = relations(SaltogramStoriesTable, ({ one, many }) => ({
    user: one(UsersTable, {
        fields: [SaltogramStoriesTable.userId],
        references: [UsersTable.id],
    }),
    views: many(SaltogramStoryViewsTable),
    likes: many(SaltogramStoryLikesTable),
}));

export const saltogramStoryViewsRelations = relations(SaltogramStoryViewsTable, ({ one }) => ({
    story: one(SaltogramStoriesTable, {
        fields: [SaltogramStoryViewsTable.storyId],
        references: [SaltogramStoriesTable.id],
    }),
    user: one(UsersTable, {
        fields: [SaltogramStoryViewsTable.userId],
        references: [UsersTable.id],
    }),
}));

export const saltogramStoryLikesRelations = relations(SaltogramStoryLikesTable, ({ one }) => ({
    story: one(SaltogramStoriesTable, {
        fields: [SaltogramStoryLikesTable.storyId],
        references: [SaltogramStoriesTable.id],
    }),
    user: one(UsersTable, {
        fields: [SaltogramStoryLikesTable.userId],
        references: [UsersTable.id],
    }),
}));

export const saltogramNotesRelations = relations(SaltogramNotesTable, ({ one }) => ({
    user: one(UsersTable, {
        fields: [SaltogramNotesTable.userId],
        references: [UsersTable.id],
    }),
}));

export const saltogramMessagesRelations = relations(SaltogramMessagesTable, ({ one }) => ({
    sender: one(UsersTable, {
        fields: [SaltogramMessagesTable.senderId],
        references: [UsersTable.id],
        relationName: "sentMessages"
    }),
    receiver: one(UsersTable, {
        fields: [SaltogramMessagesTable.receiverId],
        references: [UsersTable.id],
        relationName: "receivedMessages"
    }),
    story: one(SaltogramStoriesTable, {
        fields: [SaltogramMessagesTable.storyId],
        references: [SaltogramStoriesTable.id],
    }),
}));

export const saltogramVipListRelations = relations(SaltogramVipListTable, ({ one }) => ({
    user: one(UsersTable, {
        fields: [SaltogramVipListTable.userId],
        references: [UsersTable.id],
        relationName: "vipListOwner"
    }),
    friend: one(UsersTable, {
        fields: [SaltogramVipListTable.friendId],
        references: [UsersTable.id],
        relationName: "vipListMember"
    }),
}));

export const OAuthApplicationsTable = pgTable("oauth_applications", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name").notNull(),
    clientId: varchar("client_id").unique().notNull(),
    clientSecret: varchar("client_secret").notNull(),
    redirectUris: text("redirect_uris").array().notNull(),
    userId: integer("user_id").notNull().references(() => UsersTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const OAuthCodesTable = pgTable("oauth_codes", {
    code: varchar("code").primaryKey(),
    clientId: varchar("client_id").notNull().references(() => OAuthApplicationsTable.clientId, { onDelete: "cascade" }),
    userId: integer("user_id").notNull().references(() => UsersTable.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at").notNull(),
    redirectUri: varchar("redirect_uri"),
    scopes: text("scopes").array(),
    codeChallenge: varchar("code_challenge"),
    codeChallengeMethod: varchar("code_challenge_method"),
});

export const OAuthTokensTable = pgTable("oauth_tokens", {
    accessToken: varchar("access_token").primaryKey(),
    refreshToken: varchar("refresh_token").unique(),
    clientId: varchar("client_id").notNull().references(() => OAuthApplicationsTable.clientId, { onDelete: "cascade" }),
    userId: integer("user_id").notNull().references(() => UsersTable.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at").notNull(),
    scopes: text("scopes").array(),
});

export const NotificationsTable = pgTable("notifications", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => UsersTable.id, { onDelete: "cascade" }),
    type: varchar("type").notNull(), // 'info', 'success', 'warning', 'error', 'saltogram_like', 'saltogram_comment', etc.
    title: varchar("title").notNull(),
    message: text("message").notNull(),
    link: varchar("link"),
    image: varchar("image"),
    read: boolean("read").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const PushSubscriptionsTable = pgTable("push_subscriptions", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => UsersTable.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull().unique(),
    p256dh: varchar("p256dh").notNull(),
    auth: varchar("auth").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const oauthApplicationsRelations = relations(OAuthApplicationsTable, ({ one }) => ({
    owner: one(UsersTable, {
        fields: [OAuthApplicationsTable.userId],
        references: [UsersTable.id],
    }),
}));

// --- TOURNAMENTS SYSTEM ---

export const TournamentsTable = pgTable("tournaments", {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    bannerUrl: varchar("banner_url"),
    format: varchar("format", { length: 20 }).notNull(), // 'single_elimination', 'double_elimination', 'round_robin', 'groups'
    status: varchar("status", { length: 20 }).notNull().default('draft'), // 'draft', 'registration', 'in_progress', 'completed'
    privacy: varchar("privacy", { length: 10 }).notNull().default('public'), // 'public', 'private'
    maxParticipants: integer("max_participants"),
    startDate: timestamp("start_date"),
    endDate: timestamp("end_date"),
    config: jsonb("config").default({}), // Scoring rules, tiebreakers, etc.
    creatorId: integer("creator_id").notNull().references(() => UsersTable.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const TournamentParticipantsTable = pgTable("tournament_participants", {
    id: serial("id").primaryKey(),
    tournamentId: integer("tournament_id").notNull().references(() => TournamentsTable.id, { onDelete: "cascade" }),
    userId: integer("user_id").notNull().references(() => UsersTable.id, { onDelete: "cascade" }),
    seed: integer("seed"), // Ranking inicial
    status: varchar("status", { length: 20 }).notNull().default('pending'), // 'pending', 'confirmed', 'disqualified'
    teamName: varchar("team_name"), // Optional, if we want to allow custom names per tournament
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
    unq: unique().on(t.tournamentId, t.userId),
}));

export const TournamentMatchesTable = pgTable("tournament_matches", {
    id: serial("id").primaryKey(),
    tournamentId: integer("tournament_id").notNull().references(() => TournamentsTable.id, { onDelete: "cascade" }),
    round: integer("round").notNull(), // 1, 2, 3... or Group Number
    matchOrder: integer("match_order").notNull(), // Order within the round
    player1Id: integer("player1_id").references(() => UsersTable.id), // Nullable for TBD
    player2Id: integer("player2_id").references(() => UsersTable.id), // Nullable for TBD
    score1: integer("score1").default(0),
    score2: integer("score2").default(0),
    winnerId: integer("winner_id").references(() => UsersTable.id),
    nextMatchId: integer("next_match_id"), // Pointer to where the winner goes
    status: varchar("status", { length: 20 }).notNull().default('pending'), // 'pending', 'scheduled', 'in_progress', 'completed', 'disputed'
    startTime: timestamp("start_time"),
    metadata: jsonb("metadata").default({}), // For specific game details, maps, etc.
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tournamentsRelations = relations(TournamentsTable, ({ one, many }) => ({
    creator: one(UsersTable, {
        fields: [TournamentsTable.creatorId],
        references: [UsersTable.id],
    }),
    participants: many(TournamentParticipantsTable),
    matches: many(TournamentMatchesTable),
}));

export const tournamentParticipantsRelations = relations(TournamentParticipantsTable, ({ one }) => ({
    tournament: one(TournamentsTable, {
        fields: [TournamentParticipantsTable.tournamentId],
        references: [TournamentsTable.id],
    }),
    user: one(UsersTable, {
        fields: [TournamentParticipantsTable.userId],
        references: [UsersTable.id],
    }),
}));

export const tournamentMatchesRelations = relations(TournamentMatchesTable, ({ one }) => ({
    tournament: one(TournamentsTable, {
        fields: [TournamentMatchesTable.tournamentId],
        references: [TournamentsTable.id],
    }),
    player1: one(UsersTable, {
        fields: [TournamentMatchesTable.player1Id],
        references: [UsersTable.id],
        relationName: "player1Matches"
    }),
    player2: one(UsersTable, {
        fields: [TournamentMatchesTable.player2Id],
        references: [UsersTable.id],
        relationName: "player2Matches"
    }),
    winner: one(UsersTable, {
        fields: [TournamentMatchesTable.winnerId],
        references: [UsersTable.id],
        relationName: "wonMatches"
    }),
}));