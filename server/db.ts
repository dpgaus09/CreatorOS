/**
 * Database connection manager
 * 
 * This file establishes the database connection using Drizzle ORM.
 * Supports both regular PostgreSQL and Neon serverless database.
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@shared/schema';
import pg from 'pg';

// Get the database URL from environment
const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error("DATABASE_URL environment variable not set");
  process.exit(1);
}

// Create a pg pool for session store
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

// Use postgres.js client for Drizzle ORM which works better with Neon
// Configure with reasonable defaults for serverless environment
const client = postgres(dbUrl, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false,
});

// Create a drizzle instance with our schema
export const db = drizzle(client, { schema });

// Keep connections alive with a heartbeat
const HEARTBEAT_INTERVAL = 10 * 60 * 1000; // 10 minutes

setInterval(async () => {
  try {
    const result = await client`SELECT 1`;
    if (!result || result.length !== 1) {
      console.warn('Database heartbeat returned unexpected result');
    }
  } catch (err) {
    console.error('Database heartbeat error:', err);
  }
}, HEARTBEAT_INTERVAL);

// Test the database connection
export async function testConnection(): Promise<boolean> {
  try {
    const result = await client`SELECT 1 as test`;
    return result?.length > 0 && result[0].test === 1;
  } catch (err) {
    console.error('Database connection test failed:', err);
    return false;
  }
}