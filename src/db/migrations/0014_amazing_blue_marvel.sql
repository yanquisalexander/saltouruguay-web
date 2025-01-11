CREATE TABLE IF NOT EXISTS "streamer_wars_players" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"player_number" integer NOT NULL,
	"eliminated" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT current_timestamp NOT NULL,
	"updated_at" timestamp DEFAULT current_timestamp NOT NULL,
	CONSTRAINT "streamer_wars_players_user_id_player_number_unique" UNIQUE("user_id","player_number")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "streamer_wars_players" ADD CONSTRAINT "streamer_wars_players_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
