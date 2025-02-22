import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure pool with optimized settings
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
  max: 20,
  idleTimeoutMillis: 30000,
});

// Add error handler to the pool
pool.on('error', (err: Error, client) => {
  console.error('Unexpected error on idle client', err);
  // Attempt to reconnect
  client.release(true);
});

// Create db instance with schema
export const db = drizzle(pool, { schema });

// Export pool for potential direct usage
export { pool };