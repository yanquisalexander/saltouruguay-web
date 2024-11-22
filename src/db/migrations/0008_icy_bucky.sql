CREATE TYPE "public"."status" AS ENUM('pending', 'repaid', 'defaulted');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "loans" (
	"id" serial PRIMARY KEY NOT NULL,
	"lender_id" integer,
	"borrower_id" integer,
	"amount" integer NOT NULL,
	"due_date" timestamp NOT NULL,
	"created_at" timestamp DEFAULT current_timestamp NOT NULL,
	"updated_at" timestamp DEFAULT current_timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "coins" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "loans" ADD CONSTRAINT "loans_lender_id_users_id_fk" FOREIGN KEY ("lender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "loans" ADD CONSTRAINT "loans_borrower_id_users_id_fk" FOREIGN KEY ("borrower_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
