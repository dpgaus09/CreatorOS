/**
 * Database connection manager
 * 
 * This file establishes the database connection using Drizzle ORM.
 */

import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon } from '@neondatabase/serverless';
import * as schema from '@shared/schema';
import pg from 'pg';

// Get the database URL from environment
const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error("DATABASE_URL environment variable not set");
  process.exit(1);
}

// Create a pg pool for session store and direct DB access
export const pool = new pg.Pool({
  connectionString: dbUrl,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 3000,
});

// Error handling for the pool
pool.on('error', (err: Error) => {
  console.error('Unexpected error on idle postgres client', err);
});

// Create a Neon serverless client for Drizzle ORM
const sql = neon(dbUrl);

// Create a drizzle instance with our schema
export const db = drizzle(sql, { schema });

// Keep connections alive with a heartbeat
const HEARTBEAT_INTERVAL = 10 * 60 * 1000; // 10 minutes

setInterval(async () => {
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Database heartbeat error:', err);
  }
}, HEARTBEAT_INTERVAL);

// Test the database connection
export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT 1 as test');
      return result.rows?.length > 0 && result.rows[0].test === 1;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Database connection test failed:', err);
    return false;
  }
}