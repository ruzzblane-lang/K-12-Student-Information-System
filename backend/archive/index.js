/**
 * School Digital Archive and Media Sharing Module
 * 
 * Provides secure object storage, media sharing, and digital archive
 * management for educational institutions with multi-tenant support.
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

// Import services
const ArchiveService = require('./services/ArchiveService');
const MediaProcessingService = require('./services/MediaProcessingService');
const AccessControlService = require('./services/AccessControlService');
const StorageService = require('./services/StorageService');
const SearchService = require('./services/SearchService');

// Import controllers
const ArchiveController = require('./controllers/ArchiveController');
const MediaController = require('./controllers/MediaController');
const AccessController = require('./controllers/AccessController');

// Import middleware
const authMiddleware = require('./middleware/auth');
const tenantMiddleware = require('./middleware/tenant');
const rateLimitMiddleware = require('./middleware/rateLimit');
const validationMiddleware = require('./middleware/validation');

class DigitalArchiveModule {
  constructor(db, config = {}) {
    this.db = db;
    this.config = {
      storagePath: config.storagePath || './storage/archives',
      maxFileSize: config.maxFileSize || 100 * 1024 * 1024, // 100MB
      allowedMimeTypes: config.allowedMimeTypes || [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/webm', 'video/quicktime',
        'audio/mpeg', 'audio/wav', 'audio/ogg',
        'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain', 'text/csv', 'application/json'
      ],
      thumbnailSizes: config.thumbnailSizes || [150, 300, 600],
      enableVirusScanning: config.enableVirusScanning || false,
      enableWatermarking: config.enableWatermarking || false,
      ...config
    };
    
    this.router = express.Router();
    
    // Initialize services
    this.archiveService = new ArchiveService(db, this.config);
    this.mediaProcessingService = new MediaProcessingService(db, this.config);
    this.accessControlService = new AccessControlService(db, this.config);
    this.storageService = new StorageService(db, this.config);
    this.searchService = new SearchService(db, this.config);
    
    // Initialize controllers
    this.archiveController = new ArchiveController(this.archiveService, this.accessControlService);
    this.mediaController = new MediaController(this.mediaProcessingService, this.storageService);
    this.accessController = new AccessController(this.accessControlService);
    
    // Initialize the module
    this.initialize();
  }

  /**
   * Initialize the digital archive module
   */
  async initialize() {
    try {
      console.log('Initializing School Digital Archive Module...');
      
      // Ensure storage directories exist
      await this.ensureStorageDirectories();
      
      // Initialize services
      await this.archiveService.initialize();
      await this.mediaProcessingService.initialize();
      await this.accessControlService.initialize();
      await this.storageService.initialize();
      await this.searchService.initialize();
      
      // Setup routes
      this.setupRoutes();
      
      // Setup middleware
      this.setupMiddleware();
      
      console.log('School Digital Archive Module initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize Digital Archive Module:', error);
      throw error;
    }
  }

  /**
   * Ensure storage directories exist
   */
  async ensureStorageDirectories() {
    const directories = [
      this.config.storagePath,
      path.join(this.config.storagePath, 'uploads'),
      path.join(this.config.storagePath, 'thumbnails'),
      path.join(this.config.storagePath, 'processed'),
      path.join(this.config.storagePath, 'temp')
    ];

    for (const dir of directories) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        if (error.code !== 'EEXIST') {
          throw error;
        }
      }
    }
  }

  /**
   * Setup routes
   */
  setupRoutes() {
    // Archive management routes
    this.router.use('/archives', this.archiveController.getRouter());
    
    // Media processing routes
    this.router.use('/media', this.mediaController.getRouter());
    
    // Access control routes
    this.router.use('/access', this.accessController.getRouter());
    
    // Health check endpoint
    this.router.get('/health', async (req, res) => {
      try {
        const health = await this.getSystemHealth();
        res.status(200).json(health);
      } catch (error) {
        res.status(500).json({
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    // System statistics endpoint
    this.router.get('/stats', async (req, res) => {
      try {
        const stats = await this.getSystemStatistics(req.tenant?.id);
        res.status(200).json(stats);
      } catch (error) {
        res.status(500).json({
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  /**
   * Setup middleware
   */
  setupMiddleware() {
    // Authentication middleware
    this.router.use(authMiddleware);
    
    // Tenant context middleware
    this.router.use(tenantMiddleware);
    
    // Rate limiting middleware
    this.router.use(rateLimitMiddleware);
    
    // Request validation middleware
    this.router.use(validationMiddleware);
  }

  /**
   * Get system health status
   * @returns {Object} System health
   */
  async getSystemHealth() {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {},
      storage: {},
      features: [
        'secure_upload',
        'media_processing',
        'access_control',
        'search',
        'thumbnails',
        'virus_scanning',
        'watermarking',
        'multi_tenant',
        'audit_trail'
      ]
    };

    try {
      // Check service health
      health.services.archive = await this.archiveService.getHealthStatus();
      health.services.mediaProcessing = await this.mediaProcessingService.getHealthStatus();
      health.services.accessControl = await this.accessControlService.getHealthStatus();
      health.services.storage = await this.storageService.getHealthStatus();
      health.services.search = await this.searchService.getHealthStatus();

      // Check storage health
      health.storage = await this.getStorageHealth();

      // Determine overall health
      const unhealthyServices = Object.values(health.services).filter(s => s.status !== 'healthy').length;
      if (unhealthyServices > 0) {
        health.status = unhealthyServices > 2 ? 'unhealthy' : 'degraded';
      }

    } catch (error) {
      health.status = 'unhealthy';
      health.error = error.message;
    }

    return health;
  }

  /**
   * Get storage health status
   * @returns {Object} Storage health
   */
  async getStorageHealth() {
    try {
      const stats = await fs.stat(this.config.storagePath);
      const totalSize = await this.getDirectorySize(this.config.storagePath);
      
      return {
        status: 'healthy',
        totalSize: totalSize,
        availableSpace: await this.getAvailableSpace(),
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        lastChecked: new Date().toISOString()
      };
    }
  }

  /**
   * Get directory size recursively
   * @param {string} dirPath - Directory path
   * @returns {number} Directory size in bytes
   */
  async getDirectorySize(dirPath) {
    let totalSize = 0;
    
    try {
      const items = await fs.readdir(dirPath);
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stats = await fs.stat(itemPath);
        
        if (stats.isDirectory()) {
          totalSize += await this.getDirectorySize(itemPath);
        } else {
          totalSize += stats.size;
        }
      }
    } catch (error) {
      console.error(`Error calculating directory size for ${dirPath}:`, error);
    }
    
    return totalSize;
  }

  /**
   * Get available disk space
   * @returns {number} Available space in bytes
   */
  async getAvailableSpace() {
    try {
      const stats = await fs.stat(this.config.storagePath);
      // This is a simplified implementation
      // In production, you'd use a proper disk space checking library
      return 1000000000; // 1GB placeholder
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get system statistics
   * @param {string} tenantId - Tenant ID (optional)
   * @returns {Object} System statistics
   */
  async getSystemStatistics(tenantId) {
    try {
      const stats = {
        archives: await this.archiveService.getStatistics(tenantId),
        media: await this.mediaProcessingService.getStatistics(tenantId),
        access: await this.accessControlService.getStatistics(tenantId),
        storage: await this.storageService.getStatistics(tenantId),
        search: await this.searchService.getStatistics(tenantId),
        lastUpdated: new Date().toISOString()
      };

      return stats;

    } catch (error) {
      console.error('Failed to get system statistics:', error);
      return {
        error: error.message,
        lastUpdated: new Date().toISOString()
      };
    }
  }

  /**
   * Get router
   * @returns {express.Router} Express router
   */
  getRouter() {
    return this.router;
  }

  /**
   * Get archive service
   * @returns {ArchiveService} Archive service
   */
  getArchiveService() {
    return this.archiveService;
  }

  /**
   * Get media processing service
   * @returns {MediaProcessingService} Media processing service
   */
  getMediaProcessingService() {
    return this.mediaProcessingService;
  }

  /**
   * Get access control service
   * @returns {AccessControlService} Access control service
   */
  getAccessControlService() {
    return this.accessControlService;
  }

  /**
   * Get storage service
   * @returns {StorageService} Storage service
   */
  getStorageService() {
    return this.storageService;
  }

  /**
   * Get search service
   * @returns {SearchService} Search service
   */
  getSearchService() {
    return this.searchService;
  }

  /**
   * Shutdown the digital archive module
   */
  async shutdown() {
    try {
      console.log('Shutting down Digital Archive Module...');
      
      // Shutdown services
      await this.archiveService.shutdown();
      await this.mediaProcessingService.shutdown();
      await this.accessControlService.shutdown();
      await this.storageService.shutdown();
      await this.searchService.shutdown();
      
      console.log('Digital Archive Module shutdown complete');
      
    } catch (error) {
      console.error('Error during Digital Archive Module shutdown:', error);
    }
  }
}

// Export the DigitalArchiveModule class and individual components
module.exports = {
  DigitalArchiveModule,
  ArchiveService,
  MediaProcessingService,
  AccessControlService,
  StorageService,
  SearchService,
  ArchiveController,
  MediaController,
  AccessController
};
