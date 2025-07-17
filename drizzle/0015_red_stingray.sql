ALTER TABLE "promo_codes" ADD COLUMN "description" text NOT NULL;--> statement-breakpoint
ALTER TABLE "promo_codes" ADD COLUMN "ctaText" varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE "promo_codes" ADD COLUMN "subtitle" varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE "promo_codes" ADD COLUMN "urgent" boolean DEFAULT false NOT NULL;