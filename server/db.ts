import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure Neon database with WebSocket support
neonConfig.webSocketConstructor = ws;

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

// Initialize the connection pool
const pool = new Pool(connectionOptions);

// Test the connection immediately to catch early failures
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

console.log('Database pool created successfully');

// Initialize Drizzle ORM with the connection pool and schema
const db = drizzle({ client: pool, schema });

console.log('Database ORM initialized successfully');

// Perform a test query to validate connection
pool.query('SELECT 1')
  .then(() => {
    console.log('Database connection test successful');
  })
  .catch((err) => {
    console.error('Database connection test failed:', err);
    // Log but don't throw - allow server to start anyway
  });

// Export the instances after setup
export { pool, db };
