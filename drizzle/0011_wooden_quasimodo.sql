CREATE TABLE "promo_codes" (
	"_id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(255) NOT NULL,
	"discount" numeric(5, 2) NOT NULL,
	"isPercentage" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "promo_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "promoCodeId" varchar(255) DEFAULT '';--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "discountAmount" numeric(10, 2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_promoCodeId_promo_codes__id_fk" FOREIGN KEY ("promoCodeId") REFERENCES "public"."promo_codes"("_id") ON DELETE set null ON UPDATE no action;