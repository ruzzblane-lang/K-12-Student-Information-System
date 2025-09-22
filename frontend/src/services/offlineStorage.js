// Offline Storage Service using IndexedDB
// Provides offline data persistence and sync capabilities

const DB_NAME = 'SchoolSIS';
const DB_VERSION = 1;

// Database stores
const STORES = {
  STUDENTS: 'students',
  TEACHERS: 'teachers',
  CLASSES: 'classes',
  GRADES: 'grades',
  ATTENDANCE: 'attendance',
  PENDING_ACTIONS: 'pendingActions',
  CACHE_METADATA: 'cacheMetadata'
};

class OfflineStorageService {
  constructor() {
    this.db = null;
    this.isInitialized = false;
  }

  // Initialize IndexedDB
  async init() {
    if (this.isInitialized) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        console.log('IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        this.createStores(db);
      };
    });
  }

  // Create database stores
  createStores(db) {
    // Students store
    if (!db.objectStoreNames.contains(STORES.STUDENTS)) {
      const studentsStore = db.createObjectStore(STORES.STUDENTS, { keyPath: '_id' });
      studentsStore.createIndex('tenant_id', 'tenant_id', { unique: false });
      studentsStore.createIndex('grade', 'grade', { unique: false });
      studentsStore.createIndex('status', 'status', { unique: false });
    }

    // Teachers store
    if (!db.objectStoreNames.contains(STORES.TEACHERS)) {
      const teachersStore = db.createObjectStore(STORES.TEACHERS, { keyPath: '_id' });
      teachersStore.createIndex('tenant_id', 'tenant_id', { unique: false });
      teachersStore.createIndex('department', 'department', { unique: false });
    }

    // Classes store
    if (!db.objectStoreNames.contains(STORES.CLASSES)) {
      const classesStore = db.createObjectStore(STORES.CLASSES, { keyPath: '_id' });
      classesStore.createIndex('tenant_id', 'tenant_id', { unique: false });
      classesStore.createIndex('teacher_id', 'teacher_id', { unique: false });
    }

    // Grades store
    if (!db.objectStoreNames.contains(STORES.GRADES)) {
      const gradesStore = db.createObjectStore(STORES.GRADES, { keyPath: '_id' });
      gradesStore.createIndex('student_id', 'student_id', { unique: false });
      gradesStore.createIndex('class_id', 'class_id', { unique: false });
      gradesStore.createIndex('tenant_id', 'tenant_id', { unique: false });
    }

    // Attendance store
    if (!db.objectStoreNames.contains(STORES.ATTENDANCE)) {
      const attendanceStore = db.createObjectStore(STORES.ATTENDANCE, { keyPath: '_id' });
      attendanceStore.createIndex('student_id', 'student_id', { unique: false });
      attendanceStore.createIndex('class_id', 'class_id', { unique: false });
      attendanceStore.createIndex('date', 'date', { unique: false });
      attendanceStore.createIndex('tenant_id', 'tenant_id', { unique: false });
    }

    // Pending actions store (for offline actions that need to sync)
    if (!db.objectStoreNames.contains(STORES.PENDING_ACTIONS)) {
      const pendingStore = db.createObjectStore(STORES.PENDING_ACTIONS, { 
        keyPath: '_id', 
        autoIncrement: true 
      });
      pendingStore.createIndex('type', 'type', { unique: false });
      pendingStore.createIndex('timestamp', 'timestamp', { unique: false });
      pendingStore.createIndex('status', 'status', { unique: false });
    }

    // Cache metadata store
    if (!db.objectStoreNames.contains(STORES.CACHE_METADATA)) {
      const _metadataStore = db.createObjectStore(STORES.CACHE_METADATA, { keyPath: 'key' });
    }
  }

  // Generic CRUD operations
  async add(storeName, data) {
    await this.ensureInitialized();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(data);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async get(storeName, key) {
    await this.ensureInitialized();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll(storeName, indexName = null, _query = null) {
    await this.ensureInitialized();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const source = indexName ? store.index(indexName) : store;
      const request = _query ? source.getAll(_query) : source.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async update(storeName, data) {
    await this.ensureInitialized();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName, key) {
    await this.ensureInitialized();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Student-specific methods
  async cacheStudents(students) {
    await this.ensureInitialized();
    
    const transaction = this.db.transaction([STORES.STUDENTS], 'readwrite');
    const store = transaction.objectStore(STORES.STUDENTS);
    
    // Clear existing data
    await store.clear();
    
    // Add new data
    for (const _student of students) {
      await store.add({
        ..._student,
        cached_at: new Date().toISOString(),
        offline: true
      });
    }
    
    await this.setCacheMetadata('students_last_updated', new Date().toISOString());
  }

  async getCachedStudents(tenantId = null) {
    if (tenantId) {
      return await this.getAll(STORES.STUDENTS, 'tenant_id', tenantId);
    }
    return await this.getAll(STORES.STUDENTS);
  }

  // Grade-specific methods
  async cacheGrades(grades) {
    await this.ensureInitialized();
    
    const transaction = this.db.transaction([STORES.GRADES], 'readwrite');
    const store = transaction.objectStore(STORES.GRADES);
    
    for (const grade of grades) {
      await store.put({
        ...grade,
        cached_at: new Date().toISOString(),
        offline: true
      });
    }
    
    await this.setCacheMetadata('grades_last_updated', new Date().toISOString());
  }

  async getCachedGrades(_studentId = null, classId = null) {
    if (_studentId) {
      return await this.getAll(STORES.GRADES, 'student_id', _studentId);
    }
    if (classId) {
      return await this.getAll(STORES.GRADES, 'class_id', classId);
    }
    return await this.getAll(STORES.GRADES);
  }

  // Attendance-specific methods
  async cacheAttendance(attendance) {
    await this.ensureInitialized();
    
    const transaction = this.db.transaction([STORES.ATTENDANCE], 'readwrite');
    const store = transaction.objectStore(STORES.ATTENDANCE);
    
    for (const record of attendance) {
      await store.put({
        ...record,
        cached_at: new Date().toISOString(),
        offline: true
      });
    }
    
    await this.setCacheMetadata('attendance_last_updated', new Date().toISOString());
  }

  async getCachedAttendance(_studentId = null, classId = null, date = null) {
    if (_studentId) {
      return await this.getAll(STORES.ATTENDANCE, 'student_id', _studentId);
    }
    if (classId) {
      return await this.getAll(STORES.ATTENDANCE, 'class_id', classId);
    }
    if (date) {
      return await this.getAll(STORES.ATTENDANCE, 'date', date);
    }
    return await this.getAll(STORES.ATTENDANCE);
  }

  // Pending actions methods
  async addPendingAction(action) {
    const pendingAction = {
      ...action,
      timestamp: new Date().toISOString(),
      status: 'pending',
      retry_count: 0
    };
    
    return await this.add(STORES.PENDING_ACTIONS, pendingAction);
  }

  async getPendingActions() {
    return await this.getAll(STORES.PENDING_ACTIONS);
  }

  async removePendingAction(actionId) {
    return await this.delete(STORES.PENDING_ACTIONS, actionId);
  }

  async updatePendingActionStatus(actionId, status, error = null) {
    const action = await this.get(STORES.PENDING_ACTIONS, actionId);
    if (action) {
      action.status = status;
      action.updated_at = new Date().toISOString();
      if (error) {
        action.error = error;
        action.retry_count = (action.retry_count || 0) + 1;
      }
      return await this.update(STORES.PENDING_ACTIONS, action);
    }
  }

  // Cache metadata methods
  async setCacheMetadata(key, value) {
    return await this.update(STORES.CACHE_METADATA, { key, value });
  }

  async getCacheMetadata(key) {
    const result = await this.get(STORES.CACHE_METADATA, key);
    return result ? result.value : null;
  }

  // Utility methods
  async ensureInitialized() {
    if (!this.isInitialized) {
      await this.init();
    }
  }

  async clearAllData() {
    await this.ensureInitialized();
    
    const storeNames = Object.values(STORES);
    const transaction = this.db.transaction(storeNames, 'readwrite');
    
    for (const storeName of storeNames) {
      await transaction.objectStore(storeName).clear();
    }
  }

  async getStorageInfo() {
    await this.ensureInitialized();
    
    const info = {};
    for (const [name, storeName] of Object.entries(STORES)) {
      const count = await this.getAll(storeName);
      info[name] = count.length;
    }
    
    return info;
  }

  // Check if data is stale
  async isDataStale(dataType, maxAgeMinutes = 30) {
    const lastUpdated = await this.getCacheMetadata(`${dataType}_last_updated`);
    if (!lastUpdated) return true;
    
    const lastUpdatedTime = new Date(lastUpdated);
    const now = new Date();
    const ageMinutes = (now - lastUpdatedTime) / (1000 * 60);
    
    return ageMinutes > maxAgeMinutes;
  }
}

// Create singleton instance
const offlineStorage = new OfflineStorageService();

export default offlineStorage;
export { STORES };
