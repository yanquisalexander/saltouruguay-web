ALTER TABLE "tournament_games" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tournament_group_participants" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tournament_groups" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tournament_match_participants" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tournament_rounds" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tournament_stages" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tournament_team_members" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tournament_teams" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "tournament_games" CASCADE;--> statement-breakpoint
DROP TABLE "tournament_group_participants" CASCADE;--> statement-breakpoint
DROP TABLE "tournament_groups" CASCADE;--> statement-breakpoint
DROP TABLE "tournament_match_participants" CASCADE;--> statement-breakpoint
DROP TABLE "tournament_rounds" CASCADE;--> statement-breakpoint
DROP TABLE "tournament_stages" CASCADE;--> statement-breakpoint
DROP TABLE "tournament_team_members" CASCADE;--> statement-breakpoint
DROP TABLE "tournament_teams" CASCADE;--> statement-breakpoint
ALTER TABLE "tournament_matches" RENAME COLUMN "round_id" TO "round";--> statement-breakpoint
ALTER TABLE "tournament_matches" RENAME COLUMN "match_number" TO "match_order";--> statement-breakpoint
ALTER TABLE "tournament_participants" RENAME COLUMN "display_name" TO "team_name";--> statement-breakpoint
ALTER TABLE "tournaments" RENAME COLUMN "organizer_id" TO "creator_id";--> statement-breakpoint
ALTER TABLE "tournament_matches" DROP CONSTRAINT IF EXISTS "tournament_matches_stage_id_tournament_stages_id_fk";
--> statement-breakpoint
ALTER TABLE "tournament_matches" DROP CONSTRAINT IF EXISTS "tournament_matches_round_id_tournament_rounds_id_fk";
--> statement-breakpoint
ALTER TABLE "tournament_matches" DROP CONSTRAINT IF EXISTS "tournament_matches_group_id_tournament_groups_id_fk";
--> statement-breakpoint
ALTER TABLE "tournament_matches" DROP CONSTRAINT IF EXISTS "tournament_matches_tournament_id_tournaments_id_fk";
--> statement-breakpoint
ALTER TABLE "tournament_participants" DROP CONSTRAINT IF EXISTS "tournament_participants_team_id_tournament_teams_id_fk";
--> statement-breakpoint
ALTER TABLE "tournament_participants" DROP CONSTRAINT IF EXISTS "tournament_participants_tournament_id_tournaments_id_fk";
--> statement-breakpoint
ALTER TABLE "tournament_participants" DROP CONSTRAINT IF EXISTS "tournament_participants_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "tournaments" DROP CONSTRAINT IF EXISTS "tournaments_organizer_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "tournament_matches" ALTER COLUMN "status" SET DATA TYPE varchar(20);--> statement-breakpoint
ALTER TABLE "tournament_matches" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "tournament_participants" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tournament_participants" ALTER COLUMN "status" SET DATA TYPE varchar(20);--> statement-breakpoint
ALTER TABLE "tournament_participants" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "tournaments" ALTER COLUMN "name" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "tournaments" ALTER COLUMN "max_participants" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "tournaments" ALTER COLUMN "status" SET DATA TYPE varchar(20);--> statement-breakpoint
ALTER TABLE "tournaments" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "tournaments" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "tournament_matches" ADD COLUMN "player1_id" integer;--> statement-breakpoint
ALTER TABLE "tournament_matches" ADD COLUMN "player2_id" integer;--> statement-breakpoint
ALTER TABLE "tournament_matches" ADD COLUMN "score1" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "tournament_matches" ADD COLUMN "score2" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "tournament_matches" ADD COLUMN "winner_id" integer;--> statement-breakpoint
ALTER TABLE "tournament_matches" ADD COLUMN "start_time" timestamp;--> statement-breakpoint
ALTER TABLE "tournament_matches" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "tournament_participants" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "banner_url" varchar;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "format" varchar(20) NOT NULL;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "privacy" varchar(10) DEFAULT 'public' NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tournament_matches" ADD CONSTRAINT "tournament_matches_player1_id_users_id_fk" FOREIGN KEY ("player1_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tournament_matches" ADD CONSTRAINT "tournament_matches_player2_id_users_id_fk" FOREIGN KEY ("player2_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tournament_matches" ADD CONSTRAINT "tournament_matches_winner_id_users_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tournament_matches" ADD CONSTRAINT "tournament_matches_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tournament_participants" ADD CONSTRAINT "tournament_participants_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tournament_participants" ADD CONSTRAINT "tournament_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "tournament_matches" DROP COLUMN IF EXISTS "stage_id";--> statement-breakpoint
ALTER TABLE "tournament_matches" DROP COLUMN IF EXISTS "group_id";--> statement-breakpoint
ALTER TABLE "tournament_matches" DROP COLUMN IF EXISTS "best_of";--> statement-breakpoint
ALTER TABLE "tournament_matches" DROP COLUMN IF EXISTS "scheduled_time";--> statement-breakpoint
ALTER TABLE "tournament_matches" DROP COLUMN IF EXISTS "next_match_for_loser_id";--> statement-breakpoint
ALTER TABLE "tournament_matches" DROP COLUMN IF EXISTS "updated_at";--> statement-breakpoint
ALTER TABLE "tournament_participants" DROP COLUMN IF EXISTS "team_id";--> statement-breakpoint
ALTER TABLE "tournament_participants" DROP COLUMN IF EXISTS "checked_in";--> statement-breakpoint
ALTER TABLE "tournament_participants" DROP COLUMN IF EXISTS "updated_at";--> statement-breakpoint
ALTER TABLE "tournaments" DROP COLUMN IF EXISTS "tournament_type";--> statement-breakpoint
ALTER TABLE "tournaments" DROP COLUMN IF EXISTS "is_public";--> statement-breakpoint
ALTER TABLE "tournaments" DROP COLUMN IF EXISTS "signup_end_date";--> statement-breakpoint
ALTER TABLE "tournaments" DROP COLUMN IF EXISTS "game_name";--> statement-breakpoint
ALTER TABLE "tournament_participants" ADD CONSTRAINT "tournament_participants_tournament_id_user_id_unique" UNIQUE("tournament_id","user_id");