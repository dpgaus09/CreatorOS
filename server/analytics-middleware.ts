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
  res.end = function(chunk?: any, encoding?: BufferEncoding | undefined, callback?: (() => void) | undefined): Response<any, Record<string, any>> {
    // Restore original end
    res.end = originalEnd;

    // Call original end with appropriate arguments
    if (typeof chunk === 'function') {
      return originalEnd.call(this, chunk);
    } else if (typeof encoding === 'function') {
      return originalEnd.call(this, chunk, encoding);
    } else {
      return originalEnd.call(this, chunk, encoding, callback);
    }

    // Track page view for GET requests
    if (req.method === 'GET' && !req.path.startsWith('/api/')) {
      try {
        const pageViewData = {
          userId,
          path: req.path,
          query: req.query ? JSON.stringify(req.query) : null,
          referrer: req.headers.referer || null,
          userAgent: req.headers['user-agent'] || null,
          deviceType: getDeviceType(req.headers['user-agent'] || ''),
          ipAddress: req.ip || null,
        };

        storage.createPageView(pageViewData);
      } catch (error) {
        console.error("Error tracking page view:", error);
      }
    }

    // Track API requests as user events
    if (req.path.startsWith('/api/') && !req.path.startsWith('/api/analytics')) {
      try {
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

        storage.createUserEvent(eventData);
      } catch (error) {
        console.error("Error tracking user event:", error);
      }
    }

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

    return res;
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
  } catch (error) {
    console.error("Error tracking course view:", error);
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
  } catch (error) {
    console.error("Error tracking course completion:", error);
  }
};