/**
 * Rate Limiting Middleware
 * Provides different rate limiting configurations for various endpoint types
 */

const _rateLimit = require('express-rate-limit');

// Rate limiting configurations
const rateLimitConfigs = {
  // General rate limit for most endpoints
  _general: _rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later'
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting for authenticated users with higher limits
    skip: (req) => {
      return req.user && req.user.role === 'super_admin';
    }
  }),

  // Strict rate limit for sensitive operations (create, update, delete)
  strict: _rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 requests per windowMs
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many sensitive operations, please try again later'
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting for super admins
    skip: (req) => {
      return req.user && req.user.role === 'super_admin';
    }
  }),

  // Moderate rate limit for read operations
  moderate: _rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // limit each IP to 200 requests per windowMs
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many read requests, please try again later'
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting for super admins
    skip: (req) => {
      return req.user && req.user.role === 'super_admin';
    }
  }),

  // Very strict rate limit for authentication endpoints
  auth: _rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 login attempts per windowMs
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many authentication attempts, please try again later'
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Don't skip for anyone - even super admins should be rate limited for auth
    skip: false
  }),

  // File upload rate limiting
  upload: _rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // limit each IP to 20 uploads per hour
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many file uploads, please try again later'
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting for super admins
    skip: (req) => {
      return req.user && req.user.role === 'super_admin';
    }
  }),

  // API key generation rate limiting
  apiKey: _rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // limit each IP to 3 API key generations per hour
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many API key generation requests, please try again later'
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting for super admins
    skip: (req) => {
      return req.user && req.user.role === 'super_admin';
    }
  })
};

// Custom rate limiter for specific endpoints
const createCustomRateLimit = (windowMs, max, message) => {
  return _rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: message || 'Too many requests, please try again later'
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting for super admins
    skip: (req) => {
      return req.user && req.user.role === 'super_admin';
    }
  });
};

// Rate limiter that considers user role
const createRoleBasedRateLimit = (configs) => {
  return _rateLimit({
    windowMs: configs.windowMs,
    max: (req) => {
      // Different limits based on user role
      if (req.user) {
        switch (req.user.role) {
        case 'super_admin':
          return configs.superAdmin || configs.max * 10;
        case 'tenant_admin':
          return configs.tenantAdmin || configs.max * 5;
        case 'principal':
          return configs.principal || configs.max * 3;
        case 'teacher':
          return configs.teacher || configs.max * 2;
        default:
          return configs.max;
        }
      }
      return configs.max;
    },
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: configs.message || 'Too many requests, please try again later'
      }
    },
    standardHeaders: true,
    legacyHeaders: false
  });
};

// Rate limiter for tenant-specific operations
const createTenantRateLimit = (windowMs, max, message) => {
  return _rateLimit({
    windowMs,
    max,
    keyGenerator: (req) => {
      // Rate limit by tenant + IP combination
      return `${req.tenant?._id || 'no-tenant'}-${req.ip}`;
    },
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: message || 'Too many requests for this tenant, please try again later'
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting for super admins
    skip: (req) => {
      return req.user && req.user.role === 'super_admin';
    }
  });
};

module.exports = {
  ...rateLimitConfigs,
  createCustomRateLimit,
  createRoleBasedRateLimit,
  createTenantRateLimit
};
