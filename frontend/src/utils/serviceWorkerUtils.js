/**
 * Service Worker Utilities for PWA
 * 
 * Provides utilities for managing service worker registration,
 * updates, and communication with better UX and maintainability.
 */

import React from 'react';
import { notificationUtils } from './notificationUtils';

/**
 * Service Worker Manager
 */
class ServiceWorkerManager {
  constructor() {
    this.registration = null;
    this.updateAvailable = false;
    this.isInstalling = false;
    this.updateCallbacks = new Set();
    this.installCallbacks = new Set();
    this.errorCallbacks = new Set();
    
    this.init();
  }

  /**
   * Initialize service worker
   */
  async init() {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported');
      return;
    }

    try {
      await this.register();
      this.setupUpdateHandlers();
    } catch (error) {
      console.error('Service Worker initialization failed:', error);
      this.notifyError(error);
    }
  }

  /**
   * Register service worker
   */
  async register() {
    try {
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('Service Worker registered:', this.registration);
      this.notifyInstall();

      // Check for updates immediately
      await this.checkForUpdates();

      return this.registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      throw error;
    }
  }

  /**
   * Setup update handlers
   */
  setupUpdateHandlers() {
    if (!this.registration) return;

    // Listen for updates
    this.registration.addEventListener('updatefound', () => {
      const newWorker = this.registration.installing;
      
      if (!newWorker) return;

      this.isInstalling = true;
      this.notifyInstall();

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed') {
          this.isInstalling = false;
          
          if (navigator.serviceWorker.controller) {
            // New content is available
            this.updateAvailable = true;
            this.notifyUpdate();
          } else {
            // Content is cached for the first time
            this.notifyFirstInstall();
          }
        }
      });
    });

    // Listen for controller changes
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('Service Worker controller changed');
      this.updateAvailable = false;
      this.notifyControllerChange();
    });
  }

  /**
   * Check for updates
   */
  async checkForUpdates() {
    if (!this.registration) return false;

    try {
      await this.registration.update();
      return true;
    } catch (error) {
      console.error('Failed to check for updates:', error);
      return false;
    }
  }

  /**
   * Apply update
   */
  async applyUpdate() {
    if (!this.updateAvailable || !this.registration) {
      return false;
    }

    try {
      // Notify service worker to skip waiting
      if (this.registration.waiting) {
        this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      // Reload the page
      window.location.reload();
      return true;
    } catch (error) {
      console.error('Failed to apply update:', error);
      return false;
    }
  }

  /**
   * Show update notification
   */
  showUpdateNotification() {
    const _toastId = notificationUtils.update(
      'A new version of the app is available. Click to update.',
      'Update Available',
      [
        {
          label: 'Update Now',
          action: 'update',
          primary: true
        },
        {
          label: 'Later',
          action: 'later'
        }
      ]
    );

    // Handle action clicks
    const handleAction = (event) => {
      if (event.detail.action === 'update') {
        this.applyUpdate();
      }
      notificationUtils.removeToast(_toastId);
    };

    // Listen for action events (you'd need to implement this in your toast system)
    document.addEventListener('toast-action', handleAction);
  }

  /**
   * Show update modal
   */
  async showUpdateModal() {
    const result = await notificationUtils.updateModal(
      'A new version of the app is available. Would you like to update now?',
      'Update Available'
    );

    if (result === 'confirm') {
      await this.applyUpdate();
    }
  }

  /**
   * Get service worker status
   */
  getStatus() {
    return {
      isSupported: 'serviceWorker' in navigator,
      isRegistered: !!this.registration,
      isInstalling: this.isInstalling,
      updateAvailable: this.updateAvailable,
      hasController: !!navigator.serviceWorker.controller,
      scope: this.registration?.scope
    };
  }

  /**
   * Add update callback
   * @_param {Function} callback - Callback function
   * @returns {Function} - Unsubscribe function
   */
  onUpdate(callback) {
    this.updateCallbacks.add(callback);
    return () => this.updateCallbacks.delete(callback);
  }

  /**
   * Add install callback
   * @_param {Function} callback - Callback function
   * @returns {Function} - Unsubscribe function
   */
  onInstall(callback) {
    this.installCallbacks.add(callback);
    return () => this.installCallbacks.delete(callback);
  }

  /**
   * Add error callback
   * @_param {Function} callback - Callback function
   * @returns {Function} - Unsubscribe function
   */
  onError(callback) {
    this.errorCallbacks.add(callback);
    return () => this.errorCallbacks.delete(callback);
  }

  /**
   * Notify update callbacks
   */
  notifyUpdate() {
    this.updateCallbacks.forEach(callback => {
      try {
        callback({ updateAvailable: true, registration: this.registration });
      } catch (error) {
        console.error('Update callback error:', error);
      }
    });
  }

  /**
   * Notify install callbacks
   */
  notifyInstall() {
    this.installCallbacks.forEach(callback => {
      try {
        callback({ isInstalling: this.isInstalling, registration: this.registration });
      } catch (error) {
        console.error('Install callback error:', error);
      }
    });
  }

  /**
   * Notify first install
   */
  notifyFirstInstall() {
    notificationUtils.success(
      'App is now available offline!',
      'Ready to Use'
    );
  }

  /**
   * Notify controller change
   */
  notifyControllerChange() {
    notificationUtils.info(
      'App has been updated to the latest version.',
      'Updated'
    );
  }

  /**
   * Notify error callbacks
   */
  notifyError(error) {
    this.errorCallbacks.forEach(callback => {
      try {
        callback(error);
      } catch (callbackError) {
        console.error('Error callback error:', callbackError);
      }
    });
  }

  /**
   * Send message to service worker
   * @_param {Object} message - Message to send
   */
  async sendMessage(message) {
    if (!navigator.serviceWorker.controller) {
      console.warn('No service worker controller available');
      return;
    }

    try {
      const response = await new Promise((resolve, reject) => {
        const messageChannel = new MessageChannel();
        
        messageChannel.port1.onmessage = (event) => {
          if (event.data.error) {
            reject(new Error(event.data.error));
          } else {
            resolve(event.data);
          }
        };

        navigator.serviceWorker.controller.postMessage(message, [messageChannel.port2]);
      });

      return response;
    } catch (error) {
      console.error('Failed to send message to service worker:', error);
      throw error;
    }
  }

  /**
   * Clear all caches
   */
  async clearCaches() {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('All caches cleared');
      return true;
    } catch (error) {
      console.error('Failed to clear caches:', error);
      return false;
    }
  }

  /**
   * Get cache information
   */
  async getCacheInfo() {
    try {
      const cacheNames = await caches.keys();
      const cacheInfo = {};

      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        cacheInfo[cacheName] = {
          size: keys.length,
          keys: keys.map(request => request.url)
        };
      }

      return cacheInfo;
    } catch (error) {
      console.error('Failed to get cache info:', error);
      return {};
    }
  }

  /**
   * Unregister service worker
   */
  async unregister() {
    if (!this.registration) return false;

    try {
      const result = await this.registration.unregister();
      console.log('Service Worker unregistered:', result);
      return result;
    } catch (error) {
      console.error('Failed to unregister service worker:', error);
      return false;
    }
  }
}

// Create singleton instance
const serviceWorkerManager = new ServiceWorkerManager();

/**
 * Service Worker utilities
 */
export const serviceWorkerUtils = {
  /**
   * Get service worker status
   * @returns {Object} - Status object
   */
  getStatus: () => serviceWorkerManager.getStatus(),

  /**
   * Check for updates
   * @returns {Promise<boolean>} - Update check result
   */
  checkForUpdates: () => serviceWorkerManager.checkForUpdates(),

  /**
   * Apply update
   * @returns {Promise<boolean>} - Update result
   */
  applyUpdate: () => serviceWorkerManager.applyUpdate(),

  /**
   * Show update notification
   */
  showUpdateNotification: () => serviceWorkerManager.showUpdateNotification(),

  /**
   * Show update modal
   * @returns {Promise} - Modal result
   */
  showUpdateModal: () => serviceWorkerManager.showUpdateModal(),

  /**
   * Send message to service worker
   * @_param {Object} message - Message to send
   * @returns {Promise} - Response from service worker
   */
  sendMessage: (message) => serviceWorkerManager.sendMessage(message),

  /**
   * Clear all caches
   * @returns {Promise<boolean>} - Clear result
   */
  clearCaches: () => serviceWorkerManager.clearCaches(),

  /**
   * Get cache information
   * @returns {Promise<Object>} - Cache information
   */
  getCacheInfo: () => serviceWorkerManager.getCacheInfo(),

  /**
   * Unregister service worker
   * @returns {Promise<boolean>} - Unregister result
   */
  unregister: () => serviceWorkerManager.unregister(),

  /**
   * Add update callback
   * @_param {Function} callback - Callback function
   * @returns {Function} - Unsubscribe function
   */
  onUpdate: (callback) => serviceWorkerManager.onUpdate(callback),

  /**
   * Add install callback
   * @_param {Function} callback - Callback function
   * @returns {Function} - Unsubscribe function
   */
  onInstall: (callback) => serviceWorkerManager.onInstall(callback),

  /**
   * Add error callback
   * @_param {Function} callback - Callback function
   * @returns {Function} - Unsubscribe function
   */
  onError: (callback) => serviceWorkerManager.onError(callback)
};

/**
 * React hook for service worker
 * @returns {Object} - Service worker status and utilities
 */
export const useServiceWorker = () => {
  const [status, setStatus] = React.useState(serviceWorkerManager.getStatus());

  React.useEffect(() => {
    const unsubscribeUpdate = serviceWorkerManager.onUpdate((_updateInfo) => {
      setStatus(prev => ({ ...prev, updateAvailable: true }));
    });

    const unsubscribeInstall = serviceWorkerManager.onInstall((installInfo) => {
      setStatus(prev => ({ ...prev, isInstalling: installInfo.isInstalling }));
    });

    const unsubscribeError = serviceWorkerManager.onError((error) => {
      console.error('Service Worker error:', error);
    });

    return () => {
      unsubscribeUpdate();
      unsubscribeInstall();
      unsubscribeError();
    };
  }, []);

  return {
    ...status,
    checkForUpdates: serviceWorkerUtils.checkForUpdates,
    applyUpdate: serviceWorkerUtils.applyUpdate,
    showUpdateNotification: serviceWorkerUtils.showUpdateNotification,
    showUpdateModal: serviceWorkerUtils.showUpdateModal
  };
};

export default serviceWorkerManager;
