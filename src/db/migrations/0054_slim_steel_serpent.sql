ALTER TABLE "saltogram_comments" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "saltogram_comments" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "saltogram_messages" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "saltogram_posts" ALTER COLUMN "featured_until" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "saltogram_posts" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "saltogram_posts" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "saltogram_stories" ALTER COLUMN "expires_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "saltogram_stories" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;