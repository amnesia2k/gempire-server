import { relations } from "drizzle-orm";
import { pgTable, timestamp, varchar } from "drizzle-orm/pg-core";
import { products } from "./product-schema";

export const category = pgTable("category", {
  _id: varchar({ length: 255 }).primaryKey(),
  name: varchar({ length: 255 }).notNull(),
  slug: varchar({ length: 255 }).notNull().unique(),
  createdAt: timestamp().notNull().defaultNow(),
});

export const categoryRelations = relations(category, ({ many }) => ({
  products: many(products),
}));
