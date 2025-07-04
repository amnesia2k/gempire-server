CREATE TYPE "public"."delivery_method" AS ENUM('delivery', 'pickup');--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "deliveryMethod" "delivery_method" DEFAULT 'delivery' NOT NULL;