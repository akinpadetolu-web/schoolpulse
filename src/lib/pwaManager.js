/**
 * PWA Manager - Handles service worker registration, install prompts, and offline features
 */

// Register Service Worker
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.log('[PWA] Service Worker not supported');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/'
    });

    console.log('[PWA] Service Worker registered successfully', registration);

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'activated') {
          console.log('[PWA] New service worker activated');
          broadcastUpdateAvailable();
        }
      });
    });

    // Periodically check for updates
    setInterval(() => {
      registration.update().catch((err) => {
        console.log('[PWA] Update check failed:', err);
      });
    }, 60000); // Check every minute

    return registration;
  } catch (error) {
    console.error('[PWA] Service Worker registration failed:', error);
  }
}

// Handle install prompt
let deferredPrompt;

export function setupInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('[PWA] Install prompt available');
    broadcastInstallPromptAvailable();
  });

  window.addEventListener('appinstalled', () => {
    console.log('[PWA] App installed');
    deferredPrompt = null;
    broadcastAppInstalled();
  });
}

export function getInstallPrompt() {
  return deferredPrompt;
}

export async function triggerInstallPrompt() {
  if (!deferredPrompt) {
    console.log('[PWA] Install prompt not available');
    return false;
  }

  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  console.log('[PWA] User response to install prompt:', outcome);
  deferredPrompt = null;
  return outcome === 'accepted';
}

// Background Sync
export async function registerBackgroundSync() {
  if (!('serviceWorker' in navigator) || !('SyncManager' in window)) {
    console.log('[PWA] Background Sync not supported');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    // Only register sync from within a service worker context or user gesture
    if (registration.sync) {
      await registration.sync.register('schoolpulse-sync');
      console.log('[PWA] Background Sync registered');
    }
  } catch (error) {
    // Background Sync registration can fail in non-SW contexts — silently ignore
    console.log('[PWA] Background Sync not available in this context');
  }
}

// Queue request for offline sync
export async function queueRequestForSync(url, options = {}) {
  try {
    const db = await openSyncDB();
    const request = {
      url,
      method: options.method || 'GET',
      headers: options.headers || {},
      body: options.body ? JSON.stringify(options.body) : null,
      timestamp: new Date().toISOString()
    };

    const transaction = db.transaction(['pending-requests'], 'readwrite');
    const store = transaction.objectStore('pending-requests');
    const addRequest = store.add(request);

    return new Promise((resolve, reject) => {
      addRequest.onsuccess = () => {
        console.log('[PWA] Request queued for sync:', url);
        resolve(addRequest.result);
      };
      addRequest.onerror = () => {
        reject(addRequest.error);
      };
    });
  } catch (error) {
    console.error('[PWA] Failed to queue request:', error);
  }
}

// IndexedDB for sync queue
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

// Service Worker message handler
export function setupMessageListener(callback) {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data.type === 'SYNC_SUCCESS') {
        console.log('[PWA] Sync successful:', event.data.url);
        if (callback) {
          callback(event.data);
        }
      }
    });
  }
}

// Push Notification Support
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.log('[PWA] Notifications not supported');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

export async function subscribeToPushNotifications(vapidPublicKey = null) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('[PWA] Push Notifications not supported');
    return null;
  }

  // A valid VAPID public key is required for push subscriptions
  if (!vapidPublicKey) {
    console.log('[PWA] Push Notifications skipped: no VAPID public key configured');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      return subscription;
    }

    // Subscribe to push notifications
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    });

    console.log('[PWA] Push subscription successful');
    return subscription;
  } catch (error) {
    console.error('[PWA] Push subscription failed:', error);
    return null;
  }
}

export async function sendLocalNotification(title, options = {}) {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect fill="%231F41B3" width="192" height="192"/><text x="50%" y="50%" font-size="120" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">SP</text></svg>',
      badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect fill="%231F41B3" width="96" height="96"/></svg>',
      ...options
    });
  } catch (error) {
    console.error('[PWA] Notification failed:', error);
  }
}

// Helper for push notifications
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return new Uint8Array([...rawData].map(char => char.charCodeAt(0)));
}

// Broadcast messages to all clients
function broadcastInstallPromptAvailable() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.controller?.postMessage({
      type: 'INSTALL_PROMPT_AVAILABLE'
    });
  }
}

function broadcastAppInstalled() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.controller?.postMessage({
      type: 'APP_INSTALLED'
    });
  }
}

function broadcastUpdateAvailable() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.controller?.postMessage({
      type: 'UPDATE_AVAILABLE'
    });
  }
}

// Get offline status
export function isOnline() {
  return navigator.onLine;
}

// Store last sync time
export function updateLastSyncTime() {
  localStorage.setItem('lastSyncTime', new Date().toISOString());
}

// Check if data is stale
export function isDataStale(timestamp, maxAgeMinutes = 30) {
  if (!timestamp) return true;
  const now = new Date();
  const syncDate = new Date(timestamp);
  const diffMinutes = (now - syncDate) / (1000 * 60);
  return diffMinutes > maxAgeMinutes;
}

// Cache API helpers
export async function cacheData(key, data) {
  try {
    const cache = await caches.open('schoolpulse-api-v1');
    const response = new Response(JSON.stringify(data));
    await cache.put(new Request(key), response);
    console.log('[PWA] Data cached:', key);
  } catch (error) {
    console.error('[PWA] Cache failed:', error);
  }
}

export async function getCachedData(key) {
  try {
    const cache = await caches.open('schoolpulse-api-v1');
    const response = await cache.match(new Request(key));
    if (response) {
      return await response.json();
    }
  } catch (error) {
    console.error('[PWA] Get cached data failed:', error);
  }
  return null;
}

// Initialize all PWA features
export async function initializePWA() {
  console.log('[PWA] Initializing PWA features...');

  // Register service worker
  await registerServiceWorker();

  // Setup install prompt
  setupInstallPrompt();

  // Setup message listener
  setupMessageListener((data) => {
    console.log('[PWA] Sync completed:', data);
    updateLastSyncTime();
  });

  // Register background sync
  await registerBackgroundSync();

  // Request notification permission
  const notifPermission = await requestNotificationPermission();
  if (notifPermission) {
    console.log('[PWA] Notification permission granted');
  }

  // Subscribe to push notifications
  await subscribeToPushNotifications();

  console.log('[PWA] PWA features initialized');
}