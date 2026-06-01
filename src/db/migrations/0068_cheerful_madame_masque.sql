CREATE TABLE IF NOT EXISTS "fortnite_league_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"inscription_id" integer NOT NULL,
	"set1" integer DEFAULT 0 NOT NULL,
	"set2" integer DEFAULT 0 NOT NULL,
	"set3" integer DEFAULT 0 NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT current_timestamp NOT NULL,
	"updated_at" timestamp DEFAULT current_timestamp NOT NULL,
	CONSTRAINT "fortnite_league_scores_inscription_id_unique" UNIQUE("inscription_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "linked_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" integer NOT NULL,
	"provider" varchar(50) NOT NULL,
	"provider_user_id" varchar(255) NOT NULL,
	"username" varchar(255),
	"avatar" varchar(500),
	"access_token" text,
	"refresh_token" text,
	"token_expires_at" timestamp,
	"scopes" text[],
	"created_at" timestamp DEFAULT current_timestamp NOT NULL,
	"updated_at" timestamp DEFAULT current_timestamp NOT NULL,
	CONSTRAINT "linked_accounts_provider_provider_user_id_unique" UNIQUE("provider","provider_user_id"),
	CONSTRAINT "linked_accounts_user_id_provider_unique" UNIQUE("user_id","provider")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fortnite_league_scores" ADD CONSTRAINT "fortnite_league_scores_inscription_id_fortnite_league_inscriptions_id_fk" FOREIGN KEY ("inscription_id") REFERENCES "public"."fortnite_league_inscriptions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "linked_accounts" ADD CONSTRAINT "linked_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
