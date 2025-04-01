CREATE TABLE IF NOT EXISTS "twitch_processed_events" (
	"message_id" text PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"processed_at" timestamp DEFAULT current_timestamp NOT NULL,
	"user_id" integer,
	"event_data" text
);
