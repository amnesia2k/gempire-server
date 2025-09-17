import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { schema } from "./schema";
import { env } from "../utils/env";

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  connectionTimeoutMillis: 20000,
  idleTimeoutMillis: 120000,
  max: 10,
});

export const db = drizzle(pool, { schema });
