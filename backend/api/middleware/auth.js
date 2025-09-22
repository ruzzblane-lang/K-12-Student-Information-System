const jwt = require('jsonwebtoken');
const User = require('../../models/User');

class AuthMiddleware {
  // Verify JWT token
  async verifyToken(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'AUTH_TOKEN_MISSING',
            message: 'Access token is required'
          }
        });
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
      } catch (jwtError) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'AUTH_TOKEN_INVALID',
            message: 'Invalid or expired token'
          }
        });
      }
    } catch (error) {
      console.error('Auth middleware error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'AUTH_MIDDLEWARE_ERROR',
          message: 'Authentication error'
        }
      });
    }
  }

  // Check if user has required role(s)
  requireRole(allowedRoles) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'AUTH_REQUIRED',
            message: 'Authentication required'
          }
        });
      }

      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'AUTH_INSUFFICIENT_PERMISSIONS',
            message: 'Insufficient permissions for this action'
          }
        });
      }

      next();
    };
  }

  // Check if user is accessing their own data or has admin privileges
  requireOwnershipOrAdmin(resourceUserIdField = 'user_id') {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'AUTH_REQUIRED',
            message: 'Authentication required'
          }
        });
      }

      // Admin can access any resource
      if (req.user.role === 'admin') {
        return next();
      }

      // Check if user is accessing their own data
      const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
      
      if (req.user.id === resourceUserId) {
        return next();
      }

      // For parent role, check if accessing their child's data
      if (req.user.role === 'parent') {
        // This would need additional logic to check parent-child relationship
        // For now, we'll allow it and handle the check in the controller
        return next();
      }

      return res.status(403).json({
        success: false,
        error: {
          code: 'AUTH_INSUFFICIENT_PERMISSIONS',
          message: 'You can only access your own data'
        }
      });
    };
  }

  // Optional authentication (doesn't fail if no token)
  optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    } catch (jwtError) {
      req.user = null;
    }
    
    next();
  }

  // Rate limiting middleware
  rateLimit(maxRequests = 100, windowMs = 15 * 60 * 1000) { // 15 minutes
    const requests = new Map();

    return (req, res, next) => {
      const key = req.user ? req.user.id : req.ip;
      const now = Date.now();
      const windowStart = now - windowMs;

      // Clean old entries
      for (const [k, v] of requests.entries()) {
        if (v.timestamp < windowStart) {
          requests.delete(k);
        }
      }

      const userRequests = requests.get(key) || { count: 0, timestamp: now };
      
      if (userRequests.timestamp < windowStart) {
        userRequests.count = 1;
        userRequests.timestamp = now;
      } else {
        userRequests.count++;
      }

      requests.set(key, userRequests);

      if (userRequests.count > maxRequests) {
        return res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests, please try again later'
          }
        });
      }

      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': maxRequests,
        'X-RateLimit-Remaining': Math.max(0, maxRequests - userRequests.count),
        'X-RateLimit-Reset': new Date(userRequests.timestamp + windowMs).toISOString()
      });

      next();
    };
  }
}

module.exports = new AuthMiddleware();
