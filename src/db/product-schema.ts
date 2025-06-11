import {
  integer,
  numeric,
  pgEnum,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { category } from "./category-schema";
import { relations } from "drizzle-orm";
import { productImages } from "./product-images-schema";

// export const statusEnum = pgEnum("product_status", [
//   "ordered",
//   "delivered",
//   "cancelled",
// ]);

export const products = pgTable("products", {
  _id: varchar({ length: 255 }).primaryKey(),
  name: varchar({ length: 255 }).notNull(),
  description: varchar({ length: 255 }).notNull(),
  price: numeric({ precision: 10, scale: 2 }).notNull(),
  unit: integer().notNull(),
  categoryId: varchar().references(() => category._id, {
    onDelete: "set null",
  }),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export const productsRelations = relations(products, ({ one, many }) => ({
  images: many(productImages),
  category: one(category, {
    fields: [products.categoryId],
    references: [category._id],
  }),
}));
