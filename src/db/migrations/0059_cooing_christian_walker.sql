ALTER TYPE "public"."pet_item_category" ADD VALUE 'eyes';--> statement-breakpoint
ALTER TYPE "public"."pet_item_category" ADD VALUE 'mouth';--> statement-breakpoint
ALTER TYPE "public"."pet_item_category" ADD VALUE 'skin';--> statement-breakpoint
ALTER TABLE "pets" ALTER COLUMN "appearance" SET DEFAULT '{"color":"#FFD700","skinId":null,"hatId":null,"accessoryId":null,"eyesId":null,"mouthId":null}'::jsonb;