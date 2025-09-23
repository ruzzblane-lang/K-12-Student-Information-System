const { DataTypes } = require('sequelize');

/**
 * ArchiveShare Model - Manages secure sharing of archive content
 * Supports time-limited access, role-based sharing, and secure link generation
 */
const ArchiveShare = (sequelize) => {
  return sequelize.define('ArchiveShare', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    
    // Share information
    shareToken: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true
    },
    
    shareType: {
      type: DataTypes.ENUM('public_link', 'email_invite', 'role_based', 'temporary_access'),
      allowNull: false,
      defaultValue: 'public_link'
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
    
    // Access control
    accessLevel: {
      type: DataTypes.ENUM('view', 'download', 'comment', 'edit'),
      allowNull: false,
      defaultValue: 'view'
    },
    
    allowedRoles: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
    },
    
    allowedUsers: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
    },
    
    // Time-based access
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    
    maxUses: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1
      }
    },
    
    currentUses: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    
    // Security features
    requireAuthentication: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    
    requirePassword: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    
    ipWhitelist: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
    },
    
    // Sharing metadata
    shareMessage: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    
    shareTitle: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    
    // Status and tracking
    status: {
      type: DataTypes.ENUM('active', 'expired', 'revoked', 'suspended'),
      allowNull: false,
      defaultValue: 'active'
    },
    
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    
    // Audit fields
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    
    lastAccessedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    
    lastAccessedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    
    // Statistics
    accessCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    
    downloadCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    
    // Notification settings
    notifyOnAccess: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    
    notifyOnExpiry: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    
    // Soft delete
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
    
  }, {
    tableName: 'archive_shares',
    timestamps: true,
    paranoid: true, // Enable soft delete
    indexes: [
      {
        fields: ['shareToken'],
        unique: true
      },
      {
        fields: ['contentId']
      },
      {
        fields: ['createdBy']
      },
      {
        fields: ['status', 'isActive']
      },
      {
        fields: ['expiresAt']
      },
      {
        fields: ['shareType']
      },
      {
        fields: ['createdAt']
      }
    ],
    hooks: {
      beforeCreate: (share) => {
        // Generate secure share token if not provided
        if (!share.shareToken) {
          share.shareToken = generateSecureToken();
        }
        
        // Set default share title if not provided
        if (!share.shareTitle) {
          share.shareTitle = `Shared Archive Content`;
        }
      },
      
      beforeUpdate: (share) => {
        // Check if share has expired
        if (share.expiresAt && new Date() > share.expiresAt) {
          share.status = 'expired';
          share.isActive = false;
        }
        
        // Check if max uses exceeded
        if (share.maxUses && share.currentUses >= share.maxUses) {
          share.status = 'expired';
          share.isActive = false;
        }
      }
    }
  });
};

/**
 * Generate secure share token
 */
function generateSecureToken() {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
}

module.exports = ArchiveShare;
