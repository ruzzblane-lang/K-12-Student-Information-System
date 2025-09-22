const { DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    tenantId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'tenant_id',
      references: {
        model: 'tenants',
        key: 'id'
      }
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        isEmail: true,
        notEmpty: true
      }
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'password_hash'
    },
    emailVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      field: 'email_verified',
      defaultValue: false
    },
    emailVerificationToken: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'email_verification_token'
    },
    passwordResetToken: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'password_reset_token'
    },
    passwordResetExpires: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'password_reset_expires'
    },
    firstName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'first_name',
      validate: {
        notEmpty: true,
        len: [1, 100]
      }
    },
    lastName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'last_name',
      validate: {
        notEmpty: true,
        len: [1, 100]
      }
    },
    middleName: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'middle_name'
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    avatarUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'avatar_url'
    },
    role: {
      type: DataTypes.ENUM('super_admin', 'admin', 'principal', 'teacher', 'parent', 'student'),
      allowNull: false,
      defaultValue: 'student'
    },
    permissions: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {}
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'suspended', 'pending'),
      allowNull: false,
      defaultValue: 'pending'
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_login'
    },
    loginAttempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'login_attempts',
      defaultValue: 0
    },
    lockedUntil: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'locked_until'
    },
    twoFactorEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      field: 'two_factor_enabled',
      defaultValue: false
    },
    twoFactorSecret: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'two_factor_secret'
    },
    backupCodes: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true,
      field: 'backup_codes'
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'created_by',
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['tenant_id', 'email']
      },
      {
        fields: ['tenant_id']
      },
      {
        fields: ['role']
      },
      {
        fields: ['status']
      },
      {
        fields: ['tenant_id', 'role']
      }
    ]
  });

  // Instance methods
  User.prototype.isLocked = function() {
    return !!(this.lockedUntil && this.lockedUntil > Date.now());
  };

  User.prototype.isActive = function() {
    return this.status === 'active' && !this.isLocked();
  };

  User.prototype.hasPermission = function(permission) {
    // Check if user has specific permission
    if (this.permissions && this.permissions[permission]) {
      return true;
    }
    
    // Check role-based permissions
    const rolePermissions = this.getRolePermissions();
    return rolePermissions.includes(permission);
  };

  User.prototype.getRolePermissions = function() {
    const rolePermissionMap = {
      super_admin: [
        'tenant.create', 'tenant.read', 'tenant.update', 'tenant.delete',
        'user.create', 'user.read', 'user.update', 'user.delete',
        'student.create', 'student.read', 'student.update', 'student.delete',
        'teacher.create', 'teacher.read', 'teacher.update', 'teacher.delete',
        'class.create', 'class.read', 'class.update', 'class.delete',
        'grade.create', 'grade.read', 'grade.update', 'grade.delete',
        'attendance.create', 'attendance.read', 'attendance.update', 'attendance.delete',
        'report.create', 'report.read', 'report.update', 'report.delete',
        'system.admin'
      ],
      admin: [
        'user.create', 'user.read', 'user.update', 'user.delete',
        'student.create', 'student.read', 'student.update', 'student.delete',
        'teacher.create', 'teacher.read', 'teacher.update', 'teacher.delete',
        'class.create', 'class.read', 'class.update', 'class.delete',
        'grade.create', 'grade.read', 'grade.update', 'grade.delete',
        'attendance.create', 'attendance.read', 'attendance.update', 'attendance.delete',
        'report.create', 'report.read', 'report.update', 'report.delete'
      ],
      principal: [
        'student.read', 'student.update',
        'teacher.read', 'teacher.update',
        'class.read', 'class.update',
        'grade.read', 'grade.update',
        'attendance.read', 'attendance.update',
        'report.create', 'report.read'
      ],
      teacher: [
        'student.read',
        'class.read',
        'grade.create', 'grade.read', 'grade.update',
        'attendance.create', 'attendance.read', 'attendance.update'
      ],
      parent: [
        'student.read' // Only their own children
      ],
      student: [
        'student.read' // Only their own data
      ]
    };

    return rolePermissionMap[this.role] || [];
  };

  User.prototype.getFullName = function() {
    return `${this.firstName} ${this.lastName}`;
  };

  User.prototype.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.passwordHash);
  };

  User.prototype.incrementLoginAttempts = async function() {
    // If we have a previous lock that has expired, restart at 1
    if (this.lockedUntil && this.lockedUntil < Date.now()) {
      return this.update({
        loginAttempts: 1,
        lockedUntil: null
      });
    }

    const updates = { loginAttempts: this.loginAttempts + 1 };
    
    // Lock account after 5 failed attempts for 2 hours
    if (this.loginAttempts + 1 >= 5 && !this.isLocked()) {
      updates.lockedUntil = Date.now() + 2 * 60 * 60 * 1000; // 2 hours
    }

    return this.update(updates);
  };

  User.prototype.resetLoginAttempts = async function() {
    return this.update({
      loginAttempts: 0,
      lockedUntil: null
    });
  };

  // Class methods
  User.findByEmail = function(email, tenantId) {
    return this.findOne({ 
      where: { 
        email: email.toLowerCase(),
        tenantId 
      } 
    });
  };

  User.findActiveUsers = function(tenantId) {
    return this.findAll({ 
      where: { 
        tenantId,
        status: 'active' 
      } 
    });
  };

  User.findByRole = function(role, tenantId) {
    return this.findAll({ 
      where: { 
        role,
        tenantId 
      } 
    });
  };

  // Hooks
  User.beforeCreate(async (user) => {
    if (user.passwordHash) {
      const saltRounds = 12;
      user.passwordHash = await bcrypt.hash(user.passwordHash, saltRounds);
    }
    user.email = user.email.toLowerCase();
  });

  User.beforeUpdate(async (user) => {
    if (user.changed('passwordHash')) {
      const saltRounds = 12;
      user.passwordHash = await bcrypt.hash(user.passwordHash, saltRounds);
    }
    if (user.changed('email')) {
      user.email = user.email.toLowerCase();
    }
  });

  return User;
};