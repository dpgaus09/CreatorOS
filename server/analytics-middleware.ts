import { Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { UAParser } from "ua-parser-js";
import { pageViewProcessor, userEventProcessor } from "./batch-processor";

// Cache for analytics settings to avoid repeated DB lookups
let analyticsEnabledCache: { value: string; timestamp: number } | null = null;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes - increased to reduce DB calls

// Identify device type from user agent with optimized caching
const deviceTypeCache = new Map<string, string>();
const MAX_DEVICE_CACHE_SIZE = 500; // Reduced to optimize memory usage
let deviceCacheLastCleaned = Date.now();

/**
 * Efficiently determine device type from user agent string with caching
 */
function getDeviceType(userAgent: string): string {
  if (!userAgent) return "desktop";
  
  // Use a hash of the UA string for better cache performance
  const cacheKey = typeof userAgent === 'string' && userAgent.length > 100 
    ? userAgent.substring(0, 100) 
    : userAgent;
  
  // Check cache first
  if (deviceTypeCache.has(cacheKey)) {
    return deviceTypeCache.get(cacheKey)!;
  }
  
  // Periodically clean cache (every hour)
  if (deviceTypeCache.size > MAX_DEVICE_CACHE_SIZE || 
      Date.now() - deviceCacheLastCleaned > 60 * 60 * 1000) {
    // Keep only the most recent half of entries
    const entries = Array.from(deviceTypeCache.entries());
    deviceTypeCache.clear();
    entries.slice(-MAX_DEVICE_CACHE_SIZE/2).forEach(([k, v]) => deviceTypeCache.set(k, v));
    deviceCacheLastCleaned = Date.now();
  }
  
  // Parse and cache the result
  try {
    const parser = new UAParser(userAgent);
    const device = parser.getDevice();
    const deviceType = device.type || "desktop";
    deviceTypeCache.set(cacheKey, deviceType);
    return deviceType;
  } catch (e) {
    // Fallback in case of parsing error
    return "desktop";
  }
}

// Promise cache for analytics enabled status to prevent duplicate calls
let analyticsEnabledPromise: Promise<boolean> | null = null;
let analyticsPromiseTimestamp = 0;

/**
 * Check if analytics is enabled with optimized promise caching
 * This prevents redundant DB calls during concurrent requests
 */
function isAnalyticsEnabled(): Promise<boolean> {
  const now = Date.now();
  
  // Return cached promise if still valid
  if (analyticsEnabledPromise && now - analyticsPromiseTimestamp < 2000) {
    return analyticsEnabledPromise;
  }
  
  // Check memory cache first
  if (analyticsEnabledCache && (now - analyticsEnabledCache.timestamp < CACHE_TTL)) {
    return Promise.resolve(analyticsEnabledCache.value === "true");
  }
  
  // Create new promise for DB lookup
  analyticsPromiseTimestamp = now;
  analyticsEnabledPromise = (async () => {
    try {
      const analyticsEnabled = await storage.getSetting("analytics-enabled");
      const value = analyticsEnabled?.value || "true";
      
      // Update cache
      analyticsEnabledCache = {
        value,
        timestamp: now
      };
      
      return value === "true";
    } catch (error) {
      // If error occurs (setting doesn't exist), default to enabled
      analyticsEnabledCache = {
        value: "true",
        timestamp: now
      };
      return true;
    }
  })();
  
  return analyticsEnabledPromise;
}

/**
 * Optimized analytics middleware that minimizes impact on response time
 */
export const analyticsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Skip paths fast without async operations
  const skipPaths = ['/api/analytics', '/uploads', '/favicon.ico', '/api/health'];
  if (skipPaths.some(path => req.path.startsWith(path))) {
    return next();
  }

  // Minimal data capture upfront (non-blocking)
  const startTime = Date.now();
  const userId = req.user?.id;
  const path = req.path;
  const method = req.method;
  const userAgent = req.headers['user-agent'] || '';
  
  // Check analytics enabled status quickly
  isAnalyticsEnabled().then(analyticsEnabled => {
    if (!analyticsEnabled) return;
    
    // Prepare response interceptor to track after response is sent
    const originalEnd = res.end;
    
    // Override end method with low-overhead implementation
    // @ts-ignore: This intentional override requires ignoring type checking
    res.end = function(
      this: Response, 
      chunk?: string | Buffer | Uint8Array,
      encoding?: BufferEncoding,
      callback?: () => void
    ) {
      // Restore original end first to avoid recursion
      res.end = originalEnd;
      
      // Handle different overloads of the end method
      let result;
      if (typeof chunk === 'function') {
        // @ts-ignore: This is a valid Express.js pattern for handling response end
        result = originalEnd.call(this, null, null, chunk);
      } else if (typeof encoding === 'function') {
        // @ts-ignore: This is a valid Express.js pattern for handling response end
        result = originalEnd.call(this, chunk, null, encoding);
      } else {
        // @ts-ignore: This is a valid Express.js pattern for handling response end
        result = originalEnd.call(this, chunk, encoding, callback);
      }
      
      // Queue analytics tracking asynchronously *after* response is fully sent
      // This ensures analytics doesn't impact user-perceived response time
      setImmediate(() => {
        process.nextTick(() => {
          try {
            // Track page view for GET requests to non-API paths
            if (method === 'GET' && !path.startsWith('/api/')) {
              const pageViewData = {
                userId,
                path,
                query: req.query && Object.keys(req.query).length > 0 ? 
                  JSON.stringify(req.query) : null,
                referrer: req.headers.referer || null,
                userAgent: userAgent.slice(0, 255), // Limit length
                deviceType: getDeviceType(userAgent),
                ipAddress: req.ip || null,
              };

              // Use the batch processor
              pageViewProcessor.add(pageViewData);
            }

            // Track API requests as user events (with performance data)
            if (path.startsWith('/api/') && !path.startsWith('/api/analytics')) {
              // Only track certain HTTP methods to reduce noise
              if (method === 'GET' || method === 'POST' || method === 'PUT' || method === 'DELETE') {
                const eventData = {
                  userId,
                  eventType: `api_${method.toLowerCase()}`,
                  eventData: {
                    endpoint: path,
                    statusCode: res.statusCode,
                    responseTime: Date.now() - startTime,
                  },
                  path,
                };

                // Use the batch processor
                userEventProcessor.add(eventData);
              }
            }
          } catch (error: unknown) {
            // Don't let analytics errors affect the application
            console.error("Error in analytics tracking:", error instanceof Error ? error.message : error);
          }
        });
      });
      
      return result;
    };
    
  }).catch(err => {
    console.error("Error checking analytics status:", err);
  });
  
  // Continue middleware chain without waiting for analytics check
  // This ensures request processing isn't blocked by analytics
  next();
};

// Course analytics tracking with improved batching
const courseViewQueue = new Map<number, { 
  totalViews: number; 
  uniqueUserIds: Set<number>; 
  lastProcessed: number;
  processing: boolean; 
}>();

const courseCompletionQueue = new Map<number, { 
  totalCompletions: number; 
  lastProcessed: number;
  processing: boolean;
}>();

// Optimized processing interval
const COURSE_ANALYTICS_PROCESS_INTERVAL = 2 * 60 * 1000; // 2 minutes
const COURSE_ANALYTICS_THRESHOLD = 20; // Increased threshold

// Setup efficient course analytics processing interval
// Using a more performant approach to avoid overlapping processing
let isProcessingQueues = false;
const processInterval = setInterval(async () => {
  if (isProcessingQueues) return;
  isProcessingQueues = true;
  
  try {
    await Promise.all([
      processCourseViewQueue(),
      processCourseCompletionQueue()
    ]);
  } catch (e) {
    console.error("Error in analytics processing:", e);
  } finally {
    isProcessingQueues = false;
  }
}, COURSE_ANALYTICS_PROCESS_INTERVAL);

// Add error handling to ensure interval keeps running
processInterval.unref(); // Allow process to exit even if interval is active

/**
 * Process course view analytics with optimized DB interactions
 */
async function processCourseViewQueue() {
  const courseIdsToProcess: number[] = [];
  
  // First identify which courses need processing (separate loop to avoid
  // modifying the map during iteration)
  for (const [courseId, data] of courseViewQueue.entries()) {
    // Skip if already being processed
    if (data.processing) continue;
    
    // Process if we have enough data or enough time has passed
    if (data.totalViews >= COURSE_ANALYTICS_THRESHOLD || 
        (data.totalViews > 0 && Date.now() - data.lastProcessed > COURSE_ANALYTICS_PROCESS_INTERVAL)) {
      courseIdsToProcess.push(courseId);
      data.processing = true;
    }
  }
  
  // Now process in parallel batches to improve throughput
  const batchSize = 5;
  for (let i = 0; i < courseIdsToProcess.length; i += batchSize) {
    const batch = courseIdsToProcess.slice(i, i + batchSize);
    await Promise.all(batch.map(processSingleCourseViews));
  }
}

/**
 * Process a single course's view analytics
 */
async function processSingleCourseViews(courseId: number) {
  const data = courseViewQueue.get(courseId);
  if (!data) return;
  
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
    
    // Reset processing flag and update timestamp
    if (data) {
      data.processing = false;
      data.lastProcessed = Date.now();
    }
  }
}

/**
 * Process course completion analytics with parallel processing
 */
async function processCourseCompletionQueue() {
  const courseIdsToProcess: number[] = [];
  
  // Identify courses to process
  for (const [courseId, data] of courseCompletionQueue.entries()) {
    if (data.processing) continue;
    
    if (data.totalCompletions >= 5 || 
        (data.totalCompletions > 0 && Date.now() - data.lastProcessed > COURSE_ANALYTICS_PROCESS_INTERVAL)) {
      courseIdsToProcess.push(courseId);
      data.processing = true;
    }
  }
  
  // Process in parallel batches
  const batchSize = 5;
  for (let i = 0; i < courseIdsToProcess.length; i += batchSize) {
    const batch = courseIdsToProcess.slice(i, i + batchSize);
    await Promise.all(batch.map(processSingleCourseCompletion));
  }
}

/**
 * Process a single course's completion analytics
 */
async function processSingleCourseCompletion(courseId: number) {
  const data = courseCompletionQueue.get(courseId);
  if (!data) return;
  
  try {
    // Get existing analytics for the course
    const analytics = await storage.getCourseAnalytics(courseId);
    
    if (analytics) {
      // Update existing analytics
      await storage.updateCourseAnalytics(courseId, {
        totalCompletions: (analytics.totalCompletions || 0) + data.totalCompletions,
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
    
    // Reset processing flag and update timestamp
    if (data) {
      data.processing = false;
      data.lastProcessed = Date.now();
    }
  }
}

/**
 * Track course view with non-blocking implementation
 * Uses memory queuing to minimize DB operations
 */
export const trackCourseView = async (courseId: number, userId?: number) => {
  // Add to queue instead of processing immediately
  if (!courseViewQueue.has(courseId)) {
    courseViewQueue.set(courseId, {
      totalViews: 0,
      uniqueUserIds: new Set(),
      lastProcessed: 0,
      processing: false
    });
  }
  
  const data = courseViewQueue.get(courseId)!;
  data.totalViews++;
  
  if (userId) {
    data.uniqueUserIds.add(userId);
  }
  
  // If queue gets very large, process asynchronously
  if (data.totalViews >= 100 && !data.processing) {
    data.processing = true;
    setImmediate(() => {
      processSingleCourseViews(courseId).catch(err => {
        console.error(`Error processing large course view queue for ${courseId}:`, err);
        data.processing = false;
      });
    });
  }
};

/**
 * Track course completion with non-blocking implementation
 */
export const trackCourseCompletion = async (courseId: number) => {
  // Add to queue instead of processing immediately
  if (!courseCompletionQueue.has(courseId)) {
    courseCompletionQueue.set(courseId, {
      totalCompletions: 0,
      lastProcessed: 0,
      processing: false
    });
  }
  
  const data = courseCompletionQueue.get(courseId)!;
  data.totalCompletions++;
  
  // Completions are more important, process sooner if threshold is reached
  if (data.totalCompletions >= 10 && !data.processing) {
    data.processing = true;
    setImmediate(() => {
      processSingleCourseCompletion(courseId).catch(err => {
        console.error(`Error processing course completion queue for ${courseId}:`, err);
        data.processing = false;
      });
    });
  }
};