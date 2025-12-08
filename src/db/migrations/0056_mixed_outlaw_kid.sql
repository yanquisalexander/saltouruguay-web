CREATE TABLE IF NOT EXISTS "saltogram_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"text" varchar(60),
	"music_url" text,
	"music_track_id" text,
	"music_title" text,
	"music_artist" text,
	"music_cover" text,
	"visibility" varchar DEFAULT 'public' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT current_timestamp NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "saltogram_notes" ADD CONSTRAINT "saltogram_notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
