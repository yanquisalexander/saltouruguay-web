CREATE TABLE IF NOT EXISTS "event_organizers" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT current_timestamp NOT NULL,
	CONSTRAINT "event_organizers_event_id_user_id_unique" UNIQUE("event_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "cover" varchar;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "event_organizers" ADD CONSTRAINT "event_organizers_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "event_organizers" ADD CONSTRAINT "event_organizers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
