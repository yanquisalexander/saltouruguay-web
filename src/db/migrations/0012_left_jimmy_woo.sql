CREATE TABLE IF NOT EXISTS "streamer_wars_inscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"discord_username" varchar,
	"accepted_terms" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT current_timestamp NOT NULL,
	"updated_at" timestamp DEFAULT current_timestamp NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "streamer_wars_inscriptions" ADD CONSTRAINT "streamer_wars_inscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
