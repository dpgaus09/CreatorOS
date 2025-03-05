/**
 * Service Worker for improved caching and offline capabilities
 */

const CACHE_NAME = 'learner-bruh-cache-v1';
const RUNTIME_CACHE = 'learner-bruh-runtime';

// Resources to cache immediately on service worker install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/book.png',
  '/src/main.tsx',
  '/src/index.css'
];

// Cache strategies based on URL pattern
const CACHE_STRATEGIES = [
  {
    pattern: /\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/,
    strategy: 'cache-first'
  },
  {
    pattern: /\/api\/settings\//,
    strategy: 'stale-while-revalidate',
    expiration: 60 * 60 // 1 hour
  },
  {
    pattern: /\/api\/user/,
    strategy: 'network-first'
  }
];

// Install event - precache static resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  const currentCaches = [CACHE_NAME, RUNTIME_CACHE];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return cacheNames.filter(cacheName => !currentCaches.includes(cacheName));
    }).then(cachesToDelete => {
      return Promise.all(cachesToDelete.map(cacheToDelete => {
        return caches.delete(cacheToDelete);
      }));
    }).then(() => self.clients.claim())
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', event => {
  // Skip non-GET requests and requests to other origins
  if (event.request.method !== 'GET' || 
      !event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  // Determine which caching strategy to use based on the URL
  const matchingStrategy = CACHE_STRATEGIES.find(item => 
    item.pattern.test(event.request.url)
  );
  
  if (!matchingStrategy) {
    // Default to network-first for unmatched URLs
    event.respondWith(networkFirst(event.request));
    return;
  }
  
  // Apply the appropriate caching strategy
  switch (matchingStrategy.strategy) {
    case 'cache-first':
      event.respondWith(cacheFirst(event.request));
      break;
    case 'stale-while-revalidate':
      event.respondWith(staleWhileRevalidate(event.request, matchingStrategy.expiration));
      break;
    case 'network-first':
    default:
      event.respondWith(networkFirst(event.request));
      break;
  }
});

// Cache-first strategy: try cache, fall back to network
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // If not in cache, get from network
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      // Cache successful responses
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Completely offline
    return new Response('Network error', { status: 408, headers: { 'Content-Type': 'text/plain' } });
  }
}

// Network-first strategy: try network, fall back to cache
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      // Cache successful responses
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    // If no cached response either, return error
    return new Response('Network error', { status: 408, headers: { 'Content-Type': 'text/plain' } });
  }
}

// Stale-while-revalidate strategy: return from cache quickly while updating in background
async function staleWhileRevalidate(request, expirationSeconds = 3600) {
  const cachePromise = caches.open(RUNTIME_CACHE);
  const matchPromise = cachePromise.then(cache => cache.match(request));
  
  // Start the fetch in parallel with checking the cache
  const fetchPromise = fetch(request).then(response => {
    // Determine if we should cache this response
    if (response && response.status === 200) {
      const shouldCache = true;
      // Cache the new response with expiration
      if (shouldCache) {
        cachePromise.then(cache => {
          const clonedResponse = response.clone();
          const headers = new Headers(clonedResponse.headers);
          // Add expiration timestamp
          const expires = Date.now() + (expirationSeconds * 1000);
          headers.append('sw-cache-expires', expires.toString());
          
          const options = {
            status: clonedResponse.status,
            statusText: clonedResponse.statusText,
            headers
          };
          
          clonedResponse.text().then(body => {
            cache.put(request, new Response(body, options));
          });
        });
      }
    }
    return response;
  }).catch(error => {
    console.error('Fetch error:', error);
    return new Response('Network error', { status: 408, headers: { 'Content-Type': 'text/plain' } });
  });
  
  // Return the cached response first if we have one, otherwise wait for the fetch
  const cachedResponse = await matchPromise;
  if (cachedResponse) {
    // Check if the cached response is expired
    const expires = cachedResponse.headers.get('sw-cache-expires');
    const isExpired = expires && parseInt(expires, 10) < Date.now();
    
    // Regardless of expiration, use the cached response but update in background
    fetchPromise.catch(error => console.error('Background fetch failed:', error));
    
    // If it's not expired, return it directly
    if (!isExpired) {
      return cachedResponse;
    }
  }
  
  // If no cached response or it's expired, wait for the fetch
  return fetchPromise;
}

// Remove expired items from the cache periodically
self.addEventListener('periodicsync', event => {
  if (event.tag === 'cache-cleanup') {
    event.waitUntil(cleanupExpiredCache());
  }
});

// Also clean up on service worker activation
async function cleanupExpiredCache() {
  const now = Date.now();
  const cache = await caches.open(RUNTIME_CACHE);
  const requests = await cache.keys();
  
  for (const request of requests) {
    const response = await cache.match(request);
    if (!response) continue;
    
    const expires = response.headers.get('sw-cache-expires');
    if (expires && parseInt(expires, 10) < now) {
      await cache.delete(request);
    }
  }
}