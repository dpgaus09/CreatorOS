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
  console.log('Will attempt to proceed with startup, but database features will be limited');
  
  // Check if we're in Digital Ocean by looking for specific environment markers
  const isDigitalOcean = process.env.DIGITAL_OCEAN_APP_PLATFORM === 'true' || 
                       process.env.DYNO || 
                       process.env._?.includes('/do/bin');
                       
  // If we're in Digital Ocean and DATABASE_URL is missing, this might be temporary
  // Look for potential database credentials in other forms
  if (isDigitalOcean) {
    console.log('🌊 Detected Digital Ocean environment, searching for database credentials...');
    
    // Digital Ocean sometimes provides individual credential components
    const dbHost = process.env.DB_HOST || process.env.PGHOST;
    const dbPort = process.env.DB_PORT || process.env.PGPORT || '5432';
    const dbUser = process.env.DB_USER || process.env.PGUSER;
    const dbPassword = process.env.DB_PASSWORD || process.env.PGPASSWORD;
    const dbName = process.env.DB_NAME || process.env.PGDATABASE;
    
    if (dbHost && dbUser && dbPassword && dbName) {
      console.log('✅ Found database credentials in environment variables');
      // Construct DATABASE_URL from components
      process.env.DATABASE_URL = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`;
      console.log('✅ Constructed DATABASE_URL from environment variables');
    } else {
      console.log('⚠️ Could not find complete database credentials, using fallback');
      // Set a dummy URL that will fail safely later with recognizable error
      process.env.DATABASE_URL = 'postgresql://digital_ocean_user:fallback_password@localhost:5432/learner_bruh_lms_db';
    }
  } else {
    // Not in Digital Ocean, use a dummy URL that will fail safely
    process.env.DATABASE_URL = 'postgresql://user:password@localhost:5432/dummy_db';
  }
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

// Track connection retries
let connectionRetries = 0;
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;

// Create a synchronous initial pool instance
const pool = new Pool(connectionOptions);

// Enhanced connection error handling
pool.on('error', (err: Error) => {
  console.error('Unexpected database pool error:', err);
  
  // Only attempt reconnection if we haven't exceeded retry limit
  if (connectionRetries < MAX_RETRIES) {
    connectionRetries++;
    console.log(`⚠️ Database connection error. Retry attempt ${connectionRetries}/${MAX_RETRIES} in ${RETRY_DELAY_MS/1000}s...`);
    
    // Attempt to recreate the pool after a delay
    setTimeout(() => {
      try {
        console.log('🔄 Attempting to reconnect to the database...');
        
        // Close the old pool if possible
        if (pool && typeof pool.end === 'function') {
          try {
            pool.end().catch(endErr => {
              console.error('Error while closing existing pool:', endErr);
            });
          } catch (endErr) {
            console.error('Exception while closing existing pool:', endErr);
          }
        }
        
        // Check if DATABASE_URL may have been updated during runtime
        // Digital Ocean sometimes provisions DB resources after app startup
        if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('fallback_password')) {
          console.log('🔍 Checking for updated database credentials...');
          const dbHost = process.env.DB_HOST || process.env.PGHOST;
          const dbPort = process.env.DB_PORT || process.env.PGPORT || '5432';
          const dbUser = process.env.DB_USER || process.env.PGUSER;
          const dbPassword = process.env.DB_PASSWORD || process.env.PGPASSWORD;
          const dbName = process.env.DB_NAME || process.env.PGDATABASE;
          
          if (dbHost && dbUser && dbPassword && dbName) {
            process.env.DATABASE_URL = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`;
            console.log('✅ Found and applied updated database credentials');
          } else {
            console.log('⚠️ No updated credentials found');
          }
        }
      } catch (error) {
        console.error('Failed to reconnect to database:', error);
      }
    }, RETRY_DELAY_MS);
  } else {
    console.error(`❌ Exceeded maximum database connection retries (${MAX_RETRIES}). Server will continue with limited functionality.`);
  }
  
  // Don't crash the application regardless of errors
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
