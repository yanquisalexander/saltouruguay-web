CREATE TABLE IF NOT EXISTS "user_suspensions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"reason" text NOT NULL,
	"start_date" timestamp DEFAULT current_timestamp NOT NULL,
	"end_date" timestamp,
	"appeal_date" timestamp,
	"status" text DEFAULT 'active' NOT NULL,
	CONSTRAINT "user_suspensions_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_suspensions" ADD CONSTRAINT "user_suspensions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
