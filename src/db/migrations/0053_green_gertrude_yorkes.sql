ALTER TABLE "saltogram_comments" ADD COLUMN "parent_id" integer;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "saltogram_comments" ADD CONSTRAINT "saltogram_comments_parent_id_saltogram_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."saltogram_comments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
