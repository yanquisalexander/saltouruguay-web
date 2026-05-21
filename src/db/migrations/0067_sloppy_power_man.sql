CREATE TABLE IF NOT EXISTS "fortnite_league_inscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"discord_username" varchar NOT NULL,
	"epic_id" varchar NOT NULL,
	"platform" varchar DEFAULT 'PC' NOT NULL,
	"division" varchar DEFAULT 'clasificatoria' NOT NULL,
	"created_at" timestamp DEFAULT current_timestamp NOT NULL,
	"updated_at" timestamp DEFAULT current_timestamp NOT NULL,
	CONSTRAINT "fortnite_league_inscriptions_epic_id_unique" UNIQUE("epic_id"),
	CONSTRAINT "fortnite_league_inscriptions_discord_username_unique" UNIQUE("discord_username")
);
