import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: [
    "./src/db/passcode-schema.ts",
    "./src/db/product-schema.ts",
    "./src/db/product-images-schema.ts",
    "./src/db/category-schema.ts",
  ],
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
