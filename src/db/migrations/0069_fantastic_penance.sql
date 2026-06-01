DROP TABLE "oauth_applications" CASCADE;--> statement-breakpoint
DROP TABLE "oauth_codes" CASCADE;--> statement-breakpoint
DROP TABLE "oauth_tokens" CASCADE;

INSERT INTO linked_accounts (user_id, provider, provider_user_id, created_at, updated_at)
SELECT id, 'discord', discord_id, now(), now()
FROM users WHERE discord_id IS NOT NULL;