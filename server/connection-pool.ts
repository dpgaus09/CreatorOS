/**
 * Connection Pool Management
 * 
 * This module is a legacy file kept for backward compatibility.
 * The actual database connection is now managed in db.ts.
 */

import { db, pool, testConnection as _testConnection } from './db';

// Re-export the database and pool
export { db, pool };

/**
 * Test the database connection (redirects to db.ts implementation)
 * @returns Promise resolving to true if connection successful, false otherwise
 */
export async function testConnection(): Promise<boolean> {
  return _testConnection();
}