const AWS = require('aws-sdk');
const { BlobServiceClient } = require('@azure/storage-blob');
const { Storage } = require('@google-cloud/storage');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const EncryptionService = require('../../security/services/EncryptionService');

/**
 * ObjectStorageService - Secure object storage with encryption at rest and in transit
 * Supports multiple cloud providers with tenant-specific storage and encryption
 */
class ObjectStorageService {
  constructor(config) {
    this.config = config;
    this.encryptionService = new EncryptionService(config);
    this.provider = config.storage.provider || 'local';
    this.encryptionEnabled = config.storage.encryption !== false;
    
    // Initialize storage clients
    this.initializeStorageClients();
    
    console.log(`ObjectStorageService initialized with ${this.provider} provider`);
  }

  /**
   * Initialize storage clients based on provider
   */
  initializeStorageClients() {
    switch (this.provider) {
      case 'aws_s3':
        this.s3Client = new AWS.S3({
          accessKeyId: this.config.storage.aws.accessKeyId,
          secretAccessKey: this.config.storage.aws.secretAccessKey,
          region: this.config.storage.aws.region,
          s3ForcePathStyle: this.config.storage.aws.forcePathStyle || false
        });
        break;
        
      case 'azure_blob':
        this.blobServiceClient = new BlobServiceClient(
          this.config.storage.azure.connectionString
        );
        break;
        
      case 'google_cloud':
        this.storageClient = new Storage({
          projectId: this.config.storage.google.projectId,
          keyFilename: this.config.storage.google.keyFilename
        });
        break;
        
      case 'local':
        this.localStoragePath = this.config.storage.local.path || './storage';
        this.ensureLocalStorageDirectory();
        break;
        
      default:
        throw new Error(`Unsupported storage provider: ${this.provider}`);
    }
  }

  /**
   * Ensure local storage directory exists
   */
  ensureLocalStorageDirectory() {
    if (!fs.existsSync(this.localStoragePath)) {
      fs.mkdirSync(this.localStoragePath, { recursive: true });
    }
  }

  /**
   * Upload file to storage with encryption
   */
  async uploadFile(fileData, options = {}) {
    try {
      const {
        filename,
        mimeType,
        tenantId,
        category,
        academicYear,
        encryptionKeyId = 'default'
      } = options;

      // Generate storage path
      const storagePath = this.generateStoragePath(tenantId, category, academicYear, filename);
      
      // Encrypt file data if encryption is enabled
      let processedData = fileData;
      let encryptionMetadata = null;
      
      if (this.encryptionEnabled) {
        const encryptionResult = this.encryptionService.encrypt(fileData, encryptionKeyId);
        if (encryptionResult.success) {
          processedData = Buffer.from(encryptionResult.encryptedData, 'base64');
          encryptionMetadata = {
            encrypted: true,
            keyId: encryptionResult.keyId,
            algorithm: 'AES-256-GCM'
          };
        } else {
          throw new Error(`Encryption failed: ${encryptionResult.error}`);
        }
      }

      // Upload to storage provider
      const uploadResult = await this.uploadToProvider(processedData, storagePath, {
        mimeType,
        encryptionMetadata,
        ...options
      });

      return {
        success: true,
        storagePath: storagePath,
        provider: this.provider,
        bucketName: uploadResult.bucketName,
        objectKey: uploadResult.objectKey,
        fileSize: processedData.length,
        encrypted: this.encryptionEnabled,
        encryptionKeyId: encryptionKeyId,
        uploadMetadata: uploadResult.metadata
      };
    } catch (error) {
      console.error('File upload failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Download file from storage with decryption
   */
  async downloadFile(storagePath, options = {}) {
    try {
      const {
        bucketName,
        objectKey,
        encryptionKeyId = 'default'
      } = options;

      // Download from storage provider
      const downloadResult = await this.downloadFromProvider(storagePath, {
        bucketName,
        objectKey,
        ...options
      });

      if (!downloadResult.success) {
        return downloadResult;
      }

      let fileData = downloadResult.data;
      let encryptionMetadata = downloadResult.encryptionMetadata;

      // Decrypt file data if it was encrypted
      if (encryptionMetadata && encryptionMetadata.encrypted) {
        const decryptionResult = this.encryptionService.decrypt(
          fileData.toString('base64'),
          encryptionMetadata.keyId || encryptionKeyId
        );
        
        if (decryptionResult.success) {
          fileData = Buffer.from(decryptionResult.data, 'base64');
        } else {
          throw new Error(`Decryption failed: ${decryptionResult.error}`);
        }
      }

      return {
        success: true,
        data: fileData,
        mimeType: downloadResult.mimeType,
        fileSize: fileData.length,
        metadata: downloadResult.metadata
      };
    } catch (error) {
      console.error('File download failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete file from storage
   */
  async deleteFile(storagePath, options = {}) {
    try {
      const { bucketName, objectKey } = options;

      const deleteResult = await this.deleteFromProvider(storagePath, {
        bucketName,
        objectKey,
        ...options
      });

      return deleteResult;
    } catch (error) {
      console.error('File deletion failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate secure storage path
   */
  generateStoragePath(tenantId, category, academicYear, filename) {
    const timestamp = Date.now();
    const randomId = crypto.randomBytes(8).toString('hex');
    const sanitizedFilename = this.sanitizeFilename(filename);
    
    return `archive/${tenantId}/${academicYear}/${category}/${timestamp}_${randomId}_${sanitizedFilename}`;
  }

  /**
   * Sanitize filename for storage
   */
  sanitizeFilename(filename) {
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .toLowerCase();
  }

  /**
   * Upload to specific provider
   */
  async uploadToProvider(data, storagePath, options) {
    switch (this.provider) {
      case 'aws_s3':
        return await this.uploadToS3(data, storagePath, options);
      case 'azure_blob':
        return await this.uploadToAzure(data, storagePath, options);
      case 'google_cloud':
        return await this.uploadToGoogleCloud(data, storagePath, options);
      case 'local':
        return await this.uploadToLocal(data, storagePath, options);
      default:
        throw new Error(`Upload not implemented for provider: ${this.provider}`);
    }
  }

  /**
   * Upload to AWS S3
   */
  async uploadToS3(data, storagePath, options) {
    const bucketName = this.config.storage.aws.bucketName;
    const params = {
      Bucket: bucketName,
      Key: storagePath,
      Body: data,
      ContentType: options.mimeType,
      ServerSideEncryption: 'AES256',
      Metadata: {
        'encryption-metadata': JSON.stringify(options.encryptionMetadata || {}),
        'upload-timestamp': Date.now().toString(),
        'tenant-id': options.tenantId || 'default'
      }
    };

    const result = await this.s3Client.upload(params).promise();
    
    return {
      success: true,
      bucketName: bucketName,
      objectKey: storagePath,
      metadata: {
        etag: result.ETag,
        location: result.Location
      }
    };
  }

  /**
   * Upload to Azure Blob Storage
   */
  async uploadToAzure(data, storagePath, options) {
    const containerName = this.config.storage.azure.containerName;
    const containerClient = this.blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(storagePath);

    const uploadOptions = {
      blobHTTPHeaders: {
        blobContentType: options.mimeType
      },
      metadata: {
        'encryption-metadata': JSON.stringify(options.encryptionMetadata || {}),
        'upload-timestamp': Date.now().toString(),
        'tenant-id': options.tenantId || 'default'
      }
    };

    await blockBlobClient.upload(data, data.length, uploadOptions);
    
    return {
      success: true,
      bucketName: containerName,
      objectKey: storagePath,
      metadata: {
        url: blockBlobClient.url
      }
    };
  }

  /**
   * Upload to Google Cloud Storage
   */
  async uploadToGoogleCloud(data, storagePath, options) {
    const bucketName = this.config.storage.google.bucketName;
    const bucket = this.storageClient.bucket(bucketName);
    const file = bucket.file(storagePath);

    const uploadOptions = {
      metadata: {
        contentType: options.mimeType,
        metadata: {
          'encryption-metadata': JSON.stringify(options.encryptionMetadata || {}),
          'upload-timestamp': Date.now().toString(),
          'tenant-id': options.tenantId || 'default'
        }
      }
    };

    await file.save(data, uploadOptions);
    
    return {
      success: true,
      bucketName: bucketName,
      objectKey: storagePath,
      metadata: {
        name: file.name
      }
    };
  }

  /**
   * Upload to local storage
   */
  async uploadToLocal(data, storagePath, options) {
    const fullPath = path.join(this.localStoragePath, storagePath);
    const directory = path.dirname(fullPath);
    
    // Ensure directory exists
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
    
    // Write file
    fs.writeFileSync(fullPath, data);
    
    // Set restrictive permissions
    fs.chmodSync(fullPath, 0o600);
    
    return {
      success: true,
      bucketName: 'local',
      objectKey: storagePath,
      metadata: {
        localPath: fullPath
      }
    };
  }

  /**
   * Download from specific provider
   */
  async downloadFromProvider(storagePath, options) {
    switch (this.provider) {
      case 'aws_s3':
        return await this.downloadFromS3(storagePath, options);
      case 'azure_blob':
        return await this.downloadFromAzure(storagePath, options);
      case 'google_cloud':
        return await this.downloadFromGoogleCloud(storagePath, options);
      case 'local':
        return await this.downloadFromLocal(storagePath, options);
      default:
        throw new Error(`Download not implemented for provider: ${this.provider}`);
    }
  }

  /**
   * Download from AWS S3
   */
  async downloadFromS3(storagePath, options) {
    const bucketName = options.bucketName || this.config.storage.aws.bucketName;
    const params = {
      Bucket: bucketName,
      Key: options.objectKey || storagePath
    };

    const result = await this.s3Client.getObject(params).promise();
    
    return {
      success: true,
      data: result.Body,
      mimeType: result.ContentType,
      metadata: result.Metadata,
      encryptionMetadata: result.Metadata['encryption-metadata'] ? 
        JSON.parse(result.Metadata['encryption-metadata']) : null
    };
  }

  /**
   * Download from Azure Blob Storage
   */
  async downloadFromAzure(storagePath, options) {
    const containerName = options.bucketName || this.config.storage.azure.containerName;
    const containerClient = this.blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(options.objectKey || storagePath);

    const downloadResult = await blockBlobClient.download();
    const data = await this.streamToBuffer(downloadResult.readableStreamBody);
    
    return {
      success: true,
      data: data,
      mimeType: downloadResult.contentType,
      metadata: downloadResult.metadata,
      encryptionMetadata: downloadResult.metadata['encryption-metadata'] ? 
        JSON.parse(downloadResult.metadata['encryption-metadata']) : null
    };
  }

  /**
   * Download from Google Cloud Storage
   */
  async downloadFromGoogleCloud(storagePath, options) {
    const bucketName = options.bucketName || this.config.storage.google.bucketName;
    const bucket = this.storageClient.bucket(bucketName);
    const file = bucket.file(options.objectKey || storagePath);

    const [data] = await file.download();
    const [metadata] = await file.getMetadata();
    
    return {
      success: true,
      data: data,
      mimeType: metadata.contentType,
      metadata: metadata.metadata,
      encryptionMetadata: metadata.metadata['encryption-metadata'] ? 
        JSON.parse(metadata.metadata['encryption-metadata']) : null
    };
  }

  /**
   * Download from local storage
   */
  async downloadFromLocal(storagePath, options) {
    const fullPath = path.join(this.localStoragePath, options.objectKey || storagePath);
    
    if (!fs.existsSync(fullPath)) {
      return {
        success: false,
        error: 'File not found'
      };
    }
    
    const data = fs.readFileSync(fullPath);
    const stats = fs.statSync(fullPath);
    
    return {
      success: true,
      data: data,
      mimeType: this.getMimeTypeFromExtension(path.extname(fullPath)),
      metadata: {
        size: stats.size,
        mtime: stats.mtime
      },
      encryptionMetadata: null // Local files are encrypted at application level
    };
  }

  /**
   * Delete from specific provider
   */
  async deleteFromProvider(storagePath, options) {
    switch (this.provider) {
      case 'aws_s3':
        return await this.deleteFromS3(storagePath, options);
      case 'azure_blob':
        return await this.deleteFromAzure(storagePath, options);
      case 'google_cloud':
        return await this.deleteFromGoogleCloud(storagePath, options);
      case 'local':
        return await this.deleteFromLocal(storagePath, options);
      default:
        throw new Error(`Delete not implemented for provider: ${this.provider}`);
    }
  }

  /**
   * Delete from AWS S3
   */
  async deleteFromS3(storagePath, options) {
    const bucketName = options.bucketName || this.config.storage.aws.bucketName;
    const params = {
      Bucket: bucketName,
      Key: options.objectKey || storagePath
    };

    await this.s3Client.deleteObject(params).promise();
    
    return { success: true };
  }

  /**
   * Delete from Azure Blob Storage
   */
  async deleteFromAzure(storagePath, options) {
    const containerName = options.bucketName || this.config.storage.azure.containerName;
    const containerClient = this.blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(options.objectKey || storagePath);

    await blockBlobClient.delete();
    
    return { success: true };
  }

  /**
   * Delete from Google Cloud Storage
   */
  async deleteFromGoogleCloud(storagePath, options) {
    const bucketName = options.bucketName || this.config.storage.google.bucketName;
    const bucket = this.storageClient.bucket(bucketName);
    const file = bucket.file(options.objectKey || storagePath);

    await file.delete();
    
    return { success: true };
  }

  /**
   * Delete from local storage
   */
  async deleteFromLocal(storagePath, options) {
    const fullPath = path.join(this.localStoragePath, options.objectKey || storagePath);
    
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
    
    return { success: true };
  }

  /**
   * Convert stream to buffer
   */
  async streamToBuffer(readableStream) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      readableStream.on('data', (data) => chunks.push(data));
      readableStream.on('error', reject);
      readableStream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  /**
   * Get MIME type from file extension
   */
  getMimeTypeFromExtension(extension) {
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.doc': 'application/msword',
      '.epub': 'application/epub+zip',
      '.mp4': 'video/mp4',
      '.mp3': 'audio/mpeg',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };
    
    return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
  }

  /**
   * Get storage statistics
   */
  async getStorageStatistics(tenantId) {
    try {
      // This would typically query the storage provider for statistics
      // For now, return basic information
      return {
        success: true,
        provider: this.provider,
        encryptionEnabled: this.encryptionEnabled,
        tenantId: tenantId
      };
    } catch (error) {
      console.error('Failed to get storage statistics:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = ObjectStorageService;
