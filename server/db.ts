/**
 * Database connection manager
 * 
 * This file establishes the database connection using Drizzle ORM.
 * Optimized for Replit environment with connection pooling and recovery.
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

// Configuration for better performance in Replit environment
const PG_POOL_CONFIG = {
  connectionString: dbUrl,
  max: 5, // Reduced max connections to avoid overwhelming the DB
  idleTimeoutMillis: 15000, // Shorter idle timeout
  connectionTimeoutMillis: 5000, // Longer connection timeout
  application_name: 'learner_bruh_lms', // Identify connections in DB logs
  statement_timeout: 10000, // 10s statement timeout to prevent long-running queries
  query_timeout: 10000, // 10s query timeout
};

// Create a pg pool for session store with improved error handling
export const pool = new pg.Pool(PG_POOL_CONFIG);

// More robust error handling for the pool
pool.on('error', (err: Error) => {
  console.error('Postgres Pool Error:', err);
  
  // Don't exit process on connection errors - attempt to recover
  if (err.message.includes('connection') || err.message.includes('timeout')) {
    console.log('Database connection error - attempting recovery');
  }
});

// Implement connection validation
pool.on('connect', (client) => {
  client.on('error', (err) => {
    console.error('Database client error:', err);
  });
});

// Postgres.js client optimized for Replit environment
const client = postgres(dbUrl, {
  max: 5, // Reduced max connections
  idle_timeout: 15, // 15 seconds
  connect_timeout: 15, // 15 seconds
  prepare: false, // Disable prepared statements for better compatibility
  debug: process.env.NODE_ENV === 'development', // Enable debug in development
  connection: {
    application_name: 'learner_bruh_lms_orm',
  },
  types: {
    // Register custom parsers if needed
  },
  onnotice: () => {}, // Silence notice messages
  onparameter: () => {}, // Silence parameter messages
  transform: {
    // Optimize for JSON handling
    undefined: null,
  },
});

// Create a drizzle instance with our schema
export const db = drizzle(client, { schema });

// More frequent heartbeat for Replit environment
const HEARTBEAT_INTERVAL = 3 * 60 * 1000; // 3 minutes

let heartbeatFailures = 0;
const MAX_HEARTBEAT_FAILURES = 3;

const heartbeat = async () => {
  try {
    const result = await client`SELECT 1`;
    if (result && result.length === 1) {
      if (heartbeatFailures > 0) {
        console.log('Database connection recovered');
        heartbeatFailures = 0;
      }
    } else {
      console.warn('Database heartbeat returned unexpected result');
      heartbeatFailures++;
    }
  } catch (err) {
    console.error('Database heartbeat error:', err);
    heartbeatFailures++;
    
    // If we've failed multiple times in a row, attempt connection recovery
    if (heartbeatFailures >= MAX_HEARTBEAT_FAILURES) {
      console.log('Multiple heartbeat failures - attempting connection recovery');
      try {
        // Force a new connection on the next query
        await client.end({ timeout: 5 });
        // Reset the counter if we successfully reconnect
        heartbeatFailures = 0;
      } catch (recErr) {
        console.error('Failed to recover connection:', recErr);
      }
    }
  }
};

// Start heartbeat with initial delay
setTimeout(() => {
  heartbeat();
  setInterval(heartbeat, HEARTBEAT_INTERVAL);
}, 5000);

// Test the database connection with enhanced diagnostics
export async function testConnection(): Promise<boolean> {
  console.log('Testing database connection...');
  try {
    const startTime = Date.now();
    const result = await client`SELECT 1 as test`;
    const duration = Date.now() - startTime;
    
    console.log(`Database connection test completed in ${duration}ms`);
    
    return result?.length > 0 && result[0].test === 1;
  } catch (err) {
    console.error('Database connection test failed:', err);
    return false;
  }
}