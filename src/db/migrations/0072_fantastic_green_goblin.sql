ALTER TABLE "ruleta_loca_game_sessions" ADD COLUMN "room_code" varchar(8);--> statement-breakpoint
ALTER TABLE "ruleta_loca_game_sessions" ADD COLUMN "owner_id" integer;--> statement-breakpoint
ALTER TABLE "ruleta_loca_game_sessions" ADD COLUMN "player_ids" integer[] DEFAULT '{}'::integer[];--> statement-breakpoint
ALTER TABLE "ruleta_loca_game_sessions" ADD COLUMN "scores" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "ruleta_loca_game_sessions" ADD COLUMN "current_turn_idx" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "ruleta_loca_game_sessions" ADD COLUMN "turn_order" integer[] DEFAULT '{}'::integer[];--> statement-breakpoint
ALTER TABLE "ruleta_loca_game_sessions" ADD COLUMN "max_players" integer DEFAULT 4 NOT NULL;--> statement-breakpoint
ALTER TABLE "ruleta_loca_game_sessions" ADD COLUMN "game_mode" varchar DEFAULT 'single' NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ruleta_loca_game_sessions" ADD CONSTRAINT "ruleta_loca_game_sessions_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "ruleta_loca_game_sessions" ADD CONSTRAINT "ruleta_loca_game_sessions_room_code_unique" UNIQUE("room_code");