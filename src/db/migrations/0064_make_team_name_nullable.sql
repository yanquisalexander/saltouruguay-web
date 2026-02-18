-- 0064_make_team_name_nullable.sql
-- Allow NULLs in tournament_participants.team_name so players can be unassigned from teams
ALTER TABLE "tournament_participants" ALTER COLUMN "team_name" DROP NOT NULL;