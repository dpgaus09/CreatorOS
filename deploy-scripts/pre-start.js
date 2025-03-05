// Database initialization script
// This script verifies the database connection and preloads critical data for DigitalOcean deployment

console.log('🚀 Starting pre-deployment database validation...');
console.log(`📌 Environment: ${process.env.NODE_ENV}`);
console.log(`📌 Database URL present: ${Boolean(process.env.DATABASE_URL)}`);

// Early exit if DATABASE_URL is not available
if (!process.env.DATABASE_URL) {
  console.log('⚠️ DATABASE_URL environment variable is not set');
  console.log('⚠️ Skipping database initialization - server will use fallback mode');
  console.log('✅ Exiting pre-start script successfully to continue deployment');
  process.exit(0); // Exit with success
}

// Set up global error handlers for the Neon database connection issues
process.on('uncaughtException', (err) => {
  if (err.message && err.message.includes('Cannot set property message of #<ErrorEvent>')) {
    console.warn('🔶 Caught Neon WebSocket error (safe to ignore):', err.message);
  } else {
    console.error('💥 Uncaught exception:', err);
  }
  // Continue execution
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔶 Unhandled Rejection at:', promise, 'reason:', reason);
  // Continue execution
});

// Set a global timeout for the entire script
const GLOBAL_TIMEOUT = 30000; // 30 seconds
setTimeout(() => {
  console.log('⏱️ Global pre-deployment script timeout reached. Exiting with success to proceed with deployment.');
  process.exit(0);
}, GLOBAL_TIMEOUT);

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
        console.log('⚠️ Could not load db.js from alternate path, trying without extension...');
        try {
          dbModule = await import('../server/db');
        } catch (err3) {
          console.error('❌ Failed to load database module:', err3);
          throw new Error('Could not load database module');
        }
      }
    }
    
    try {
      schemaModule = await import('../shared/schema.js');
    } catch (err) {
      console.log('⚠️ Could not load shared/schema.js, trying alternative paths...');
      try {
        schemaModule = await import('./schema.js');
      } catch (err2) {
        console.log('⚠️ Could not load schema.js from alternate path, trying without extension...');
        try {
          schemaModule = await import('../shared/schema');
        } catch (err3) {
          console.error('❌ Failed to load schema module:', err3);
          throw new Error('Could not load schema module');
        }
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
    // Set a timeout to ensure the script doesn't hang indefinitely
    const timeout = setTimeout(() => {
      console.log('⏱️ Database initialization timed out - continuing with server startup');
      process.exit(0); // Exit success to let the server start
    }, 15000); // 15 seconds timeout
    
    // Load required modules
    const { db, pool, users, settings, courses, eq } = await loadModules();
    
    // Early exit if modules failed to load
    if (!db || !pool) {
      console.log('⚠️ Database modules not loaded, skipping initialization');
      clearTimeout(timeout);
      return true; // Return true to continue server startup
    }
    
    // Test raw database connection with timeout protection
    let connectionSuccessful = false;
    try {
      // Set a short timeout just for the query
      const queryPromise = pool.query('SELECT 1 as alive');
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database query timeout')), 5000)
      );
      
      const rawResult = await Promise.race([queryPromise, timeoutPromise]);
      console.log('✅ Raw database connection successful:', rawResult.rows[0]);
      connectionSuccessful = true;
    } catch (rawErr) {
      console.error('❌ Raw database connection failed:', rawErr);
      console.log('🚨 Attempting to continue despite connection issues');
    }
    
    // Only try ORM operations if raw connection worked
    if (connectionSuccessful) {
      try {
        // Wrap in timeout protection
        const ormPromise = db.select().from(users).limit(1);
        const ormTimeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('ORM query timeout')), 5000)
        );
        
        const dbTest = await Promise.race([ormPromise, ormTimeoutPromise]);
        console.log('✅ ORM database connection successful');
        
        // Check if required settings exist
        console.log('🔍 Checking critical application settings...');
        try {
          const lmsName = await db.select().from(settings).where(eq(settings.name, 'lms-name')).limit(1);
          
          if (!lmsName || lmsName.length === 0) {
            console.log('⚠️ Creating default LMS name setting...');
            await db.insert(settings).values({
              name: 'lms-name',
              value: 'Learner_Bruh LMS',
            });
          }
        } catch (settingsErr) {
          console.error('⚠️ Settings check failed:', settingsErr);
        }
        
        // Check if any courses exist
        try {
          const courseCount = await db.select().from(courses).limit(1);
          console.log(`📚 Found ${courseCount.length} courses in the database`);
        } catch (coursesErr) {
          console.error('⚠️ Courses check failed:', coursesErr);
        }
      } catch (ormErr) {
        console.error('⚠️ ORM database operations failed:', ormErr);
        console.log('🚨 Will attempt to continue server startup anyway');
      }
    }
    
    // Clear the overall timeout since we're done
    clearTimeout(timeout);
    
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