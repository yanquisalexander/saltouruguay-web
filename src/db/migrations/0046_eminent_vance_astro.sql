CREATE TYPE "public"."pet_item_category" AS ENUM('food', 'toy', 'furniture', 'clothing', 'accessory');--> statement-breakpoint
CREATE TYPE "public"."pet_item_rarity" AS ENUM('common', 'uncommon', 'rare', 'epic', 'legendary');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pet_houses" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" integer NOT NULL,
	"background_id" varchar DEFAULT 'default' NOT NULL,
	"layout" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT current_timestamp NOT NULL,
	"updated_at" timestamp DEFAULT current_timestamp NOT NULL,
	CONSTRAINT "pet_houses_owner_id_unique" UNIQUE("owner_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pet_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"category" "pet_item_category" NOT NULL,
	"rarity" "pet_item_rarity" DEFAULT 'common' NOT NULL,
	"price" integer NOT NULL,
	"icon_url" varchar,
	"effect_value" integer DEFAULT 0 NOT NULL,
	"is_consumable" boolean DEFAULT true NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT current_timestamp NOT NULL,
	"updated_at" timestamp DEFAULT current_timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pet_minigame_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"game_name" varchar(50) NOT NULL,
	"score" integer NOT NULL,
	"coins_earned" integer DEFAULT 0 NOT NULL,
	"played_at" timestamp DEFAULT current_timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pet_user_inventory" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"acquired_at" timestamp DEFAULT current_timestamp NOT NULL,
	CONSTRAINT "user_item_idx" UNIQUE("user_id","item_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pets" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" integer NOT NULL,
	"name" varchar(50) NOT NULL,
	"appearance" jsonb DEFAULT '{"color":"#FFD700","skinId":null,"hatId":null,"accessoryId":null}'::jsonb NOT NULL,
	"hunger" integer DEFAULT 100 NOT NULL,
	"energy" integer DEFAULT 100 NOT NULL,
	"hygiene" integer DEFAULT 100 NOT NULL,
	"happiness" integer DEFAULT 100 NOT NULL,
	"last_interaction" timestamp DEFAULT current_timestamp NOT NULL,
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
 ALTER TABLE "pet_minigame_scores" ADD CONSTRAINT "pet_minigame_scores_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pet_user_inventory" ADD CONSTRAINT "pet_user_inventory_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pet_user_inventory" ADD CONSTRAINT "pet_user_inventory_item_id_pet_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."pet_items"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pets" ADD CONSTRAINT "pets_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
