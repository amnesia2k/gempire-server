CREATE TYPE "public"."order_status" AS ENUM('ordered', 'shipped', 'delivered');--> statement-breakpoint
CREATE TABLE "order_items" (
	"_id" varchar(255) PRIMARY KEY NOT NULL,
	"orderId" varchar(255) NOT NULL,
	"productId" varchar(255) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unitPrice" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"_id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"address" varchar(255) NOT NULL,
	"telephone" varchar(20) NOT NULL,
	"email" varchar(255) NOT NULL,
	"note" varchar(500),
	"status" "order_status" DEFAULT 'ordered' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_orders__id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_products__id_fk" FOREIGN KEY ("productId") REFERENCES "public"."products"("_id") ON DELETE cascade ON UPDATE no action;