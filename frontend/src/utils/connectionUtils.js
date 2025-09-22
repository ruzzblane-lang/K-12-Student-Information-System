/**
 * Connection Utilities for PWA
 * 
 * Provides utilities for managing online/offline status and connection events
 * across the application for better maintainability and reusability.
 */

import React from 'react';

/**
 * Connection status manager
 */
class ConnectionManager {
  constructor() {
    this.isOnline = navigator.onLine;
    this.listeners = new Set();
    this.retryAttempts = 0;
    this.maxRetryAttempts = 3;
    this.retryDelay = 1000; // 1 second
    this.heartbeatInterval = null;
    this.heartbeatUrl = '/api/health';
    
    this.init();
  }

  /**
   * Initialize connection monitoring
   */
  init() {
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
    
    // Start heartbeat monitoring
    this.startHeartbeat();
    
    // Initial status update
    this.updateStatus();
  }

  /**
   * Handle online event
   */
  handleOnline() {
    console.log('Connection: Back online');
    this.isOnline = true;
    this.retryAttempts = 0;
    this.updateStatus();
    this.notifyListeners({ isOnline: true, event: 'online' });
    
    // Trigger background sync if available
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SYNC_OFFLINE_DATA'
      });
    }
  }

  /**
   * Handle offline event
   */
  handleOffline() {
    console.log('Connection: Gone offline');
    this.isOnline = false;
    this.updateStatus();
    this.notifyListeners({ isOnline: false, event: 'offline' });
  }

  /**
   * Update connection status in DOM and dispatch events
   */
  updateStatus() {
    // Update body class for styling
    document.body.classList.toggle('offline', !this.isOnline);
    document.body.classList.toggle('online', this.isOnline);
    
    // Dispatch custom event for components
    window.dispatchEvent(new CustomEvent('connectionChange', {
      detail: { 
        isOnline: this.isOnline,
        timestamp: Date.now(),
        retryAttempts: this.retryAttempts
      }
    }));
  }

  /**
   * Start heartbeat monitoring for more accurate connection detection
   */
  startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(async () => {
      try {
        const response = await fetch(this.heartbeatUrl, {
          method: 'HEAD',
          cache: 'no-cache',
          timeout: 5000
        });
        
        if (response.ok && !this.isOnline) {
          // We're actually online, update status
          this.isOnline = true;
          this.retryAttempts = 0;
          this.updateStatus();
          this.notifyListeners({ isOnline: true, event: 'heartbeat-online' });
        }
      } catch (error) {
        if (this.isOnline) {
          // We're actually offline, update status
          this.isOnline = false;
          this.updateStatus();
          this.notifyListeners({ isOnline: false, event: 'heartbeat-offline' });
        }
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Stop heartbeat monitoring
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Add connection status listener
   * @_param {Function} callback - Callback function to call on status change
   * @returns {Function} - Unsubscribe function
   */
  addListener(callback) {
    this.listeners.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify all listeners of connection status change
   * @_param {Object} status - Connection status object
   */
  notifyListeners(status) {
    this.listeners.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('Connection listener error:', error);
      }
    });
  }

  /**
   * Get current connection status
   * @returns {Object} - Current connection status
   */
  getStatus() {
    return {
      isOnline: this.isOnline,
      timestamp: Date.now(),
      retryAttempts: this.retryAttempts
    };
  }

  /**
   * Test connection with retry logic
   * @_param {string} url - URL to test connection against
   * @_param {number} timeout - Timeout in milliseconds
   * @returns {Promise<boolean>} - True if connection is successful
   */
  async testConnection(url = this.heartbeatUrl, timeout = 5000) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, {
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Retry failed requests with exponential backoff
   * @_param {Function} requestFn - Function that returns a promise
   * @_param {number} maxAttempts - Maximum number of retry attempts
   * @returns {Promise} - Promise that resolves when request succeeds or max attempts reached
   */
  async retryRequest(requestFn, maxAttempts = this.maxRetryAttempts) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await requestFn();
        this.retryAttempts = 0;
        return result;
      } catch (error) {
        if (attempt === maxAttempts) {
          throw error;
        }
        
        this.retryAttempts = attempt;
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.stopHeartbeat();
    this.listeners.clear();
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }
}

// Create singleton instance
const connectionManager = new ConnectionManager();

/**
 * Utility functions for connection management
 */
export const connectionUtils = {
  /**
   * Get current connection status
   * @returns {Object} - Connection status
   */
  getStatus: () => connectionManager.getStatus(),

  /**
   * Add connection status listener
   * @_param {Function} callback - Callback function
   * @returns {Function} - Unsubscribe function
   */
  addListener: (callback) => connectionManager.addListener(callback),

  /**
   * Test connection
   * @_param {string} url - URL to test
   * @_param {number} timeout - Timeout in milliseconds
   * @returns {Promise<boolean>} - Connection test result
   */
  testConnection: (url, timeout) => connectionManager.testConnection(url, timeout),

  /**
   * Retry request with exponential backoff
   * @_param {Function} requestFn - Request function
   * @_param {number} maxAttempts - Maximum attempts
   * @returns {Promise} - Retry result
   */
  retryRequest: (requestFn, maxAttempts) => connectionManager.retryRequest(requestFn, maxAttempts),

  /**
   * Check if currently online
   * @returns {boolean} - Online status
   */
  isOnline: () => connectionManager.isOnline,

  /**
   * Cleanup connection manager
   */
  destroy: () => connectionManager.destroy()
};

/**
 * React hook for connection status
 * @returns {Object} - Connection status and utilities
 */
export const useConnection = () => {
  const [status, setStatus] = React.useState(connectionManager.getStatus());

  React.useEffect(() => {
    const unsubscribe = connectionManager.addListener((newStatus) => {
      setStatus(newStatus);
    });

    return unsubscribe;
  }, []);

  return {
    ...status,
    testConnection: connectionUtils.testConnection,
    retryRequest: connectionUtils.retryRequest
  };
};

export default connectionManager;
