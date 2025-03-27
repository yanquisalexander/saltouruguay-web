CREATE TABLE IF NOT EXISTS "salto_play_authorization_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"user_id" integer NOT NULL,
	"code" varchar NOT NULL,
	"scopes" varchar NOT NULL,
	"redirect_uri" varchar NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT current_timestamp NOT NULL,
	CONSTRAINT "salto_play_authorization_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "salto_play_authorization_codes" ADD CONSTRAINT "salto_play_authorization_codes_game_id_salto_play_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."salto_play_games"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "salto_play_authorization_codes" ADD CONSTRAINT "salto_play_authorization_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
