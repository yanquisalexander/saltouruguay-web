CREATE TABLE IF NOT EXISTS "saltogram_stories" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"media_url" varchar NOT NULL,
	"media_type" varchar NOT NULL,
	"duration" integer DEFAULT 5,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT current_timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "saltogram_story_likes" (
	"id" serial PRIMARY KEY NOT NULL,
	"story_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT current_timestamp NOT NULL,
	CONSTRAINT "unique_story_like" UNIQUE("story_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "saltogram_story_views" (
	"id" serial PRIMARY KEY NOT NULL,
	"story_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"viewed_at" timestamp DEFAULT current_timestamp NOT NULL,
	CONSTRAINT "unique_story_view" UNIQUE("story_id","user_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "saltogram_stories" ADD CONSTRAINT "saltogram_stories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "saltogram_story_likes" ADD CONSTRAINT "saltogram_story_likes_story_id_saltogram_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."saltogram_stories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "saltogram_story_likes" ADD CONSTRAINT "saltogram_story_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "saltogram_story_views" ADD CONSTRAINT "saltogram_story_views_story_id_saltogram_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."saltogram_stories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "saltogram_story_views" ADD CONSTRAINT "saltogram_story_views_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
