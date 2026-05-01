const CACHE_NAME = 'schoolpulse-v1';
const OFFLINE_URL = '/offline.html';
const API_CACHE_NAME = 'schoolpulse-api-v1';
const SYNC_TAG = 'schoolpulse-sync';

// Files to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json'
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Caching essential assets');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.log('[ServiceWorker] Cache install error:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
            console.log('[ServiceWorker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - implement cache strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // API calls: Network First
  if (url.pathname.includes('/api/') || url.hostname !== location.hostname) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Static assets (JS, CSS, fonts, images): Cache First
  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font' ||
    request.destination === 'image'
  ) {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }

  // HTML pages: Network First (with offline fallback)
  if (request.mode === 'navigate') {
    event.respondWith(navigationStrategy(request));
    return;
  }

  // Default: Network First
  event.respondWith(networkFirstStrategy(request));
});

// Cache First Strategy: Try cache first, fall back to network
async function cacheFirstStrategy(request) {
  try {
    const cached = await caches.match(request);
    if (cached) {
      console.log('[ServiceWorker] Cache hit:', request.url);
      return cached;
    }

    const response = await fetch(request);
    if (!response || response.status !== 200) {
      return response;
    }

    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    console.log('[ServiceWorker] Cache First error:', error);
    const cached = await caches.match(request);
    return cached || new Response('Resource not found', { status: 404 });
  }
}

// Network First Strategy: Try network first, fall back to cache
async function networkFirstStrategy(request) {
  try {
    const response = await fetch(request, { timeout: 5000 });
    if (response && response.status === 200) {
      const cache = await caches.open(API_CACHE_NAME);
      cache.put(request, response.clone());
      console.log('[ServiceWorker] Network success, cached:', request.url);
    }
    return response;
  } catch (error) {
    console.log('[ServiceWorker] Network failed, using cache:', request.url);
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    // Return offline page for HTML requests
    if (request.mode === 'navigate') {
      return caches.match(OFFLINE_URL);
    }
    return new Response('Network unavailable', { status: 503 });
  }
}

// Navigation Strategy: For HTML pages
async function navigationStrategy(request) {
  try {
    const response = await Promise.race([
      fetch(request),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 5000)
      )
    ]);
    
    if (response && response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
      return response;
    }
    return response;
  } catch (error) {
    console.log('[ServiceWorker] Navigation failed, checking cache:', request.url);
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    return caches.match(OFFLINE_URL);
  }
}

// Background Sync: Retry failed requests when online
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Background Sync triggered:', event.tag);
  if (event.tag === SYNC_TAG) {
    event.waitUntil(retrySyncedRequests());
  }
});

async function retrySyncedRequests() {
  try {
    const db = await openSyncDB();
    const requests = await getAllPendingRequests(db);
    
    console.log('[ServiceWorker] Retrying', requests.length, 'pending requests');
    
    for (const req of requests) {
      try {
        const response = await fetch(req.url, {
          method: req.method,
          headers: req.headers,
          body: req.body ? JSON.parse(req.body) : undefined
        });
        
        if (response.ok) {
          await deletePendingRequest(db, req.id);
          console.log('[ServiceWorker] Synced successfully:', req.url);
          // Notify clients of successful sync
          broadcastSyncSuccess(req);
        }
      } catch (error) {
        console.log('[ServiceWorker] Sync retry failed:', error);
      }
    }
  } catch (error) {
    console.log('[ServiceWorker] Sync error:', error);
  }
}

// IndexedDB operations for sync queue
function openSyncDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SchoolPulseSyncDB', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pending-requests')) {
        db.createObjectStore('pending-requests', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

function getAllPendingRequests(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pending-requests'], 'readonly');
    const store = transaction.objectStore('pending-requests');
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function deletePendingRequest(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pending-requests'], 'readwrite');
    const store = transaction.objectStore('pending-requests');
    const request = store.delete(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

function broadcastSyncSuccess(request) {
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage({
        type: 'SYNC_SUCCESS',
        url: request.url,
        timestamp: new Date().toISOString()
      });
    });
  });
}

// Message handler for client communication
self.addEventListener('message', (event) => {
  console.log('[ServiceWorker] Message received:', event.data);
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Push notification event
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push notification received');
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body,
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect fill="%231F41B3" width="192" height="192"/><text x="50%" y="50%" font-size="120" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">SP</text></svg>',
    badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect fill="%231F41B3" width="96" height="96"/></svg>',
    tag: data.tag || 'schoolpulse-notification',
    requireInteraction: data.requireInteraction || false,
    data: data.data || {}
  };

  if (data.actions) {
    options.actions = data.actions;
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'SchoolPulse', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification clicked');
  event.notification.close();

  const urlToOpen = event.notification.data.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Check if app is already open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If not open, open new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
