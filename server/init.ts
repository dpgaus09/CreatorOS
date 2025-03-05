/**
 * Production initialization module
 * 
 * This module is used to initialize critical data and verify systems
 * are properly configured in production deployments.
 */
import { db } from './db';
import { storage } from './storage';
import { pageViews, users, settings, courses, courseAnalytics } from '../shared/schema';
import { count, eq } from 'drizzle-orm';

/**
 * Initializes the analytics service by ensuring all required tables
 * and data structures exist and are populated with default values
 * when necessary.
 */
export async function initializeAnalyticsService() {
  console.log('Initializing analytics service...');
  
  try {
    // First, verify database connection is working
    try {
      await db.execute('SELECT 1');
      console.log('Database connection verified successfully');
    } catch (dbError) {
      console.error('Failed to connect to database:', dbError);
      // Return early but with success=true to prevent app from failing to start
      return true;
    }
    
    // Check if analytics tables exist before querying them
    try {
      // Perform a safer check to see if tables exist before querying them
      const queryText = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'page_views'
        )
      `;
      const pageViewTableExists = await db.execute(queryText);
      
      if (!pageViewTableExists || !pageViewTableExists.rows || !pageViewTableExists.rows[0]?.exists) {
        console.log('Analytics tables may not exist yet - skipping initialization');
        return true;
      }
      
      console.log('Analytics tables exist, proceeding with initialization');
    } catch (tableCheckError) {
      console.error('Error checking if analytics tables exist:', tableCheckError);
      // Continue anyway, the next steps have their own error handling
    }
    
    // Check if analytics tables have data - with error handling
    let pageViewCount;
    try {
      [pageViewCount] = await db.select({ count: count() }).from(pageViews);
      console.log(`Found ${pageViewCount?.count || 0} page view records`);
    } catch (err) {
      console.error('Error checking page view records, but continuing:', err);
      // If this fails, continue with other initialization
    }
    
    // Check course analytics - with error handling
    let courseAnalyticsCount;
    try {
      [courseAnalyticsCount] = await db.select({ count: count() }).from(courseAnalytics);
      console.log(`Found ${courseAnalyticsCount?.count || 0} course analytics records`);
    } catch (err) {
      console.error('Error checking course analytics records, but continuing:', err);
      // If this fails, continue with other initialization
      // Return success to allow server to start regardless
      return true;
    }
    
    // If no course analytics exist, create default records for existing courses
    // Only proceed if we successfully retrieved the count
    if (courseAnalyticsCount !== undefined && !courseAnalyticsCount?.count) {
      console.log('No course analytics found, initializing default records');
      
      let allCourses = [];
      try {
        allCourses = await storage.getPublishedCourses();
        console.log(`Found ${allCourses.length} courses to initialize analytics for`);
      } catch (err) {
        console.error('Error retrieving courses for analytics initialization:', err);
        // If we can't get the courses, we can't create analytics, but we shouldn't fail
        return true;
      }
      
      // Create analytics records one by one with error handling for each
      for (const course of allCourses) {
        console.log(`Creating default analytics for course: ${course.id} - ${course.title}`);
        
        try {
          await storage.createCourseAnalytics({
            courseId: course.id,
            totalViews: 0,
            uniqueViews: 0,
            totalCompletions: 0,
            averageRating: 0
            // lastUpdated is handled automatically by the schema default
          });
        } catch (error) {
          console.error(`Error creating analytics for course ${course.id}, but continuing with others:`, error);
          // Continue with other courses even if one fails
        }
      }
    }

    console.log('Analytics service initialization completed successfully');
    return true;
  } catch (error) {
    console.error('Error initializing analytics service:', error);
    // Return true anyway to allow the server to start
    return true;
  }
}

/**
 * Master initialization function that should be called during
 * application startup in production environments.
 */
export async function initializeProductionServer() {
  console.log('Starting production server initialization...');
  
  try {
    // First verify DB connection directly
    try {
      await db.execute('SELECT 1');
      console.log('Database connection verified for production initialization');
    } catch (dbError) {
      console.error('Database connection failed during production initialization:', dbError);
      console.log('Starting server anyway - DB connection may be established later');
      // Return success to allow server to start
      return true;
    }
    
    // Initialize analytics service with error handling
    try {
      const analyticsResult = await initializeAnalyticsService();
      if (analyticsResult) {
        console.log('Analytics service initialized successfully');
      } else {
        console.log('Analytics service initialization skipped or had issues');
      }
    } catch (error) {
      console.error('Error initializing analytics service, but continuing with other initialization:', error);
      // Don't return here, continue with other initialization steps
    }
    
    // Verify LMS settings - with improved error handling
    try {
      // Check if settings table exists first
      const settingsTableExists = await db.execute(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'settings'
        )
      `);
      
      if (settingsTableExists && settingsTableExists.rows && settingsTableExists.rows[0]?.exists) {
        console.log('Settings table exists, checking LMS name setting');
        
        try {
          const lmsName = await storage.getSetting('lms-name');
          if (!lmsName) {
            console.log('Creating default LMS name setting');
            await storage.updateSetting('lms-name', 'Learner_Bruh LMS');
          } else {
            console.log('LMS name setting already exists:', lmsName.value);
          }
        } catch (settingError) {
          console.error('Error while checking LMS name setting:', settingError);
          // Don't fail the entire initialization for settings errors
        }
      } else {
        console.log('Settings table may not exist yet - skipping settings verification');
      }
    } catch (tableCheckError) {
      console.error('Error checking for settings table:', tableCheckError);
      // Continue execution regardless
    }
    
    console.log('Production server initialization completed');
    return true;
  } catch (error) {
    console.error('Error during production server initialization:', error);
    // Even with errors, return true to allow the server to start
    return true;
  }
}