/**
 * Tenant Controller
 * Handles tenant-related operations
 */

const tenantService = require('../services/tenantService');

class TenantController {
  /**
   * Get all tenants
   */
  async getAllTenants(req, res) {
    try {
      // Mock implementation
      const tenants = [
        {
          id: '1',
          name: 'Sample School',
          slug: 'sample-school',
          status: 'active',
          created_at: new Date().toISOString()
        }
      ];

      res.json({
        success: true,
        data: tenants
      });
    } catch (error) {
      console.error('Error getting tenants:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_TENANTS_ERROR',
          message: 'Failed to get tenants'
        }
      });
    }
  }

  /**
   * Get tenant by ID
   */
  async getTenantById(req, res) {
    try {
      const { id } = req.params;
      const tenant = await tenantService.getTenantById(id);

      res.json({
        success: true,
        data: tenant
      });
    } catch (error) {
      console.error('Error getting tenant:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_TENANT_ERROR',
          message: 'Failed to get tenant'
        }
      });
    }
  }
}

module.exports = new TenantController();