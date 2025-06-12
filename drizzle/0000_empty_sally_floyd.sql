CREATE TABLE "passcodes" (
	"_id" varchar(255) PRIMARY KEY NOT NULL,
	"passcode" varchar(255) NOT NULL,
	"owner" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"_id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" varchar(255) NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"unit" integer NOT NULL,
	"categoryId" varchar,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_images" (
	"_id" varchar(255) PRIMARY KEY NOT NULL,
	"imageUrl" varchar(255) NOT NULL,
	"productId" varchar NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "category" (
	"_id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "category_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_category__id_fk" FOREIGN KEY ("categoryId") REFERENCES "public"."category"("_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_productId_products__id_fk" FOREIGN KEY ("productId") REFERENCES "public"."products"("_id") ON DELETE cascade ON UPDATE no action;