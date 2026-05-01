/**
 * Offline Data Manager - Handles caching and retrieval of entity data for offline use
 */

const DB_NAME = 'SchoolPulseOfflineDB';
const DB_VERSION = 1;

const CACHEABLE_STORES = [
  'timetables',
  'grades',
  'assignments',
  'announcements',
  'materials',
  'lessonPlans',
  'calendar',
  'subjects',
  'classes'
];

// Open database
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      CACHEABLE_STORES.forEach((store) => {
        if (!db.objectStoreNames.contains(store)) {
          const objectStore = db.createObjectStore(store, { keyPath: 'id' });
          objectStore.createIndex('timestamp', 'timestamp', { unique: false });
          objectStore.createIndex('schoolId', 'schoolId', { unique: false });
        }
      });
    };
  });
}

// Cache entity data
export async function cacheEntityData(storeName, data, schoolId) {
  if (!CACHEABLE_STORES.includes(storeName)) {
    console.warn('[OfflineData] Invalid store name:', storeName);
    return;
  }

  try {
    const db = await openDB();
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);

    // Prepare data with metadata
    const dataWithMeta = {
      ...data,
      timestamp: new Date().toISOString(),
      schoolId
    };

    const request = store.put(dataWithMeta);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        console.log('[OfflineData] Cached:', storeName, data.id);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[OfflineData] Cache error:', error);
  }
}

// Cache multiple items
export async function cacheEntityDataBatch(storeName, dataArray, schoolId) {
  if (!CACHEABLE_STORES.includes(storeName)) {
    console.warn('[OfflineData] Invalid store name:', storeName);
    return;
  }

  try {
    const db = await openDB();
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);

    // Clear old data for this school first
    const index = store.index('schoolId');
    const range = IDBKeyRange.only(schoolId);
    store.delete(range);

    // Add new data
    dataArray.forEach((data) => {
      const dataWithMeta = {
        ...data,
        timestamp: new Date().toISOString(),
        schoolId
      };
      store.put(dataWithMeta);
    });

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        console.log('[OfflineData] Cached batch:', storeName, dataArray.length, 'items');
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.error('[OfflineData] Batch cache error:', error);
  }
}

// Get cached data
export async function getCachedData(storeName, schoolId) {
  if (!CACHEABLE_STORES.includes(storeName)) {
    console.warn('[OfflineData] Invalid store name:', storeName);
    return [];
  }

  try {
    const db = await openDB();
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index('schoolId');
    const range = IDBKeyRange.only(schoolId);
    const request = index.getAll(range);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const data = request.result || [];
        console.log('[OfflineData] Retrieved from cache:', storeName, data.length, 'items');
        resolve(data);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[OfflineData] Get cache error:', error);
    return [];
  }
}

// Get single cached item
export async function getCachedItem(storeName, id) {
  if (!CACHEABLE_STORES.includes(storeName)) {
    console.warn('[OfflineData] Invalid store name:', storeName);
    return null;
  }

  try {
    const db = await openDB();
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(id);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[OfflineData] Get item error:', error);
    return null;
  }
}

// Clear cached data for a store
export async function clearCachedData(storeName) {
  if (!CACHEABLE_STORES.includes(storeName)) {
    console.warn('[OfflineData] Invalid store name:', storeName);
    return;
  }

  try {
    const db = await openDB();
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        console.log('[OfflineData] Cleared cache:', storeName);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[OfflineData] Clear cache error:', error);
  }
}

// Clear all cached data
export async function clearAllCachedData() {
  try {
    const db = await openDB();
    const promises = CACHEABLE_STORES.map((storeName) => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });

    await Promise.all(promises);
    console.log('[OfflineData] Cleared all caches');
  } catch (error) {
    console.error('[OfflineData] Clear all error:', error);
  }
}

// Get cache statistics
export async function getCacheStats() {
  try {
    const db = await openDB();
    const stats = {};

    const promises = CACHEABLE_STORES.map((storeName) => {
      return new Promise((resolve) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.count();

        request.onsuccess = () => {
          stats[storeName] = request.result;
          resolve();
        };
        request.onerror = () => {
          stats[storeName] = 0;
          resolve();
        };
      });
    });

    await Promise.all(promises);
    return stats;
  } catch (error) {
    console.error('[OfflineData] Get stats error:', error);
    return {};
  }
}

// Check if data is fresh
export function isDataFresh(timestamp, maxAgeMinutes = 30) {
  if (!timestamp) return false;
  const now = new Date();
  const dataDate = new Date(timestamp);
  const diffMinutes = (now - dataDate) / (1000 * 60);
  return diffMinutes < maxAgeMinutes;
}

// Get offline-first data (cache first, network as fallback)
export async function getOfflineFirstData(storeName, schoolId, fetchFn) {
  try {
    // First try cache
    const cached = await getCachedData(storeName, schoolId);
    if (cached.length > 0 && isDataFresh(cached[0]?.timestamp)) {
      console.log('[OfflineData] Using fresh cached data:', storeName);
      return cached;
    }

    // Try network if available
    if (navigator.onLine) {
      try {
        const fresh = await fetchFn();
        // Cache the fresh data
        if (fresh && fresh.length > 0) {
          await cacheEntityDataBatch(storeName, fresh, schoolId);
        }
        return fresh || cached;
      } catch (error) {
        console.log('[OfflineData] Network fetch failed, using cache:', error);
        return cached;
      }
    }

    // Return cached data if offline
    return cached;
  } catch (error) {
    console.error('[OfflineData] Get offline-first error:', error);
    return [];
  }
}

// Initialize offline data on app startup
export async function initializeOfflineData() {
  try {
    await openDB();
    const stats = await getCacheStats();
    console.log('[OfflineData] Offline database initialized:', stats);
  } catch (error) {
    console.error('[OfflineData] Initialization error:', error);
  }
}