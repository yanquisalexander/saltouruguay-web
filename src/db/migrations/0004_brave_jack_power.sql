ALTER TABLE "achievements" DROP CONSTRAINT "achievements_name_unique";--> statement-breakpoint
ALTER TABLE "achievements" DROP COLUMN IF EXISTS "name";--> statement-breakpoint
ALTER TABLE "achievements" DROP COLUMN IF EXISTS "description";--> statement-breakpoint
ALTER TABLE "achievements" DROP COLUMN IF EXISTS "icon_url";