ALTER TABLE "negative_votes_streamers" DROP CONSTRAINT "negative_votes_streamers_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "negative_votes_streamers" DROP CONSTRAINT "negative_votes_streamers_player_number_streamer_wars_players_player_number_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "negative_votes_streamers" ADD CONSTRAINT "negative_votes_streamers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "negative_votes_streamers" ADD CONSTRAINT "negative_votes_streamers_player_number_streamer_wars_players_player_number_fk" FOREIGN KEY ("player_number") REFERENCES "public"."streamer_wars_players"("player_number") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
