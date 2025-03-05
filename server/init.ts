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
    // Check if analytics tables have data
    const [pageViewCount] = await db.select({ count: count() }).from(pageViews);
    console.log(`Found ${pageViewCount?.count || 0} page view records`);
    
    // Check course analytics
    const [courseAnalyticsCount] = await db.select({ count: count() }).from(courseAnalytics);
    console.log(`Found ${courseAnalyticsCount?.count || 0} course analytics records`);
    
    // If no course analytics exist, create default records for existing courses
    if (!courseAnalyticsCount?.count) {
      console.log('No course analytics found, initializing default records');
      
      const allCourses = await storage.getPublishedCourses();
      console.log(`Found ${allCourses.length} courses to initialize analytics for`);
      
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
          console.error(`Error creating analytics for course ${course.id}:`, error);
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
    // Initialize analytics service
    await initializeAnalyticsService();
    
    // Verify LMS settings
    const lmsName = await storage.getSetting('lms-name');
    if (!lmsName) {
      console.log('Creating default LMS name setting');
      await storage.updateSetting('lms-name', 'Learner_Bruh LMS');
    }
    
    console.log('Production server initialization completed successfully');
    return true;
  } catch (error) {
    console.error('Error during production server initialization:', error);
    return false;
  }
}