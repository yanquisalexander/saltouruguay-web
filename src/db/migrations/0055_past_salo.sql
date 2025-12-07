ALTER TABLE "saltogram_reactions" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "saltogram_posts" ADD COLUMN "metadata" jsonb;