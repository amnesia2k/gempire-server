import { relations } from "drizzle-orm";
import { integer, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";
import { products } from "./product-schema";

export const productImages = pgTable("product_images", {
  _id: varchar({ length: 255 }).primaryKey(),
  imageUrl: varchar({ length: 255 }).notNull(),
  productId: varchar()
    .notNull()
    .references(() => products._id, { onDelete: "cascade" }),
  createdAt: timestamp().notNull().defaultNow(),
});

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products._id],
  }),
}));
