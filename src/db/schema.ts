import { TournamentMatchStatus, TournamentParticipantStatus, TournamentStatus, TournamentType } from "../consts/Torneos";
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

// Pet item categories
export const petItemCategoryEnum = pgEnum('pet_item_category', [
    'food',      // Items to feed the pet
    'toy',       // Items to play with the pet
    'furniture', // Decorations for the house
    'clothing',  // Cosmetic items for the pet
    'accessory', // Hats, glasses, etc.
]);

// Pet item rarity
export const petItemRarityEnum = pgEnum('pet_item_rarity', [
    'common',
    'uncommon',
    'rare',
    'epic',
    'legendary'
]);

// Available pet items in the store
export const PetItemsTable = pgTable('pet_items', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 100 }).notNull().unique(),
    description: text('description'),
    category: petItemCategoryEnum('category').notNull(),
    rarity: petItemRarityEnum('rarity').notNull().default('common'),
    price: integer('price').notNull(), // Price in SaltoCoins
    iconUrl: varchar('icon_url'), // URL or path to icon image
    effectValue: integer('effect_value').notNull().default(0), // How much it affects stats (e.g., +20 hunger)
    isConsumable: boolean('is_consumable').notNull().default(true), // If true, item is consumed on use
    isAvailable: boolean('is_available').notNull().default(true), // If item is currently available in store
    createdAt: timestamp('created_at').notNull().default(sql`current_timestamp`),
    updatedAt: timestamp('updated_at').notNull().default(sql`current_timestamp`),
});

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
    itemId: integer('item_id').notNull().references(() => PetItemsTable.id, { onDelete: 'cascade' }),
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
export const petItemsRelations = relations(PetItemsTable, ({ many }) => ({
    inventoryEntries: many(PetUserInventoryTable),
}));

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
    item: one(PetItemsTable, {
        fields: [PetUserInventoryTable.itemId],
        references: [PetItemsTable.id],
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
    featuredUntil: timestamp("featured_until"),
    isHidden: boolean("is_hidden").notNull().default(false),
    createdAt: timestamp("created_at").notNull().default(sql`current_timestamp`),
    updatedAt: timestamp("updated_at").notNull().default(sql`current_timestamp`),
});

export const SaltogramReactionsTable = pgTable("saltogram_reactions", {
    id: serial("id").primaryKey(),
    postId: integer("post_id").notNull().references(() => SaltogramPostsTable.id, { onDelete: "cascade" }),
    userId: integer("user_id").notNull().references(() => UsersTable.id, { onDelete: "cascade" }),
    emoji: varchar("emoji", { length: 10 }).notNull(),
    createdAt: timestamp("created_at").notNull().default(sql`current_timestamp`),
}, (t) => ({
    uniqueUserPostEmoji: unique("unique_user_post_emoji").on(t.postId, t.userId, t.emoji),
}));

export const SaltogramCommentsTable = pgTable("saltogram_comments", {
    id: serial("id").primaryKey(),
    postId: integer("post_id").notNull().references(() => SaltogramPostsTable.id, { onDelete: "cascade" }),
    userId: integer("user_id").notNull().references(() => UsersTable.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    createdAt: timestamp("created_at").notNull().default(sql`current_timestamp`),
    updatedAt: timestamp("updated_at").notNull().default(sql`current_timestamp`),
});

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
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().default(sql`current_timestamp`),
});

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