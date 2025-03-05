import { Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { UAParser } from "ua-parser-js";

// Cache for analytics settings to avoid repeated DB lookups
let analyticsEnabledCache: { value: string; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Batch processing queue for analytics events
const analyticsQueue: {
  type: 'pageView' | 'userEvent';
  data: any;
  timestamp: number;
}[] = [];

// Process size and interval for batch processing
const BATCH_SIZE = 20;
const BATCH_INTERVAL = 30 * 1000; // 30 seconds

// Setup batch processing interval
setInterval(() => {
  processBatchAnalytics();
}, BATCH_INTERVAL);

// Process the analytics queue in batches
async function processBatchAnalytics() {
  if (analyticsQueue.length === 0) return;
  
  // Take items from the queue up to batch size
  const batch = analyticsQueue.splice(0, BATCH_SIZE);
  
  // Group by type
  const pageViews = batch.filter(item => item.type === 'pageView').map(item => item.data);
  const userEvents = batch.filter(item => item.type === 'userEvent').map(item => item.data);
  
  // Process page views in bulk if implemented
  if (pageViews.length > 0) {
    try {
      // For now, process them individually since we don't have bulk insert
      for (const pageView of pageViews) {
        await storage.createPageView(pageView);
      }
    } catch (error) {
      console.error("Error processing page view batch:", error);
    }
  }
  
  // Process user events in bulk if implemented
  if (userEvents.length > 0) {
    try {
      // For now, process them individually since we don't have bulk insert
      for (const userEvent of userEvents) {
        await storage.createUserEvent(userEvent);
      }
    } catch (error) {
      console.error("Error processing user event batch:", error);
    }
  }
}

// Identify device type from user agent - memoize results to avoid repeated parsing
const deviceTypeCache = new Map<string, string>();
function getDeviceType(userAgent: string): string {
  if (!userAgent) return "desktop";
  
  // Check cache first
  if (deviceTypeCache.has(userAgent)) {
    return deviceTypeCache.get(userAgent)!;
  }
  
  // Parse and cache the result
  const parser = new UAParser(userAgent);
  const device = parser.getDevice();
  const deviceType = device.type || "desktop";
  
  // Store in cache - limit cache size to prevent memory leaks
  if (deviceTypeCache.size > 1000) {
    // Clear oldest entries if cache gets too large
    const oldestKeys = Array.from(deviceTypeCache.keys()).slice(0, 200);
    oldestKeys.forEach(key => deviceTypeCache.delete(key));
  }
  
  deviceTypeCache.set(userAgent, deviceType);
  return deviceType;
}

// Check if analytics is enabled (with caching)
async function isAnalyticsEnabled(): Promise<boolean> {
  // Check cache
  if (analyticsEnabledCache && (Date.now() - analyticsEnabledCache.timestamp < CACHE_TTL)) {
    return analyticsEnabledCache.value === "true";
  }
  
  // Get from database
  try {
    const analyticsEnabled = await storage.getSetting("analytics-enabled");
    const value = analyticsEnabled?.value || "true";
    
    // Update cache
    analyticsEnabledCache = {
      value,
      timestamp: Date.now()
    };
    
    return value === "true";
  } catch (error) {
    // If error occurs (setting doesn't exist), default to enabled
    console.log("Analytics setting not found, defaulting to enabled");
    analyticsEnabledCache = {
      value: "true",
      timestamp: Date.now()
    };
    return true;
  }
}

export const analyticsMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // Skip analytics collection for certain paths
  const skipPaths = ['/api/analytics', '/uploads', '/favicon.ico'];
  if (skipPaths.some(path => req.path.startsWith(path))) {
    return next();
  }

  // Fast check if analytics is enabled
  const analyticsEnabled = await isAnalyticsEnabled();
  if (!analyticsEnabled) {
    return next();
  }

  // Capture the beginning of the request
  const startTime = Date.now();

  // Extract user information
  const userId = req.user?.id;
  const sessionId = req.sessionID;

  // Prepare response interceptor to track after response is sent
  const originalEnd = res.end;
  
  // We need to override the end method with a custom implementation that tracks analytics
  // @ts-ignore: This intentional override requires ignoring type checking
  res.end = function(
    this: Response, 
    chunk?: string | Buffer | Uint8Array,
    encoding?: BufferEncoding,
    callback?: () => void
  ) {
    // Track analytics asynchronously after response
    setImmediate(() => {
      try {
        // Track page view for GET requests to non-API paths
        if (req.method === 'GET' && !req.path.startsWith('/api/')) {
          const pageViewData = {
            userId,
            path: req.path,
            query: req.query ? JSON.stringify(req.query) : null,
            referrer: req.headers.referer || null,
            userAgent: req.headers['user-agent'] || null,
            deviceType: getDeviceType(req.headers['user-agent'] || ''),
            ipAddress: req.ip || null,
          };

          // Add to batch processing queue
          analyticsQueue.push({
            type: 'pageView',
            data: pageViewData,
            timestamp: Date.now()
          });
        }

        // Track API requests as user events
        if (req.path.startsWith('/api/') && !req.path.startsWith('/api/analytics')) {
          const eventData = {
            userId,
            eventType: `api_${req.method.toLowerCase()}`,
            eventData: {
              endpoint: req.path,
              statusCode: res.statusCode,
              responseTime: Date.now() - startTime,
            },
            path: req.path,
          };

          // Add to batch processing queue
          analyticsQueue.push({
            type: 'userEvent',
            data: eventData,
            timestamp: Date.now()
          });
        }
      } catch (error: unknown) {
        console.error("Error in analytics tracking:", error instanceof Error ? error.message : error);
      }
    });

    // Restore original end method
    res.end = originalEnd;
    
    // Handle different overloads of the end method
    if (typeof chunk === 'function') {
      // @ts-ignore: This is a valid Express.js pattern for handling response end
      return originalEnd.call(this, null, null, chunk);
    } else if (typeof encoding === 'function') {
      // @ts-ignore: This is a valid Express.js pattern for handling response end
      return originalEnd.call(this, chunk, null, encoding);
    } else {
      // @ts-ignore: This is a valid Express.js pattern for handling response end
      return originalEnd.call(this, chunk, encoding, callback);
    }
  };

  next();
};

// Course analytics tracking queue
const courseViewQueue: Map<number, { totalViews: number; uniqueUserIds: Set<number>; lastProcessed: number }> = new Map();
const courseCompletionQueue: Map<number, { totalCompletions: number; lastProcessed: number }> = new Map();
const COURSE_ANALYTICS_PROCESS_INTERVAL = 60 * 1000; // 1 minute
const COURSE_ANALYTICS_THRESHOLD = 10; // Process when at least 10 views/completions are queued

// Setup course analytics processing interval
setInterval(() => {
  processCourseViewQueue();
  processCourseCompletionQueue();
}, COURSE_ANALYTICS_PROCESS_INTERVAL);

// Process the course view queue
async function processCourseViewQueue() {
  for (const [courseId, data] of courseViewQueue.entries()) {
    // Skip if not enough views or not enough time has passed since last processing
    if (data.totalViews < COURSE_ANALYTICS_THRESHOLD && 
        Date.now() - data.lastProcessed < COURSE_ANALYTICS_PROCESS_INTERVAL) {
      continue;
    }
    
    try {
      // Get existing analytics for the course
      const analytics = await storage.getCourseAnalytics(courseId);
      
      if (analytics) {
        // Update existing analytics
        await storage.updateCourseAnalytics(courseId, {
          totalViews: analytics.totalViews + data.totalViews,
          uniqueViews: analytics.uniqueViews + data.uniqueUserIds.size,
          lastUpdated: new Date(),
        });
      } else {
        // Create new analytics
        await storage.createCourseAnalytics({
          courseId,
          totalViews: data.totalViews,
          uniqueViews: data.uniqueUserIds.size,
        });
      }
      
      // Clear processed data
      courseViewQueue.delete(courseId);
    } catch (error: unknown) {
      console.error(`Error processing course view queue for course ${courseId}:`, 
        error instanceof Error ? error.message : error);
      
      // Mark as processed anyway to avoid retrying too soon
      data.lastProcessed = Date.now();
    }
  }
}

// Process the course completion queue
async function processCourseCompletionQueue() {
  for (const [courseId, data] of courseCompletionQueue.entries()) {
    // Skip if not enough completions or not enough time has passed
    if (data.totalCompletions < 5 && 
        Date.now() - data.lastProcessed < COURSE_ANALYTICS_PROCESS_INTERVAL) {
      continue;
    }
    
    try {
      // Get existing analytics for the course
      const analytics = await storage.getCourseAnalytics(courseId);
      
      if (analytics) {
        // Update existing analytics
        await storage.updateCourseAnalytics(courseId, {
          totalCompletions: analytics.totalCompletions + data.totalCompletions,
          lastUpdated: new Date(),
        });
      } else {
        // Create new analytics
        await storage.createCourseAnalytics({
          courseId,
          totalCompletions: data.totalCompletions,
        });
      }
      
      // Clear processed data
      courseCompletionQueue.delete(courseId);
    } catch (error: unknown) {
      console.error(`Error processing course completion queue for course ${courseId}:`, 
        error instanceof Error ? error.message : error);
      
      // Mark as processed anyway to avoid retrying too soon
      data.lastProcessed = Date.now();
    }
  }
}

// Function to track course specific events with batching
export const trackCourseView = async (courseId: number, userId?: number) => {
  // Add to queue instead of processing immediately
  if (!courseViewQueue.has(courseId)) {
    courseViewQueue.set(courseId, {
      totalViews: 0,
      uniqueUserIds: new Set(),
      lastProcessed: 0
    });
  }
  
  const data = courseViewQueue.get(courseId)!;
  data.totalViews++;
  
  if (userId) {
    data.uniqueUserIds.add(userId);
  }
  
  // If queue gets large, process immediately
  if (data.totalViews >= 50) {
    processCourseViewQueue();
  }
};

export const trackCourseCompletion = async (courseId: number) => {
  // Add to queue instead of processing immediately
  if (!courseCompletionQueue.has(courseId)) {
    courseCompletionQueue.set(courseId, {
      totalCompletions: 0,
      lastProcessed: 0
    });
  }
  
  const data = courseCompletionQueue.get(courseId)!;
  data.totalCompletions++;
  
  // Completions are more important, process immediately if threshold is reached
  if (data.totalCompletions >= 10) {
    processCourseCompletionQueue();
  }
};