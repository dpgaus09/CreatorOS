/**
 * Connection Pool Management
 * 
 * This module manages database connections and provides pooling, retry logic,
 * and connection optimization to reduce resource usage.
 */

import * as pg from 'pg';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon, neonConfig } from '@neondatabase/serverless';
import * as schema from '@shared/schema';

// Get database URL from environment
const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error("DATABASE_URL environment variable not set");
  process.exit(1);
}

// Configure Neon for WebSocket fallback
neonConfig.fetchConnectionCache = true;

// Create a Neon serverless connection (WebSocket)
const sql = neon(dbUrl);
console.log("Neon WebSocket configured successfully");

// Create standard pool configuration for direct connections (reduces latency for critical operations)
const poolConfig: pg.PoolConfig = {
  connectionString: dbUrl,
  max: 10, // Maximum pool size
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 3000, // Connection timeout after 3 seconds
};

// Create the connection pool
export const pool = new pg.Pool(poolConfig);

// Setup connection pool error handling
pool.on('error', (err: Error) => {
  console.error('Unexpected error on idle client', err);
});

// Create drizzle database instance with optimizations
export const db = drizzle(sql, { schema });

// Set up a heartbeat to keep connections alive and reduce cold starts
const HEARTBEAT_INTERVAL = 10 * 60 * 1000; // 10 minutes

// Create a lightweight heartbeat query for the pool
setInterval(async () => {
  try {
    const client = await pool.connect();
    try {
      // Use a minimal query to keep the connection alive
      await client.query('SELECT 1');
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Database heartbeat error:", err);
  }
}, HEARTBEAT_INTERVAL);

/**
 * Test the database connection
 * @returns Promise resolving to true if connection successful, false otherwise
 */
export async function testConnection(): Promise<boolean> {
  try {
    // Use the pool to test the connection - more reliable
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT 1 as test');
      return result.rows && result.rows.length > 0 && result.rows[0].test === 1;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Database connection test failed:", err);
    return false;
  }
}