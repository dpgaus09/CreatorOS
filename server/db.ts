import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Error handlers for WebSocket - set these up before creating the pool
// This is a known issue with Neon DB and can be safely ignored
process.on('uncaughtException', (err) => {
  if (err.message && err.message.includes('Cannot set property message of #<ErrorEvent>')) {
    console.warn('Caught Neon WebSocket error (safe to ignore):', err.message);
  } else {
    console.error('Uncaught exception:', err);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.warn('Unhandled promise rejection:', reason);
  // Continue execution anyway
});

// Configure Neon database with WebSocket support
try {
  // Set WebSocket constructor for Neon
  neonConfig.webSocketConstructor = ws;
  
  // Set custom options for Neon connection
  // Note: We don't use connectionTimeoutMillis directly as it's not officially
  // part of the NeonConfig interface, but we'll set similar options on the Pool
  console.log('Neon WebSocket configured successfully');
} catch (error) {
  console.error('Error configuring Neon WebSocket:', error);
  // Continue execution anyway
}

// Verify DATABASE_URL exists with better error handling
if (!process.env.DATABASE_URL) {
  console.error('⚠️ DATABASE_URL environment variable is not set');
  console.log('Will attempt to proceed with startup, but database features will fail');
  // Set a dummy URL that will fail safely later
  process.env.DATABASE_URL = 'postgresql://user:password@localhost:5432/dummy_db';
}

console.log('Initializing database connection');

// Create connection pool with additional options for better stability
const connectionOptions = { 
  connectionString: process.env.DATABASE_URL,
  max: 10, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 10000, // Maximum time to wait for connection (increased)
  allowExitOnIdle: false, // Don't exit on idle in production
};

// Create a synchronous initial pool instance
const pool = new Pool(connectionOptions);

// Register pool error handler
pool.on('error', (err: Error) => {
  console.error('Unexpected database pool error:', err);
  // Don't crash the application
});

// Initialize Drizzle ORM with the connection pool and schema
// Define the DrizzleInstance type for better typing
type DrizzleInstance = ReturnType<typeof drizzle<typeof schema>>;

// Create the initial drizzle instance
const db = drizzle({ client: pool, schema });

// Perform a test query to validate connection
try {
  pool.query('SELECT 1')
    .then(() => {
      console.log('Database connection test successful');
    })
    .catch((err: Error) => {
      console.error('Database connection test failed:', err);
      // Log but don't throw - allow server to start anyway
    });
} catch (error) {
  console.error('Error during connection test setup:', error);
}

// Add this safety net for production deployments
process.on('exit', (code) => {
  // Log graceful shutdown
  console.log(`Server exiting with code: ${code}`);
  
  // Try to close the pool cleanly if possible
  if (pool && typeof pool.end === 'function') {
    try {
      pool.end().catch(err => {
        console.error('Error closing database pool during shutdown:', err);
      });
    } catch (e) {
      console.error('Exception while closing the database pool:', e);
    }
  }
});

// Export the instances after setup
export { pool, db };
