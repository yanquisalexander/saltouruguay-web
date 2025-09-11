CREATE TABLE IF NOT EXISTS "extremo3_players" (
	"id" serial PRIMARY KEY NOT NULL,
	"inscription_id" integer,
	"is_confirmed_player" boolean DEFAULT false NOT NULL,
	"lives_count" integer DEFAULT 3 NOT NULL,
	"created_at" timestamp DEFAULT current_timestamp NOT NULL,
	"updated_at" timestamp DEFAULT current_timestamp NOT NULL,
	CONSTRAINT "extremo3_players_inscription_id_unique" UNIQUE("inscription_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "extremo3_players" ADD CONSTRAINT "extremo3_players_inscription_id_salto_craft_extremo3_inscriptions_id_fk" FOREIGN KEY ("inscription_id") REFERENCES "public"."salto_craft_extremo3_inscriptions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
