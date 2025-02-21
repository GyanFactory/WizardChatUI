
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

// Configure pool with retry strategy
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
  max: 20,
  idleTimeoutMillis: 30000,
  retryStrategy: (err, attempts) => {
    if (attempts > 3) return null; // Give up after 3 retries
    return Math.min(attempts * 1000, 3000); // Wait 1s, 2s, then 3s between retries
  }
});

// Add error handler to the pool
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  // Attempt to reconnect
  client.release(true);
});

// Create db instance with schema
export const db = drizzle({ client: pool, schema });

// Export pool for potential direct usage
export { pool };
