import {
  pgTable,
  varchar,
  numeric,
  timestamp,
  boolean,
  text,
} from "drizzle-orm/pg-core";

export const promoCodes = pgTable("promo_codes", {
  _id: varchar({ length: 255 }).primaryKey(),
  name: varchar({ length: 255 }).notNull(), // e.g. "₦1000 OFF Midnight Edition"
  code: varchar({ length: 255 }).notNull().unique(),
  discount: numeric({ precision: 5, scale: 2 }).notNull(), // ₦ or %
  isPercentage: boolean().notNull().default(true),
  isActive: boolean().notNull().default(true),

  // ✨ UI-only fields now part of schema
  description: text("description").notNull(), // e.g. "Only 100 bottles available"
  ctaText: varchar({ length: 100 }).notNull(), // e.g. "Shop Now"
  subtitle: varchar({ length: 100 }).notNull(), // e.g. "Summer Collection"
  urgent: boolean().notNull().default(false), // For limited-time pulse badge

  createdAt: timestamp().notNull().defaultNow(),
});
