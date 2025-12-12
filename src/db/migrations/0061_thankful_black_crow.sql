CREATE TABLE IF NOT EXISTS "saltogram_comment_reactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"comment_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"emoji" varchar(10) NOT NULL,
	"created_at" timestamp with time zone DEFAULT current_timestamp NOT NULL,
	CONSTRAINT "unique_user_comment_emoji" UNIQUE("comment_id","user_id","emoji")
);
--> statement-breakpoint
ALTER TABLE "pet_items" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "pet_items" CASCADE;--> statement-breakpoint
ALTER TABLE "pet_user_inventory" DROP CONSTRAINT IF EXISTS "pet_user_inventory_item_id_pet_items_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "saltogram_comment_reactions" ADD CONSTRAINT "saltogram_comment_reactions_comment_id_saltogram_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."saltogram_comments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "saltogram_comment_reactions" ADD CONSTRAINT "saltogram_comment_reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DROP TYPE "public"."pet_item_category";--> statement-breakpoint
DROP TYPE "public"."pet_item_rarity";