import {
  pgTable,
  varchar,
  numeric,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";

export const promoCodes = pgTable("promo_codes", {
  _id: varchar({ length: 255 }).primaryKey(),
  name: varchar({ length: 255 }).notNull(),
  code: varchar({ length: 255 }).notNull().unique(),
  discount: numeric({ precision: 5, scale: 2 }).notNull(), // e.g. 10.00 for ₦10 or 10%
  isPercentage: boolean().notNull().default(true), // 💡 better than string
  createdAt: timestamp().notNull().defaultNow(),
});
