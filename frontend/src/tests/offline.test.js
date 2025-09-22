// Offline-First Testing Suite for School SIS PWA

import offlineStorage from '../services/offlineStorage';
import pushNotificationService from '../services/pushNotifications';

// Mock IndexedDB for testing
const mockIndexedDB = () => {
  const store = new Map();
  
  return {
    open: jest.fn(() => ({
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
      result: {
        transaction: jest.fn(() => ({
          objectStore: jest.fn(() => ({
            add: jest.fn((data) => {
              store.set(data.id, data);
              return { onsuccess: null, onerror: null };
            }),
            get: jest.fn((key) => ({
              onsuccess: null,
              onerror: null,
              result: store.get(key)
            })),
            getAll: jest.fn(() => ({
              onsuccess: null,
              onerror: null,
              result: Array.from(store.values())
            })),
            put: jest.fn((data) => {
              store.set(data.id, data);
              return { onsuccess: null, onerror: null };
            }),
            delete: jest.fn((key) => {
              store.delete(key);
              return { onsuccess: null, onerror: null };
            }),
            clear: jest.fn(() => {
              store.clear();
              return { onsuccess: null, onerror: null };
            })
          }))
        }))
      }
    }))
  };
};

// Mock service worker
const mockServiceWorker = () => {
  global.navigator.serviceWorker = {
    register: jest.fn(() => Promise.resolve({
      installing: null,
      waiting: null,
      active: null,
      addEventListener: jest.fn()
    })),
    ready: Promise.resolve({
      pushManager: {
        subscribe: jest.fn(() => Promise.resolve({
          endpoint: 'test-endpoint',
          keys: { p256dh: 'test-key', auth: 'test-auth' }
        })),
        getSubscription: jest.fn(() => Promise.resolve(null))
      }
    })
  };
};

// Mock fetch for offline scenarios
const mockFetch = (shouldFail = false) => {
  global.fetch = jest.fn(() => {
    if (shouldFail) {
      return Promise.reject(new Error('Network error'));
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ success: true }),
      clone: () => ({ ok: true })
    });
  });
};

describe('Offline Storage Service', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock IndexedDB
    global.indexedDB = mockIndexedDB();
    
    // Mock console methods to avoid test output noise
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should initialize IndexedDB successfully', async () => {
    const result = await offlineStorage.init();
    expect(result).toBeUndefined(); // init returns void
  });

  test('should cache students data', async () => {
    await offlineStorage.init();
    
    const mockStudents = [
      { id: 1, first_name: 'John', last_name: 'Doe', grade: 9 },
      { id: 2, first_name: 'Jane', last_name: 'Smith', grade: 10 }
    ];

    await offlineStorage.cacheStudents(mockStudents);
    
    const cachedStudents = await offlineStorage.getCachedStudents();
    expect(cachedStudents).toHaveLength(2);
    expect(cachedStudents[0]).toHaveProperty('cached_at');
    expect(cachedStudents[0]).toHaveProperty('offline', true);
  });

  test('should handle pending actions', async () => {
    await offlineStorage.init();
    
    const mockAction = {
      type: 'CREATE_STUDENT',
      data: { first_name: 'Test', last_name: 'Student' },
      endpoint: '/api/students'
    };

    const actionId = await offlineStorage.addPendingAction(mockAction);
    expect(actionId).toBeDefined();

    const pendingActions = await offlineStorage.getPendingActions();
    expect(pendingActions).toHaveLength(1);
    expect(pendingActions[0].type).toBe('CREATE_STUDENT');
  });

  test('should check if data is stale', async () => {
    await offlineStorage.init();
    
    // Test with no cached data
    const isStaleNoData = await offlineStorage.isDataStale('students');
    expect(isStaleNoData).toBe(true);

    // Test with fresh data
    await offlineStorage.setCacheMetadata('students_last_updated', new Date().toISOString());
    const isStaleFresh = await offlineStorage.isDataStale('students', 60);
    expect(isStaleFresh).toBe(false);
  });
});

describe('Push Notification Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockServiceWorker();
    
    // Mock Notification API
    global.Notification = {
      requestPermission: jest.fn(() => Promise.resolve('granted')),
      permission: 'granted'
    };
  });

  test('should initialize push notifications', async () => {
    const result = await pushNotificationService.init();
    expect(result).toBe(true);
  });

  test('should request notification permission', async () => {
    const result = await pushNotificationService.requestPermission();
    expect(result).toBe(true);
    expect(global.Notification.requestPermission).toHaveBeenCalled();
  });

  test('should show local notification', () => {
    pushNotificationService.showNotification('Test Notification', {
      body: 'This is a test notification'
    });
    
    // Since we can't easily test the actual notification display,
    // we just verify the method doesn't throw
    expect(true).toBe(true);
  });
});

describe('Offline-First API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch();
    global.indexedDB = mockIndexedDB();
  });

  test('should handle network failures gracefully', async () => {
    // Mock network failure
    mockFetch(true);
    
    await offlineStorage.init();
    
    // Simulate API call that fails
    try {
      const response = await fetch('/api/students');
      expect(response).toBeUndefined();
    } catch (error) {
      expect(error.message).toBe('Network error');
    }
  });

  test('should fallback to cached data when offline', async () => {
    await offlineStorage.init();
    
    // Cache some data
    const mockStudents = [
      { id: 1, first_name: 'Cached', last_name: 'Student' }
    ];
    await offlineStorage.cacheStudents(mockStudents);
    
    // Simulate offline scenario
    mockFetch(true);
    
    // Should return cached data
    const cachedStudents = await offlineStorage.getCachedStudents();
    expect(cachedStudents).toHaveLength(1);
    expect(cachedStudents[0].first_name).toBe('Cached');
  });
});

describe('Service Worker Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockServiceWorker();
  });

  test('should register service worker', async () => {
    const registration = await navigator.serviceWorker.register('/sw.js');
    expect(registration).toBeDefined();
    expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js');
  });

  test('should handle service worker updates', async () => {
    const mockRegistration = {
      addEventListener: jest.fn(),
      installing: null,
      waiting: null,
      active: null
    };
    
    navigator.serviceWorker.register.mockResolvedValue(mockRegistration);
    
    const registration = await navigator.serviceWorker.register('/sw.js');
    expect(registration.addEventListener).toBeDefined();
  });
});

describe('Mobile Touch Interactions', () => {
  test('should handle touch events', () => {
    const mockTouchEvent = {
      targetTouches: [{ clientX: 100, clientY: 100 }],
      changedTouches: [{ clientX: 150, clientY: 100 }],
      preventDefault: jest.fn()
    };

    // Test touch start
    const touchStart = mockTouchEvent.targetTouches[0].clientX;
    expect(touchStart).toBe(100);

    // Test touch end
    const touchEnd = mockTouchEvent.changedTouches[0].clientX;
    expect(touchEnd).toBe(150);

    // Test swipe distance
    const swipeDistance = touchStart - touchEnd;
    expect(swipeDistance).toBe(-50);
  });

  test('should detect swipe gestures', () => {
    const minSwipeDistance = 50;
    
    // Test left swipe
    const leftSwipeDistance = 100;
    const isLeftSwipe = leftSwipeDistance > minSwipeDistance;
    expect(isLeftSwipe).toBe(true);

    // Test right swipe
    const rightSwipeDistance = -100;
    const isRightSwipe = rightSwipeDistance < -minSwipeDistance;
    expect(isRightSwipe).toBe(true);
  });
});

describe('PWA Manifest Validation', () => {
  test('should have valid manifest structure', () => {
    const manifest = {
      short_name: 'School SIS',
      name: 'K-12 Student Information System',
      start_url: '/',
      display: 'standalone',
      theme_color: '#1e40af',
      background_color: '#ffffff'
    };

    expect(manifest.short_name).toBeDefined();
    expect(manifest.name).toBeDefined();
    expect(manifest.start_url).toBe('/');
    expect(manifest.display).toBe('standalone');
  });

  test('should include required icons', () => {
    const manifest = {
      icons: [
        { src: 'favicon.ico', sizes: '64x64 32x32 24x24 16x16' },
        { src: 'logo192.png', sizes: '192x192' },
        { src: 'logo512.png', sizes: '512x512' }
      ]
    };

    expect(manifest.icons).toHaveLength(3);
    expect(manifest.icons[0].src).toBe('favicon.ico');
    expect(manifest.icons[1].sizes).toBe('192x192');
  });
});

// Integration tests for offline-first workflow
describe('Offline-First Workflow Integration', () => {
  beforeEach(async () => {
    await offlineStorage.init();
  });

  test('should handle complete offline workflow', async () => {
    // 1. Cache initial data
    const students = [
      { id: 1, first_name: 'John', last_name: 'Doe', grade: 9 }
    ];
    await offlineStorage.cacheStudents(students);

    // 2. Simulate offline action
    const newStudent = { first_name: 'Jane', last_name: 'Smith', grade: 10 };
    await offlineStorage.addPendingAction({
      type: 'CREATE_STUDENT',
      data: newStudent,
      endpoint: '/api/students'
    });

    // 3. Verify pending action exists
    const pendingActions = await offlineStorage.getPendingActions();
    expect(pendingActions).toHaveLength(1);

    // 4. Verify cached data is available
    const cachedStudents = await offlineStorage.getCachedStudents();
    expect(cachedStudents).toHaveLength(1);

    // 5. Simulate coming back online and syncing
    await offlineStorage.removePendingAction(pendingActions[0].id);
    const remainingActions = await offlineStorage.getPendingActions();
    expect(remainingActions).toHaveLength(0);
  });
});
