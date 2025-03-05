/**
 * Resource Preloading and Critical Path Optimization
 * 
 * This module improves initial page load performance by:
 * 1. Preloading critical resources
 * 2. Implementing progressive resource loading
 * 3. Managing initial data requests efficiently
 */

// Initial cache for critical data
type DataCache = {
  [key: string]: {
    data: any;
    timestamp: number;
  }
};

// In-memory cache for frequently accessed data
const dataCache: DataCache = {};
const CACHE_TTL = 60 * 1000; // 1 minute cache TTL

// Preload critical routes to improve navigation performance
export function preloadCriticalRoutes() {
  // List of route paths that should be preloaded
  const routes = [
    '/api/user', 
    '/api/settings/lms-name',
    '/api/announcements/active'
  ];
  
  // Use requestIdleCallback to avoid impacting main thread during initial load
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      preloadRoutes(routes);
    }, { timeout: 2000 });
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(() => preloadRoutes(routes), 1000);
  }
}

// Preload a list of API routes in the background
function preloadRoutes(routes: string[]) {
  routes.forEach(route => {
    // Use a low-priority fetch to avoid competing with critical resources
    fetch(route, { 
      method: 'GET',
      credentials: 'include',
      priority: 'low' as RequestPriority, // TypeScript may not recognize this
      headers: {
        'Purpose': 'prefetch',
      }
    })
    .then(response => {
      if (response.ok) return response.json();
      return null;
    })
    .then(data => {
      if (data) {
        // Store in cache for later use
        dataCache[route] = {
          data,
          timestamp: Date.now()
        };
      }
    })
    .catch(error => {
      console.log(`Preload error for ${route}:`, error);
    });
  });
}

// Register service worker for better caching if supported
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('ServiceWorker registration successful with scope: ', registration.scope);
        })
        .catch(error => {
          console.log('ServiceWorker registration failed: ', error);
        });
    });
  }
}

// Get cached data if available, otherwise fetch fresh
export async function getCachedData<T>(url: string, forceFresh = false): Promise<T | null> {
  // Check cache first unless forceFresh is true
  if (!forceFresh && dataCache[url] && (Date.now() - dataCache[url].timestamp < CACHE_TTL)) {
    return dataCache[url].data as T;
  }
  
  // Fetch fresh data
  try {
    const response = await fetch(url, { credentials: 'include' });
    if (response.ok) {
      const data = await response.json();
      
      // Update cache
      dataCache[url] = {
        data,
        timestamp: Date.now()
      };
      
      return data as T;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    
    // Return stale data if available rather than null
    if (dataCache[url]) {
      return dataCache[url].data as T;
    }
    
    return null;
  }
}

// Clear the data cache (useful after mutations)
export function clearDataCache(urlPattern?: string) {
  if (!urlPattern) {
    // Clear all cache
    Object.keys(dataCache).forEach(key => delete dataCache[key]);
  } else {
    // Clear pattern-matched cache entries
    Object.keys(dataCache).forEach(key => {
      if (key.includes(urlPattern)) {
        delete dataCache[key];
      }
    });
  }
}