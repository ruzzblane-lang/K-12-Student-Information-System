const tenantService = require('../services/tenantService');
const { validationResult } = require('express-validator');

class TenantController {
  /**
   * Create a new tenant (school)
   */
  async createTenant(req, res) {
    try {
      // Validate request data
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const tenantData = req.body;
      const createdBy = req.user?.id; // Super admin who created this tenant

      // Validate tenant data
      const validationErrors = tenantService.validateTenantData(tenantData);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          error: 'Invalid tenant data',
          details: validationErrors
        });
      }

      const tenant = await tenantService.createTenant(tenantData, createdBy);

      res.status(201).json({
        success: true,
        message: 'Tenant created successfully',
        data: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          schoolName: tenant.schoolName,
          schoolType: tenant.schoolType,
          schoolLevel: tenant.schoolLevel,
          subscriptionPlan: tenant.subscriptionPlan,
          subscriptionStatus: tenant.subscriptionStatus,
          features: tenant.features,
          createdAt: tenant.createdAt
        }
      });
    } catch (error) {
      console.error('Create tenant error:', error);
      res.status(500).json({
        error: 'Failed to create tenant',
        message: error.message
      });
    }
  }

  /**
   * Get tenant information
   */
  async getTenant(req, res) {
    try {
      const tenant = req.tenant; // From tenantContext middleware

      res.json({
        success: true,
        data: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          domain: tenant.domain,
          subdomain: tenant.subdomain,
          schoolName: tenant.schoolName,
          schoolType: tenant.schoolType,
          schoolLevel: tenant.schoolLevel,
          address: tenant.address,
          phone: tenant.phone,
          email: tenant.email,
          website: tenant.website,
          logoUrl: tenant.logoUrl,
          primaryColor: tenant.primaryColor,
          secondaryColor: tenant.secondaryColor,
          timezone: tenant.timezone,
          locale: tenant.locale,
          subscriptionPlan: tenant.subscriptionPlan,
          subscriptionStatus: tenant.subscriptionStatus,
          maxStudents: tenant.maxStudents,
          maxTeachers: tenant.maxTeachers,
          features: tenant.features,
          createdAt: tenant.createdAt,
          updatedAt: tenant.updatedAt
        }
      });
    } catch (error) {
      console.error('Get tenant error:', error);
      res.status(500).json({
        error: 'Failed to get tenant',
        message: error.message
      });
    }
  }

  /**
   * Update tenant information
   */
  async updateTenant(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const tenantId = req.tenant.id;
      const updateData = req.body;
      const updatedBy = req.user.id;

      // Validate update data
      const validationErrors = tenantService.validateTenantData(updateData);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          error: 'Invalid tenant data',
          details: validationErrors
        });
      }

      const tenant = await tenantService.updateTenant(tenantId, updateData, updatedBy);

      res.json({
        success: true,
        message: 'Tenant updated successfully',
        data: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          schoolName: tenant.schoolName,
          subscriptionPlan: tenant.subscriptionPlan,
          subscriptionStatus: tenant.subscriptionStatus,
          features: tenant.features,
          updatedAt: tenant.updatedAt
        }
      });
    } catch (error) {
      console.error('Update tenant error:', error);
      res.status(500).json({
        error: 'Failed to update tenant',
        message: error.message
      });
    }
  }

  /**
   * Get tenant statistics
   */
  async getTenantStats(req, res) {
    try {
      const tenantId = req.tenant.id;
      const stats = await tenantService.getTenantStats(tenantId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Get tenant stats error:', error);
      res.status(500).json({
        error: 'Failed to get tenant statistics',
        message: error.message
      });
    }
  }

  /**
   * Get tenant limits and usage
   */
  async getTenantLimits(req, res) {
    try {
      const tenantId = req.tenant.id;
      const tenant = req.tenant;

      const [studentCount, teacherCount] = await Promise.all([
        req.db.models.Student.count({ where: { tenantId, status: 'active' } }),
        req.db.models.Teacher.count({ where: { tenantId, employmentStatus: 'active' } })
      ]);

      const limits = {
        students: {
          current: studentCount,
          max: tenant.maxStudents,
          remaining: tenant.maxStudents - studentCount,
          canAdd: studentCount < tenant.maxStudents
        },
        teachers: {
          current: teacherCount,
          max: tenant.maxTeachers,
          remaining: tenant.maxTeachers - teacherCount,
          canAdd: teacherCount < tenant.maxTeachers
        },
        subscription: {
          plan: tenant.subscriptionPlan,
          status: tenant.subscriptionStatus,
          features: tenant.features
        }
      };

      res.json({
        success: true,
        data: limits
      });
    } catch (error) {
      console.error('Get tenant limits error:', error);
      res.status(500).json({
        error: 'Failed to get tenant limits',
        message: error.message
      });
    }
  }

  /**
   * Update tenant subscription
   */
  async updateSubscription(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const tenantId = req.tenant.id;
      const subscriptionData = req.body;

      const tenant = await tenantService.updateSubscription(tenantId, subscriptionData);

      res.json({
        success: true,
        message: 'Subscription updated successfully',
        data: {
          id: tenant.id,
          subscriptionPlan: tenant.subscriptionPlan,
          subscriptionStatus: tenant.subscriptionStatus,
          maxStudents: tenant.maxStudents,
          maxTeachers: tenant.maxTeachers,
          features: tenant.features,
          updatedAt: tenant.updatedAt
        }
      });
    } catch (error) {
      console.error('Update subscription error:', error);
      res.status(500).json({
        error: 'Failed to update subscription',
        message: error.message
      });
    }
  }

  /**
   * Suspend tenant
   */
  async suspendTenant(req, res) {
    try {
      const tenantId = req.tenant.id;
      const { reason } = req.body;

      const tenant = await tenantService.suspendTenant(tenantId, reason);

      res.json({
        success: true,
        message: 'Tenant suspended successfully',
        data: {
          id: tenant.id,
          subscriptionStatus: tenant.subscriptionStatus,
          features: tenant.features
        }
      });
    } catch (error) {
      console.error('Suspend tenant error:', error);
      res.status(500).json({
        error: 'Failed to suspend tenant',
        message: error.message
      });
    }
  }

  /**
   * Reactivate tenant
   */
  async reactivateTenant(req, res) {
    try {
      const tenantId = req.tenant.id;

      const tenant = await tenantService.reactivateTenant(tenantId);

      res.json({
        success: true,
        message: 'Tenant reactivated successfully',
        data: {
          id: tenant.id,
          subscriptionStatus: tenant.subscriptionStatus,
          features: tenant.features
        }
      });
    } catch (error) {
      console.error('Reactivate tenant error:', error);
      res.status(500).json({
        error: 'Failed to reactivate tenant',
        message: error.message
      });
    }
  }

  /**
   * Get all tenants (super admin only)
   */
  async getAllTenants(req, res) {
    try {
      const { page = 1, limit = 10, status, plan } = req.query;
      const offset = (page - 1) * limit;

      const whereClause = {};
      if (status) {
        whereClause.subscriptionStatus = status;
      }
      if (plan) {
        whereClause.subscriptionPlan = plan;
      }

      const { count, rows: tenants } = await req.db.models.Tenant.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['createdAt', 'DESC']],
        attributes: [
          'id', 'name', 'slug', 'schoolName', 'schoolType', 'schoolLevel',
          'subscriptionPlan', 'subscriptionStatus', 'maxStudents', 'maxTeachers',
          'createdAt', 'updatedAt'
        ]
      });

      res.json({
        success: true,
        data: {
          tenants,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count,
            pages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      console.error('Get all tenants error:', error);
      res.status(500).json({
        error: 'Failed to get tenants',
        message: error.message
      });
    }
  }

  /**
   * Delete tenant (soft delete)
   */
  async deleteTenant(req, res) {
    try {
      const tenantId = req.tenant.id;

      const tenant = await tenantService.deleteTenant(tenantId);

      res.json({
        success: true,
        message: 'Tenant deleted successfully',
        data: {
          id: tenant.id,
          subscriptionStatus: tenant.subscriptionStatus
        }
      });
    } catch (error) {
      console.error('Delete tenant error:', error);
      res.status(500).json({
        error: 'Failed to delete tenant',
        message: error.message
      });
    }
  }
}

module.exports = new TenantController();
