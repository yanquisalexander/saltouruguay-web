CREATE TYPE "public"."pet_item_type" AS ENUM('food', 'decoration', 'clothing', 'accessory', 'toy');--> statement-breakpoint
CREATE TYPE "public"."pet_stage" AS ENUM('egg', 'baby', 'child', 'teen', 'adult');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pet_houses" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" integer NOT NULL,
	"layout" jsonb DEFAULT '{"wallpaper":"default","flooring":"default","theme":"default"}'::jsonb NOT NULL,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT current_timestamp NOT NULL,
	"updated_at" timestamp DEFAULT current_timestamp NOT NULL,
	CONSTRAINT "pet_houses_owner_id_unique" UNIQUE("owner_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pet_inventory" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"purchased_at" timestamp DEFAULT current_timestamp NOT NULL,
	"created_at" timestamp DEFAULT current_timestamp NOT NULL,
	CONSTRAINT "user_item_idx" UNIQUE("user_id","item_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pet_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"type" "pet_item_type" NOT NULL,
	"price" integer NOT NULL,
	"icon" varchar,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"is_available" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT current_timestamp NOT NULL,
	"updated_at" timestamp DEFAULT current_timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pet_mini_game_limits" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"game_name" varchar(50) NOT NULL,
	"plays_today" integer DEFAULT 0 NOT NULL,
	"last_play_date" timestamp DEFAULT current_date NOT NULL,
	"created_at" timestamp DEFAULT current_timestamp NOT NULL,
	"updated_at" timestamp DEFAULT current_timestamp NOT NULL,
	CONSTRAINT "user_game_limit_idx" UNIQUE("user_id","game_name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pet_mini_game_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"game_name" varchar(50) NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"coins_earned" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp DEFAULT current_timestamp NOT NULL,
	"created_at" timestamp DEFAULT current_timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pet_visits" (
	"id" serial PRIMARY KEY NOT NULL,
	"visitor_id" integer NOT NULL,
	"owner_id" integer NOT NULL,
	"like_given" boolean DEFAULT false NOT NULL,
	"gift_item_id" integer,
	"created_at" timestamp DEFAULT current_timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pets" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" integer NOT NULL,
	"name" varchar(50) NOT NULL,
	"appearance" jsonb DEFAULT '{"color":"#FF6B6B","shape":"round","accessories":[],"clothing":[]}'::jsonb NOT NULL,
	"stats" jsonb DEFAULT '{"hunger":100,"happiness":100,"energy":100,"hygiene":100}'::jsonb NOT NULL,
	"stage" "pet_stage" DEFAULT 'egg' NOT NULL,
	"experience" integer DEFAULT 0 NOT NULL,
	"last_fed" timestamp,
	"last_cleaned" timestamp,
	"last_slept" timestamp,
	"last_updated" timestamp DEFAULT current_timestamp NOT NULL,
	"created_at" timestamp DEFAULT current_timestamp NOT NULL,
	"updated_at" timestamp DEFAULT current_timestamp NOT NULL,
	CONSTRAINT "pets_owner_id_unique" UNIQUE("owner_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pet_houses" ADD CONSTRAINT "pet_houses_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pet_inventory" ADD CONSTRAINT "pet_inventory_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pet_inventory" ADD CONSTRAINT "pet_inventory_item_id_pet_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."pet_items"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pet_mini_game_limits" ADD CONSTRAINT "pet_mini_game_limits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pet_mini_game_sessions" ADD CONSTRAINT "pet_mini_game_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pet_visits" ADD CONSTRAINT "pet_visits_visitor_id_users_id_fk" FOREIGN KEY ("visitor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pet_visits" ADD CONSTRAINT "pet_visits_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pet_visits" ADD CONSTRAINT "pet_visits_gift_item_id_pet_items_id_fk" FOREIGN KEY ("gift_item_id") REFERENCES "public"."pet_items"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pets" ADD CONSTRAINT "pets_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
