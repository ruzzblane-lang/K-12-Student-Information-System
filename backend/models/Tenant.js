const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Tenant = sequelize.define('Tenant', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 255]
      }
    },
    slug: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        is: /^[a-z0-9-]+$/,
        len: [1, 100]
      }
    },
    domain: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
      validate: {
        isUrl: true
      }
    },
    subdomain: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true,
      validate: {
        is: /^[a-z0-9-]+$/
      }
    },
    schoolName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'school_name',
      validate: {
        notEmpty: true
      }
    },
    schoolType: {
      type: DataTypes.ENUM('public', 'private', 'charter', 'international'),
      allowNull: false,
      field: 'school_type',
      defaultValue: 'public'
    },
    schoolLevel: {
      type: DataTypes.ENUM('elementary', 'middle', 'high', 'k12'),
      allowNull: false,
      field: 'school_level',
      defaultValue: 'k12'
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isEmail: true
      }
    },
    website: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isUrl: true
      }
    },
    logoUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'logo_url'
    },
    primaryColor: {
      type: DataTypes.STRING(7),
      allowNull: true,
      field: 'primary_color',
      validate: {
        is: /^#[0-9A-F]{6}$/i
      }
    },
    secondaryColor: {
      type: DataTypes.STRING(7),
      allowNull: true,
      field: 'secondary_color',
      validate: {
        is: /^#[0-9A-F]{6}$/i
      }
    },
    customCss: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'custom_css'
    },
    timezone: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'America/New_York'
    },
    locale: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'en-US'
    },
    subscriptionPlan: {
      type: DataTypes.ENUM('basic', 'professional', 'enterprise'),
      allowNull: false,
      field: 'subscription_plan',
      defaultValue: 'basic'
    },
    subscriptionStatus: {
      type: DataTypes.ENUM('active', 'suspended', 'cancelled', 'trial'),
      allowNull: false,
      field: 'subscription_status',
      defaultValue: 'trial'
    },
    maxStudents: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'max_students',
      defaultValue: 500,
      validate: {
        min: 1
      }
    },
    maxTeachers: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'max_teachers',
      defaultValue: 50,
      validate: {
        min: 1
      }
    },
    billingEmail: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'billing_email',
      validate: {
        isEmail: true
      }
    },
    features: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {}
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'created_by'
    }
  }, {
    tableName: 'tenants',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['slug']
      },
      {
        unique: true,
        fields: ['domain']
      },
      {
        unique: true,
        fields: ['subdomain']
      },
      {
        fields: ['subscription_status']
      },
      {
        fields: ['subscription_plan']
      }
    ]
  });

  // Instance methods
  Tenant.prototype.isActive = function() {
    return this.subscriptionStatus === 'active';
  };

  Tenant.prototype.isTrial = function() {
    return this.subscriptionStatus === 'trial';
  };

  Tenant.prototype.hasFeature = function(featureName) {
    return this.features && this.features[featureName] === true;
  };

  Tenant.prototype.getFeatureLimit = function(featureName) {
    return this.features && this.features[featureName] || null;
  };

  Tenant.prototype.canAddStudents = function(currentCount) {
    return currentCount < this.maxStudents;
  };

  Tenant.prototype.canAddTeachers = function(currentCount) {
    return currentCount < this.maxTeachers;
  };

  // Class methods
  Tenant.findBySlug = function(slug) {
    return this.findOne({ where: { slug } });
  };

  Tenant.findByDomain = function(domain) {
    return this.findOne({ where: { domain } });
  };

  Tenant.findBySubdomain = function(subdomain) {
    return this.findOne({ where: { subdomain } });
  };

  Tenant.findActiveTenants = function() {
    return this.findAll({ 
      where: { 
        subscriptionStatus: ['active', 'trial'] 
      } 
    });
  };

  // Associations will be defined in the main models file
  return Tenant;
};
