import { db } from './db';
import { sql } from 'drizzle-orm';

/**
 * Executes database migrations manually
 * This script adds the instructor_id column to the users table
 * for implementing tenant-based student isolation
 */
async function runMigration() {
  try {
    console.log('Starting database migration...');
    
    // Check if the instructor_id column already exists
    const result = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'instructor_id'
      );
    `);
    
    const columnExists = result[0]?.exists;
    
    if (!columnExists) {
      console.log('Adding instructor_id column to users table...');
      
      // Add the instructor_id column with a foreign key reference to users(id)
      await db.execute(sql`
        ALTER TABLE users 
        ADD COLUMN instructor_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
      `);
      
      console.log('Successfully added instructor_id column!');
    } else {
      console.log('instructor_id column already exists, skipping migration.');
    }
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  }
}

// Execute the migration
runMigration()
  .then(() => {
    console.log('Migration script completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });