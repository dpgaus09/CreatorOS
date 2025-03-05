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

    return true;
  } catch (error) {
    console.error('Error initializing analytics service:', error);
    return false;
  }
}

/**
 * Master initialization function that should be called during
 * application startup in production environments.
 */
export async function initializeProductionServer() {
  console.log('Starting production server initialization...');
  
  try {
    // Initialize analytics service with error handling
    try {
      await initializeAnalyticsService();
    } catch (error) {
      console.error('Error initializing analytics service, but continuing with other initialization:', error);
      // Don't return here, continue with other initialization steps
    }
    
    // Verify LMS settings
    try {
      const lmsName = await storage.getSetting('lms-name');
      if (!lmsName) {
        console.log('Creating default LMS name setting');
        await storage.updateSetting('lms-name', 'Learner_Bruh LMS');
      }
    } catch (settingError) {
      console.error('Error verifying LMS settings:', settingError);
      // Don't fail the entire initialization for settings errors
    }
    
    console.log('Production server initialization completed');
    return true;
  } catch (error) {
    console.error('Error during production server initialization:', error);
    // Even with errors, return true to allow the server to start
    return true;
  }
}