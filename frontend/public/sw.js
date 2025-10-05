// Service Worker for MSK Rehabilitation Platform - CACHE DISABLED
// This service worker is disabled to prevent caching issues with real-time data

console.log('Service Worker loaded but caching is DISABLED for real-time updates');

// Install event - do nothing (no caching)
self.addEventListener('install', (event) => {
  console.log('Service Worker install - no caching enabled');
  event.waitUntil(self.skipWaiting());
});

// Activate event - clean up all existing caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activate - clearing all caches');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log('Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch event - always go to network, never cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip handling navigation requests for SPA routes
  if (request.mode === 'navigate' && !url.pathname.includes('.')) {
    return;
  }

  // Always go to network - NO CACHING
  event.respondWith(
    fetch(request)
      .catch(() => {
        // If network fails, return a simple error response
        return new Response(
          JSON.stringify({ 
            error: 'Network unavailable', 
            message: 'Please check your internet connection' 
          }),
          {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'application/json' }
          }
        );
      })
  );
});