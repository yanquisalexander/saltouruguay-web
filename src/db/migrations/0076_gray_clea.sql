CREATE TABLE IF NOT EXISTS "sticker_drop_windows" (
	"window_key" text PRIMARY KEY NOT NULL,
	"stream_id" text,
	"packs_granted" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT current_timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sticker_packs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"tier" varchar DEFAULT 'comun' NOT NULL,
	"source" varchar DEFAULT 'stream_drop' NOT NULL,
	"opened" boolean DEFAULT false NOT NULL,
	"cards" jsonb,
	"created_at" timestamp DEFAULT current_timestamp NOT NULL,
	"opened_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_sticker_inventory" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"sticker_id" integer NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"first_obtained_at" timestamp DEFAULT current_timestamp NOT NULL,
	"updated_at" timestamp DEFAULT current_timestamp NOT NULL,
	CONSTRAINT "user_sticker_inventory_user_id_sticker_id_unique" UNIQUE("user_id","sticker_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sticker_packs" ADD CONSTRAINT "sticker_packs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_sticker_inventory" ADD CONSTRAINT "user_sticker_inventory_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
