import { pgTable, varchar } from "drizzle-orm/pg-core";

export const adminPasscodes = pgTable("passcodes", {
  _id: varchar({ length: 255 }).primaryKey(),
  passcode: varchar({ length: 255 }).notNull(),
  owner: varchar({ length: 255 }).notNull(),
});
