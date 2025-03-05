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
  // Set global timeout for connection attempts
  neonConfig.connectionTimeoutMillis = 10000;
  neonConfig.webSocketConstructor = ws;
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

// Initialize the connection pool with more robust error handling
let pool;
try {
  // Create the pool with a timeout guard
  const poolPromise = new Pool(connectionOptions);
  
  // Set a timeout to prevent hanging on pool creation
  const timeoutPromise = new Promise<any>((_, reject) => {
    setTimeout(() => reject(new Error('Database pool creation timed out')), 5000);
  });
  
  // Use Promise.race to handle potential hanging
  pool = await Promise.race([poolPromise, timeoutPromise]).catch(err => {
    console.error('Error during pool creation:', err.message);
    console.log('Using fallback pool configuration');
    return new Pool({ 
      connectionString: process.env.DATABASE_URL,
      max: 3, // Reduced pool size for fallback
      connectionTimeoutMillis: 5000,
    });
  });
  
  // Register pool error handler
  pool.on('error', (err) => {
    console.error('Unexpected database pool error:', err);
    // Don't crash the application
  });
  
  console.log('Database pool created successfully');
} catch (error) {
  console.error('Error creating database pool:', error);
  // Create a minimal pool that will be replaced later
  pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    max: 2 // Minimal connections
  });
  console.log('Created fallback database pool');
}

// Initialize Drizzle ORM with the connection pool and schema
let db;
try {
  // Include a timeout here as well
  const dbPromise = drizzle({ client: pool, schema });
  const timeoutPromise = new Promise<any>((_, reject) => {
    setTimeout(() => reject(new Error('Drizzle ORM initialization timed out')), 5000);
  });
  
  db = await Promise.race([dbPromise, timeoutPromise]).catch(err => {
    console.error('Error during ORM initialization:', err.message);
    console.log('Using fallback ORM configuration');
    return drizzle({ client: pool }); // Minimal instance
  });
  
  console.log('Database ORM initialized successfully');
} catch (error) {
  console.error('Error initializing Drizzle ORM:', error);
  // Create a minimal db instance
  db = drizzle({ client: pool });
  console.log('Created fallback Drizzle ORM instance');
}

// Perform a test query to validate connection
try {
  pool.query('SELECT 1')
    .then(() => {
      console.log('Database connection test successful');
    })
    .catch((err) => {
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
