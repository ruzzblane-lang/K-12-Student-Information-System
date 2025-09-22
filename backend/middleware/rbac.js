const { User } = require('../models');

/**
 * Enhanced Role-Based Access Control for Multi-Tenant System
 */

// Define role hierarchy and permissions
const ROLE_HIERARCHY = {
  super_admin: 100,
  admin: 80,
  principal: 60,
  teacher: 40,
  parent: 20,
  student: 10
};

const ROLE_PERMISSIONS = {
  super_admin: [
    // Tenant Management
    'tenant.create', 'tenant.read', 'tenant.update', 'tenant.delete',
    'tenant.suspend', 'tenant.reactivate', 'tenant.billing',
    
    // User Management
    'user.create', 'user.read', 'user.update', 'user.delete',
    'user.impersonate', 'user.reset_password',
    
    // Student Management
    'student.create', 'student.read', 'student.update', 'student.delete',
    'student.bulk_import', 'student.export',
    
    // Teacher Management
    'teacher.create', 'teacher.read', 'teacher.update', 'teacher.delete',
    'teacher.schedule', 'teacher.evaluation',
    
    // Class Management
    'class.create', 'class.read', 'class.update', 'class.delete',
    'class.schedule', 'class.enrollment',
    
    // Grade Management
    'grade.create', 'grade.read', 'grade.update', 'grade.delete',
    'grade.bulk_entry', 'grade.export',
    
    // Attendance Management
    'attendance.create', 'attendance.read', 'attendance.update', 'attendance.delete',
    'attendance.bulk_entry', 'attendance.export',
    
    // Reporting
    'report.create', 'report.read', 'report.update', 'report.delete',
    'report.export', 'report.schedule',
    
    // System Administration
    'system.config', 'system.backup', 'system.restore',
    'system.audit', 'system.maintenance',
    
    // Communication
    'communication.send', 'communication.read', 'communication.manage',
    
    // Integration
    'integration.manage', 'integration.sync'
  ],
  
  admin: [
    // User Management (within tenant)
    'user.create', 'user.read', 'user.update', 'user.delete',
    
    // Student Management
    'student.create', 'student.read', 'student.update', 'student.delete',
    'student.bulk_import', 'student.export',
    
    // Teacher Management
    'teacher.create', 'teacher.read', 'teacher.update', 'teacher.delete',
    'teacher.schedule',
    
    // Class Management
    'class.create', 'class.read', 'class.update', 'class.delete',
    'class.schedule', 'class.enrollment',
    
    // Grade Management
    'grade.create', 'grade.read', 'grade.update', 'grade.delete',
    'grade.bulk_entry', 'grade.export',
    
    // Attendance Management
    'attendance.create', 'attendance.read', 'attendance.update', 'attendance.delete',
    'attendance.bulk_entry', 'attendance.export',
    
    // Reporting
    'report.create', 'report.read', 'report.update', 'report.delete',
    'report.export',
    
    // Communication
    'communication.send', 'communication.read', 'communication.manage'
  ],
  
  principal: [
    // Student Management (read/limited update)
    'student.read', 'student.update',
    
    // Teacher Management (read/limited update)
    'teacher.read', 'teacher.update',
    
    // Class Management (read/limited update)
    'class.read', 'class.update',
    
    // Grade Management (read/limited update)
    'grade.read', 'grade.update',
    
    // Attendance Management (read/limited update)
    'attendance.read', 'attendance.update',
    
    // Reporting
    'report.create', 'report.read', 'report.export',
    
    // Communication
    'communication.send', 'communication.read'
  ],
  
  teacher: [
    // Student Management (read only)
    'student.read',
    
    // Class Management (assigned classes only)
    'class.read',
    
    // Grade Management (assigned classes only)
    'grade.create', 'grade.read', 'grade.update',
    
    // Attendance Management (assigned classes only)
    'attendance.create', 'attendance.read', 'attendance.update',
    
    // Communication (with parents of assigned students)
    'communication.send', 'communication.read'
  ],
  
  parent: [
    // Student Management (own children only)
    'student.read',
    
    // Grade Management (own children only)
    'grade.read',
    
    // Attendance Management (own children only)
    'attendance.read',
    
    // Communication (with teachers of own children)
    'communication.send', 'communication.read'
  ],
  
  student: [
    // Student Management (own data only)
    'student.read',
    
    // Grade Management (own grades only)
    'grade.read',
    
    // Attendance Management (own attendance only)
    'attendance.read',
    
    // Communication (limited)
    'communication.read'
  ]
};

/**
 * Check if user has specific permission
 */
const hasPermission = (user, permission) => {
  // Check if user has explicit permission override
  if (user.permissions && user.permissions[permission]) {
    return true;
  }
  
  // Check role-based permissions
  const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
  return rolePermissions.includes(permission);
};

/**
 * Check if user has any of the specified permissions
 */
const hasAnyPermission = (user, permissions) => {
  return permissions.some(permission => hasPermission(user, permission));
};

/**
 * Check if user has all of the specified permissions
 */
const hasAllPermissions = (user, permissions) => {
  return permissions.every(permission => hasPermission(user, permission));
};

/**
 * Check if user role is higher than or equal to specified role
 */
const hasRoleLevel = (user, requiredRole) => {
  const userLevel = ROLE_HIERARCHY[user.role] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
  return userLevel >= requiredLevel;
};

/**
 * Get user's effective permissions
 */
const getUserPermissions = (user) => {
  const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
  const explicitPermissions = user.permissions || {};
  
  // Combine role permissions with explicit permissions
  const allPermissions = [...rolePermissions];
  
  // Add explicit permissions that aren't already included
  Object.keys(explicitPermissions).forEach(permission => {
    if (explicitPermissions[permission] && !allPermissions.includes(permission)) {
      allPermissions.push(permission);
    }
  });
  
  return allPermissions;
};

/**
 * Middleware to check specific permission
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User must be authenticated'
      });
    }

    if (!req.tenant) {
      return res.status(400).json({
        error: 'Tenant context required',
        message: 'Tenant context is required for permission checks'
      });
    }

    if (!hasPermission(req.user, permission)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `Permission '${permission}' is required`,
        requiredPermission: permission,
        userRole: req.user.role,
        userPermissions: getUserPermissions(req.user)
      });
    }

    next();
  };
};

/**
 * Middleware to check any of the specified permissions
 */
const requireAnyPermission = (permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User must be authenticated'
      });
    }

    if (!req.tenant) {
      return res.status(400).json({
        error: 'Tenant context required',
        message: 'Tenant context is required for permission checks'
      });
    }

    if (!hasAnyPermission(req.user, permissions)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `One of the following permissions is required: ${permissions.join(', ')}`,
        requiredPermissions: permissions,
        userRole: req.user.role,
        userPermissions: getUserPermissions(req.user)
      });
    }

    next();
  };
};

/**
 * Middleware to check all of the specified permissions
 */
const requireAllPermissions = (permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User must be authenticated'
      });
    }

    if (!req.tenant) {
      return res.status(400).json({
        error: 'Tenant context required',
        message: 'Tenant context is required for permission checks'
      });
    }

    if (!hasAllPermissions(req.user, permissions)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `All of the following permissions are required: ${permissions.join(', ')}`,
        requiredPermissions: permissions,
        userRole: req.user.role,
        userPermissions: getUserPermissions(req.user)
      });
    }

    next();
  };
};

/**
 * Middleware to check role level
 */
const requireRoleLevel = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User must be authenticated'
      });
    }

    if (!hasRoleLevel(req.user, requiredRole)) {
      return res.status(403).json({
        error: 'Insufficient role level',
        message: `Role '${requiredRole}' or higher is required`,
        requiredRole,
        userRole: req.user.role,
        roleHierarchy: ROLE_HIERARCHY
      });
    }

    next();
  };
};

/**
 * Middleware to check resource ownership (for students, parents, etc.)
 */
const requireResourceOwnership = (resourceType, resourceIdParam = 'id') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'User must be authenticated'
        });
      }

      const resourceId = req.params[resourceIdParam];
      if (!resourceId) {
        return res.status(400).json({
          error: 'Resource ID required',
          message: 'Resource ID is required for ownership check'
        });
      }

      // Super admins and admins can access any resource
      if (hasRoleLevel(req.user, 'admin')) {
        return next();
      }

      let hasAccess = false;

      switch (resourceType) {
        case 'student':
          // Teachers can access students in their classes
          if (req.user.role === 'teacher') {
            const student = await req.db.models.Student.findByPk(resourceId, {
              include: [{
                model: req.db.models.Class,
                through: req.db.models.Enrollment,
                where: {
                  teacherId: req.user.id
                }
              }]
            });
            hasAccess = student && student.Classes.length > 0;
          }
          // Parents can access their own children
          else if (req.user.role === 'parent') {
            const student = await req.db.models.Student.findByPk(resourceId, {
              where: {
                // This would need to be implemented based on parent-student relationship
                // For now, we'll assume a direct relationship
                parentUserId: req.user.id
              }
            });
            hasAccess = !!student;
          }
          // Students can access their own data
          else if (req.user.role === 'student') {
            hasAccess = resourceId === req.user.studentId;
          }
          break;

        case 'grade':
          // Teachers can access grades for their classes
          if (req.user.role === 'teacher') {
            const grade = await req.db.models.Grade.findByPk(resourceId, {
              include: [{
                model: req.db.models.Class,
                where: {
                  teacherId: req.user.id
                }
              }]
            });
            hasAccess = !!grade;
          }
          // Students and parents can access their own grades
          else if (['student', 'parent'].includes(req.user.role)) {
            const grade = await req.db.models.Grade.findByPk(resourceId, {
              include: [{
                model: req.db.models.Student,
                where: {
                  // This would need to be implemented based on parent-student relationship
                  parentUserId: req.user.role === 'parent' ? req.user.id : undefined,
                  userId: req.user.role === 'student' ? req.user.id : undefined
                }
              }]
            });
            hasAccess = !!grade;
          }
          break;

        default:
          return res.status(400).json({
            error: 'Invalid resource type',
            message: `Unknown resource type: ${resourceType}`
          });
      }

      if (!hasAccess) {
        return res.status(403).json({
          error: 'Access denied',
          message: `You don't have access to this ${resourceType}`,
          resourceType,
          resourceId
        });
      }

      next();
    } catch (error) {
      console.error('Resource ownership check error:', error);
      return res.status(500).json({
        error: 'Ownership check failed',
        message: 'Failed to verify resource ownership'
      });
    }
  };
};

/**
 * Middleware to add user permissions to request
 */
const addUserPermissions = (req, res, next) => {
  if (req.user) {
    req.userPermissions = getUserPermissions(req.user);
    req.userRoleLevel = ROLE_HIERARCHY[req.user.role] || 0;
  }
  next();
};

module.exports = {
  ROLE_HIERARCHY,
  ROLE_PERMISSIONS,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  hasRoleLevel,
  getUserPermissions,
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireRoleLevel,
  requireResourceOwnership,
  addUserPermissions
};
