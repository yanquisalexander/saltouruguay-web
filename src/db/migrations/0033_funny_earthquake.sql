CREATE TABLE IF NOT EXISTS "custom_pages" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar NOT NULL,
	"slug" varchar NOT NULL,
	"permalink" varchar NOT NULL,
	"content" text NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"is_draft" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT current_timestamp NOT NULL,
	"updated_at" timestamp DEFAULT current_timestamp NOT NULL,
	CONSTRAINT "custom_pages_slug_unique" UNIQUE("slug"),
	CONSTRAINT "custom_pages_permalink_unique" UNIQUE("permalink"),
	CONSTRAINT "slug" UNIQUE("slug"),
	CONSTRAINT "permalink" UNIQUE("permalink")
);
