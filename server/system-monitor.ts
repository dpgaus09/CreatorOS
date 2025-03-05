/**
 * System Monitor
 * 
 * Provides real-time monitoring of system resources to help identify and diagnose
 * performance bottlenecks and optimize resource usage.
 */

import os from 'os';

// Statistics about system resource usage
interface SystemStats {
  timestamp: number;
  cpu: {
    usage: number;        // CPU usage percentage (0-100)
    loadAvg: number[];    // Load average for 1, 5, and 15 minutes
  };
  memory: {
    total: number;        // Total memory in bytes
    free: number;         // Free memory in bytes
    used: number;         // Used memory in bytes
    percentage: number;   // Used memory percentage (0-100)
  };
  eventLoop: {
    lag: number;          // Event loop lag in milliseconds
  };
  httpRequests: {
    active: number;       // Currently active HTTP requests
    total: number;        // Total HTTP requests since server start
    statusCodes: Record<number, number>; // Counter for each status code
  };
  database: {
    activeQueries: number; // Currently active database queries
    totalQueries: number;  // Total database queries since server start
    slowQueries: number;   // Number of slow queries
    avgQueryTime: number;  // Average query time in milliseconds
  };
}

// Default empty system stats
const initialSystemStats: SystemStats = {
  timestamp: Date.now(),
  cpu: {
    usage: 0,
    loadAvg: [0, 0, 0],
  },
  memory: {
    total: 0,
    free: 0,
    used: 0,
    percentage: 0,
  },
  eventLoop: {
    lag: 0,
  },
  httpRequests: {
    active: 0,
    total: 0,
    statusCodes: {},
  },
  database: {
    activeQueries: 0,
    totalQueries: 0,
    slowQueries: 0,
    avgQueryTime: 0,
  },
};

// Maintain a history of system stats
const statsHistory: SystemStats[] = [];
const HISTORY_SIZE = 60; // Keep 60 data points (1 hour at 1 minute intervals)

// Current system stats
let currentStats: SystemStats = { ...initialSystemStats };
let totalQueryTime = 0;
let activeHttpRequests = 0;

/**
 * Calculate CPU usage percentage
 * 
 * Note: This is an approximation using load average,
 * as getting actual CPU usage percentage in Node.js is complex
 */
function calculateCpuUsage(): number {
  const loadAvg = os.loadavg()[0]; // 1 minute load average
  const cpuCount = os.cpus().length;
  const usage = (loadAvg / cpuCount) * 100;
  return Math.min(usage, 100); // Cap at 100%
}

/**
 * Calculate memory usage
 */
function calculateMemoryUsage(): {
  total: number;
  free: number;
  used: number;
  percentage: number;
} {
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;
  const percentage = (used / total) * 100;
  
  return { total, free, used, percentage };
}

/**
 * Measure event loop lag
 */
function measureEventLoopLag(): Promise<number> {
  return new Promise(resolve => {
    const start = Date.now();
    setImmediate(() => {
      const lag = Date.now() - start;
      resolve(lag);
    });
  });
}

/**
 * Update system stats
 */
async function updateStats() {
  const memory = calculateMemoryUsage();
  const cpuUsage = calculateCpuUsage();
  const lagTime = await measureEventLoopLag();
  
  currentStats = {
    timestamp: Date.now(),
    cpu: {
      usage: cpuUsage,
      loadAvg: os.loadavg(),
    },
    memory,
    eventLoop: {
      lag: lagTime,
    },
    httpRequests: {
      ...currentStats.httpRequests,
      active: activeHttpRequests,
    },
    database: {
      ...currentStats.database,
    },
  };
  
  // Add to history and maintain history size
  statsHistory.push({ ...currentStats });
  if (statsHistory.length > HISTORY_SIZE) {
    statsHistory.shift();
  }
}

// Set up periodic stats collection
const STATS_INTERVAL = 60 * 1000; // Collect stats every 60 seconds
setInterval(updateStats, STATS_INTERVAL);

// Track HTTP request start
export function trackHttpRequestStart() {
  activeHttpRequests++;
  currentStats.httpRequests.total++;
}

// Track HTTP request end
export function trackHttpRequestEnd(statusCode: number) {
  activeHttpRequests = Math.max(0, activeHttpRequests - 1);
  
  // Update status code count
  if (!currentStats.httpRequests.statusCodes[statusCode]) {
    currentStats.httpRequests.statusCodes[statusCode] = 0;
  }
  currentStats.httpRequests.statusCodes[statusCode]++;
}

// Track database query stats
export function trackDatabaseQuery(
  executionTimeMs: number, 
  isSlow: boolean = false
) {
  currentStats.database.totalQueries++;
  totalQueryTime += executionTimeMs;
  currentStats.database.avgQueryTime = 
    totalQueryTime / currentStats.database.totalQueries;
  
  if (isSlow) {
    currentStats.database.slowQueries++;
  }
}

// Track active database queries
export function trackActiveDatabaseQuery(active: boolean) {
  if (active) {
    currentStats.database.activeQueries++;
  } else {
    currentStats.database.activeQueries = 
      Math.max(0, currentStats.database.activeQueries - 1);
  }
}

/**
 * Get the current system stats
 */
export function getCurrentStats(): SystemStats {
  return { ...currentStats };
}

/**
 * Get system stats history
 */
export function getStatsHistory(): SystemStats[] {
  return [...statsHistory];
}

/**
 * Reset statistics
 */
export function resetStats() {
  currentStats = { ...initialSystemStats, timestamp: Date.now() };
  statsHistory.length = 0;
  totalQueryTime = 0;
  activeHttpRequests = 0;
}

// Initialize stats on module load
updateStats().catch(err => {
  console.error('Error initializing system stats:', err);
});