const { DataTypes } = require('sequelize');

/**
 * ArchiveTag Model - Manages metadata tags for archive content
 * Supports hierarchical tagging, tag categories, and content association
 */
const ArchiveTag = (sequelize) => {
  return sequelize.define('ArchiveTag', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    
    // Tag information
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [1, 100]
      }
    },
    
    slug: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [1, 100]
      }
    },
    
    // Tag categorization
    category: {
      type: DataTypes.ENUM(
        'academic_year', 'class', 'club', 'sport', 'event_type', 'subject',
        'grade_level', 'department', 'location', 'season', 'award_type',
        'project_type', 'performance_type', 'custom'
      ),
      allowNull: false,
      defaultValue: 'custom'
    },
    
    // Hierarchical structure
    parentTagId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'ArchiveTag',
        key: 'id'
      }
    },
    
    // Tag metadata
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    
    color: {
      type: DataTypes.STRING(7),
      allowNull: true,
      validate: {
        is: /^#[0-9A-F]{6}$/i
      }
    },
    
    icon: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    
    // Usage statistics
    usageCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    
    // Tag status
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'deprecated'),
      allowNull: false,
      defaultValue: 'active'
    },
    
    isSystemTag: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
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
    
    // Soft delete
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
    
  }, {
    tableName: 'archive_tags',
    timestamps: true,
    paranoid: true, // Enable soft delete
    indexes: [
      {
        fields: ['name'],
        unique: true
      },
      {
        fields: ['slug'],
        unique: true
      },
      {
        fields: ['category']
      },
      {
        fields: ['parentTagId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['isSystemTag']
      },
      {
        fields: ['createdBy']
      },
      {
        fields: ['usageCount']
      }
    ],
    hooks: {
      beforeCreate: (tag) => {
        // Generate slug from name if not provided
        if (!tag.slug) {
          tag.slug = generateSlug(tag.name);
        }
        
        // Ensure slug is unique
        return ensureUniqueSlug(tag);
      },
      
      beforeUpdate: (tag) => {
        // Update slug if name changed
        if (tag.changed('name') && !tag.changed('slug')) {
          tag.slug = generateSlug(tag.name);
          return ensureUniqueSlug(tag);
        }
      }
    }
  });
};

/**
 * Generate URL-friendly slug from tag name
 */
function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim();
}

/**
 * Ensure slug is unique by appending number if necessary
 */
async function ensureUniqueSlug(tag) {
  const sequelize = tag.sequelize;
  let slug = tag.slug;
  let counter = 1;
  
  while (true) {
    const existing = await sequelize.models.ArchiveTag.findOne({
      where: { slug: slug },
      paranoid: false // Include soft-deleted records
    });
    
    if (!existing || existing.id === tag.id) {
      tag.slug = slug;
      break;
    }
    
    slug = `${tag.slug}-${counter}`;
    counter++;
  }
}

module.exports = ArchiveTag;
