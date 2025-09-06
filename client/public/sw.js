const CACHE_NAME = 'pall-network-v1.0.0';
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching static assets');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('[Service Worker] Installation complete');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[Service Worker] Installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[Service Worker] Activation complete');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Skip Firebase and external API calls
  if (event.request.url.includes('firebaseapp.com') || 
      event.request.url.includes('googleapis.com') ||
      event.request.url.includes('ethereum') ||
      event.request.url.includes('web3')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          console.log('[Service Worker] Serving from cache:', event.request.url);
          return cachedResponse;
        }

        // Network fallback
        return fetch(event.request)
          .then(response => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Cache successful responses for static assets
            if (event.request.url.includes('.js') || 
                event.request.url.includes('.css') || 
                event.request.url.includes('.png') ||
                event.request.url.includes('.ico')) {
              
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
            }

            return response;
          })
          .catch(error => {
            console.log('[Service Worker] Network fetch failed:', error);
            
            // Return offline page for navigation requests
            if (event.request.destination === 'document') {
              return caches.match('/index.html');
            }
            
            throw error;
          });
      })
  );
});

// Background sync for mining data
self.addEventListener('sync', (event) => {
  if (event.tag === 'mining-sync') {
    console.log('[Service Worker] Syncing mining data...');
    event.waitUntil(syncMiningData());
  }
});

// Push notifications for mining completion
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Your mining session has completed!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      url: '/?action=mine'
    },
    actions: [
      {
        action: 'start-mining',
        title: 'Start New Session',
        icon: '/icons/icon-96x96.png'
      },
      {
        action: 'view-balance',
        title: 'View Balance',
        icon: '/icons/icon-96x96.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Pall Network', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  let url = '/';

  if (action === 'start-mining') {
    url = '/?action=mine';
  } else if (action === 'view-balance') {
    url = '/?page=wallet';
  } else if (event.notification.data && event.notification.data.url) {
    url = event.notification.data.url;
  }

  event.waitUntil(
    clients.openWindow(url)
  );
});

// Helper function to sync mining data
async function syncMiningData() {
  try {
    // This would sync any pending mining data with Firebase
    console.log('[Service Worker] Mining data sync completed');
  } catch (error) {
    console.error('[Service Worker] Mining data sync failed:', error);
  }
}