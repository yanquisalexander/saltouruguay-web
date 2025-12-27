CREATE TABLE IF NOT EXISTS "custom_page_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"page_id" integer NOT NULL,
	"title" varchar NOT NULL,
	"slug" varchar NOT NULL,
	"permalink" varchar NOT NULL,
	"content" text NOT NULL,
	"cooked_html" text,
	"editor_id" integer NOT NULL,
	"created_at" timestamp DEFAULT current_timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "custom_pages" ADD COLUMN "cooked_html" text;--> statement-breakpoint
ALTER TABLE "custom_pages" ADD COLUMN "author_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "custom_pages" ADD COLUMN "last_editor_id" integer;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "custom_page_history" ADD CONSTRAINT "custom_page_history_page_id_custom_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."custom_pages"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "custom_page_history" ADD CONSTRAINT "custom_page_history_editor_id_users_id_fk" FOREIGN KEY ("editor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "custom_pages" ADD CONSTRAINT "custom_pages_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "custom_pages" ADD CONSTRAINT "custom_pages_last_editor_id_users_id_fk" FOREIGN KEY ("last_editor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
