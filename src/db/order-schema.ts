import {
  pgTable,
  varchar,
  timestamp,
  integer,
  pgEnum,
  numeric,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { products } from "./product-schema";
import { promoCodes } from "./promo-schema"; // 👈 imported from promo code file

// 🔘 Enums
export const orderStatusEnum = pgEnum("order_status", [
  "ordered",
  "shipped",
  "delivered",
  "cancelled",
]);

export const deliveryMethodEnum = pgEnum("delivery_method", [
  "delivery",
  "pickup",
]);

// 📦 Orders Table
export const orders = pgTable("orders", {
  _id: varchar({ length: 255 }).primaryKey(), // Internal DB ID
  orderId: varchar({ length: 255 }).notNull().unique(), // Public-facing ID

  name: varchar({ length: 255 }).notNull(),
  address: varchar({ length: 255 }).notNull(),
  telephone: varchar({ length: 20 }).notNull(),
  email: varchar({ length: 255 }).notNull(),
  note: varchar({ length: 500 }),

  deliveryMethod: deliveryMethodEnum().notNull(),
  status: orderStatusEnum().notNull().default("ordered"),

  // 🎁 Promo Code Info
  promoCodeId: varchar({ length: 255 })
    .references(() => promoCodes._id, { onDelete: "set null" })
    .default(""),

  discountAmount: numeric({ precision: 10, scale: 2 }).default("0.00"),

  createdAt: timestamp().notNull().defaultNow(),
});

// 📦 Order Items Table
export const orderItems = pgTable("order_items", {
  _id: varchar({ length: 255 }).primaryKey(),

  orderId: varchar({ length: 255 })
    .notNull()
    .references(() => orders._id, { onDelete: "cascade" }),

  productId: varchar({ length: 255 })
    .notNull()
    .references(() => products._id, { onDelete: "cascade" }),

  quantity: integer().notNull().default(1),
  unitPrice: numeric({ precision: 10, scale: 2 }).notNull(),
});

// 🔄 Relations
export const ordersRelations = relations(orders, ({ many, one }) => ({
  items: many(orderItems),

  promoCode: one(promoCodes, {
    fields: [orders.promoCodeId],
    references: [promoCodes._id],
  }),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders._id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products._id],
  }),
}));
