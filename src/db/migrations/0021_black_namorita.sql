CREATE TABLE IF NOT EXISTS "negative_votes_streamers" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"player_number" integer,
	"created_at" timestamp DEFAULT current_timestamp NOT NULL,
	"updated_at" timestamp DEFAULT current_timestamp NOT NULL,
	CONSTRAINT "negative_votes_streamers_user_id_player_number_unique" UNIQUE("user_id","player_number")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "negative_votes_streamers" ADD CONSTRAINT "negative_votes_streamers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "negative_votes_streamers" ADD CONSTRAINT "negative_votes_streamers_player_number_streamer_wars_players_player_number_fk" FOREIGN KEY ("player_number") REFERENCES "public"."streamer_wars_players"("player_number") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
