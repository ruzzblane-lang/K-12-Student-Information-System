/**
 * Simplified Role-Based Access Control Middleware
 * For use with _student routes and other endpoints
 */

/**
 * Middleware to check if user has required role(s)
 */
const rbacMiddleware = (allowedRoles) => {
  return (req, res, _next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'User must be authenticated'
        }
      });
    }

    const userRole = req.user.role;
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    if (!roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_ROLE',
          message: `Access denied. Required roles: ${roles.join(' or ')}`,
          requiredRoles: roles,
          userRole: userRole
        }
      });
    }

    _next();
  };
};

/**
 * Check if user has specific permission
 */
const hasPermission = (user, permission) => {
  // For now, we'll use a simple role-based permission system
  const rolePermissions = {
    super_admin: ['*'], // All permissions
    tenant_admin: [
      '_student.create', '_student.read', '_student.update', '_student.delete',
      'teacher.create', 'teacher.read', 'teacher.update', 'teacher.delete',
      'class.create', 'class.read', 'class.update', 'class.delete',
      'grade.create', 'grade.read', 'grade.update', 'grade.delete',
      'attendance.create', 'attendance.read', 'attendance.update', 'attendance.delete'
    ],
    principal: [
      '_student.read', '_student.update',
      'teacher.read', 'teacher.update',
      'class.read', 'class.update',
      'grade.read', 'grade.update',
      'attendance.read', 'attendance.update'
    ],
    teacher: [
      '_student.read',
      'class.read',
      'grade.create', 'grade.read', 'grade.update',
      'attendance.create', 'attendance.read', 'attendance.update'
    ],
    parent: [
      '_student.read',
      'grade.read',
      'attendance.read'
    ],
    _student: [
      '_student.read',
      'grade.read',
      'attendance.read'
    ]
  };

  const userPermissions = rolePermissions[user.role] || [];
  
  // Check if user has explicit permission override
  if (user.permissions && user.permissions[permission]) {
    return true;
  }
  
  // Check if user has wildcard permission
  if (userPermissions.includes('*')) {
    return true;
  }
  
  return userPermissions.includes(permission);
};

/**
 * Middleware to check specific permission
 */
const requirePermission = (permission) => {
  return (req, res, _next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'User must be authenticated'
        }
      });
    }

    if (!hasPermission(req.user, permission)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSION',
          message: `Permission '${permission}' is required`,
          requiredPermission: permission,
          userRole: req.user.role
        }
      });
    }

    _next();
  };
};

/**
 * Check if user role is higher than or equal to specified role
 */
const hasRoleLevel = (user, requiredRole) => {
  const roleHierarchy = {
    super_admin: 100,
    tenant_admin: 80,
    principal: 60,
    teacher: 40,
    parent: 20,
    _student: 10
  };

  const userLevel = roleHierarchy[user.role] || 0;
  const requiredLevel = roleHierarchy[requiredRole] || 0;
  return userLevel >= requiredLevel;
};

/**
 * Middleware to check role level
 */
const requireRoleLevel = (requiredRole) => {
  return (req, res, _next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'User must be authenticated'
        }
      });
    }

    if (!hasRoleLevel(req.user, requiredRole)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_ROLE_LEVEL',
          message: `Role '${requiredRole}' or higher is required`,
          requiredRole,
          userRole: req.user.role
        }
      });
    }

    _next();
  };
};

module.exports = {
  rbacMiddleware,
  hasPermission,
  requirePermission,
  hasRoleLevel,
  requireRoleLevel
};