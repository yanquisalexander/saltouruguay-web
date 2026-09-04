ALTER TABLE "users" DROP CONSTRAINT "users_discord_id_unique";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "discord_id";