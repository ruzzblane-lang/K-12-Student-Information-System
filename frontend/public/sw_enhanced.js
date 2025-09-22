// Enhanced Service Worker for School SIS PWA
// Version: 2.0.0

/* eslint-disable */

const STATIC_CACHE_NAME = 'school-sis-static-v2.0.0';
const DYNAMIC_CACHE_NAME = 'school-sis-dynamic-v2.0.0';
const FONTS_CACHE_NAME = 'school-sis-fonts-v2.0.0';

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png',
  '/offline.html',
  '/styles/offline.css'
];

// Third-party fonts to preload and cache
const FONT_ASSETS = [
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
  'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2',
  'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fAZ9hiJ-Ek-_EeA.woff2'
];

// API endpoints that should be cached (currently unused but kept for future implementation)
// const API_CACHE_PATTERNS = [
//   /\/api\/students/,
//   /\/api\/teachers/,
//   /\/api\/classes/,
//   /\/api\/grades/,
//   /\/api\/attendance/,
//   /\/api\/health/
// ];

// Cache size limits
const CACHE_LIMITS = {
  DYNAMIC: 50, // Maximum number of dynamic cache entries
  STATIC: 100, // Maximum number of static cache entries
  FONTS: 20    // Maximum number of font cache entries
};

// Error handling utilities
class CacheErrorHandler {
  static async handleCacheError(operation, error, cacheName) {
    console.error(`Cache ${operation} failed for ${cacheName}:`, error);
    
    // If quota exceeded, try to clean up old caches
    if (error.name === 'QuotaExceededError') {
      console.log('Quota exceeded, cleaning up old caches...');
      await this.cleanupOldCaches();
    }
    
    // Report error to analytics if available
    this.reportError(operation, error, cacheName);
  }
  
  static async cleanupOldCaches() {
    try {
      const cacheNames = await caches.keys();
      const currentCaches = [STATIC_CACHE_NAME, DYNAMIC_CACHE_NAME, FONTS_CACHE_NAME];
      
      for (const cacheName of cacheNames) {
        if (!currentCaches.includes(cacheName)) {
          console.log(`Deleting old cache: ${cacheName}`);
          await caches.delete(cacheName);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old caches:', error);
    }
  }
  
  static reportError(operation, error, cacheName) {
    // Send error to analytics service
    if (typeof self.analytics !== 'undefined') {
      self.analytics.track('service_worker_error', {
        operation,
        error: error.message,
        cacheName,
        timestamp: Date.now()
      });
    }
  }
}

// Cache management utilities
class CacheManager {
  static async addToCache(cacheName, request, response) {
    try {
      const cache = await caches.open(cacheName);
      await cache.put(request, response.clone());
      
      // Enforce cache size limits
      await this.enforceCacheLimit(cacheName);
      
      return true;
    } catch (error) {
      await CacheErrorHandler.handleCacheError('put', error, cacheName);
      return false;
    }
  }
  
  static async getFromCache(cacheName, request) {
    try {
      const cache = await caches.open(cacheName);
      return await cache.match(request);
    } catch (error) {
      await CacheErrorHandler.handleCacheError('match', error, cacheName);
      return null;
    }
  }
  
  static async enforceCacheLimit(cacheName) {
    try {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      const limit = CACHE_LIMITS[cacheName.split('-').pop().toUpperCase()] || 50;
      
      if (keys.length > limit) {
        // Remove oldest entries (FIFO)
        const entriesToDelete = keys.slice(0, keys.length - limit);
        await Promise.all(entriesToDelete.map(key => cache.delete(key)));
        console.log(`Cleaned up ${entriesToDelete.length} old entries from ${cacheName}`);
      }
    } catch (error) {
      console.error(`Failed to enforce cache limit for ${cacheName}:`, error);
    }
  }
  
  static async clearSpecificEntries(pattern) {
    try {
      const cacheNames = [DYNAMIC_CACHE_NAME, STATIC_CACHE_NAME];
      
      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        
        const keysToDelete = keys.filter(key => {
          const url = new URL(key.url);
          return pattern.test(url.pathname);
        });
        
        await Promise.all(keysToDelete.map(key => cache.delete(key)));
        console.log(`Cleared ${keysToDelete.length} entries matching pattern from ${cacheName}`);
      }
    } catch (error) {
      console.error('Failed to clear specific cache entries:', error);
    }
  }
}

// IndexedDB integration for background sync
class IndexedDBManager {
  static async openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('SchoolSISOffline', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create pending actions store
        if (!db.objectStoreNames.contains('pendingActions')) {
          const store = db.createObjectStore('pendingActions', { keyPath: 'id', autoIncrement: true });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('type', 'type', { unique: false });
        }
        
        // Create offline data store
        if (!db.objectStoreNames.contains('offlineData')) {
          const store = db.createObjectStore('offlineData', { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }
  
  static async addPendingAction(action) {
    try {
      const db = await this.openDB();
      const transaction = db.transaction(['pendingActions'], 'readwrite');
      const store = transaction.objectStore('pendingActions');
      
      const actionData = {
        ...action,
        timestamp: Date.now(),
        retryCount: 0
      };
      
      return new Promise((resolve, reject) => {
        const request = store.add(actionData);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to add pending action:', error);
      throw error;
    }
  }
  
  static async getPendingActions() {
    try {
      const db = await this.openDB();
      const transaction = db.transaction(['pendingActions'], 'readonly');
      const store = transaction.objectStore('pendingActions');
      
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to get pending actions:', error);
      return [];
    }
  }
  
  static async removePendingAction(actionId) {
    try {
      const db = await this.openDB();
      const transaction = db.transaction(['pendingActions'], 'readwrite');
      const store = transaction.objectStore('pendingActions');
      
      return new Promise((resolve, reject) => {
        const request = store.delete(actionId);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to remove pending action:', error);
      throw error;
    }
  }
  
  static async updatePendingAction(actionId, updates) {
    try {
      const db = await this.openDB();
      const transaction = db.transaction(['pendingActions'], 'readwrite');
      const store = transaction.objectStore('pendingActions');
      
      const getRequest = store.get(actionId);
      return new Promise((resolve, reject) => {
        getRequest.onsuccess = () => {
          const action = getRequest.result;
          if (action) {
            Object.assign(action, updates);
            const putRequest = store.put(action);
            putRequest.onsuccess = () => resolve();
            putRequest.onerror = () => reject(putRequest.error);
          } else {
            reject(new Error('Action not found'));
          }
        };
        getRequest.onerror = () => reject(getRequest.error);
      });
    } catch (error) {
      console.error('Failed to update pending action:', error);
      throw error;
    }
  }
}

// Install event - cache static assets and fonts
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE_NAME)
        .then((cache) => {
          console.log('Service Worker: Caching static assets');
          return cache.addAll(STATIC_ASSETS);
        })
        .catch((error) => {
          console.error('Service Worker: Failed to cache static assets', error);
          return CacheErrorHandler.handleCacheError('install', error, STATIC_CACHE_NAME);
        }),
      
      // Cache fonts
      caches.open(FONTS_CACHE_NAME)
        .then((cache) => {
          console.log('Service Worker: Caching fonts');
          return cache.addAll(FONT_ASSETS);
        })
        .catch((error) => {
          console.error('Service Worker: Failed to cache fonts', error);
          return CacheErrorHandler.handleCacheError('install', error, FONTS_CACHE_NAME);
        })
    ]).then(() => {
      console.log('Service Worker: Installation completed');
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys()
        .then((cacheNames) => {
          return Promise.all(
            cacheNames.map((cacheName) => {
              if (![STATIC_CACHE_NAME, DYNAMIC_CACHE_NAME, FONTS_CACHE_NAME].includes(cacheName)) {
                console.log('Service Worker: Deleting old cache', cacheName);
                return caches.delete(cacheName);
              }
              return Promise.resolve(); // Return resolved promise for cache names to keep
            })
          );
        }),
      
      // Claim all clients
      self.clients.claim()
    ]).then(() => {
      console.log('Service Worker: Activated successfully');
    })
  );
});

// Fetch event - implement enhanced caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle API requests with network-first strategy and error handling
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle font requests with cache-first strategy
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(handleFontRequest(request));
    return;
  }

  // Handle static assets with cache-first strategy
  if (isStaticAsset(request)) {
    event.respondWith(handleStaticAsset(request));
    return;
  }

  // Handle navigation requests with network-first strategy
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }

  // Default: try network first, fallback to cache
  event.respondWith(handleDefaultRequest(request));
});

// Enhanced API request handler with error handling
async function handleApiRequest(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful API responses
    if (networkResponse.ok) {
      await CacheManager.addToCache(DYNAMIC_CACHE_NAME, request, networkResponse);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Network failed, trying cache for API request');
    
    const cachedResponse = await CacheManager.getFromCache(DYNAMIC_CACHE_NAME, request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return enhanced offline response
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'This data is not available offline',
        offline: true,
        timestamp: Date.now(),
        retryAfter: 30000 // Suggest retry after 30 seconds
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      }
    );
  }
}

// Font request handler with preloading
async function handleFontRequest(request) {
  const cachedResponse = await CacheManager.getFromCache(FONTS_CACHE_NAME, request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      await CacheManager.addToCache(FONTS_CACHE_NAME, request, networkResponse);
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Service Worker: Failed to fetch font', error);
    
    // Return fallback font response
    if (request.url.includes('.css')) {
      return new Response(
        'body { font-family: system-ui, -apple-system, sans-serif; }',
        {
          status: 200,
          headers: { 'Content-Type': 'text/css' }
        }
      );
    }
    
    throw error;
  }
}

// Enhanced static asset handler
async function handleStaticAsset(request) {
  const cachedResponse = await CacheManager.getFromCache(STATIC_CACHE_NAME, request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      await CacheManager.addToCache(STATIC_CACHE_NAME, request, networkResponse);
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Service Worker: Failed to fetch static asset', error);
    throw error;
  }
}

// Enhanced navigation handler
async function handleNavigation(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      await CacheManager.addToCache(DYNAMIC_CACHE_NAME, request, networkResponse);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Network failed, trying cache for navigation');
    
    const cachedResponse = await CacheManager.getFromCache(DYNAMIC_CACHE_NAME, request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return enhanced offline page
    return caches.match('/offline.html') || new Response(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Offline - School SIS</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: system-ui, -apple-system, sans-serif; 
              text-align: center; 
              padding: 2rem; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0;
            }
            .offline-container {
              background: rgba(255, 255, 255, 0.1);
              padding: 2rem;
              border-radius: 20px;
              backdrop-filter: blur(10px);
            }
            .offline-icon { font-size: 4rem; margin-bottom: 1rem; }
            button {
              background: rgba(255, 255, 255, 0.2);
              border: 2px solid rgba(255, 255, 255, 0.3);
              color: white;
              padding: 12px 24px;
              border-radius: 50px;
              cursor: pointer;
              margin-top: 1rem;
            }
          </style>
        </head>
        <body>
          <div class="offline-container">
            <div class="offline-icon">📱</div>
            <h1>You're Offline</h1>
            <p>Please check your internet connection and try again.</p>
            <button onclick="window.location.reload()">Retry</button>
          </div>
        </body>
      </html>
      `,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }
}

// Enhanced default request handler
async function handleDefaultRequest(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      await CacheManager.addToCache(DYNAMIC_CACHE_NAME, request, networkResponse);
    }
    
    return networkResponse;
  } catch (error) {
    const cachedResponse = await CacheManager.getFromCache(DYNAMIC_CACHE_NAME, request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// Check if request is for a static asset
function isStaticAsset(request) {
  const url = new URL(request.url);
  return (
    url.pathname.startsWith('/static/') ||
    url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)
  );
}

// Enhanced background sync with IndexedDB integration
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  } else if (event.tag.startsWith('api-sync-')) {
    const apiEndpoint = event.tag.replace('api-sync-', '');
    event.waitUntil(syncApiData(apiEndpoint));
  }
});

// Enhanced background sync implementation
async function doBackgroundSync() {
  try {
    const pendingActions = await IndexedDBManager.getPendingActions();
    console.log(`Service Worker: Syncing ${pendingActions.length} pending actions`);
    
    for (const action of pendingActions) {
      try {
        await syncAction(action);
        await IndexedDBManager.removePendingAction(action.id);
        console.log(`Service Worker: Successfully synced action ${action.id}`);
      } catch (error) {
        console.error(`Service Worker: Failed to sync action ${action.id}:`, error);
        
        // Update retry count
        const newRetryCount = (action.retryCount || 0) + 1;
        if (newRetryCount < 3) {
          await IndexedDBManager.updatePendingAction(action.id, { 
            retryCount: newRetryCount,
            lastError: error.message,
            lastRetry: Date.now()
          });
        } else {
          // Remove after max retries
          await IndexedDBManager.removePendingAction(action.id);
          console.log(`Service Worker: Removed action ${action.id} after max retries`);
        }
      }
    }
  } catch (error) {
    console.error('Service Worker: Background sync failed', error);
  }
}

// Sync specific API data
async function syncApiData(endpoint) {
  try {
    const response = await fetch(`/api/${endpoint}`);
    if (response.ok) {
      await response.json();
      // Store synced data in IndexedDB for offline access
      console.log(`Service Worker: Synced data for ${endpoint}`);
    }
  } catch (error) {
    console.error(`Service Worker: Failed to sync ${endpoint}:`, error);
  }
}

// Enhanced sync action implementation
async function syncAction(action) {
  console.log('Service Worker: Syncing action', action);
  
  switch (action.type) {
  case 'attendance':
    return syncAttendanceAction(action);
  case 'grade':
    return syncGradeAction(action);
  case 'student':
    return syncStudentAction(action);
  default:
    throw new Error(`Unknown action type: ${action.type}`);
  }
}

// Specific sync implementations
async function syncAttendanceAction(action) {
  const response = await fetch('/api/attendance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(action.data)
  });
  
  if (!response.ok) {
    throw new Error(`Attendance sync failed: ${response.statusText}`);
  }
  
  return response.json();
}

async function syncGradeAction(action) {
  const response = await fetch('/api/grades', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(action.data)
  });
  
  if (!response.ok) {
    throw new Error(`Grade sync failed: ${response.statusText}`);
  }
  
  return response.json();
}

async function syncStudentAction(action) {
  const response = await fetch('/api/students', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(action.data)
  });
  
  if (!response.ok) {
    throw new Error(`Student sync failed: ${response.statusText}`);
  }
  
  return response.json();
}

// Enhanced push notification handler with deep linking
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received');
  
  let notificationData = {
    title: 'School SIS',
    body: 'New notification from School SIS',
    icon: '/logo192.png',
    badge: '/logo192.png',
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };
  
  // Parse push data if available
  if (event.data) {
    try {
      const pushData = event.data.json();
      notificationData = { ...notificationData, ...pushData };
    } catch (error) {
      notificationData.body = event.data.text();
    }
  }
  
  // Add deep linking support
  if (notificationData.data && notificationData.data.url) {
    notificationData.actions = [
      {
        action: 'view',
        title: 'View Details',
        icon: '/icon-view.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icon-close.png'
      }
    ];
  }
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Enhanced notification click handler with deep linking
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');
  
  event.notification.close();
  
  const notificationData = event.notification.data;
  
  if (event.action === 'view' && notificationData.url) {
    // Deep link to specific page
    event.waitUntil(
      self.clients.openWindow(notificationData.url)
    );
  } else if (event.action === 'close') {
    // Just close the notification
  } else {
    // Default action - open the app or specific page
    const urlToOpen = notificationData.url || '/';
    event.waitUntil(
      self.clients.openWindow(urlToOpen)
    );
  }
});

// Message handling for cache management
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
  case 'CLEAR_CACHE':
    clearSpecificCache(data.pattern);
    break;
  case 'ADD_PENDING_ACTION':
    IndexedDBManager.addPendingAction(data.action);
    break;
  case 'SYNC_OFFLINE_DATA':
    doBackgroundSync();
    break;
  case 'GET_CACHE_INFO':
    getCacheInfo().then(info => {
      event.ports[0].postMessage({ type: 'CACHE_INFO', data: info });
    });
    break;
  default:
    console.log('Service Worker: Unknown message type', type);
  }
});

// Clear specific cache entries
async function clearSpecificCache(pattern) {
  try {
    const regex = new RegExp(pattern);
    await CacheManager.clearSpecificEntries(regex);
    console.log(`Service Worker: Cleared cache entries matching pattern: ${pattern}`);
  } catch (error) {
    console.error('Service Worker: Failed to clear cache entries:', error);
  }
}

// Get cache information
async function getCacheInfo() {
  try {
    const cacheNames = await caches.keys();
    const cacheInfo = {};
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      cacheInfo[cacheName] = {
        size: keys.length,
        keys: keys.map(request => ({
          url: request.url,
          method: request.method
        }))
      };
    }
    
    return cacheInfo;
  } catch (error) {
    console.error('Service Worker: Failed to get cache info:', error);
    return {};
  }
}

// Periodic cleanup task
setInterval(async () => {
  try {
    await CacheManager.enforceCacheLimit(DYNAMIC_CACHE_NAME);
    await CacheManager.enforceCacheLimit(STATIC_CACHE_NAME);
    await CacheManager.enforceCacheLimit(FONTS_CACHE_NAME);
    console.log('Service Worker: Periodic cache cleanup completed');
  } catch (error) {
    console.error('Service Worker: Periodic cleanup failed:', error);
  }
}, 300000); // Run every 5 minutes
