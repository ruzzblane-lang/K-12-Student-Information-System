/**
 * Enhanced Role-Based Access Control (RBAC) Middleware
 * 
 * Provides comprehensive multi-tenant RBAC with fine-grained permissions,
 * dynamic role assignment, and context-aware access control.
 */

const { v4: uuidv4 } = require('uuid');

class EnhancedRBACMiddleware {
  constructor(db, config = {}) {
    this.db = db;
    this.config = config;
    
    // Permission types
    this.permissionTypes = {
      READ: 'read',
      WRITE: 'write',
      DELETE: 'delete',
      EXECUTE: 'execute',
      ADMIN: 'admin'
    };
    
    // Resource types
    this.resourceTypes = {
      PAYMENT: 'payment',
      ARCHIVE: 'archive',
      USER: 'user',
      STUDENT: 'student',
      TEACHER: 'teacher',
      CLASS: 'class',
      GRADE: 'grade',
      ATTENDANCE: 'attendance',
      REPORT: 'report',
      SYSTEM: 'system'
    };
    
    // Role hierarchy
    this.roleHierarchy = {
      SUPER_ADMIN: 100,
      TENANT_ADMIN: 90,
      SCHOOL_ADMIN: 80,
      PRINCIPAL: 70,
      VICE_PRINCIPAL: 60,
      DEPARTMENT_HEAD: 50,
      TEACHER: 40,
      COUNSELOR: 35,
      STAFF: 30,
      PARENT: 20,
      STUDENT: 10,
      GUEST: 5
    };
    
    // Context types
    this.contextTypes = {
      TENANT: 'tenant',
      SCHOOL: 'school',
      DEPARTMENT: 'department',
      CLASS: 'class',
      STUDENT: 'student',
      GLOBAL: 'global'
    };
    
    // Cache for permissions and roles
    this.permissionCache = new Map();
    this.roleCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Main RBAC middleware function
   * @param {Object} options - Middleware options
   * @returns {Function} Express middleware function
   */
  middleware(options = {}) {
    return async (req, res, next) => {
      try {
        // Extract user and tenant information
        const user = req.user;
        const tenant = req.tenant;
        
        if (!user || !tenant) {
          return res.status(401).json({
            error: 'Authentication required',
            code: 'AUTH_REQUIRED'
          });
        }

        // Get requested resource and action
        const resource = this.extractResource(req);
        const action = this.extractAction(req);
        const context = this.extractContext(req, tenant);

        // Check permissions
        const hasPermission = await this.checkPermission(
          user.id,
          tenant.id,
          resource,
          action,
          context,
          options
        );

        if (!hasPermission.allowed) {
          // Log access denied
          await this.logAccessDenied(user, tenant, resource, action, hasPermission.reason);
          
          return res.status(403).json({
            error: 'Access denied',
            code: 'ACCESS_DENIED',
            reason: hasPermission.reason,
            requiredPermissions: hasPermission.requiredPermissions
          });
        }

        // Add permission context to request
        req.permissions = {
          resource,
          action,
          context,
          grantedBy: hasPermission.grantedBy,
          conditions: hasPermission.conditions
        };

        // Log successful access
        await this.logAccessGranted(user, tenant, resource, action);

        next();

      } catch (error) {
        console.error('RBAC middleware error:', error);
        return res.status(500).json({
          error: 'Authorization system error',
          code: 'AUTH_SYSTEM_ERROR'
        });
      }
    };
  }

  /**
   * Check if user has permission for specific resource and action
   * @param {string} userId - User ID
   * @param {string} tenantId - Tenant ID
   * @param {Object} resource - Resource information
   * @param {string} action - Action to perform
   * @param {Object} context - Access context
   * @param {Object} options - Additional options
   * @returns {Object} Permission check result
   */
  async checkPermission(userId, tenantId, resource, action, context, options = {}) {
    try {
      // Get user roles and permissions
      const userPermissions = await this.getUserPermissions(userId, tenantId, context);
      
      // Check direct permissions
      const directPermission = this.checkDirectPermission(userPermissions, resource, action);
      if (directPermission.allowed) {
        return directPermission;
      }

      // Check role-based permissions
      const rolePermission = this.checkRolePermission(userPermissions, resource, action);
      if (rolePermission.allowed) {
        return rolePermission;
      }

      // Check hierarchical permissions
      const hierarchicalPermission = await this.checkHierarchicalPermission(
        userId, tenantId, resource, action, context
      );
      if (hierarchicalPermission.allowed) {
        return hierarchicalPermission;
      }

      // Check conditional permissions
      const conditionalPermission = await this.checkConditionalPermissions(
        userId, tenantId, resource, action, context, options
      );
      if (conditionalPermission.allowed) {
        return conditionalPermission;
      }

      return {
        allowed: false,
        reason: 'No matching permissions found',
        requiredPermissions: this.getRequiredPermissions(resource, action)
      };

    } catch (error) {
      console.error('Permission check failed:', error);
      return {
        allowed: false,
        reason: 'Permission check system error'
      };
    }
  }

  /**
   * Get user permissions with caching
   * @param {string} userId - User ID
   * @param {string} tenantId - Tenant ID
   * @param {Object} context - Access context
   * @returns {Object} User permissions
   */
  async getUserPermissions(userId, tenantId, context) {
    const cacheKey = `${userId}:${tenantId}:${JSON.stringify(context)}`;
    const cached = this.getCachedPermissions(cacheKey);
    
    if (cached) {
      return cached;
    }

    // Get user roles
    const roles = await this.getUserRoles(userId, tenantId, context);
    
    // Get role permissions
    const rolePermissions = await this.getRolePermissions(roles, tenantId);
    
    // Get direct user permissions
    const directPermissions = await this.getDirectUserPermissions(userId, tenantId, context);
    
    // Get conditional permissions
    const conditionalPermissions = await this.getConditionalPermissions(userId, tenantId, context);

    const permissions = {
      roles,
      rolePermissions,
      directPermissions,
      conditionalPermissions,
      timestamp: Date.now()
    };

    this.setCachedPermissions(cacheKey, permissions);
    return permissions;
  }

  /**
   * Check direct user permissions
   * @param {Object} userPermissions - User permissions object
   * @param {Object} resource - Resource information
   * @param {string} action - Action to perform
   * @returns {Object} Permission check result
   */
  checkDirectPermission(userPermissions, resource, action) {
    const directPermissions = userPermissions.directPermissions || [];
    
    for (const permission of directPermissions) {
      if (this.matchesPermission(permission, resource, action)) {
        return {
          allowed: true,
          grantedBy: 'direct_permission',
          permission: permission,
          conditions: permission.conditions || {}
        };
      }
    }

    return { allowed: false };
  }

  /**
   * Check role-based permissions
   * @param {Object} userPermissions - User permissions object
   * @param {Object} resource - Resource information
   * @param {string} action - Action to perform
   * @returns {Object} Permission check result
   */
  checkRolePermission(userPermissions, resource, action) {
    const rolePermissions = userPermissions.rolePermissions || [];
    
    for (const rolePermission of rolePermissions) {
      if (this.matchesPermission(rolePermission, resource, action)) {
        return {
          allowed: true,
          grantedBy: 'role_permission',
          role: rolePermission.role,
          permission: rolePermission,
          conditions: rolePermission.conditions || {}
        };
      }
    }

    return { allowed: false };
  }

  /**
   * Check hierarchical permissions
   * @param {string} userId - User ID
   * @param {string} tenantId - Tenant ID
   * @param {Object} resource - Resource information
   * @param {string} action - Action to perform
   * @param {Object} context - Access context
   * @returns {Object} Permission check result
   */
  async checkHierarchicalPermission(userId, tenantId, resource, action, context) {
    try {
      // Get user's role hierarchy
      const userRoles = await this.getUserRoles(userId, tenantId, context);
      const userRoleLevel = this.getHighestRoleLevel(userRoles);

      // Check if user has sufficient role level for the action
      const requiredRoleLevel = this.getRequiredRoleLevel(resource, action);
      
      if (userRoleLevel >= requiredRoleLevel) {
        return {
          allowed: true,
          grantedBy: 'hierarchical_permission',
          userRoleLevel,
          requiredRoleLevel,
          conditions: {}
        };
      }

      return { allowed: false };

    } catch (error) {
      console.error('Hierarchical permission check failed:', error);
      return { allowed: false };
    }
  }

  /**
   * Check conditional permissions
   * @param {string} userId - User ID
   * @param {string} tenantId - Tenant ID
   * @param {Object} resource - Resource information
   * @param {string} action - Action to perform
   * @param {Object} context - Access context
   * @param {Object} options - Additional options
   * @returns {Object} Permission check result
   */
  async checkConditionalPermissions(userId, tenantId, resource, action, context, options) {
    try {
      const conditionalPermissions = await this.getConditionalPermissions(userId, tenantId, context);
      
      for (const permission of conditionalPermissions) {
        if (this.matchesPermission(permission, resource, action)) {
          // Evaluate conditions
          const conditionsMet = await this.evaluateConditions(
            permission.conditions,
            userId,
            tenantId,
            context,
            options
          );

          if (conditionsMet) {
            return {
              allowed: true,
              grantedBy: 'conditional_permission',
              permission: permission,
              conditions: permission.conditions
            };
          }
        }
      }

      return { allowed: false };

    } catch (error) {
      console.error('Conditional permission check failed:', error);
      return { allowed: false };
    }
  }

  /**
   * Extract resource information from request
   * @param {Object} req - Express request object
   * @returns {Object} Resource information
   */
  extractResource(req) {
    const path = req.path;
    const method = req.method;
    
    // Parse resource from URL path
    const pathParts = path.split('/').filter(part => part);
    
    let resourceType = this.resourceTypes.SYSTEM;
    let resourceId = null;
    let subResource = null;

    // Map URL patterns to resource types
    if (pathParts.includes('payments')) {
      resourceType = this.resourceTypes.PAYMENT;
      resourceId = pathParts[pathParts.indexOf('payments') + 1];
    } else if (pathParts.includes('archives')) {
      resourceType = this.resourceTypes.ARCHIVE;
      resourceId = pathParts[pathParts.indexOf('archives') + 1];
    } else if (pathParts.includes('users')) {
      resourceType = this.resourceTypes.USER;
      resourceId = pathParts[pathParts.indexOf('users') + 1];
    } else if (pathParts.includes('students')) {
      resourceType = this.resourceTypes.STUDENT;
      resourceId = pathParts[pathParts.indexOf('students') + 1];
    } else if (pathParts.includes('teachers')) {
      resourceType = this.resourceTypes.TEACHER;
      resourceId = pathParts[pathParts.indexOf('teachers') + 1];
    } else if (pathParts.includes('classes')) {
      resourceType = this.resourceTypes.CLASS;
      resourceId = pathParts[pathParts.indexOf('classes') + 1];
    } else if (pathParts.includes('grades')) {
      resourceType = this.resourceTypes.GRADE;
      resourceId = pathParts[pathParts.indexOf('grades') + 1];
    } else if (pathParts.includes('attendance')) {
      resourceType = this.resourceTypes.ATTENDANCE;
      resourceId = pathParts[pathParts.indexOf('attendance') + 1];
    } else if (pathParts.includes('reports')) {
      resourceType = this.resourceTypes.REPORT;
      resourceId = pathParts[pathParts.indexOf('reports') + 1];
    }

    return {
      type: resourceType,
      id: resourceId,
      subResource: subResource,
      path: path,
      method: method
    };
  }

  /**
   * Extract action from request
   * @param {Object} req - Express request object
   * @returns {string} Action
   */
  extractAction(req) {
    const method = req.method;
    
    switch (method) {
      case 'GET':
        return this.permissionTypes.READ;
      case 'POST':
      case 'PUT':
      case 'PATCH':
        return this.permissionTypes.WRITE;
      case 'DELETE':
        return this.permissionTypes.DELETE;
      default:
        return this.permissionTypes.EXECUTE;
    }
  }

  /**
   * Extract context from request
   * @param {Object} req - Express request object
   * @param {Object} tenant - Tenant information
   * @returns {Object} Access context
   */
  extractContext(req, tenant) {
    const context = {
      tenant: tenant.id,
      type: this.contextTypes.TENANT
    };

    // Extract additional context from request
    if (req.params.schoolId) {
      context.school = req.params.schoolId;
      context.type = this.contextTypes.SCHOOL;
    }

    if (req.params.departmentId) {
      context.department = req.params.departmentId;
      context.type = this.contextTypes.DEPARTMENT;
    }

    if (req.params.classId) {
      context.class = req.params.classId;
      context.type = this.contextTypes.CLASS;
    }

    if (req.params.studentId) {
      context.student = req.params.studentId;
      context.type = this.contextTypes.STUDENT;
    }

    // Extract from query parameters
    if (req.query.schoolId) {
      context.school = req.query.schoolId;
    }

    if (req.query.departmentId) {
      context.department = req.query.departmentId;
    }

    return context;
  }

  /**
   * Check if permission matches resource and action
   * @param {Object} permission - Permission object
   * @param {Object} resource - Resource information
   * @param {string} action - Action to perform
   * @returns {boolean} Whether permission matches
   */
  matchesPermission(permission, resource, action) {
    // Check resource type
    if (permission.resourceType && permission.resourceType !== resource.type) {
      return false;
    }

    // Check action
    if (permission.action && permission.action !== action) {
      return false;
    }

    // Check resource ID (if specified)
    if (permission.resourceId && permission.resourceId !== resource.id) {
      return false;
    }

    // Check path pattern (if specified)
    if (permission.pathPattern && !this.matchesPathPattern(permission.pathPattern, resource.path)) {
      return false;
    }

    return true;
  }

  /**
   * Check if path matches pattern
   * @param {string} pattern - Path pattern
   * @param {string} path - Actual path
   * @returns {boolean} Whether path matches pattern
   */
  matchesPathPattern(pattern, path) {
    // Convert pattern to regex
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  }

  /**
   * Evaluate permission conditions
   * @param {Object} conditions - Permission conditions
   * @param {string} userId - User ID
   * @param {string} tenantId - Tenant ID
   * @param {Object} context - Access context
   * @param {Object} options - Additional options
   * @returns {boolean} Whether conditions are met
   */
  async evaluateConditions(conditions, userId, tenantId, context, options) {
    if (!conditions || Object.keys(conditions).length === 0) {
      return true;
    }

    try {
      // Time-based conditions
      if (conditions.timeRange) {
        if (!this.evaluateTimeCondition(conditions.timeRange)) {
          return false;
        }
      }

      // Location-based conditions
      if (conditions.allowedLocations) {
        if (!this.evaluateLocationCondition(conditions.allowedLocations, options.location)) {
          return false;
        }
      }

      // IP-based conditions
      if (conditions.allowedIPs) {
        if (!this.evaluateIPCondition(conditions.allowedIPs, options.ipAddress)) {
          return false;
        }
      }

      // Resource ownership conditions
      if (conditions.requireOwnership) {
        if (!await this.evaluateOwnershipCondition(conditions.requireOwnership, userId, context)) {
          return false;
        }
      }

      // Custom conditions
      if (conditions.custom) {
        if (!await this.evaluateCustomConditions(conditions.custom, userId, tenantId, context, options)) {
          return false;
        }
      }

      return true;

    } catch (error) {
      console.error('Condition evaluation failed:', error);
      return false;
    }
  }

  /**
   * Get required permissions for resource and action
   * @param {Object} resource - Resource information
   * @param {string} action - Action to perform
   * @returns {Array} Required permissions
   */
  getRequiredPermissions(resource, action) {
    return [
      {
        resourceType: resource.type,
        action: action,
        resourceId: resource.id
      }
    ];
  }

  /**
   * Get required role level for resource and action
   * @param {Object} resource - Resource information
   * @param {string} action - Action to perform
   * @returns {number} Required role level
   */
  getRequiredRoleLevel(resource, action) {
    // Define role level requirements
    const requirements = {
      [this.resourceTypes.SYSTEM]: {
        [this.permissionTypes.READ]: this.roleHierarchy.STAFF,
        [this.permissionTypes.WRITE]: this.roleHierarchy.TEACHER,
        [this.permissionTypes.DELETE]: this.roleHierarchy.SCHOOL_ADMIN,
        [this.permissionTypes.ADMIN]: this.roleHierarchy.TENANT_ADMIN
      },
      [this.resourceTypes.PAYMENT]: {
        [this.permissionTypes.READ]: this.roleHierarchy.STAFF,
        [this.permissionTypes.WRITE]: this.roleHierarchy.TEACHER,
        [this.permissionTypes.DELETE]: this.roleHierarchy.SCHOOL_ADMIN,
        [this.permissionTypes.ADMIN]: this.roleHierarchy.TENANT_ADMIN
      },
      [this.resourceTypes.ARCHIVE]: {
        [this.permissionTypes.READ]: this.roleHierarchy.STUDENT,
        [this.permissionTypes.WRITE]: this.roleHierarchy.TEACHER,
        [this.permissionTypes.DELETE]: this.roleHierarchy.SCHOOL_ADMIN,
        [this.permissionTypes.ADMIN]: this.roleHierarchy.TENANT_ADMIN
      }
    };

    const resourceRequirements = requirements[resource.type];
    if (!resourceRequirements) {
      return this.roleHierarchy.STAFF; // Default requirement
    }

    return resourceRequirements[action] || this.roleHierarchy.STAFF;
  }

  /**
   * Get highest role level from user roles
   * @param {Array} roles - User roles
   * @returns {number} Highest role level
   */
  getHighestRoleLevel(roles) {
    let highestLevel = 0;
    
    for (const role of roles) {
      const level = this.roleHierarchy[role.name] || 0;
      if (level > highestLevel) {
        highestLevel = level;
      }
    }

    return highestLevel;
  }

  // Database operation methods (placeholders)
  async getUserRoles(userId, tenantId, context) {
    // Implementation would query user roles from database
    return [];
  }

  async getRolePermissions(roles, tenantId) {
    // Implementation would query role permissions from database
    return [];
  }

  async getDirectUserPermissions(userId, tenantId, context) {
    // Implementation would query direct user permissions from database
    return [];
  }

  async getConditionalPermissions(userId, tenantId, context) {
    // Implementation would query conditional permissions from database
    return [];
  }

  // Condition evaluation methods
  evaluateTimeCondition(timeRange) {
    const now = new Date();
    const currentHour = now.getHours();
    
    if (timeRange.startHour !== undefined && currentHour < timeRange.startHour) {
      return false;
    }
    
    if (timeRange.endHour !== undefined && currentHour > timeRange.endHour) {
      return false;
    }
    
    return true;
  }

  evaluateLocationCondition(allowedLocations, userLocation) {
    if (!userLocation) {
      return true; // No location restriction if location not provided
    }
    
    return allowedLocations.includes(userLocation);
  }

  evaluateIPCondition(allowedIPs, userIP) {
    if (!userIP) {
      return true; // No IP restriction if IP not provided
    }
    
    return allowedIPs.includes(userIP);
  }

  async evaluateOwnershipCondition(ownershipConfig, userId, context) {
    // Implementation would check resource ownership
    return true;
  }

  async evaluateCustomConditions(customConditions, userId, tenantId, context, options) {
    // Implementation would evaluate custom conditions
    return true;
  }

  // Logging methods
  async logAccessGranted(user, tenant, resource, action) {
    // Implementation would log access granted
  }

  async logAccessDenied(user, tenant, resource, action, reason) {
    // Implementation would log access denied
  }

  // Cache methods
  getCachedPermissions(cacheKey) {
    const cached = this.permissionCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  setCachedPermissions(cacheKey, data) {
    this.permissionCache.set(cacheKey, {
      data: data,
      timestamp: Date.now()
    });
  }
}

module.exports = EnhancedRBACMiddleware;
