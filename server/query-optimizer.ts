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
}

// Configure a cache for query results with appropriate limits
const queryCache = new LRUCache<string, any>({
  max: 1000, // Maximum number of items in cache
  ttl: 60 * 1000, // Time-to-live: 60 seconds
  fetchMethod: async (key: string, staleValue: any, { context }: { context?: QueryContext }) => {
    // This is called when cache misses or when entry is stale
    if (!context || !context.query) {
      throw new Error('Cache fetch context missing required query');
    }
    return executeQuery(context.query);
  },
  allowStale: true, // Allow serving stale data while fetching fresh data
});

// Keep track of slow queries to optimize
const slowQueries: { 
  query: string; 
  count: number; 
  totalTime: number;
  lastExecuted: number;
}[] = [];

// Set threshold for slow queries (in milliseconds)
const SLOW_QUERY_THRESHOLD = 200;

// Limit the size of slow queries array
const MAX_SLOW_QUERIES = 50;

/**
 * Raw query execution function
 */
async function executeQuery<T>(query: SQL | SQLWrapper): Promise<T[]> {
  const startTime = performance.now();
  
  try {
    // Use the pg pool directly for better performance with complex queries
    const client = await pool.connect();
    try {
      // Converting the Drizzle query to SQL string and parameters
      const queryStr = query.toString();
      const result = await client.query(queryStr);
      
      // Measure execution time
      const executionTime = performance.now() - startTime;
      
      // Track slow queries for optimization insights
      if (executionTime > SLOW_QUERY_THRESHOLD) {
        trackSlowQuery(queryStr, executionTime);
      }
      
      // Transform the result to the expected format
      return result.rows as unknown as T[];
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Query execution error:', error);
    throw error;
  }
}

/**
 * Track slow queries for optimization
 */
function trackSlowQuery(queryString: string, executionTime: number) {
  // Find existing entry or create new one
  const existing = slowQueries.find(q => q.query === queryString);
  
  if (existing) {
    existing.count++;
    existing.totalTime += executionTime;
    existing.lastExecuted = Date.now();
  } else {
    // Add new entry if we haven't reached the limit
    if (slowQueries.length < MAX_SLOW_QUERIES) {
      slowQueries.push({
        query: queryString,
        count: 1,
        totalTime: executionTime,
        lastExecuted: Date.now()
      });
    } else {
      // Replace oldest tracked slow query
      const oldest = slowQueries.reduce((prev, curr) => 
        prev.lastExecuted < curr.lastExecuted ? prev : curr
      );
      
      const idx = slowQueries.indexOf(oldest);
      slowQueries[idx] = {
        query: queryString,
        count: 1,
        totalTime: executionTime,
        lastExecuted: Date.now()
      };
    }
  }
}

/**
 * Execute a query with caching
 * 
 * @param query The SQL query to execute
 * @param cacheKey Optional custom cache key
 * @param ttl Optional time-to-live in milliseconds
 * @returns Query results
 */
export async function cachedQuery<T>(
  query: SQL | SQLWrapper,
  cacheKey?: string,
  ttl?: number
): Promise<T[]> {
  // Generate cache key from query if not provided
  const key = cacheKey || `query:${query.toString()}`;
  
  // Specify custom TTL if provided
  const options: { context: QueryContext; ttl?: number } = { 
    context: { query } 
  };
  
  if (ttl) {
    options.ttl = ttl;
  }
  
  // Get from cache or execute query
  return queryCache.fetch(key, options);
}

/**
 * Clear the entire query cache or specific entries
 */
export function clearQueryCache(key?: string): void {
  if (key) {
    queryCache.delete(key);
  } else {
    queryCache.clear();
  }
}

/**
 * Get slow query statistics
 */
export function getSlowQueryStats() {
  return slowQueries.map(q => ({
    query: q.query,
    count: q.count,
    avgTime: q.totalTime / q.count,
    lastExecuted: new Date(q.lastExecuted).toISOString(),
  }));
}

/**
 * Execute a query with automatic retry logic
 */
export async function retryableQuery<T>(
  query: SQL | SQLWrapper,
  maxRetries: number = 3,
  initialDelay: number = 100
): Promise<T[]> {
  let retries = 0;
  let delay = initialDelay;
  
  while (true) {
    try {
      return await executeQuery<T>(query);
    } catch (error) {
      if (retries >= maxRetries) {
        throw error;
      }
      
      // Check if error is retryable (connection errors, deadlocks, etc)
      const isRetryable = error instanceof Error && 
        (error.message.includes('connection') || 
         error.message.includes('deadlock') ||
         error.message.includes('timeout'));
         
      if (!isRetryable) {
        throw error;
      }
      
      // Wait with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
      
      retries++;
      delay *= 2; // Exponential backoff
    }
  }
}