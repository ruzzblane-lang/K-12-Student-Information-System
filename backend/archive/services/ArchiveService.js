/**
 * Archive Service
 * 
 * Manages digital archives, file storage, metadata, and archive operations
 * with multi-tenant support and comprehensive access control.
 */

const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

class ArchiveService {
  constructor(db, config) {
    this.db = db;
    this.config = config;
    
    // Archive types
    this.archiveTypes = {
      MEDIA: 'media',
      DOCUMENTS: 'documents',
      RECORDS: 'records',
      PHOTOS: 'photos',
      VIDEOS: 'videos',
      AUDIO: 'audio',
      PRESENTATIONS: 'presentations',
      SPREADSHEETS: 'spreadsheets'
    };
    
    // Access levels
    this.accessLevels = {
      PUBLIC: 'public',
      PRIVATE: 'private',
      RESTRICTED: 'restricted',
      CONFIDENTIAL: 'confidential'
    };
    
    // Item types
    this.itemTypes = {
      IMAGE: 'image',
      VIDEO: 'video',
      AUDIO: 'audio',
      DOCUMENT: 'document',
      PRESENTATION: 'presentation',
      SPREADSHEET: 'spreadsheet',
      ARCHIVE: 'archive',
      OTHER: 'other'
    };
  }

  /**
   * Initialize the archive service
   */
  async initialize() {
    try {
      console.log('Archive Service initialized');
    } catch (error) {
      console.error('Failed to initialize Archive Service:', error);
      throw error;
    }
  }

  /**
   * Create a new archive
   * @param {Object} archiveData - Archive data
   * @returns {Object} Created archive
   */
  async createArchive(archiveData) {
    try {
      const archiveId = uuidv4();
      const archive = {
        id: archiveId,
        tenantId: archiveData.tenantId,
        name: archiveData.name,
        description: archiveData.description || '',
        archiveType: archiveData.archiveType || this.archiveTypes.MEDIA,
        storageConfig: archiveData.storageConfig || {},
        accessConfig: archiveData.accessConfig || {},
        retentionPolicy: archiveData.retentionPolicy || {},
        isActive: true,
        createdBy: archiveData.createdBy,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Validate archive data
      this.validateArchiveData(archive);

      // Create storage directory
      await this.createArchiveStorageDirectory(archiveId);

      // Store in database
      await this.storeArchive(archive);

      // Log archive creation
      await this.logArchiveEvent('archive_created', archiveId, archiveData.createdBy, {
        archiveName: archive.name,
        archiveType: archive.archiveType
      });

      return archive;

    } catch (error) {
      console.error('Failed to create archive:', error);
      throw error;
    }
  }

  /**
   * Get archive by ID
   * @param {string} archiveId - Archive ID
   * @param {string} tenantId - Tenant ID
   * @returns {Object} Archive data
   */
  async getArchive(archiveId, tenantId) {
    try {
      const query = `
        SELECT * FROM digital_archives 
        WHERE id = $1 AND tenant_id = $2 AND is_active = true
      `;

      const result = await this.db.query(query, [archiveId, tenantId]);
      
      if (result.rows.length === 0) {
        throw new Error('Archive not found');
      }

      return result.rows[0];

    } catch (error) {
      console.error('Failed to get archive:', error);
      throw error;
    }
  }

  /**
   * Get archives for tenant
   * @param {string} tenantId - Tenant ID
   * @param {Object} filters - Filter options
   * @returns {Array} List of archives
   */
  async getArchives(tenantId, filters = {}) {
    try {
      let query = `
        SELECT * FROM digital_archives 
        WHERE tenant_id = $1 AND is_active = true
      `;
      const params = [tenantId];
      let paramIndex = 2;

      // Apply filters
      if (filters.archiveType) {
        query += ` AND archive_type = $${paramIndex}`;
        params.push(filters.archiveType);
        paramIndex++;
      }

      if (filters.search) {
        query += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
        params.push(`%${filters.search}%`);
        paramIndex++;
      }

      // Add ordering and pagination
      query += ` ORDER BY created_at DESC`;
      
      if (filters.limit) {
        query += ` LIMIT $${paramIndex}`;
        params.push(filters.limit);
        paramIndex++;
      }

      if (filters.offset) {
        query += ` OFFSET $${paramIndex}`;
        params.push(filters.offset);
      }

      const result = await this.db.query(query, params);
      return result.rows;

    } catch (error) {
      console.error('Failed to get archives:', error);
      throw error;
    }
  }

  /**
   * Update archive
   * @param {string} archiveId - Archive ID
   * @param {string} tenantId - Tenant ID
   * @param {Object} updateData - Update data
   * @param {string} updatedBy - User ID who updated
   * @returns {Object} Updated archive
   */
  async updateArchive(archiveId, tenantId, updateData, updatedBy) {
    try {
      // Get current archive
      const currentArchive = await this.getArchive(archiveId, tenantId);

      // Prepare update data
      const allowedFields = ['name', 'description', 'accessConfig', 'retentionPolicy', 'isActive'];
      const updateFields = [];
      const params = [];
      let paramIndex = 1;

      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          updateFields.push(`${field} = $${paramIndex}`);
          params.push(updateData[field]);
          paramIndex++;
        }
      }

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      // Add updated_at and updated_by
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      updateFields.push(`updated_by = $${paramIndex}`);
      params.push(updatedBy);
      paramIndex++;

      // Add WHERE clause parameters
      params.push(archiveId, tenantId);

      const query = `
        UPDATE digital_archives 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await this.db.query(query, params);
      
      if (result.rows.length === 0) {
        throw new Error('Archive not found or update failed');
      }

      const updatedArchive = result.rows[0];

      // Log archive update
      await this.logArchiveEvent('archive_updated', archiveId, updatedBy, {
        changes: updateData,
        previousValues: currentArchive
      });

      return updatedArchive;

    } catch (error) {
      console.error('Failed to update archive:', error);
      throw error;
    }
  }

  /**
   * Delete archive
   * @param {string} archiveId - Archive ID
   * @param {string} tenantId - Tenant ID
   * @param {string} deletedBy - User ID who deleted
   * @param {boolean} force - Force delete (permanent)
   * @returns {Object} Deletion result
   */
  async deleteArchive(archiveId, tenantId, deletedBy, force = false) {
    try {
      // Get archive
      const archive = await this.getArchive(archiveId, tenantId);

      if (force) {
        // Permanent deletion
        // Delete all archive items first
        await this.deleteArchiveItems(archiveId, tenantId, deletedBy, true);
        
        // Delete archive directory
        await this.deleteArchiveStorageDirectory(archiveId);
        
        // Delete from database
        const query = `DELETE FROM digital_archives WHERE id = $1 AND tenant_id = $2`;
        await this.db.query(query, [archiveId, tenantId]);
        
        // Log permanent deletion
        await this.logArchiveEvent('archive_deleted_permanent', archiveId, deletedBy, {
          archiveName: archive.name
        });
        
      } else {
        // Soft deletion
        const query = `
          UPDATE digital_archives 
          SET is_active = false, updated_at = CURRENT_TIMESTAMP, updated_by = $1
          WHERE id = $2 AND tenant_id = $3
        `;
        
        await this.db.query(query, [deletedBy, archiveId, tenantId]);
        
        // Log soft deletion
        await this.logArchiveEvent('archive_deleted_soft', archiveId, deletedBy, {
          archiveName: archive.name
        });
      }

      return {
        success: true,
        archiveId,
        deleted: force ? 'permanent' : 'soft'
      };

    } catch (error) {
      console.error('Failed to delete archive:', error);
      throw error;
    }
  }

  /**
   * Upload file to archive
   * @param {string} archiveId - Archive ID
   * @param {string} tenantId - Tenant ID
   * @param {Object} fileData - File data
   * @param {string} uploadedBy - User ID who uploaded
   * @returns {Object} Upload result
   */
  async uploadFile(archiveId, tenantId, fileData, uploadedBy) {
    try {
      // Validate archive exists
      await this.getArchive(archiveId, tenantId);

      // Generate file ID and path
      const fileId = uuidv4();
      const fileExtension = path.extname(fileData.originalname);
      const fileName = `${fileId}${fileExtension}`;
      const filePath = path.join(this.config.storagePath, 'uploads', fileName);

      // Validate file
      await this.validateFile(fileData);

      // Save file to storage
      await fs.writeFile(filePath, fileData.buffer);

      // Determine item type
      const itemType = this.determineItemType(fileData.mimetype);

      // Create archive item record
      const archiveItem = {
        id: fileId,
        tenantId,
        archiveId,
        itemName: fileData.originalname,
        itemType,
        filePath,
        fileSize: fileData.size,
        mimeType: fileData.mimetype,
        metadata: {
          originalName: fileData.originalname,
          uploadedAt: new Date().toISOString(),
          uploadedBy
        },
        tags: [],
        isPublic: false,
        accessLevel: this.accessLevels.PRIVATE,
        uploadedBy,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Store in database
      await this.storeArchiveItem(archiveItem);

      // Generate thumbnails if applicable
      if (this.isImageFile(fileData.mimetype)) {
        await this.generateThumbnails(fileId, filePath);
      }

      // Log file upload
      await this.logArchiveEvent('file_uploaded', archiveId, uploadedBy, {
        fileId,
        fileName: fileData.originalname,
        fileSize: fileData.size,
        itemType
      });

      return {
        success: true,
        fileId,
        fileName: fileData.originalname,
        itemType,
        fileSize: fileData.size
      };

    } catch (error) {
      console.error('Failed to upload file:', error);
      throw error;
    }
  }

  /**
   * Get archive items
   * @param {string} archiveId - Archive ID
   * @param {string} tenantId - Tenant ID
   * @param {Object} filters - Filter options
   * @returns {Array} List of archive items
   */
  async getArchiveItems(archiveId, tenantId, filters = {}) {
    try {
      let query = `
        SELECT * FROM archive_items 
        WHERE archive_id = $1 AND tenant_id = $2
      `;
      const params = [archiveId, tenantId];
      let paramIndex = 3;

      // Apply filters
      if (filters.itemType) {
        query += ` AND item_type = $${paramIndex}`;
        params.push(filters.itemType);
        paramIndex++;
      }

      if (filters.isPublic !== undefined) {
        query += ` AND is_public = $${paramIndex}`;
        params.push(filters.isPublic);
        paramIndex++;
      }

      if (filters.accessLevel) {
        query += ` AND access_level = $${paramIndex}`;
        params.push(filters.accessLevel);
        paramIndex++;
      }

      if (filters.search) {
        query += ` AND (item_name ILIKE $${paramIndex} OR $${paramIndex} = ANY(tags))`;
        params.push(`%${filters.search}%`);
        paramIndex++;
      }

      if (filters.tags && filters.tags.length > 0) {
        query += ` AND tags && $${paramIndex}`;
        params.push(filters.tags);
        paramIndex++;
      }

      // Add ordering and pagination
      query += ` ORDER BY created_at DESC`;
      
      if (filters.limit) {
        query += ` LIMIT $${paramIndex}`;
        params.push(filters.limit);
        paramIndex++;
      }

      if (filters.offset) {
        query += ` OFFSET $${paramIndex}`;
        params.push(filters.offset);
      }

      const result = await this.db.query(query, params);
      return result.rows;

    } catch (error) {
      console.error('Failed to get archive items:', error);
      throw error;
    }
  }

  /**
   * Get archive item by ID
   * @param {string} itemId - Item ID
   * @param {string} tenantId - Tenant ID
   * @returns {Object} Archive item
   */
  async getArchiveItem(itemId, tenantId) {
    try {
      const query = `
        SELECT ai.*, da.name as archive_name, da.archive_type
        FROM archive_items ai
        JOIN digital_archives da ON ai.archive_id = da.id
        WHERE ai.id = $1 AND ai.tenant_id = $2
      `;

      const result = await this.db.query(query, [itemId, tenantId]);
      
      if (result.rows.length === 0) {
        throw new Error('Archive item not found');
      }

      return result.rows[0];

    } catch (error) {
      console.error('Failed to get archive item:', error);
      throw error;
    }
  }

  /**
   * Update archive item
   * @param {string} itemId - Item ID
   * @param {string} tenantId - Tenant ID
   * @param {Object} updateData - Update data
   * @param {string} updatedBy - User ID who updated
   * @returns {Object} Updated archive item
   */
  async updateArchiveItem(itemId, tenantId, updateData, updatedBy) {
    try {
      // Get current item
      const currentItem = await this.getArchiveItem(itemId, tenantId);

      // Prepare update data
      const allowedFields = ['itemName', 'metadata', 'tags', 'isPublic', 'accessLevel'];
      const updateFields = [];
      const params = [];
      let paramIndex = 1;

      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          updateFields.push(`${field} = $${paramIndex}`);
          params.push(updateData[field]);
          paramIndex++;
        }
      }

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      // Add updated_at
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      
      // Add WHERE clause parameters
      params.push(itemId, tenantId);

      const query = `
        UPDATE archive_items 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await this.db.query(query, params);
      
      if (result.rows.length === 0) {
        throw new Error('Archive item not found or update failed');
      }

      const updatedItem = result.rows[0];

      // Log item update
      await this.logArchiveEvent('item_updated', currentItem.archive_id, updatedBy, {
        itemId,
        changes: updateData,
        previousValues: currentItem
      });

      return updatedItem;

    } catch (error) {
      console.error('Failed to update archive item:', error);
      throw error;
    }
  }

  /**
   * Delete archive item
   * @param {string} itemId - Item ID
   * @param {string} tenantId - Tenant ID
   * @param {string} deletedBy - User ID who deleted
   * @param {boolean} force - Force delete (permanent)
   * @returns {Object} Deletion result
   */
  async deleteArchiveItem(itemId, tenantId, deletedBy, force = false) {
    try {
      // Get item
      const item = await this.getArchiveItem(itemId, tenantId);

      if (force) {
        // Delete file from storage
        try {
          await fs.unlink(item.file_path);
        } catch (error) {
          console.warn('Failed to delete file from storage:', error);
        }

        // Delete thumbnails
        await this.deleteThumbnails(itemId);

        // Delete from database
        const query = `DELETE FROM archive_items WHERE id = $1 AND tenant_id = $2`;
        await this.db.query(query, [itemId, tenantId]);
        
        // Log permanent deletion
        await this.logArchiveEvent('item_deleted_permanent', item.archive_id, deletedBy, {
          itemId,
          itemName: item.item_name
        });
        
      } else {
        // Soft deletion - mark as deleted in metadata
        const query = `
          UPDATE archive_items 
          SET metadata = metadata || '{"deleted": true, "deletedAt": $1, "deletedBy": $2}'::jsonb,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $3 AND tenant_id = $4
        `;
        
        await this.db.query(query, [
          new Date().toISOString(),
          deletedBy,
          itemId,
          tenantId
        ]);
        
        // Log soft deletion
        await this.logArchiveEvent('item_deleted_soft', item.archive_id, deletedBy, {
          itemId,
          itemName: item.item_name
        });
      }

      return {
        success: true,
        itemId,
        deleted: force ? 'permanent' : 'soft'
      };

    } catch (error) {
      console.error('Failed to delete archive item:', error);
      throw error;
    }
  }

  /**
   * Get system statistics
   * @param {string} tenantId - Tenant ID (optional)
   * @returns {Object} Statistics
   */
  async getStatistics(tenantId) {
    try {
      const whereClause = tenantId ? 'WHERE tenant_id = $1' : '';
      const params = tenantId ? [tenantId] : [];

      // Archive statistics
      const archiveQuery = `
        SELECT 
          COUNT(*) as total_archives,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_archives,
          COUNT(DISTINCT archive_type) as archive_types
        FROM digital_archives 
        ${whereClause}
      `;

      const archiveResult = await this.db.query(archiveQuery, params);
      const archiveStats = archiveResult.rows[0];

      // Item statistics
      const itemQuery = `
        SELECT 
          COUNT(*) as total_items,
          COUNT(CASE WHEN is_public = true THEN 1 END) as public_items,
          COUNT(DISTINCT item_type) as item_types,
          SUM(file_size) as total_size
        FROM archive_items ai
        JOIN digital_archives da ON ai.archive_id = da.id
        ${whereClause}
      `;

      const itemResult = await this.db.query(itemQuery, params);
      const itemStats = itemResult.rows[0];

      return {
        archives: {
          total: parseInt(archiveStats.total_archives),
          active: parseInt(archiveStats.active_archives),
          types: parseInt(archiveStats.archive_types)
        },
        items: {
          total: parseInt(itemStats.total_items),
          public: parseInt(itemStats.public_items),
          types: parseInt(itemStats.item_types),
          totalSize: parseInt(itemStats.total_size) || 0
        },
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      console.error('Failed to get archive statistics:', error);
      return {
        archives: { total: 0, active: 0, types: 0 },
        items: { total: 0, public: 0, types: 0, totalSize: 0 },
        lastUpdated: new Date().toISOString(),
        error: error.message
      };
    }
  }

  /**
   * Get system health status
   * @returns {Object} Health status
   */
  async getHealthStatus() {
    try {
      // Check database connectivity
      await this.db.query('SELECT 1');
      
      // Check storage accessibility
      await fs.access(this.config.storagePath);
      
      return {
        status: 'healthy',
        database: 'connected',
        storage: 'accessible',
        lastChecked: new Date().toISOString()
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        database: 'unknown',
        storage: 'unknown',
        error: error.message,
        lastChecked: new Date().toISOString()
      };
    }
  }

  /**
   * Shutdown the archive service
   */
  async shutdown() {
    try {
      console.log('Archive Service shutdown complete');
    } catch (error) {
      console.error('Error during Archive Service shutdown:', error);
    }
  }

  // Helper methods
  validateArchiveData(archive) {
    if (!archive.name || archive.name.trim().length === 0) {
      throw new Error('Archive name is required');
    }
    
    if (!archive.tenantId) {
      throw new Error('Tenant ID is required');
    }
    
    if (!archive.createdBy) {
      throw new Error('Created by user ID is required');
    }
    
    if (!Object.values(this.archiveTypes).includes(archive.archiveType)) {
      throw new Error('Invalid archive type');
    }
  }

  async createArchiveStorageDirectory(archiveId) {
    const archiveDir = path.join(this.config.storagePath, 'archives', archiveId);
    await fs.mkdir(archiveDir, { recursive: true });
  }

  async deleteArchiveStorageDirectory(archiveId) {
    const archiveDir = path.join(this.config.storagePath, 'archives', archiveId);
    try {
      await fs.rmdir(archiveDir, { recursive: true });
    } catch (error) {
      console.warn('Failed to delete archive directory:', error);
    }
  }

  async storeArchive(archive) {
    const query = `
      INSERT INTO digital_archives (
        id, tenant_id, name, description, archive_type, storage_config,
        access_config, retention_policy, is_active, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `;

    await this.db.query(query, [
      archive.id,
      archive.tenantId,
      archive.name,
      archive.description,
      archive.archiveType,
      JSON.stringify(archive.storageConfig),
      JSON.stringify(archive.accessConfig),
      JSON.stringify(archive.retentionPolicy),
      archive.isActive,
      archive.createdBy,
      archive.createdAt,
      archive.updatedAt
    ]);
  }

  async storeArchiveItem(item) {
    const query = `
      INSERT INTO archive_items (
        id, tenant_id, archive_id, item_name, item_type, file_path,
        file_size, mime_type, metadata, tags, is_public, access_level,
        uploaded_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    `;

    await this.db.query(query, [
      item.id,
      item.tenantId,
      item.archiveId,
      item.itemName,
      item.itemType,
      item.filePath,
      item.fileSize,
      item.mimeType,
      JSON.stringify(item.metadata),
      item.tags,
      item.isPublic,
      item.accessLevel,
      item.uploadedBy,
      item.createdAt,
      item.updatedAt
    ]);
  }

  async validateFile(fileData) {
    // Check file size
    if (fileData.size > this.config.maxFileSize) {
      throw new Error(`File size exceeds maximum allowed size of ${this.config.maxFileSize} bytes`);
    }

    // Check MIME type
    if (!this.config.allowedMimeTypes.includes(fileData.mimetype)) {
      throw new Error(`File type ${fileData.mimetype} is not allowed`);
    }

    // Additional validation can be added here (virus scanning, etc.)
  }

  determineItemType(mimeType) {
    if (mimeType.startsWith('image/')) return this.itemTypes.IMAGE;
    if (mimeType.startsWith('video/')) return this.itemTypes.VIDEO;
    if (mimeType.startsWith('audio/')) return this.itemTypes.AUDIO;
    if (mimeType.includes('pdf') || mimeType.includes('document')) return this.itemTypes.DOCUMENT;
    if (mimeType.includes('presentation')) return this.itemTypes.PRESENTATION;
    if (mimeType.includes('spreadsheet')) return this.itemTypes.SPREADSHEET;
    if (mimeType.includes('zip') || mimeType.includes('archive')) return this.itemTypes.ARCHIVE;
    return this.itemTypes.OTHER;
  }

  isImageFile(mimeType) {
    return mimeType.startsWith('image/');
  }

  async generateThumbnails(fileId, filePath) {
    // This would integrate with an image processing library
    // For now, we'll just log that thumbnails should be generated
    console.log(`Generating thumbnails for file: ${fileId}`);
  }

  async deleteThumbnails(fileId) {
    // Delete thumbnail files
    console.log(`Deleting thumbnails for file: ${fileId}`);
  }

  async deleteArchiveItems(archiveId, tenantId, deletedBy, force) {
    const query = `
      SELECT id FROM archive_items 
      WHERE archive_id = $1 AND tenant_id = $2
    `;

    const result = await this.db.query(query, [archiveId, tenantId]);
    
    for (const row of result.rows) {
      await this.deleteArchiveItem(row.id, tenantId, deletedBy, force);
    }
  }

  async logArchiveEvent(eventType, archiveId, userId, eventData) {
    try {
      const query = `
        INSERT INTO archive_access_logs (
          id, tenant_id, archive_id, user_id, access_type, access_granted, access_reason, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      `;

      await this.db.query(query, [
        uuidv4(),
        eventData.tenantId || null,
        archiveId,
        userId,
        eventType,
        true,
        JSON.stringify(eventData)
      ]);
    } catch (error) {
      console.error('Failed to log archive event:', error);
    }
  }
}

module.exports = ArchiveService;
