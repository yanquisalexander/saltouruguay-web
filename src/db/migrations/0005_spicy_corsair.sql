ALTER TABLE "users" ADD COLUMN "discord_id" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_discord_id_unique" UNIQUE("discord_id");