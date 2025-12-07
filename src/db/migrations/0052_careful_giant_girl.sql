ALTER TABLE "saltogram_stories" ADD COLUMN "visibility" varchar DEFAULT 'public' NOT NULL;--> statement-breakpoint
ALTER TABLE "saltogram_stories" DROP COLUMN IF EXISTS "is_vip";