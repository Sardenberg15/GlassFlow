import dotenv from 'dotenv';
dotenv.config();
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
  max: 5, // Keep low for free tier
  idleTimeoutMillis: 0, // Disable idle timeout to keep connections open indefinitely
  connectionTimeoutMillis: 10000, // 10s timeout
  keepAlive: true, // Enable TCP keep-alive to prevent network dropouts
});

// Add detailed logging for debugging production connectivity
pool.on('connect', () => {
  console.log('Successfully acquired a client from the pool');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Test connection on startup
pool.query('SELECT NOW()')
  .then((res) => {
    console.log('Database connected successfully:', res.rows[0]);
  })
  .catch((err) => {
    console.error('Database connection failed eagerly on startup:', err);
  });
export const db = drizzle({ client: pool, schema });
