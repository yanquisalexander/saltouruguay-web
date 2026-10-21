CREATE TABLE IF NOT EXISTS "conga_game_rooms" (
	"id" serial PRIMARY KEY NOT NULL,
	"room_code" varchar(6) NOT NULL,
	"owner_id" integer NOT NULL,
	"player_ids" integer[] DEFAULT '{}'::integer[] NOT NULL,
	"status" varchar DEFAULT 'waiting' NOT NULL,
	"state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT current_timestamp NOT NULL,
	"updated_at" timestamp DEFAULT current_timestamp NOT NULL,
	CONSTRAINT "conga_game_rooms_room_code_unique" UNIQUE("room_code")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "conga_game_rooms" ADD CONSTRAINT "conga_game_rooms_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
