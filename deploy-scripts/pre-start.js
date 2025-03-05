// Database initialization script
// This script verifies the database connection and preloads critical data
import { db } from '../server/db.js';
import { users, settings, courses } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

async function initializeDatabase() {
  console.log('🔌 Verifying database connection...');
  
  try {
    // Test database connection
    const dbTest = await db.select().from(users).limit(1);
    console.log('✅ Database connection successful');
    
    // Check if required settings exist
    console.log('🔍 Checking critical application settings...');
    const lmsName = await db.select().from(settings).where(eq(settings.name, 'lms-name')).limit(1);
    
    if (!lmsName || lmsName.length === 0) {
      console.log('⚠️ Creating default LMS name setting...');
      await db.insert(settings).values({
        name: 'lms-name',
        value: 'Learner_Bruh LMS',
      });
    }
    
    // Check if any courses exist
    const courseCount = await db.select().from(courses).limit(1);
    console.log(`📚 Found ${courseCount.length} courses in the database`);
    
    console.log('✅ Database initialization completed successfully');
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    return false;
  }
}

// Run initialization
initializeDatabase()
  .then(success => {
    if (success) {
      console.log('🚀 Ready to start application server');
      process.exit(0);
    } else {
      console.error('❌ Database initialization failed, check logs for details');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('💥 Critical error during database initialization:', err);
    process.exit(1);
  });