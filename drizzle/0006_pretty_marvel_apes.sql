ALTER TABLE "orders" ADD COLUMN "orderId" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_orderId_unique" UNIQUE("orderId");