/**
 * Simplified Tenant Context Middleware
 * For use with _student routes and other endpoints
 */

/**
 * Middleware to extract and validate tenant context from request
 */
const _tenantContextMiddleware = async (req, res, _next) => {
  try {
    let tenant = null;
    let tenantSource = null;

    // Method 1: Check for tenant ID in headers (for API calls)
    if (req.headers['x-tenant-_id']) {
      // In a real implementation, you would fetch the tenant from the database
      tenant = {
        _id: req.headers['x-tenant-_id'],
        name: 'Sample Tenant',
        slug: 'sample-tenant',
        isActive: () => true,
        isTrial: () => false
      };
      tenantSource = 'header';
    }
    // Method 2: Check for tenant slug in headers
    else if (req.headers['x-tenant-slug']) {
      tenant = {
        _id: 'sample-tenant-_id',
        name: 'Sample Tenant',
        slug: req.headers['x-tenant-slug'],
        isActive: () => true,
        isTrial: () => false
      };
      tenantSource = 'header-slug';
    }
    // Method 3: Extract from subdomain
    else if (req.subdomains && req.subdomains.length > 0) {
      const subdomain = req.subdomains[0];
      if (subdomain !== 'www' && subdomain !== 'api') {
        tenant = {
          _id: 'sample-tenant-_id',
          name: 'Sample Tenant',
          slug: subdomain,
          isActive: () => true,
          isTrial: () => false
        };
        tenantSource = 'subdomain';
      }
    }
    // Method 4: Check JWT token for tenant context
    else if (req.user && req.user.tenantId) {
      tenant = {
        _id: req.user.tenantId,
        name: 'Sample Tenant',
        slug: 'sample-tenant',
        isActive: () => true,
        isTrial: () => false
      };
      tenantSource = 'jwt';
    }
    // Method 5: Default tenant for development
    else if (process.env.NODE_ENV === 'development') {
      tenant = {
        _id: 'default-tenant-_id',
        name: 'Development Tenant',
        slug: 'dev-tenant',
        isActive: () => true,
        isTrial: () => false
      };
      tenantSource = 'default';
    }

    // If no tenant found, return error
    if (!tenant) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TENANT_CONTEXT_REQUIRED',
          message: 'Unable to determine tenant context from request'
        }
      });
    }

    // Check if tenant is active
    if (!tenant.isActive() && !tenant.isTrial()) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'TENANT_INACTIVE',
          message: 'This tenant account is not active'
        }
      });
    }

    // Add tenant context to request
    req.tenant = tenant;
    req.tenantSource = tenantSource;
    req.tenantId = tenant._id;

    _next();
  } catch (error) {
    console.error('Tenant context error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'TENANT_CONTEXT_ERROR',
        message: 'Failed to resolve tenant context'
      }
    });
  }
};

/**
 * Middleware to require tenant context (stricter version)
 */
const requireTenantContext = async (req, res, _next) => {
  if (!req.tenant) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'TENANT_CONTEXT_REQUIRED',
        message: 'This endpoint requires tenant context'
      }
    });
  }
  _next();
};

/**
 * Middleware to validate user belongs to tenant
 */
const validateUserTenant = async (req, res, _next) => {
  try {
    if (!req.user || !req.tenant) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'User and tenant context required'
        }
      });
    }

    if (req.user.tenantId !== req.tenant._id) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'User does not belong to this tenant'
        }
      });
    }

    _next();
  } catch (error) {
    console.error('User tenant validation error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Failed to validate user tenant relationship'
      }
    });
  }
};

module.exports = {
  _tenantContextMiddleware,
  requireTenantContext,
  validateUserTenant
};