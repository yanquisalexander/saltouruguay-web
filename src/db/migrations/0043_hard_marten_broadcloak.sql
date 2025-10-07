CREATE TABLE IF NOT EXISTS "extremo3_repechaje_votes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"player_id" integer NOT NULL,
	"created_at" timestamp DEFAULT current_timestamp NOT NULL,
	CONSTRAINT "extremo3_repechaje_votes_user_id_player_id_unique" UNIQUE("user_id","player_id")
);
--> statement-breakpoint
ALTER TABLE "extremo3_players" ADD COLUMN "is_repechaje" boolean DEFAULT false NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "extremo3_repechaje_votes" ADD CONSTRAINT "extremo3_repechaje_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "extremo3_repechaje_votes" ADD CONSTRAINT "extremo3_repechaje_votes_player_id_extremo3_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."extremo3_players"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
