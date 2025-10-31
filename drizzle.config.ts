import { defineConfig } from 'drizzle-kit'
import { env } from './src/utils/env'

export default defineConfig({
  out: './drizzle',
  schema: [
    './src/db/passcode-schema.ts',
    './src/db/product-schema.ts',
    './src/db/product-images-schema.ts',
    './src/db/category-schema.ts',
    './src/db/order-schema.ts',
    './src/db/promo-schema.ts',
  ],
  dialect: 'postgresql',
  dbCredentials: {
    url: env.DATABASE_URL,
  },
})
