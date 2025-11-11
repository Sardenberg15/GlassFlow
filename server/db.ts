import dotenv from 'dotenv';
dotenv.config({ override: true });
// In development, relax TLS verification to avoid self-signed chain issues
if (process.env.NODE_ENV === 'development') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}
import pg from 'pg';
const { Pool } = pg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Allow development without DATABASE_URL when using in-memory storage.
// Only enforce DATABASE_URL when not explicitly using memory storage.
const usingMemory = process.env.USE_MEMORY_STORAGE === '1' || (process.env.NODE_ENV === 'development' && !process.env.DATABASE_URL);
if (!process.env.DATABASE_URL && !usingMemory) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
export const db = drizzle({ client: pool, schema });
