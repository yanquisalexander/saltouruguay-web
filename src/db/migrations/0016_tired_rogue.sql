CREATE TABLE IF NOT EXISTS "streamer_wars_teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"color" varchar NOT NULL
);
--> statement-breakpoint
ALTER TABLE "streamer_wars_players" ADD CONSTRAINT "streamer_wars_players_player_number_unique" UNIQUE("player_number");