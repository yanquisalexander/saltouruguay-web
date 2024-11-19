CREATE TABLE IF NOT EXISTS "member_cards" (
	"user_id" varchar PRIMARY KEY NOT NULL,
	"stickers" text[] NOT NULL,
	"updated_at" timestamp DEFAULT current_timestamp NOT NULL
);
