CREATE TABLE IF NOT EXISTS "sus_oauth_authorization_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"user_id" integer NOT NULL,
	"code" varchar NOT NULL,
	"scopes" text[] NOT NULL,
	"redirect_uri" varchar NOT NULL,
	"code_challenge" varchar,
	"code_challenge_method" varchar,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT current_timestamp NOT NULL,
	CONSTRAINT "sus_oauth_authorization_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sus_oauth_client_redirect_uris" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"redirect_uri" varchar NOT NULL,
	"created_at" timestamp DEFAULT current_timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sus_oauth_clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"icon" varchar,
	"website" varchar,
	"client_secret" varchar NOT NULL,
	"allowed_scopes" text[] DEFAULT '{}' NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT current_timestamp NOT NULL,
	"updated_at" timestamp DEFAULT current_timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sus_oauth_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"user_id" integer NOT NULL,
	"access_token" varchar NOT NULL,
	"refresh_token" varchar,
	"scopes" text[] NOT NULL,
	"access_token_expires_at" timestamp NOT NULL,
	"refresh_token_expires_at" timestamp,
	"revoked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT current_timestamp NOT NULL,
	CONSTRAINT "sus_oauth_tokens_access_token_unique" UNIQUE("access_token"),
	CONSTRAINT "sus_oauth_tokens_refresh_token_unique" UNIQUE("refresh_token")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sus_oauth_authorization_codes" ADD CONSTRAINT "sus_oauth_authorization_codes_client_id_sus_oauth_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."sus_oauth_clients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sus_oauth_authorization_codes" ADD CONSTRAINT "sus_oauth_authorization_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sus_oauth_client_redirect_uris" ADD CONSTRAINT "sus_oauth_client_redirect_uris_client_id_sus_oauth_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."sus_oauth_clients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sus_oauth_clients" ADD CONSTRAINT "sus_oauth_clients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sus_oauth_tokens" ADD CONSTRAINT "sus_oauth_tokens_client_id_sus_oauth_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."sus_oauth_clients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sus_oauth_tokens" ADD CONSTRAINT "sus_oauth_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
