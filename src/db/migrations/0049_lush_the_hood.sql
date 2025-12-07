CREATE TABLE IF NOT EXISTS "friends" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"friend_id" integer NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT current_timestamp NOT NULL,
	"updated_at" timestamp DEFAULT current_timestamp NOT NULL,
	CONSTRAINT "unique_friendship" UNIQUE("user_id","friend_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "friends" ADD CONSTRAINT "friends_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "friends" ADD CONSTRAINT "friends_friend_id_users_id_fk" FOREIGN KEY ("friend_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "pet_items" ADD CONSTRAINT "pet_items_name_unique" UNIQUE("name");