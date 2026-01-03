CREATE TABLE IF NOT EXISTS "acreconre_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"email" varchar NOT NULL,
	"discord_username" varchar NOT NULL,
	"platform_type" varchar NOT NULL,
	"platform_name" varchar,
	"canal_name" varchar NOT NULL,
	"canal_link" varchar,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT current_timestamp NOT NULL,
	"updated_at" timestamp DEFAULT current_timestamp NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "acreconre_members" ADD CONSTRAINT "acreconre_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
