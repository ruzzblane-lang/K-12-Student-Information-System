const { DataTypes } = require('sequelize');

/**
 * ArchiveAccessLog Model - Tracks access to archive content
 * Provides detailed audit trail for security and analytics
 */
const ArchiveAccessLog = (sequelize) => {
  return sequelize.define('ArchiveAccessLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    
    // Content reference
    contentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'ArchiveContent',
        key: 'id'
      }
    },
    
    // Share reference (if accessed via share)
    shareId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'ArchiveShare',
        key: 'id'
      }
    },
    
    // User information
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    
    userRole: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    
    // Access details
    accessType: {
      type: DataTypes.ENUM('view', 'download', 'preview', 'share', 'comment', 'edit'),
      allowNull: false,
      defaultValue: 'view'
    },
    
    accessMethod: {
      type: DataTypes.ENUM('direct', 'share_link', 'search', 'browse', 'api'),
      allowNull: false,
      defaultValue: 'direct'
    },
    
    // Request information
    ipAddress: {
      type: DataTypes.INET,
      allowNull: true
    },
    
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    
    referer: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    
    // Session information
    sessionId: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    
    // Geographic information
    country: {
      type: DataTypes.STRING(2),
      allowNull: true
    },
    
    region: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    
    city: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    
    // Access result
    success: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    
    errorCode: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    
    // Performance metrics
    responseTime: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Response time in milliseconds'
    },
    
    bytesTransferred: {
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: 'Bytes transferred during access'
    },
    
    // Additional metadata
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {}
    },
    
    // Timestamp
    accessedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
    
  }, {
    tableName: 'archive_access_logs',
    timestamps: false, // We use accessedAt instead
    indexes: [
      {
        fields: ['contentId']
      },
      {
        fields: ['userId']
      },
      {
        fields: ['shareId']
      },
      {
        fields: ['accessType']
      },
      {
        fields: ['accessMethod']
      },
      {
        fields: ['ipAddress']
      },
      {
        fields: ['success']
      },
      {
        fields: ['accessedAt']
      },
      {
        fields: ['contentId', 'accessedAt']
      },
      {
        fields: ['userId', 'accessedAt']
      },
      {
        fields: ['country', 'accessedAt']
      }
    ],
    hooks: {
      beforeCreate: (log) => {
        // Set accessedAt if not provided
        if (!log.accessedAt) {
          log.accessedAt = new Date();
        }
        
        // Extract geographic information from IP if available
        if (log.ipAddress && !log.country) {
          // This would typically use a GeoIP service
          // For now, we'll leave it as null
        }
      }
    }
  });
};

module.exports = ArchiveAccessLog;
