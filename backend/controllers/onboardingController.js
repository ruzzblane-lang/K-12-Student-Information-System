/**
 * Onboarding Controller
 * Handles tenant onboarding operations
 */

const onboardingService = require('../services/onboardingService');

class OnboardingController {
  /**
   * Create a new tenant
   */
  async createTenant(req, res) {
    try {
      const tenantData = req._body;
      const tenant = await onboardingService.createTenant(tenantData);

      res.status(201).json({
        success: true,
        data: tenant,
        message: 'Tenant created successfully'
      });
    } catch (error) {
      console.error('Error creating tenant:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CREATE_TENANT_ERROR',
          message: 'Failed to create tenant'
        }
      });
    }
  }

  /**
   * Get onboarding status
   */
  async getOnboardingStatus(req, res) {
    try {
      const { tenantId } = req.params;
      const status = await onboardingService.getOnboardingStatus(tenantId);

      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      console.error('Error getting onboarding status:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_ONBOARDING_STATUS_ERROR',
          message: 'Failed to get onboarding status'
        }
      });
    }
  }
}

module.exports = new OnboardingController();