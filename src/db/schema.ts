import { TournamentMatchStatus, TournamentParticipantStatus, TournamentStatus, TournamentType } from "@/consts/Torneos";
import { relations, sql } from "drizzle-orm";
import { boolean, integer, jsonb, pgEnum, pgTable, serial, text, timestamp, unique, uuid, varchar } from "drizzle-orm/pg-core";

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
    content: text("content").notNull(),
    isPublic: boolean("is_public").notNull().default(false),
    isDraft: boolean("is_draft").notNull().default(true),
    createdAt: timestamp("created_at").notNull().default(sql`current_timestamp`),
    updatedAt: timestamp("updated_at").notNull().default(sql`current_timestamp`),
}, (t) => ({
    uniqueSlug: unique("slug").on(t.slug),
    uniquePermalink: unique("permalink").on(t.permalink),
}))

/* 
    Tournaments system
*/

// Tipos de torneo más comunes


// Tabla principal de torneos
export const TournamentsTable = pgTable("tournaments", {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    tournamentType: varchar("tournament_type", {
        enum: Object.values(TournamentType) as [string, ...string[]]
    }).notNull(),
    maxParticipants: integer("max_participants").default(100),
    organizerId: integer("organizer_id")
        .references(() => UsersTable.id)
        .notNull(),
    isPublic: boolean("is_public").notNull().default(false),
    signupEndDate: timestamp("signup_end_date"),
    startDate: timestamp("start_date"),
    endDate: timestamp("end_date"),
    status: varchar("status", {
        enum: Object.values(TournamentStatus) as [string, ...string[]]
    }).notNull().default(TournamentStatus.DRAFT),
    config: jsonb("config").default({}),
    gameName: varchar("game_name", { length: 255 }),
    createdAt: timestamp("created_at").notNull().default(sql`current_timestamp`),
    updatedAt: timestamp("updated_at").notNull().default(sql`current_timestamp`),
});

// Tabla de equipos de torneo
export const TournamentTeamsTable = pgTable("tournament_teams", {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    logo: varchar("logo"),
    captainId: integer("captain_id").references(() => UsersTable.id).notNull(),
    createdAt: timestamp("created_at").notNull().default(sql`current_timestamp`),
    updatedAt: timestamp("updated_at").notNull().default(sql`current_timestamp`),
});

// Miembros de equipo
export const TournamentTeamMembersTable = pgTable("tournament_team_members", {
    id: serial("id").primaryKey(),
    teamId: integer("team_id").notNull().references(() => TournamentTeamsTable.id),
    userId: integer("user_id").notNull().references(() => UsersTable.id),
    role: varchar("role", { length: 50 }).default('member'),
    createdAt: timestamp("created_at").notNull().default(sql`current_timestamp`),
});

// Participantes del torneo (equipos o individuales)
export const TournamentParticipantsTable = pgTable("tournament_participants", {
    id: serial("id").primaryKey(),
    tournamentId: integer("tournament_id").notNull().references(() => TournamentsTable.id),
    // Uno de estos debe estar presente (a nivel de aplicación)
    userId: integer("user_id").references(() => UsersTable.id),
    teamId: integer("team_id").references(() => TournamentTeamsTable.id),
    displayName: varchar("display_name", { length: 255 }).notNull(),
    seed: integer("seed"),
    status: varchar("status", {
        enum: Object.values(TournamentParticipantStatus) as [string, ...string[]]
    }).notNull().default(TournamentParticipantStatus.PENDING),
    checkedIn: boolean("checked_in").default(false),
    createdAt: timestamp("created_at").notNull().default(sql`current_timestamp`),
    updatedAt: timestamp("updated_at").notNull().default(sql`current_timestamp`),
});

// Etapas del torneo (para grupo+eliminación)
export const TournamentStagesTable = pgTable("tournament_stages", {
    id: serial("id").primaryKey(),
    tournamentId: integer("tournament_id").notNull().references(() => TournamentsTable.id),
    name: varchar("name", { length: 255 }).notNull(),
    stageType: varchar("stage_type", {
        enum: Object.values(TournamentType) as [string, ...string[]]
    }).notNull(),
    order: integer("order").notNull(), // Secuencia de las etapas
    status: varchar("status", {
        enum: ['pending', 'active', 'completed']
    }).notNull().default('pending'),
    createdAt: timestamp("created_at").notNull().default(sql`current_timestamp`),
});

// Grupos (para etapas de grupos o swiss)
export const TournamentGroupsTable = pgTable("tournament_groups", {
    id: serial("id").primaryKey(),
    tournamentId: integer("tournament_id").notNull().references(() => TournamentsTable.id),
    stageId: integer("stage_id").references(() => TournamentStagesTable.id),
    name: varchar("name", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").notNull().default(sql`current_timestamp`),
});

// Asignación de participantes a grupos
export const TournamentGroupParticipantsTable = pgTable("tournament_group_participants", {
    id: serial("id").primaryKey(),
    groupId: integer("group_id").notNull().references(() => TournamentGroupsTable.id),
    participantId: integer("participant_id").notNull().references(() => TournamentParticipantsTable.id),
    stats: jsonb("stats").default({}), // Para estadísticas como puntos, victorias, etc.
    createdAt: timestamp("created_at").notNull().default(sql`current_timestamp`),
});

// Rondas del torneo
export const TournamentRoundsTable = pgTable("tournament_rounds", {
    id: serial("id").primaryKey(),
    tournamentId: integer("tournament_id").notNull().references(() => TournamentsTable.id),
    stageId: integer("stage_id").references(() => TournamentStagesTable.id),
    number: integer("number").notNull(),
    name: varchar("name", { length: 255 }),
    status: varchar("status", {
        enum: ['pending', 'active', 'completed']
    }).notNull().default('pending'),
    createdAt: timestamp("created_at").notNull().default(sql`current_timestamp`),
});

// Partidas del torneo
export const TournamentMatchesTable = pgTable("tournament_matches", {
    id: serial("id").primaryKey(),
    tournamentId: integer("tournament_id").notNull().references(() => TournamentsTable.id),
    stageId: integer("stage_id").references(() => TournamentStagesTable.id),
    roundId: integer("round_id").notNull().references(() => TournamentRoundsTable.id),
    groupId: integer("group_id").references(() => TournamentGroupsTable.id), // Opcional
    matchNumber: integer("match_number").notNull(),
    bestOf: integer("best_of").default(1),
    status: varchar("status", {
        enum: Object.values(TournamentMatchStatus) as [string, ...string[]]
    }).notNull().default(TournamentMatchStatus.PENDING),
    scheduledTime: timestamp("scheduled_time"),
    // Para brackets: winner va a siguiente partida
    nextMatchId: integer("next_match_id"),
    nextMatchForLoserId: integer("next_match_for_loser_id"),
    createdAt: timestamp("created_at").notNull().default(sql`current_timestamp`),
    updatedAt: timestamp("updated_at").notNull().default(sql`current_timestamp`),
});

// Participantes de partidas
export const TournamentMatchParticipantsTable = pgTable("tournament_match_participants", {
    id: serial("id").primaryKey(),
    matchId: integer("match_id").notNull().references(() => TournamentMatchesTable.id),
    participantId: integer("participant_id").notNull().references(() => TournamentParticipantsTable.id),
    position: integer("position").default(0), // 0=lado izquierdo, 1=lado derecho en un bracket
    score: integer("score").default(0),
    isWinner: boolean("is_winner").default(false),
    status: varchar("status", {
        enum: ['pending', 'ready', 'completed', 'forfeited']
    }).notNull().default('pending'),
    createdAt: timestamp("created_at").notNull().default(sql`current_timestamp`),
});

// Juegos individuales (para matches "best of X")
export const TournamentGamesTable = pgTable("tournament_games", {
    id: serial("id").primaryKey(),
    matchId: integer("match_id").notNull().references(() => TournamentMatchesTable.id),
    gameNumber: integer("game_number").notNull(),
    winnerId: integer("winner_id").references(() => TournamentParticipantsTable.id),
    // Detalles como mapa, modo, etc.
    details: jsonb("details").default({}),
    createdAt: timestamp("created_at").notNull().default(sql`current_timestamp`),
});


export const TournamentsRelations = relations(TournamentsTable, ({ one, many }) => ({
    organizer: one(UsersTable, {
        fields: [TournamentsTable.organizerId],
        references: [UsersTable.id],
    }),
    participants: many(TournamentParticipantsTable),
    teams: many(TournamentTeamsTable),
    stages: many(TournamentStagesTable),
}));
export const TournamentParticipantsRelations = relations(TournamentParticipantsTable, ({ one, many }) => ({
    tournament: one(TournamentsTable, {
        fields: [TournamentParticipantsTable.tournamentId],
        references: [TournamentsTable.id],
    }),
    user: one(UsersTable, {
        fields: [TournamentParticipantsTable.userId],
        references: [UsersTable.id],
    }),
    team: one(TournamentTeamsTable, {
        fields: [TournamentParticipantsTable.teamId],
        references: [TournamentTeamsTable.id],
    }),
    matches: many(TournamentMatchParticipantsTable),
}));

export const TournamentTeamsRelations = relations(TournamentTeamsTable, ({ one, many }) => ({
    captain: one(UsersTable, {
        fields: [TournamentTeamsTable.captainId],
        references: [UsersTable.id],
    }),
    members: many(TournamentTeamMembersTable),
}));

export const TournamentTeamMembersRelations = relations(TournamentTeamMembersTable, ({ one }) => ({
    team: one(TournamentTeamsTable, {
        fields: [TournamentTeamMembersTable.teamId],
        references: [TournamentTeamsTable.id],
    }),
    user: one(UsersTable, {
        fields: [TournamentTeamMembersTable.userId],
        references: [UsersTable.id],
    }),
}));

export const TournamentStagesRelations = relations(TournamentStagesTable, ({ one, many }) => ({
    tournament: one(TournamentsTable, {
        fields: [TournamentStagesTable.tournamentId],
        references: [TournamentsTable.id],
    }),
    groups: many(TournamentGroupsTable),
    matches: many(TournamentMatchesTable),
}));

export const TournamentGroupsRelations = relations(TournamentGroupsTable, ({ one, many }) => ({
    tournament: one(TournamentsTable, {
        fields: [TournamentGroupsTable.tournamentId],
        references: [TournamentsTable.id],
    }),
    participants: many(TournamentGroupParticipantsTable),
}));

export const TournamentGroupParticipantsRelations = relations(TournamentGroupParticipantsTable, ({ one }) => ({
    group: one(TournamentGroupsTable, {
        fields: [TournamentGroupParticipantsTable.groupId],
        references: [TournamentGroupsTable.id],
    }),
    participant: one(TournamentParticipantsTable, {
        fields: [TournamentGroupParticipantsTable.participantId],
        references: [TournamentParticipantsTable.id],
    }),
}));

export const TournamentRoundsRelations = relations(TournamentRoundsTable, ({ one, many }) => ({
    tournament: one(TournamentsTable, {
        fields: [TournamentRoundsTable.tournamentId],
        references: [TournamentsTable.id],
    }),
    matches: many(TournamentMatchesTable),
}));

export const TournamentMatchesRelations = relations(TournamentMatchesTable, ({ one, many }) => ({
    tournament: one(TournamentsTable, {
        fields: [TournamentMatchesTable.tournamentId],
        references: [TournamentsTable.id],
    }),
    stage: one(TournamentStagesTable, {
        fields: [TournamentMatchesTable.stageId],
        references: [TournamentStagesTable.id],
    }),
    round: one(TournamentRoundsTable, {
        fields: [TournamentMatchesTable.roundId],
        references: [TournamentRoundsTable.id],
    }),
    group: one(TournamentGroupsTable, {
        fields: [TournamentMatchesTable.groupId],
        references: [TournamentGroupsTable.id],
    }),
    participants: many(TournamentMatchParticipantsTable),
}));

export const TournamentMatchParticipantsRelations = relations(TournamentMatchParticipantsTable, ({ one }) => ({
    match: one(TournamentMatchesTable, {
        fields: [TournamentMatchParticipantsTable.matchId],
        references: [TournamentMatchesTable.id],
    }),
    participant: one(TournamentParticipantsTable, {
        fields: [TournamentMatchParticipantsTable.participantId],
        references: [TournamentParticipantsTable.id],
    }),
}));

export const TournamentGamesRelations = relations(TournamentGamesTable, ({ one }) => ({
    match: one(TournamentMatchesTable, {
        fields: [TournamentGamesTable.matchId],
        references: [TournamentMatchesTable.id],
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
    suspensions: many(UserSuspensionsTable),
    sessions: many(SessionsTable),
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