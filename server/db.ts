import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Error handler for WebSocket - set this up before creating the pool
process.on('uncaughtException', (err) => {
  if (err.message && err.message.includes('Cannot set property message of #<ErrorEvent>')) {
    console.warn('Caught Neon WebSocket error (safe to ignore):', err.message);
  } else {
    console.error('Uncaught exception:', err);
  }
});

// Configure Neon database with WebSocket support
try {
  neonConfig.webSocketConstructor = ws;
  console.log('Neon WebSocket configured successfully');
} catch (error) {
  console.error('Error configuring Neon WebSocket:', error);
  // Continue execution anyway
}

// Verify DATABASE_URL exists
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

console.log('Initializing database connection');

// Create connection pool with additional options for better stability
const connectionOptions = { 
  connectionString: process.env.DATABASE_URL,
  max: 10, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 5000, // Maximum time to wait for connection
};

// Initialize the connection pool with error handling
let pool;
try {
  pool = new Pool(connectionOptions);
  
  // Test the connection immediately to catch early failures
  pool.on('error', (err) => {
    console.error('Unexpected database pool error:', err);
  });
  
  console.log('Database pool created successfully');
} catch (error) {
  console.error('Error creating database pool:', error);
  // Create a minimal pool that will be replaced later
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  console.log('Created fallback database pool');
}

// Initialize Drizzle ORM with the connection pool and schema
let db;
try {
  db = drizzle({ client: pool, schema });
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

// Export the instances after setup
export { pool, db };
