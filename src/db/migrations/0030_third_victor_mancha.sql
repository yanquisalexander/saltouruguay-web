ALTER TABLE "users" ADD COLUMN "two_factor_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "two_factor_secret" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "two_factor_recovery_codes" text[];