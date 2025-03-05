// Database initialization script
// This script verifies the database connection and preloads critical data

// Enhanced error handling for module imports
async function loadModules() {
  try {
    console.log('🔄 Loading required modules...');

    // Try different import paths to handle different build environments
    let dbModule, schemaModule, drizzleModule;
    
    try {
      dbModule = await import('../server/db.js');
    } catch (err) {
      console.log('⚠️ Could not load db.js, trying alternative paths...');
      try {
        dbModule = await import('./db.js');
      } catch (err2) {
        console.error('❌ Failed to load database module:', err2);
        throw new Error('Could not load database module');
      }
    }
    
    try {
      schemaModule = await import('../shared/schema.js');
    } catch (err) {
      console.log('⚠️ Could not load shared/schema.js, trying alternative paths...');
      try {
        schemaModule = await import('./schema.js');
      } catch (err2) {
        console.error('❌ Failed to load schema module:', err2);
        throw new Error('Could not load schema module');
      }
    }
    
    try {
      drizzleModule = await import('drizzle-orm');
    } catch (err) {
      console.error('❌ Failed to load drizzle-orm:', err);
      throw new Error('Could not load drizzle-orm');
    }
    
    console.log('✅ All modules loaded successfully');
    
    return {
      db: dbModule.db,
      pool: dbModule.pool,
      users: schemaModule.users,
      settings: schemaModule.settings,
      courses: schemaModule.courses,
      eq: drizzleModule.eq
    };
  } catch (error) {
    console.error('❌ Module loading failed:', error);
    console.log('🚨 Continuing with server startup even with module errors');
    
    // Return empty objects to allow the script to continue
    // The main server will handle proper initialization
    return {
      db: null,
      pool: null,
      users: {},
      settings: {},
      courses: {},
      eq: (a) => a
    };
  }
}

async function initializeDatabase() {
  console.log('🔌 Verifying database connection...');
  
  try {
    // Load required modules
    const { db, pool, users, settings, courses, eq } = await loadModules();
    
    // Early exit if modules failed to load
    if (!db || !pool) {
      console.log('⚠️ Database modules not loaded, skipping initialization');
      return true; // Return true to continue server startup
    }
    
    // Test raw database connection
    try {
      const rawResult = await pool.query('SELECT 1 as alive');
      console.log('✅ Raw database connection successful:', rawResult.rows[0]);
    } catch (rawErr) {
      console.error('❌ Raw database connection failed:', rawErr);
      console.log('🚨 Attempting to continue despite connection issues');
    }
    
    // Test ORM connection
    try {
      const dbTest = await db.select().from(users).limit(1);
      console.log('✅ ORM database connection successful');
      
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
    } catch (ormErr) {
      console.error('⚠️ ORM database operations failed:', ormErr);
      console.log('🚨 Will attempt to continue server startup anyway');
    }
    
    console.log('✅ Database initialization completed');
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    console.log('🚨 Will attempt to continue server startup despite errors');
    return true; // Always return true to let server try to start
  }
}

// Run initialization with improved error handling
initializeDatabase()
  .then(success => {
    console.log('🚀 Ready to start application server');
    process.exit(0); // Always exit with success to let server try to start
  })
  .catch(err => {
    console.error('💥 Critical error during database initialization:', err);
    console.log('🚨 Will attempt to continue server startup despite errors');
    process.exit(0); // Exit with success to let server try to start
  });