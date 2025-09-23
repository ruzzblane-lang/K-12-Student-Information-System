/**
 * Enhanced Authentication Middleware
 * Secure authentication with proper validation and no fallback secrets
 */

const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

/**
 * Validate environment configuration
 */
const validateEnvironment = () => {
  const requiredEnvVars = ['JWT_SECRET', 'JWT_REFRESH_SECRET'];
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  // Validate JWT secret strength
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }
  
  if (process.env.JWT_REFRESH_SECRET && process.env.JWT_REFRESH_SECRET.length < 32) {
    throw new Error('JWT_REFRESH_SECRET must be at least 32 characters long');
  }
};

/**
 * Authenticate JWT token with database validation
 */
const _authMiddleware = async (req, res, _next) => {
  try {
    // Validate environment configuration
    validateEnvironment();
    
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Validate user exists in database and is active
    const userResult = await query(
      'SELECT id, email, role, status, tenant_id FROM users WHERE id = $1 AND status = $2',
      [decoded._userId || decoded._id, 'active']
    );
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found or inactive'
        }
      });
    }
    
    const dbUser = userResult.rows[0];
    
    // Validate token claims match database
    if (dbUser.email !== decoded.email || dbUser.role !== decoded.role) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_INVALID',
          message: 'Token claims do not match user data'
        }
      });
    }
    
    // Create user object from validated data
    const user = {
      _id: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
      tenantId: dbUser.tenant_id,
      status: dbUser.status
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

    // Log authentication errors for monitoring
    if (process.env.NODE_ENV !== 'test') {
      console.error('Authentication error:', error);
    }
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
    
    // Only proceed if JWT_SECRET is available
    if (!process.env.JWT_SECRET) {
      return _next(); // Continue without authentication
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Validate user exists in database and is active
    const userResult = await query(
      'SELECT id, email, role, status, tenant_id FROM users WHERE id = $1 AND status = $2',
      [decoded._userId || decoded._id, 'active']
    );
    
    if (userResult.rows.length > 0) {
      const dbUser = userResult.rows[0];
      
      // Validate token claims match database
      if (dbUser.email === decoded.email && dbUser.role === decoded.role) {
        const user = {
          _id: dbUser.id,
          email: dbUser.email,
          role: dbUser.role,
          tenantId: dbUser.tenant_id,
          status: dbUser.status
        };

        req.user = user;
        req._userId = user._id;
        req.tenantId = user.tenantId;
      }
    }

    _next();
  } catch (error) {
    // Continue without authentication on error
    _next();
  }
};

/**
 * Generate JWT token with secure configuration
 */
const generateToken = (user) => {
  // Validate environment configuration
  validateEnvironment();
  
  const payload = {
    _userId: user._id,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
    iat: Math.floor(Date.now() / 1000)
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    issuer: process.env.JWT_ISSUER || 'school-sis',
    audience: process.env.JWT_AUDIENCE || 'school-sis-users'
  });
};

/**
 * Generate refresh token with secure configuration
 */
const generateRefreshToken = (user) => {
  // Validate environment configuration
  validateEnvironment();
  
  const payload = {
    _userId: user._id,
    type: 'refresh',
    iat: Math.floor(Date.now() / 1000)
  };

  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    issuer: process.env.JWT_ISSUER || 'school-sis',
    audience: process.env.JWT_AUDIENCE || 'school-sis-users'
  });
};

module.exports = {
  authMiddleware: _authMiddleware,
  optionalAuth,
  generateToken,
  generateRefreshToken
};