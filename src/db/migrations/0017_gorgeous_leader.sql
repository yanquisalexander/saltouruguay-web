CREATE TABLE IF NOT EXISTS "streamer_wars_team_players" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer,
	"player_number" integer
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "streamer_wars_team_players" ADD CONSTRAINT "streamer_wars_team_players_team_id_streamer_wars_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."streamer_wars_teams"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "streamer_wars_team_players" ADD CONSTRAINT "streamer_wars_team_players_player_number_streamer_wars_players_player_number_fk" FOREIGN KEY ("player_number") REFERENCES "public"."streamer_wars_players"("player_number") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
