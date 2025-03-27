CREATE TABLE IF NOT EXISTS "salto_play_achievements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"icon" varchar,
	"xp_reward" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp DEFAULT current_timestamp NOT NULL,
	"updated_at" timestamp DEFAULT current_timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "salto_play_developers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" integer NOT NULL,
	"developer_name" varchar NOT NULL,
	"developer_url" varchar NOT NULL,
	"created_at" timestamp DEFAULT current_timestamp NOT NULL,
	"updated_at" timestamp DEFAULT current_timestamp NOT NULL,
	CONSTRAINT "salto_play_developers_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "salto_play_game_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"user_id" integer NOT NULL,
	"access_token" varchar NOT NULL,
	"refresh_token" varchar NOT NULL,
	"scopes" varchar NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT current_timestamp NOT NULL,
	"updated_at" timestamp DEFAULT current_timestamp NOT NULL,
	CONSTRAINT "salto_play_game_tokens_access_token_unique" UNIQUE("access_token"),
	CONSTRAINT "salto_play_game_tokens_refresh_token_unique" UNIQUE("refresh_token"),
	CONSTRAINT "game_user_idx" UNIQUE("game_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "salto_play_games" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"developer_id" uuid NOT NULL,
	"icon" varchar,
	"url" varchar,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"client_secret" varchar NOT NULL,
	"redirect_uri" varchar NOT NULL,
	"created_at" timestamp DEFAULT current_timestamp NOT NULL,
	"updated_at" timestamp DEFAULT current_timestamp NOT NULL,
	CONSTRAINT "salto_play_games_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "salto_tag_achievements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"salto_tag_id" integer NOT NULL,
	"achievement_id" uuid NOT NULL,
	"unlocked_at" timestamp DEFAULT current_timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "salto_tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"salto_tag" varchar NOT NULL,
	"discriminator" varchar NOT NULL,
	"avatar" varchar,
	"total_xp" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT current_timestamp NOT NULL,
	"updated_at" timestamp DEFAULT current_timestamp NOT NULL,
	CONSTRAINT "salto_tags_salto_tag_unique" UNIQUE("salto_tag")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "salto_play_achievements" ADD CONSTRAINT "salto_play_achievements_game_id_salto_play_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."salto_play_games"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "salto_play_developers" ADD CONSTRAINT "salto_play_developers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "salto_play_game_tokens" ADD CONSTRAINT "salto_play_game_tokens_game_id_salto_play_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."salto_play_games"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "salto_play_game_tokens" ADD CONSTRAINT "salto_play_game_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "salto_play_games" ADD CONSTRAINT "salto_play_games_developer_id_salto_play_developers_id_fk" FOREIGN KEY ("developer_id") REFERENCES "public"."salto_play_developers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "salto_tag_achievements" ADD CONSTRAINT "salto_tag_achievements_salto_tag_id_salto_tags_id_fk" FOREIGN KEY ("salto_tag_id") REFERENCES "public"."salto_tags"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "salto_tag_achievements" ADD CONSTRAINT "salto_tag_achievements_achievement_id_salto_play_achievements_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."salto_play_achievements"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "salto_tags" ADD CONSTRAINT "salto_tags_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
