const tenantService = require('../services/tenantService');
const { Op } = require('sequelize');

/**
 * Middleware to extract and validate tenant context from request
 */
const tenantContext = async (req, res, next) => {
  try {
    let tenant = null;
    let tenantSource = null;

    // Method 1: Check for tenant ID in headers (for API calls)
    if (req.headers['x-tenant-id']) {
      tenant = await tenantService.getTenantById(req.headers['x-tenant-id']);
      tenantSource = 'header';
    }
    // Method 2: Check for tenant slug in headers
    else if (req.headers['x-tenant-slug']) {
      tenant = await tenantService.getTenantBySlug(req.headers['x-tenant-slug']);
      tenantSource = 'header-slug';
    }
    // Method 3: Extract from subdomain
    else if (req.subdomains && req.subdomains.length > 0) {
      const subdomain = req.subdomains[0];
      if (subdomain !== 'www' && subdomain !== 'api') {
        tenant = await tenantService.getTenantBySubdomain(subdomain);
        tenantSource = 'subdomain';
      }
    }
    // Method 4: Extract from custom domain
    else if (req.hostname && !req.hostname.includes('sisplatform.com')) {
      tenant = await tenantService.getTenantByDomain(req.hostname);
      tenantSource = 'domain';
    }
    // Method 5: Check JWT token for tenant context
    else if (req.user && req.user.tenantId) {
      tenant = await tenantService.getTenantById(req.user.tenantId);
      tenantSource = 'jwt';
    }

    // If no tenant found, return error
    if (!tenant) {
      return res.status(400).json({
        error: 'Tenant context required',
        message: 'Unable to determine tenant context from request'
      });
    }

    // Check if tenant is active
    if (!tenant.isActive() && !tenant.isTrial()) {
      return res.status(403).json({
        error: 'Tenant inactive',
        message: 'This tenant account is not active'
      });
    }

    // Add tenant context to request
    req.tenant = tenant;
    req.tenantSource = tenantSource;

    // Add tenant ID to all database queries
    req.tenantId = tenant.id;

    next();
  } catch (error) {
    console.error('Tenant context error:', error);
    return res.status(500).json({
      error: 'Tenant context error',
      message: 'Failed to resolve tenant context'
    });
  }
};

/**
 * Middleware to require tenant context (stricter version)
 */
const requireTenantContext = async (req, res, next) => {
  if (!req.tenant) {
    return res.status(400).json({
      error: 'Tenant context required',
      message: 'This endpoint requires tenant context'
    });
  }
  next();
};

/**
 * Middleware to check tenant feature access
 */
const checkTenantFeature = (featureName) => {
  return (req, res, next) => {
    if (!req.tenant) {
      return res.status(400).json({
        error: 'Tenant context required',
        message: 'This endpoint requires tenant context'
      });
    }

    if (!req.tenant.hasFeature(featureName)) {
      return res.status(403).json({
        error: 'Feature not available',
        message: `Feature '${featureName}' is not available for this tenant`,
        feature: featureName,
        subscriptionPlan: req.tenant.subscriptionPlan
      });
    }

    next();
  };
};

/**
 * Middleware to check tenant limits
 */
const checkTenantLimit = (limitType) => {
  return async (req, res, next) => {
    try {
      if (!req.tenant) {
        return res.status(400).json({
          error: 'Tenant context required',
          message: 'This endpoint requires tenant context'
        });
      }

      let canAdd = false;
      let currentCount = 0;
      let maxCount = 0;

      switch (limitType) {
        case 'students':
          canAdd = await tenantService.canAddStudents(req.tenant.id);
          currentCount = await req.db.models.Student.count({
            where: { tenantId: req.tenant.id, status: 'active' }
          });
          maxCount = req.tenant.maxStudents;
          break;
        case 'teachers':
          canAdd = await tenantService.canAddTeachers(req.tenant.id);
          currentCount = await req.db.models.Teacher.count({
            where: { tenantId: req.tenant.id, employmentStatus: 'active' }
          });
          maxCount = req.tenant.maxTeachers;
          break;
        default:
          return res.status(400).json({
            error: 'Invalid limit type',
            message: `Unknown limit type: ${limitType}`
          });
      }

      if (!canAdd) {
        return res.status(403).json({
          error: 'Tenant limit exceeded',
          message: `Cannot add more ${limitType}. Limit reached.`,
          limitType,
          currentCount,
          maxCount,
          subscriptionPlan: req.tenant.subscriptionPlan
        });
      }

      req.tenantLimit = {
        type: limitType,
        current: currentCount,
        max: maxCount,
        remaining: maxCount - currentCount
      };

      next();
    } catch (error) {
      console.error('Tenant limit check error:', error);
      return res.status(500).json({
        error: 'Tenant limit check failed',
        message: 'Failed to check tenant limits'
      });
    }
  };
};

/**
 * Middleware to add tenant ID to request body for create operations
 */
const addTenantToBody = (req, res, next) => {
  if (req.tenant && req.body) {
    req.body.tenantId = req.tenant.id;
  }
  next();
};

/**
 * Middleware to add tenant ID to query parameters for read operations
 */
const addTenantToQuery = (req, res, next) => {
  if (req.tenant && req.query) {
    req.query.tenantId = req.tenant.id;
  }
  next();
};

/**
 * Middleware to validate user belongs to tenant
 */
const validateUserTenant = async (req, res, next) => {
  try {
    if (!req.user || !req.tenant) {
      return res.status(400).json({
        error: 'Authentication required',
        message: 'User and tenant context required'
      });
    }

    if (req.user.tenantId !== req.tenant.id) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'User does not belong to this tenant'
      });
    }

    next();
  } catch (error) {
    console.error('User tenant validation error:', error);
    return res.status(500).json({
      error: 'Validation failed',
      message: 'Failed to validate user tenant relationship'
    });
  }
};

/**
 * Middleware to log tenant access for audit purposes
 */
const logTenantAccess = (req, res, next) => {
  if (req.tenant && req.user) {
    // Log tenant access for audit purposes
    console.log(`Tenant access: ${req.user.email} accessed tenant ${req.tenant.slug} via ${req.tenantSource}`);
  }
  next();
};

module.exports = {
  tenantContext,
  requireTenantContext,
  checkTenantFeature,
  checkTenantLimit,
  addTenantToBody,
  addTenantToQuery,
  validateUserTenant,
  logTenantAccess
};
