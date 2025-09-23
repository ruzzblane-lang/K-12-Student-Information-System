const { DataTypes } = require('sequelize');

/**
 * ArchiveContent Model - Represents digital content in the school archive
 * Supports multiple file formats and categories with metadata tagging
 */
const ArchiveContent = (sequelize) => {
  return sequelize.define('ArchiveContent', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    
    // Basic content information
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 255]
      }
    },
    
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    
    // Content categorization
    category: {
      type: DataTypes.ENUM(
        'yearbook', 'newsletter', 'announcement', 'event_photo', 'event_video',
        'award', 'student_project', 'performance', 'document', 'presentation',
        'audio', 'image', 'video', 'other'
      ),
      allowNull: false,
      defaultValue: 'other'
    },
    
    subcategory: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    
    // File information
    filename: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    
    originalFilename: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    
    fileExtension: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    
    mimeType: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    
    fileSize: {
      type: DataTypes.BIGINT,
      allowNull: false,
      validate: {
        min: 0
      }
    },
    
    // Storage information
    storagePath: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    
    storageProvider: {
      type: DataTypes.ENUM('aws_s3', 'azure_blob', 'google_cloud', 'local'),
      allowNull: false,
      defaultValue: 'local'
    },
    
    bucketName: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    
    objectKey: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    
    // Encryption information
    encrypted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    
    encryptionKeyId: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    
    // Versioning
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    
    parentContentId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'ArchiveContent',
        key: 'id'
      }
    },
    
    isLatestVersion: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    
    // Temporal information
    academicYear: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1900,
        max: 2100
      }
    },
    
    schoolYear: {
      type: DataTypes.STRING(20),
      allowNull: true // e.g., "2023-2024"
    },
    
    eventDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    
    // Metadata and tagging
    tags: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
    },
    
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {}
    },
    
    // Access control
    visibility: {
      type: DataTypes.ENUM('public', 'school', 'staff', 'students', 'parents', 'alumni', 'private'),
      allowNull: false,
      defaultValue: 'school'
    },
    
    accessRoles: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
    },
    
    // Content status
    status: {
      type: DataTypes.ENUM('draft', 'pending_review', 'approved', 'archived', 'deleted'),
      allowNull: false,
      defaultValue: 'draft'
    },
    
    // Sharing and permissions
    allowSharing: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    
    allowDownload: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    
    allowComments: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    
    // Audit fields
    uploadedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    
    approvedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    
    approvedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    
    // Statistics
    viewCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    
    downloadCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    
    shareCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    
    // Soft delete
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
    
  }, {
    tableName: 'archive_content',
    timestamps: true,
    paranoid: true, // Enable soft delete
    indexes: [
      {
        fields: ['category', 'status']
      },
      {
        fields: ['academicYear', 'schoolYear']
      },
      {
        fields: ['uploadedBy']
      },
      {
        fields: ['visibility', 'status']
      },
      {
        fields: ['parentContentId']
      },
      {
        fields: ['isLatestVersion']
      },
      {
        fields: ['tags'],
        using: 'gin'
      },
      {
        fields: ['metadata'],
        using: 'gin'
      },
      {
        fields: ['createdAt']
      }
    ],
    hooks: {
      beforeCreate: (content) => {
        // Generate storage path if not provided
        if (!content.storagePath) {
          const year = content.academicYear || new Date().getFullYear();
          const category = content.category;
          const filename = content.filename;
          content.storagePath = `archive/${year}/${category}/${filename}`;
        }
        
        // Set school year if academic year is provided
        if (content.academicYear && !content.schoolYear) {
          content.schoolYear = `${content.academicYear}-${content.academicYear + 1}`;
        }
      },
      
      beforeUpdate: (content) => {
        // Update version if content is being modified
        if (content.changed('filename') || content.changed('fileSize')) {
          content.version = content.version + 1;
        }
      }
    }
  });
};

module.exports = ArchiveContent;
