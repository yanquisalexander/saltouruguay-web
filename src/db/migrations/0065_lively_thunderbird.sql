ALTER TABLE "tournaments" ADD COLUMN "featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "external_challonge_bracket_id" varchar(255);