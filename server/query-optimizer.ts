/**
 * Query Optimizer
 * 
 * This module provides optimized query functions with caching, execution planning,
 * and retry logic to improve database performance and reduce CPU usage.
 */

import { db, pool } from './db';
import { SQL, SQLWrapper } from 'drizzle-orm';
import { LRUCache } from 'lru-cache';

// Define type for context
interface QueryContext {
  query: SQL | SQLWrapper;
  params?: any[];
  options?: QueryOptions;
}

// Query optimization options
interface QueryOptions {
  priority?: 'high' | 'normal' | 'low';
  timeout?: number;
  tags?: string[];
}

// Cache statistics for monitoring
interface CacheStats {
  hits: number;
  misses: number;
  staleHits: number;
  size: number;
  lastReset: Date;
}

// Initialize cache statistics
const cacheStats: CacheStats = {
  hits: 0,
  misses: 0,
  staleHits: 0,
  size: 0,
  lastReset: new Date()
};

// Optimized cache configuration for Replit environment
const queryCache = new LRUCache<string, any>({
  max: 500, // Reduced to avoid memory pressure
  ttl: 30 * 1000, // Reduced TTL to 30 seconds for fresher data
  maxSize: 5 * 1024 * 1024, // 5MB size limit to avoid memory issues
  sizeCalculation: (value, key) => {
    // Estimate size in bytes (rough approximation)
    try {
      return JSON.stringify(value).length + key.length;
    } catch {
      return 1000; // Default size if can't stringify
    }
  },
  fetchMethod: async (key: string, staleValue: any, { context }: { context?: QueryContext }) => {
    // This is called when cache misses or when entry is stale
    if (!context || !context.query) {
      throw new Error('Cache fetch context missing required query');
    }
    
    // Track cache miss
    cacheStats.misses++;
    cacheStats.size = queryCache.size;
    
    // Execute the query
    const result = await executeQuery(context.query, context.options);
    return result;
  },
  allowStale: true, // Allow serving stale data while fetching fresh data
  updateAgeOnGet: true, // Reset TTL when an item is accessed
  noDeleteOnFetchRejection: true, // Don't delete on fetch errors
  noDisposeOnSet: true, // Don't dispose on overwrites
  fetchContext: true, // Enable context for fetchMethod
  
  // Track cache hits
  fetchMethodOnGet: true,
  noDeleteOnStaleGet: true,
  
  onCacheHit: (key, value, options) => {
    cacheStats.hits++;
    // Check if stale
    if (options.status === 'stale') {
      cacheStats.staleHits++;
    }
  }
});

// Query priority queue 
const highPriorityQueue: Array<() => Promise<any>> = [];
const normalPriorityQueue: Array<() => Promise<any>> = [];
const lowPriorityQueue: Array<() => Promise<any>> = [];

// Query scheduler
let isProcessingQueue = false;
const processQueryQueue = async () => {
  if (isProcessingQueue) return;
  isProcessingQueue = true;
  
  try {
    // Process high priority queries first
    while (highPriorityQueue.length > 0) {
      const query = highPriorityQueue.shift();
      if (query) await query();
    }
    
    // Then normal priority
    if (normalPriorityQueue.length > 0) {
      const query = normalPriorityQueue.shift();
      if (query) await query();
    }
    
    // Finally low priority if there's capacity
    if (highPriorityQueue.length === 0 && normalPriorityQueue.length === 0) {
      if (lowPriorityQueue.length > 0) {
        const query = lowPriorityQueue.shift();
        if (query) await query();
      }
    }
  } finally {
    isProcessingQueue = false;
    
    // Continue processing if queues still have items
    if (
      highPriorityQueue.length > 0 || 
      normalPriorityQueue.length > 0 || 
      lowPriorityQueue.length > 0
    ) {
      setImmediate(processQueryQueue);
    }
  }
};

// Enhanced slow query tracking
const slowQueries: { 
  query: string;
  params?: any[];
  count: number; 
  totalTime: number;
  maxTime: number;
  lastExecuted: number;
  path?: string; // API path that triggered the query
  tags?: string[];
}[] = [];

// Adjusted threshold for slow queries (in milliseconds)
const SLOW_QUERY_THRESHOLD = 150; // Reduced threshold for more sensitivity

// Limit the size of slow queries array
const MAX_SLOW_QUERIES = 100;

// Keep track of query patterns for optimization suggestions
const queryPatterns = new Map<string, {
  count: number;
  avgTime: number;
  lastSeen: number;
}>();

/**
 * Normalize SQL for pattern recognition
 */
function normalizeSQL(sql: string): string {
  return sql
    .replace(/\s+/g, ' ')
    .replace(/[0-9]+/g, 'N')
    .replace(/'[^']*'/g, "'S'")
    .replace(/"[^"]*"/g, '"C"')
    .trim();
}

/**
 * Improved raw query execution function
 */
async function executeQuery<T>(
  query: SQL | SQLWrapper, 
  options?: QueryOptions
): Promise<T[]> {
  const startTime = performance.now();
  const timeout = options?.timeout || 10000; // Default 10s timeout
  
  try {
    // Use the pg pool directly for better performance with complex queries
    const client = await pool.connect();
    let queryComplete = false;
    
    // Setup query timeout
    const timeoutId = setTimeout(() => {
      if (!queryComplete) {
        console.warn(`Query timeout after ${timeout}ms: ${query.toString().substring(0, 100)}...`);
        client.release(true); // Force release with error
      }
    }, timeout);
    
    try {
      // Converting the Drizzle query to SQL string
      const queryStr = query.toString();
      
      // Track query pattern
      const pattern = normalizeSQL(queryStr);
      const patternStats = queryPatterns.get(pattern) || { count: 0, avgTime: 0, lastSeen: 0 };
      patternStats.count++;
      patternStats.lastSeen = Date.now();
      queryPatterns.set(pattern, patternStats);
      
      // Execute query with timeout
      const result = await client.query(queryStr);
      queryComplete = true;
      
      // Measure execution time
      const executionTime = performance.now() - startTime;
      
      // Update pattern stats with execution time
      patternStats.avgTime = ((patternStats.avgTime * (patternStats.count - 1)) + executionTime) / patternStats.count;
      
      // Track slow queries for optimization insights
      if (executionTime > SLOW_QUERY_THRESHOLD) {
        trackSlowQuery(queryStr, executionTime, options?.tags);
      }
      
      // Transform the result to the expected format
      return result.rows as unknown as T[];
    } finally {
      clearTimeout(timeoutId);
      client.release();
    }
  } catch (error) {
    const executionTime = performance.now() - startTime;
    console.error(`Query execution error after ${executionTime.toFixed(2)}ms:`, error);
    
    // Categorize errors for better diagnostics
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('connection')) {
      console.error('Database connection error - may need connection retry logic');
    } else if (errorMessage.includes('timeout')) {
      console.error('Query timeout - consider query optimization');
    } else if (errorMessage.includes('syntax')) {
      console.error('SQL syntax error - please review query');
    }
    
    throw error;
  }
}

/**
 * Enhanced slow query tracking
 */
function trackSlowQuery(
  queryString: string, 
  executionTime: number,
  tags?: string[]
) {
  // Find existing entry or create new one
  const existing = slowQueries.find(q => q.query === queryString);
  
  // Get API path from stack trace if possible
  let path: string | undefined;
  try {
    const stack = new Error().stack;
    if (stack) {
      const apiPathMatch = stack.match(/\/api\/([^\s:]+)/);
      path = apiPathMatch ? `/api/${apiPathMatch[1]}` : undefined;
    }
  } catch (e) {
    // Ignore stack tracing errors
  }
  
  if (existing) {
    existing.count++;
    existing.totalTime += executionTime;
    existing.lastExecuted = Date.now();
    existing.maxTime = Math.max(existing.maxTime, executionTime);
    if (path) existing.path = path;
    if (tags) existing.tags = tags;
  } else {
    // Add new entry if we haven't reached the limit
    if (slowQueries.length < MAX_SLOW_QUERIES) {
      slowQueries.push({
        query: queryString,
        count: 1,
        totalTime: executionTime,
        maxTime: executionTime,
        lastExecuted: Date.now(),
        path,
        tags
      });
    } else {
      // Replace least frequently executed query
      const leastFrequent = slowQueries.reduce((prev, curr) => 
        prev.count < curr.count ? prev : curr
      );
      
      const idx = slowQueries.indexOf(leastFrequent);
      slowQueries[idx] = {
        query: queryString,
        count: 1,
        totalTime: executionTime,
        maxTime: executionTime,
        lastExecuted: Date.now(),
        path,
        tags
      };
    }
  }
  
  // Log slow queries in development for immediate feedback
  if (process.env.NODE_ENV === 'development') {
    console.warn(`Slow query detected (${executionTime.toFixed(2)}ms): ${queryString.substring(0, 100)}...`);
  }
}

/**
 * Enhanced cached query execution with priority support
 */
export async function cachedQuery<T>(
  query: SQL | SQLWrapper,
  options?: {
    cacheKey?: string,
    ttl?: number,
    priority?: 'high' | 'normal' | 'low',
    tags?: string[],
    bypassCache?: boolean
  }
): Promise<T[]> {
  const {
    cacheKey,
    ttl,
    priority = 'normal',
    tags,
    bypassCache = false
  } = options || {};
  
  // Generate cache key from query if not provided
  const key = cacheKey || `query:${query.toString()}`;
  
  // Skip cache if requested
  if (bypassCache) {
    return executeQuery<T>(query, { priority, tags });
  }
  
  // Define query execution with proper context
  const executeWithContext = async () => {
    const queryOptions: { context: QueryContext; ttl?: number } = {
      context: {
        query,
        options: { priority, tags }
      }
    };
    
    if (ttl) {
      queryOptions.ttl = ttl;
    }
    
    return queryCache.fetch(key, queryOptions) as Promise<T[]>;
  };
  
  // Handle high priority queries immediately
  if (priority === 'high') {
    return executeWithContext();
  }
  
  // Otherwise queue based on priority
  return new Promise((resolve, reject) => {
    const queuedQuery = async () => {
      try {
        const result = await executeWithContext();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };
    
    if (priority === 'normal') {
      normalPriorityQueue.push(queuedQuery);
    } else {
      lowPriorityQueue.push(queuedQuery);
    }
    
    // Start processing queue if not already running
    if (!isProcessingQueue) {
      processQueryQueue();
    }
  });
}

/**
 * Clear the entire query cache or specific entries with prefixes
 */
export function clearQueryCache(keyOrPrefix?: string): void {
  if (!keyOrPrefix) {
    queryCache.clear();
    console.log('Entire query cache cleared');
    return;
  }
  
  if (keyOrPrefix.endsWith('*')) {
    // Prefix-based clearing
    const prefix = keyOrPrefix.slice(0, -1);
    let count = 0;
    
    for (const key of queryCache.keys()) {
      if (key.startsWith(prefix)) {
        queryCache.delete(key);
        count++;
      }
    }
    
    console.log(`Cleared ${count} cache entries with prefix: ${prefix}`);
  } else {
    // Single key clearing
    queryCache.delete(keyOrPrefix);
    console.log(`Cache entry cleared: ${keyOrPrefix}`);
  }
  
  // Update stats
  cacheStats.size = queryCache.size;
}

/**
 * Get cache statistics
 */
export function getCacheStats(): CacheStats {
  return {
    ...cacheStats,
    size: queryCache.size
  };
}

/**
 * Reset cache statistics
 */
export function resetCacheStats(): void {
  cacheStats.hits = 0;
  cacheStats.misses = 0;
  cacheStats.staleHits = 0;
  cacheStats.size = queryCache.size;
  cacheStats.lastReset = new Date();
}

/**
 * Get enhanced slow query statistics with optimization recommendations
 */
export function getSlowQueryStats() {
  // Get basic stats
  const stats = slowQueries.map(q => ({
    query: q.query,
    count: q.count,
    avgTime: q.totalTime / q.count,
    maxTime: q.maxTime,
    lastExecuted: new Date(q.lastExecuted).toISOString(),
    path: q.path,
    tags: q.tags,
    // Add optimization suggestions
    suggestion: getSuggestionForQuery(q.query)
  }));
  
  // Sort by impact (freq * avg time)
  return stats.sort((a, b) => 
    (b.count * b.avgTime) - (a.count * a.avgTime)
  );
}

/**
 * Generate optimization suggestions for queries
 */
function getSuggestionForQuery(queryStr: string): string {
  if (queryStr.includes('SELECT * FROM') && !queryStr.includes('LIMIT')) {
    return 'Consider adding LIMIT clause and selecting only needed columns';
  }
  
  if (queryStr.includes('SELECT') && queryStr.includes('JOIN') && !queryStr.includes('INDEX')) {
    return 'Consider adding indexes for JOIN conditions';
  }
  
  if (queryStr.includes('WHERE') && queryStr.includes('LIKE')) {
    return 'LIKE with wildcards can be slow, consider using full-text search';
  }
  
  if (queryStr.includes('ORDER BY') && !queryStr.includes('LIMIT')) {
    return 'Sorting without LIMIT can be expensive';
  }
  
  return 'Consider adding appropriate indexes';
}

/**
 * Execute a query with automatic retry logic and timeout
 */
export async function retryableQuery<T>(
  query: SQL | SQLWrapper,
  options?: {
    maxRetries?: number,
    initialDelay?: number,
    timeout?: number,
    tags?: string[]
  }
): Promise<T[]> {
  const {
    maxRetries = 3,
    initialDelay = 100,
    timeout = 10000,
    tags
  } = options || {};
  
  let retries = 0;
  let delay = initialDelay;
  const startTime = performance.now();
  
  while (true) {
    try {
      return await executeQuery<T>(query, { priority: 'high', timeout, tags });
    } catch (error) {
      const elapsed = performance.now() - startTime;
      
      // Don't retry if we're close to the overall timeout
      if (elapsed + delay > timeout) {
        console.log(`Giving up retries after ${elapsed}ms - approaching timeout`);
        throw error;
      }
      
      if (retries >= maxRetries) {
        console.log(`Giving up after ${retries} retries`);
        throw error;
      }
      
      // Check if error is retryable
      const isRetryable = error instanceof Error && 
        (error.message.includes('connection') || 
         error.message.includes('deadlock') ||
         error.message.includes('timeout') ||
         error.message.includes('temporarily unavailable'));
         
      if (!isRetryable) {
        throw error;
      }
      
      // Log retry attempt
      console.log(`Retrying query attempt ${retries + 1}/${maxRetries} after ${delay}ms delay`);
      
      // Wait with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
      
      retries++;
      delay *= 2; // Exponential backoff
    }
  }
}

/**
 * Execute a batch of queries efficiently
 */
export async function batchQueries<T>(
  queries: SQL[], 
  options?: {
    concurrency?: number,
    timeout?: number
  }
): Promise<T[][]> {
  const { concurrency = 3, timeout = 30000 } = options || {};
  const results: T[][] = [];
  
  // Process in chunks for controlled concurrency
  for (let i = 0; i < queries.length; i += concurrency) {
    const chunk = queries.slice(i, i + concurrency);
    const chunkPromises = chunk.map(query => 
      executeQuery<T>(query, { timeout })
    );
    
    const chunkResults = await Promise.all(chunkPromises);
    results.push(...chunkResults);
  }
  
  return results;
}

// Periodically clean the cache if memory pressure is high
setInterval(() => {
  const memoryUsage = process.memoryUsage();
  const heapUsed = memoryUsage.heapUsed / 1024 / 1024; // MB
  
  if (heapUsed > 200) { // If using more than 200MB
    console.log(`High memory usage (${heapUsed.toFixed(2)}MB) - pruning query cache`);
    
    // Prune old items from cache
    const prunedCount = queryCache.purgeStale();
    console.log(`Pruned ${prunedCount} stale items from query cache`);
    
    // Update stats
    cacheStats.size = queryCache.size;
  }
}, 5 * 60 * 1000); // Check every 5 minutes