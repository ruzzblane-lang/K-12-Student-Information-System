const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { hasPermission } = require('./rbac');

/**
 * Enhanced Authentication Middleware for Multi-Tenant System
 */

/**
 * Authenticate JWT token
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Bearer token is required'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await User.findByPk(decoded.userId, {
      include: [{
        model: require('../models').Tenant,
        as: 'tenant'
      }]
    });

    if (!user) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'User not found'
      });
    }

    // Check if user is active
    if (!user.isActive()) {
      return res.status(401).json({
        error: 'Account inactive',
        message: 'User account is not active'
      });
    }

    // Check if user's tenant is active
    if (user.tenant && !user.tenant.isActive() && !user.tenant.isTrial()) {
      return res.status(403).json({
        error: 'Tenant inactive',
        message: 'Your school account is not active'
      });
    }

    // Add user to request
    req.user = user;
    req.userId = user.id;
    req.tenantId = user.tenantId;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Token is invalid or malformed'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Token has expired'
      });
    }

    console.error('Authentication error:', error);
    return res.status(500).json({
      error: 'Authentication failed',
      message: 'Internal authentication error'
    });
  }
};

/**
 * Require specific role(s)
 */
const requireRole = (roles) => {
  const roleArray = Array.isArray(roles) ? roles : [roles];
  
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User must be authenticated'
      });
    }

    if (!roleArray.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient role',
        message: `Role '${roleArray.join(' or ')}' is required`,
        requiredRoles: roleArray,
        userRole: req.user.role
      });
    }

    next();
  };
};

/**
 * Require specific permission
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User must be authenticated'
      });
    }

    if (!hasPermission(req.user, permission)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `Permission '${permission}' is required`,
        requiredPermission: permission,
        userRole: req.user.role
      });
    }

    next();
  };
};

/**
 * Optional authentication (doesn't fail if no token)
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continue without authentication
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findByPk(decoded.userId, {
      include: [{
        model: require('../models').Tenant,
        as: 'tenant'
      }]
    });

    if (user && user.isActive()) {
      req.user = user;
      req.userId = user.id;
      req.tenantId = user.tenantId;
    }

    next();
  } catch (error) {
    // Continue without authentication on error
    next();
  }
};

/**
 * Require email verification
 */
const requireEmailVerification = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'User must be authenticated'
    });
  }

  if (!req.user.emailVerified) {
    return res.status(403).json({
      error: 'Email verification required',
      message: 'Please verify your email address before accessing this resource'
    });
  }

  next();
};

/**
 * Require two-factor authentication
 */
const requireTwoFactor = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'User must be authenticated'
    });
  }

  if (req.user.twoFactorEnabled && !req.headers['x-2fa-verified']) {
    return res.status(403).json({
      error: 'Two-factor authentication required',
      message: 'Two-factor authentication is required for this action'
    });
  }

  next();
};

/**
 * Rate limiting for authentication attempts
 */
const authRateLimit = (maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
  const attempts = new Map();

  return (req, res, next) => {
    const key = req.ip + ':' + (req.body.email || req.body.username || 'unknown');
    const now = Date.now();
    
    if (!attempts.has(key)) {
      attempts.set(key, { count: 0, resetTime: now + windowMs });
    }

    const attempt = attempts.get(key);
    
    if (now > attempt.resetTime) {
      attempt.count = 0;
      attempt.resetTime = now + windowMs;
    }

    if (attempt.count >= maxAttempts) {
      return res.status(429).json({
        error: 'Too many attempts',
        message: `Too many authentication attempts. Try again in ${Math.ceil((attempt.resetTime - now) / 1000)} seconds.`
      });
    }

    attempt.count++;
    next();
  };
};

/**
 * Generate JWT token
 */
const generateToken = (user) => {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m'
  });
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (user) => {
  const payload = {
    userId: user.id,
    type: 'refresh'
  };

  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  });
};

/**
 * Verify refresh token
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};

/**
 * Middleware to update last login
 */
const updateLastLogin = async (req, res, next) => {
  if (req.user) {
    try {
      await req.user.update({ lastLogin: new Date() });
    } catch (error) {
      console.error('Failed to update last login:', error);
      // Don't fail the request for this
    }
  }
  next();
};

/**
 * Middleware to log authentication events
 */
const logAuthEvent = (eventType) => {
  return (req, res, next) => {
    if (req.user) {
      console.log(`Auth event: ${eventType} - User: ${req.user.email} (${req.user.role}) - IP: ${req.ip}`);
    }
    next();
  };
};

module.exports = {
  authenticate,
  requireRole,
  requirePermission,
  optionalAuth,
  requireEmailVerification,
  requireTwoFactor,
  authRateLimit,
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
  updateLastLogin,
  logAuthEvent
};
