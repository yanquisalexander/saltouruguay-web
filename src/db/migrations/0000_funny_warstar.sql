CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar NOT NULL,
	"twitch_id" varchar,
	"display_name" varchar NOT NULL,
	"username" varchar NOT NULL,
	"avatar" varchar,
	"twitch_tier" integer,
	"admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT current_timestamp NOT NULL,
	"updated_at" timestamp DEFAULT current_timestamp NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_twitch_id_unique" UNIQUE("twitch_id")
);
