CREATE TABLE IF NOT EXISTS "ruleta_loca_game_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"phrase_id" integer NOT NULL,
	"current_score" integer DEFAULT 0 NOT NULL,
	"wheel_value" integer DEFAULT 0 NOT NULL,
	"revealed_letters" text[] DEFAULT '{}',
	"guessed_letters" text[] DEFAULT '{}',
	"status" varchar DEFAULT 'playing' NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT current_timestamp NOT NULL,
	"updated_at" timestamp DEFAULT current_timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ruleta_loca_phrases" (
	"id" serial PRIMARY KEY NOT NULL,
	"phrase" text NOT NULL,
	"category" varchar(100) NOT NULL,
	"difficulty" varchar DEFAULT 'medium' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT current_timestamp NOT NULL,
	"updated_at" timestamp DEFAULT current_timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ruleta_loca_player_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"games_played" integer DEFAULT 0 NOT NULL,
	"games_won" integer DEFAULT 0 NOT NULL,
	"total_coins_earned" integer DEFAULT 0 NOT NULL,
	"total_score" integer DEFAULT 0 NOT NULL,
	"highest_score" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT current_timestamp NOT NULL,
	"updated_at" timestamp DEFAULT current_timestamp NOT NULL,
	CONSTRAINT "ruleta_loca_player_stats_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ruleta_loca_game_sessions" ADD CONSTRAINT "ruleta_loca_game_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ruleta_loca_game_sessions" ADD CONSTRAINT "ruleta_loca_game_sessions_phrase_id_ruleta_loca_phrases_id_fk" FOREIGN KEY ("phrase_id") REFERENCES "public"."ruleta_loca_phrases"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ruleta_loca_player_stats" ADD CONSTRAINT "ruleta_loca_player_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
