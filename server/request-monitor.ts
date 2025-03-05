/**
 * Request Monitor Middleware
 * 
 * Provides HTTP request monitoring, performance tracking, and rate limiting
 * to optimize API throughput and reduce resource usage.
 */

import { Request, Response, NextFunction } from 'express';
import { trackHttpRequestStart, trackHttpRequestEnd } from './system-monitor';

// Tracking active requests
const activeRequests = new Map<string, {
  count: number;
  lastReset: number;
}>();

// Request tracking window in milliseconds (1 minute)
const REQUEST_WINDOW = 60 * 1000;

// Request limits by path pattern
const REQUEST_LIMITS: Record<string, number> = {
  '/api/analytics': 20,       // Limit heavy analytics endpoints
  '/api/courses': 100,        // Reasonable limit for course data
  'default': 300,              // Default limit for all other endpoints
};

// URL patterns to exclude from rate limiting (public endpoints)
const EXCLUDE_PATTERNS = [
  '/api/public/',
  '/api/health',
];

/**
 * Get the appropriate rate limit for a request path
 */
function getRateLimit(path: string): number {
  // Check for specific path limits
  for (const pattern in REQUEST_LIMITS) {
    if (path.includes(pattern)) {
      return REQUEST_LIMITS[pattern];
    }
  }
  
  // Return default limit
  return REQUEST_LIMITS.default;
}

/**
 * Check if path should be excluded from rate limiting
 */
function isExcluded(path: string): boolean {
  return EXCLUDE_PATTERNS.some(pattern => path.includes(pattern));
}

/**
 * HTTP request monitoring middleware
 */
export function requestMonitor(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const clientIp = req.ip || 'unknown';
  const path = req.path;
  
  // Track request in system monitor
  trackHttpRequestStart();
  
  // Handle rate limiting for all but excluded paths
  if (!isExcluded(path)) {
    const rateKey = `${clientIp}:${path}`;
    const limit = getRateLimit(path);
    const now = Date.now();
    
    // Initialize or update rate tracking for this client+path
    if (!activeRequests.has(rateKey)) {
      activeRequests.set(rateKey, {
        count: 1,
        lastReset: now,
      });
    } else {
      const entry = activeRequests.get(rateKey)!;
      
      // Reset counter if window has passed
      if (now - entry.lastReset > REQUEST_WINDOW) {
        entry.count = 1;
        entry.lastReset = now;
      } else {
        // Increment counter
        entry.count++;
        
        // Check if rate limit exceeded
        if (entry.count > limit) {
          // Track the completed request (even though we're rejecting it)
          trackHttpRequestEnd(429);
          
          // Return 429 Too Many Requests
          return res.status(429).json({
            error: 'Too many requests',
            message: 'Please try again later',
          });
        }
      }
    }
  }
  
  // Intercept response to track metrics when request completes
  const originalEnd = res.end;
  
  // Override response end method to capture metrics
  // @ts-ignore: Standard express middleware pattern
  res.end = function(chunk?: any, encoding?: string) {
    // Restore original end method
    res.end = originalEnd;
    
    // Calculate request duration
    const duration = Date.now() - startTime;
    
    // Add response time header
    res.setHeader('X-Response-Time', `${duration}ms`);
    
    // Log slow API requests
    if (duration > 500 && req.path.startsWith('/api/')) {
      console.warn(`⚠️ Slow API request: ${req.method} ${req.path} (${duration}ms)`);
    }
    
    // Track request completion in system monitor
    trackHttpRequestEnd(res.statusCode);
    
    // Call the original end method
    return originalEnd.apply(this, arguments as any);
  };
  
  next();
}

/**
 * Clean up expired rate limit entries periodically
 */
function cleanupRateLimits() {
  const now = Date.now();
  for (const [key, entry] of activeRequests.entries()) {
    if (now - entry.lastReset > REQUEST_WINDOW) {
      activeRequests.delete(key);
    }
  }
}

// Clean up rate limits every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
setInterval(cleanupRateLimits, CLEANUP_INTERVAL);

/**
 * Get current rate limiting status (for monitoring/debugging)
 */
export function getRateLimitStatus() {
  const result: Record<string, { current: number, limit: number, timeRemaining: number }> = {};
  
  const now = Date.now();
  for (const [key, entry] of activeRequests.entries()) {
    const path = key.split(':')[1] || key;
    const limit = getRateLimit(path);
    const timeRemaining = Math.max(0, REQUEST_WINDOW - (now - entry.lastReset));
    
    result[key] = {
      current: entry.count,
      limit,
      timeRemaining,
    };
  }
  
  return result;
}