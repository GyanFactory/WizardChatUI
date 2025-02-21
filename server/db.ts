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

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Add error handler to the pool
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
});

// Create db instance with schema
export const db = drizzle({ client: pool, schema });

// Export pool for potential direct usage
export { pool };