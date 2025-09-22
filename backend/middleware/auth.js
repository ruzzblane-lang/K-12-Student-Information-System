/**
 * Simplified Authentication Middleware
 * For use with _student routes and other endpoints
 */

const jwt = require('jsonwebtoken');

/**
 * Authenticate JWT token
 */
const _authMiddleware = async (req, res, _next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Bearer token is required'
        }
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
    
    // For now, we'll create a simple user object from the token
    // In a real implementation, you would fetch the user from the database
    const user = {
      _id: decoded._userId || decoded._id,
      email: decoded.email,
      role: decoded.role || '_student',
      tenantId: decoded.tenantId
    };

    // Add user to request
    req.user = user;
    req._userId = user._id;
    req.tenantId = user.tenantId;

    _next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Token is invalid or malformed'
        }
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Token has expired'
        }
      });
    }

    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Internal authentication error'
      }
    });
  }
};

/**
 * Optional authentication (doesn't fail if no token)
 */
const optionalAuth = async (req, res, _next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return _next(); // Continue without authentication
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
    
    const user = {
      _id: decoded._userId || decoded._id,
      email: decoded.email,
      role: decoded.role || '_student',
      tenantId: decoded.tenantId
    };

    req.user = user;
    req._userId = user._id;
    req.tenantId = user.tenantId;

    _next();
  } catch (error) {
    // Continue without authentication on error
    _next();
  }
};

/**
 * Generate JWT token
 */
const generateToken = (user) => {
  const payload = {
    _userId: user._id,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId
  };

  return jwt.sign(payload, process.env.JWT_SECRET || 'fallback-secret-key', {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m'
  });
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (user) => {
  const payload = {
    _userId: user._id,
    type: 'refresh'
  };

  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-key', {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  });
};

module.exports = {
  _authMiddleware,
  optionalAuth,
  generateToken,
  generateRefreshToken
};