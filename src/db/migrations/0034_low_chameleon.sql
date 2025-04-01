CREATE TABLE IF NOT EXISTS "tournament_games" (
	"id" serial PRIMARY KEY NOT NULL,
	"match_id" integer NOT NULL,
	"game_number" integer NOT NULL,
	"winner_id" integer,
	"details" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT current_timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tournament_group_participants" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"participant_id" integer NOT NULL,
	"stats" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT current_timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tournament_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"tournament_id" integer NOT NULL,
	"stage_id" integer,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT current_timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tournament_match_participants" (
	"id" serial PRIMARY KEY NOT NULL,
	"match_id" integer NOT NULL,
	"participant_id" integer NOT NULL,
	"position" integer DEFAULT 0,
	"score" integer DEFAULT 0,
	"is_winner" boolean DEFAULT false,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT current_timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tournament_matches" (
	"id" serial PRIMARY KEY NOT NULL,
	"tournament_id" integer NOT NULL,
	"stage_id" integer,
	"round_id" integer NOT NULL,
	"group_id" integer,
	"match_number" integer NOT NULL,
	"best_of" integer DEFAULT 1,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"scheduled_time" timestamp,
	"next_match_id" integer,
	"next_match_for_loser_id" integer,
	"created_at" timestamp DEFAULT current_timestamp NOT NULL,
	"updated_at" timestamp DEFAULT current_timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tournament_participants" (
	"id" serial PRIMARY KEY NOT NULL,
	"tournament_id" integer NOT NULL,
	"user_id" integer,
	"team_id" integer,
	"display_name" varchar(255) NOT NULL,
	"seed" integer,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"checked_in" boolean DEFAULT false,
	"created_at" timestamp DEFAULT current_timestamp NOT NULL,
	"updated_at" timestamp DEFAULT current_timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tournament_rounds" (
	"id" serial PRIMARY KEY NOT NULL,
	"tournament_id" integer NOT NULL,
	"stage_id" integer,
	"number" integer NOT NULL,
	"name" varchar(255),
	"status" varchar DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT current_timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tournament_stages" (
	"id" serial PRIMARY KEY NOT NULL,
	"tournament_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"stage_type" varchar NOT NULL,
	"order" integer NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT current_timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tournament_team_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" varchar(50) DEFAULT 'member',
	"created_at" timestamp DEFAULT current_timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tournament_teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"logo" varchar,
	"captain_id" integer NOT NULL,
	"created_at" timestamp DEFAULT current_timestamp NOT NULL,
	"updated_at" timestamp DEFAULT current_timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tournaments" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"tournament_type" varchar NOT NULL,
	"max_participants" integer DEFAULT 100,
	"organizer_id" integer NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"signup_end_date" timestamp,
	"start_date" timestamp,
	"end_date" timestamp,
	"status" varchar DEFAULT 'draft' NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT current_timestamp NOT NULL,
	"updated_at" timestamp DEFAULT current_timestamp NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tournament_games" ADD CONSTRAINT "tournament_games_match_id_tournament_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."tournament_matches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tournament_games" ADD CONSTRAINT "tournament_games_winner_id_tournament_participants_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."tournament_participants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tournament_group_participants" ADD CONSTRAINT "tournament_group_participants_group_id_tournament_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."tournament_groups"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tournament_group_participants" ADD CONSTRAINT "tournament_group_participants_participant_id_tournament_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."tournament_participants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tournament_groups" ADD CONSTRAINT "tournament_groups_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tournament_groups" ADD CONSTRAINT "tournament_groups_stage_id_tournament_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."tournament_stages"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tournament_match_participants" ADD CONSTRAINT "tournament_match_participants_match_id_tournament_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."tournament_matches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tournament_match_participants" ADD CONSTRAINT "tournament_match_participants_participant_id_tournament_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."tournament_participants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tournament_matches" ADD CONSTRAINT "tournament_matches_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tournament_matches" ADD CONSTRAINT "tournament_matches_stage_id_tournament_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."tournament_stages"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tournament_matches" ADD CONSTRAINT "tournament_matches_round_id_tournament_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."tournament_rounds"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tournament_matches" ADD CONSTRAINT "tournament_matches_group_id_tournament_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."tournament_groups"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tournament_participants" ADD CONSTRAINT "tournament_participants_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tournament_participants" ADD CONSTRAINT "tournament_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tournament_participants" ADD CONSTRAINT "tournament_participants_team_id_tournament_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."tournament_teams"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tournament_rounds" ADD CONSTRAINT "tournament_rounds_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tournament_rounds" ADD CONSTRAINT "tournament_rounds_stage_id_tournament_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."tournament_stages"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tournament_stages" ADD CONSTRAINT "tournament_stages_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tournament_team_members" ADD CONSTRAINT "tournament_team_members_team_id_tournament_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."tournament_teams"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tournament_team_members" ADD CONSTRAINT "tournament_team_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tournament_teams" ADD CONSTRAINT "tournament_teams_captain_id_users_id_fk" FOREIGN KEY ("captain_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_organizer_id_users_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
