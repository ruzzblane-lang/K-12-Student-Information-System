const { DataTypes } = require('sequelize');

/**
 * ArchiveComment Model - Manages comments and interactions on archive content
 * Supports threaded comments, moderation, and role-based commenting
 */
const ArchiveComment = (sequelize) => {
  return sequelize.define('ArchiveComment', {
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
    
    // Comment hierarchy
    parentCommentId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'ArchiveComment',
        key: 'id'
      }
    },
    
    // Comment content
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 5000]
      }
    },
    
    // Comment metadata
    commentType: {
      type: DataTypes.ENUM('comment', 'review', 'rating', 'question', 'answer'),
      allowNull: false,
      defaultValue: 'comment'
    },
    
    rating: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 5
      }
    },
    
    // Moderation
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected', 'hidden', 'deleted'),
      allowNull: false,
      defaultValue: 'pending'
    },
    
    moderationNotes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    
    moderatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    
    moderatedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    
    // Author information
    authorId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    
    authorName: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    
    authorRole: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    
    // Visibility and access
    isPublic: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    
    allowReplies: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    
    // Engagement metrics
    likeCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    
    replyCount: {
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
    tableName: 'archive_comments',
    timestamps: true,
    paranoid: true, // Enable soft delete
    indexes: [
      {
        fields: ['contentId']
      },
      {
        fields: ['authorId']
      },
      {
        fields: ['parentCommentId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['commentType']
      },
      {
        fields: ['createdAt']
      },
      {
        fields: ['isPublic', 'status']
      }
    ],
    hooks: {
      afterCreate: async (comment, options) => {
        // Update reply count for parent comment
        if (comment.parentCommentId) {
          const parentComment = await sequelize.models.ArchiveComment.findByPk(comment.parentCommentId);
          if (parentComment) {
            await parentComment.increment('replyCount');
          }
        }
      },
      
      afterDestroy: async (comment, options) => {
        // Update reply count for parent comment
        if (comment.parentCommentId) {
          const parentComment = await sequelize.models.ArchiveComment.findByPk(comment.parentCommentId);
          if (parentComment) {
            await parentComment.decrement('replyCount');
          }
        }
      }
    }
  });
};

module.exports = ArchiveComment;
