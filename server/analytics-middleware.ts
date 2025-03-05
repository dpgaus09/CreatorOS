import { Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { UAParser } from "ua-parser-js";

// Identify device type from user agent
function getDeviceType(userAgent: string): string {
  const parser = new UAParser(userAgent);
  const device = parser.getDevice();
  return device.type || "desktop";
}

export const analyticsMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // Skip analytics collection for certain paths
  const skipPaths = ['/api/analytics', '/uploads', '/favicon.ico'];
  if (skipPaths.some(path => req.path.startsWith(path))) {
    return next();
  }

  // Get analytics enabled setting
  try {
    const analyticsEnabled = await storage.getSetting("analytics-enabled");
    if (!analyticsEnabled || analyticsEnabled.value !== "true") {
      return next();
    }
  } catch (error) {
    // If error occurs (setting doesn't exist), default to enabled
    console.log("Analytics setting not found, defaulting to enabled");
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
    // Track analytics before completing the response
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

        storage.createPageView(pageViewData).catch(err => {
          console.error("Error tracking page view:", err);
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

        storage.createUserEvent(eventData).catch(err => {
          console.error("Error tracking user event:", err);
        });
      }

      // Temporarily disable session tracking to fix app crash
      /*
      // Update session data
      if (sessionId) {
        // Use Promise to handle async operations outside the sync response handler
        Promise.resolve().then(async () => {
          try {
            const existingSession = await storage.getSessionBySessionId(sessionId);

            if (existingSession) {
              // Update existing session
              storage.updateSession(existingSession.id, {
                endTime: new Date(),
                duration: Math.floor((Date.now() - existingSession.startTime.getTime()) / 1000),
              });
            } else if (userId) {
              // Create new session
              storage.createSession({
                userId,
                sessionId,
                deviceType: getDeviceType(req.headers['user-agent'] || ''),
                browserInfo: req.headers['user-agent'] || null,
              });
            }
          } catch (error) {
            console.error("Error tracking session:", error);
          }
        });
      }
      */
    } catch (error: unknown) {
      console.error("Error in analytics tracking:", error instanceof Error ? error.message : error);
    }

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

// Function to track course specific events
export const trackCourseView = async (courseId: number, userId?: number) => {
  try {
    // Get existing analytics for the course
    const analytics = await storage.getCourseAnalytics(courseId);

    if (analytics) {
      // Update existing analytics
      await storage.updateCourseAnalytics(courseId, {
        totalViews: analytics.totalViews + 1,
        // We only increment unique views if this is a new user
        uniqueViews: userId ? analytics.uniqueViews + 1 : analytics.uniqueViews,
        lastUpdated: new Date(),
      });
    } else {
      // Create new analytics
      await storage.createCourseAnalytics({
        courseId,
        totalViews: 1,
        uniqueViews: userId ? 1 : 0,
      });
    }
  } catch (error: unknown) {
    console.error("Error tracking course view:", error instanceof Error ? error.message : error);
  }
};

export const trackCourseCompletion = async (courseId: number) => {
  try {
    // Get existing analytics for the course
    const analytics = await storage.getCourseAnalytics(courseId);

    if (analytics) {
      // Update existing analytics
      await storage.updateCourseAnalytics(courseId, {
        totalCompletions: analytics.totalCompletions + 1,
        lastUpdated: new Date(),
      });
    } else {
      // Create new analytics
      await storage.createCourseAnalytics({
        courseId,
        totalCompletions: 1,
      });
    }
  } catch (error: unknown) {
    console.error("Error tracking course completion:", error instanceof Error ? error.message : error);
  }
};