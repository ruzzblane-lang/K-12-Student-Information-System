/**
 * Integration Initialization Script
 * 
 * Initializes all third-party integrations and registers them
 * with the IntegrationManager. This script should be run during
 * application startup.
 */

const { IntegrationManager } = require('../services');
const { INTEGRATION_PROVIDERS, INTEGRATION_CATEGORIES } = require('../index');

// Import all integration providers
const GoogleWorkspaceIntegration = require('../providers/google/GoogleWorkspaceIntegration');
const Microsoft365Integration = require('../providers/microsoft/Microsoft365Integration');
const TwilioIntegration = require('../providers/communication/TwilioIntegration');
const SendGridIntegration = require('../providers/communication/SendGridIntegration');
const StripeIntegration = require('../providers/payment/StripeIntegration');
const KhanAcademyIntegration = require('../providers/learning/KhanAcademyIntegration');
const WeatherIntegration = require('../providers/utility/WeatherIntegration');

class IntegrationInitializer {
  constructor() {
    this.integrationManager = new IntegrationManager();
    this.integrations = new Map();
  }

  /**
   * Initialize all integrations
   */
  async initializeAll() {
    try {
      console.log('Initializing third-party integrations...');

      // Education & Productivity Integrations
      await this.registerIntegration(
        INTEGRATION_PROVIDERS.GOOGLE_WORKSPACE,
        new GoogleWorkspaceIntegration(),
        {
          category: INTEGRATION_CATEGORIES.EDUCATION,
          version: '1.0.0',
          description: 'Google Workspace for Education API integration',
          services: ['drive', 'docs', 'calendar', 'gmail', 'classroom', 'meet']
        }
      );

      await this.registerIntegration(
        INTEGRATION_PROVIDERS.MICROSOFT_365,
        new Microsoft365Integration(),
        {
          category: INTEGRATION_CATEGORIES.EDUCATION,
          version: '1.0.0',
          description: 'Microsoft 365 Education Graph API integration',
          services: ['teams', 'outlook', 'onedrive', 'sharepoint', 'graph']
        }
      );

      // Communication Integrations
      await this.registerIntegration(
        INTEGRATION_PROVIDERS.TWILIO,
        new TwilioIntegration(),
        {
          category: INTEGRATION_CATEGORIES.COMMUNICATION,
          version: '1.0.0',
          description: 'Twilio communication services integration',
          services: ['sms', 'voice', 'whatsapp', 'email']
        }
      );

      await this.registerIntegration(
        INTEGRATION_PROVIDERS.SENDGRID,
        new SendGridIntegration(),
        {
          category: INTEGRATION_CATEGORIES.COMMUNICATION,
          version: '1.0.0',
          description: 'SendGrid email services integration',
          services: ['email', 'templates', 'analytics', 'webhooks']
        }
      );

      // Payment Integrations
      await this.registerIntegration(
        INTEGRATION_PROVIDERS.STRIPE,
        new StripeIntegration(),
        {
          category: INTEGRATION_CATEGORIES.PAYMENT,
          version: '1.0.0',
          description: 'Stripe payment processing integration',
          services: ['payments', 'subscriptions', 'invoices', 'webhooks']
        }
      );

      // Learning Integrations
      await this.registerIntegration(
        INTEGRATION_PROVIDERS.KHAN_ACADEMY,
        new KhanAcademyIntegration(),
        {
          category: INTEGRATION_CATEGORIES.LEARNING,
          version: '1.0.0',
          description: 'Khan Academy learning platform integration',
          services: ['courses', 'progress', 'exercises', 'badges', 'assignments']
        }
      );

      // Utility Integrations
      await this.registerIntegration(
        INTEGRATION_PROVIDERS.WEATHER,
        new WeatherIntegration(),
        {
          category: INTEGRATION_CATEGORIES.UTILITY,
          version: '1.0.0',
          description: 'Weather services integration for school operations',
          services: ['current', 'forecast', 'alerts', 'historical']
        }
      );

      console.log(`Successfully initialized ${this.integrations.size} integrations`);
      
      // Perform health check on all integrations
      await this.performHealthCheck();

      return {
        success: true,
        initialized: this.integrations.size,
        integrations: Array.from(this.integrations.keys())
      };
    } catch (error) {
      console.error('Failed to initialize integrations:', error);
      throw error;
    }
  }

  /**
   * Register a single integration
   * @param {string} provider - Integration provider identifier
   * @param {Object} integration - Integration instance
   * @param {Object} config - Integration configuration
   */
  async registerIntegration(provider, integration, config) {
    try {
      this.integrationManager.registerIntegration(provider, integration, config);
      this.integrations.set(provider, integration);
      
      console.log(`✓ Registered integration: ${provider} (${config.category})`);
    } catch (error) {
      console.error(`✗ Failed to register integration: ${provider}`, error.message);
      throw error;
    }
  }

  /**
   * Perform health check on all integrations
   */
  async performHealthCheck() {
    try {
      console.log('Performing health check on all integrations...');
      
      const healthResults = await this.integrationManager.performHealthCheck();
      
      for (const [provider, health] of Object.entries(healthResults)) {
        const status = health.status === 'healthy' ? '✓' : '✗';
        console.log(`${status} ${provider}: ${health.status} - ${health.message}`);
      }
      
      return healthResults;
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }

  /**
   * Get integration manager instance
   * @returns {IntegrationManager} Integration manager
   */
  getIntegrationManager() {
    return this.integrationManager;
  }

  /**
   * Get all registered integrations
   * @returns {Map} Map of registered integrations
   */
  getIntegrations() {
    return this.integrations;
  }
}

// Export singleton instance
const integrationInitializer = new IntegrationInitializer();

module.exports = integrationInitializer;
