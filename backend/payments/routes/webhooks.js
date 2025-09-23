/**
 * Webhook Routes
 * 
 * Defines webhook endpoints for payment providers to send
 * real-time payment status updates and events.
 */

const express = require('express');
const router = express.Router();
const WebhookController = require('../controllers/webhookController');
const { authenticateToken } = require('../../middleware/auth');
const { requireTenant } = require('../../middleware/tenantContext');

// Initialize webhook controller
let webhookController;

// Initialize controller with database connection
const initializeController = (db) => {
  if (!webhookController) {
    webhookController = new WebhookController(db);
  }
  return webhookController;
};

// Middleware to ensure controller is initialized
const ensureController = (req, res, next) => {
  if (!webhookController) {
    return res.status(500).json({
      success: false,
      error: 'Webhook service not initialized'
    });
  }
  next();
};

/**
 * @route   POST /api/webhooks/stripe
 * @desc    Handle Stripe webhook events
 * @access  Public (Webhook endpoint)
 * @headers { stripe-signature }
 */
router.post('/stripe',
  ensureController,
  async (req, res) => {
    await webhookController.handleStripeWebhook(req, res);
  }
);

/**
 * @route   POST /api/webhooks/paypal
 * @desc    Handle PayPal webhook events
 * @access  Public (Webhook endpoint)
 * @headers { paypal-transmission-sig }
 */
router.post('/paypal',
  ensureController,
  async (req, res) => {
    await webhookController.handlePayPalWebhook(req, res);
  }
);

/**
 * @route   POST /api/webhooks/adyen
 * @desc    Handle Adyen webhook events
 * @access  Public (Webhook endpoint)
 * @headers { adyen-signature }
 */
router.post('/adyen',
  ensureController,
  async (req, res) => {
    await webhookController.handleAdyenWebhook(req, res);
  }
);

/**
 * @route   POST /api/webhooks/:provider
 * @desc    Handle generic webhook events
 * @access  Public (Webhook endpoint)
 * @params  { provider }
 * @headers { signature, x-signature }
 */
router.post('/:provider',
  ensureController,
  async (req, res) => {
    await webhookController.handleGenericWebhook(req, res);
  }
);

/**
 * @route   GET /api/webhooks/events
 * @desc    Get webhook events
 * @access  Private (Authenticated users)
 * @query   { provider, eventType, limit, offset }
 */
router.get('/events',
  authenticateToken,
  requireTenant,
  ensureController,
  async (req, res) => {
    await webhookController.getWebhookEvents(req, res);
  }
);

/**
 * @route   GET /api/webhooks/events/:eventId
 * @desc    Get webhook event details
 * @access  Private (Authenticated users)
 * @params  { eventId }
 */
router.get('/events/:eventId',
  authenticateToken,
  requireTenant,
  ensureController,
  async (req, res) => {
    await webhookController.getWebhookEventDetails(req, res);
  }
);

/**
 * @route   POST /api/webhooks/events/:eventId/retry
 * @desc    Retry webhook event processing
 * @access  Private (Authenticated users)
 * @params  { eventId }
 */
router.post('/events/:eventId/retry',
  authenticateToken,
  requireTenant,
  ensureController,
  async (req, res) => {
    await webhookController.retryWebhookEvent(req, res);
  }
);

/**
 * @route   GET /api/webhooks/stats
 * @desc    Get webhook statistics
 * @access  Private (Authenticated users)
 * @query   { provider, period }
 */
router.get('/stats',
  authenticateToken,
  requireTenant,
  ensureController,
  async (req, res) => {
    await webhookController.getWebhookStats(req, res);
  }
);

/**
 * @route   GET /api/webhooks/health
 * @desc    Health check for webhook service
 * @access  Public
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Webhook service is healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

/**
 * @route   GET /api/webhooks/providers
 * @desc    Get available webhook providers
 * @access  Private (Authenticated users)
 */
router.get('/providers',
  authenticateToken,
  requireTenant,
  ensureController,
  async (req, res) => {
    try {
      const providers = [];
      
      // Get provider information from webhook controller
      for (const [name, provider] of webhookController.providers) {
        providers.push({
          name,
          capabilities: provider.getCapabilities(),
          supportedEvents: provider.getSupportedEvents?.() || []
        });
      }

      res.status(200).json({
        success: true,
        data: providers
      });
    } catch (error) {
      console.error('Webhook provider information error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/webhooks/endpoints
 * @desc    Get webhook endpoint URLs
 * @access  Private (Authenticated users)
 */
router.get('/endpoints',
  authenticateToken,
  requireTenant,
  ensureController,
  async (req, res) => {
    try {
      const baseUrl = process.env.BASE_URL || 'https://api.schoolsis.com';
      const tenantId = req.tenant.id;

      const endpoints = {
        stripe: `${baseUrl}/api/webhooks/stripe`,
        paypal: `${baseUrl}/api/webhooks/paypal`,
        adyen: `${baseUrl}/api/webhooks/adyen`,
        generic: `${baseUrl}/api/webhooks/{provider}`,
        tenantSpecific: {
          stripe: `${baseUrl}/api/webhooks/stripe?tenant=${tenantId}`,
          paypal: `${baseUrl}/api/webhooks/paypal?tenant=${tenantId}`,
          adyen: `${baseUrl}/api/webhooks/adyen?tenant=${tenantId}`
        }
      };

      res.status(200).json({
        success: true,
        data: endpoints
      });
    } catch (error) {
      console.error('Webhook endpoints error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/webhooks/test
 * @desc    Test webhook endpoint
 * @access  Private (Authenticated users)
 * @body    { provider, eventType, payload }
 */
router.post('/test',
  authenticateToken,
  requireTenant,
  ensureController,
  async (req, res) => {
    try {
      const { provider, eventType, payload } = req.body;

      if (!provider || !eventType || !payload) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: provider, eventType, payload'
        });
      }

      const providerInstance = webhookController.providers.get(provider);
      if (!providerInstance) {
        return res.status(404).json({
          success: false,
          error: `Provider ${provider} not found`
        });
      }

      // Process test webhook event
      const result = await providerInstance.processWebhookEvent(payload);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Webhook test error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/webhooks/events/summary
 * @desc    Get webhook events summary
 * @access  Private (Authenticated users)
 * @query   { period, provider }
 */
router.get('/events/summary',
  authenticateToken,
  requireTenant,
  ensureController,
  async (req, res) => {
    try {
      const { period = '24h', provider } = req.query;
      const tenantId = req.tenant?.id;

      let query = `
        SELECT 
          provider,
          event_type,
          status,
          COUNT(*) as count,
          MIN(created_at) as first_event,
          MAX(created_at) as last_event
        FROM webhook_events
        WHERE created_at >= NOW() - INTERVAL '${period}'
      `;
      
      const params = [];
      let paramIndex = 1;

      if (provider) {
        query += ` AND provider = $${paramIndex++}`;
        params.push(provider);
      }

      if (tenantId) {
        query += ` AND tenant_id = $${paramIndex++}`;
        params.push(tenantId);
      }

      query += ` GROUP BY provider, event_type, status ORDER BY count DESC`;

      const result = await webhookController.db.query(query, params);

      res.status(200).json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Webhook events summary error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

// Export router and initialization function
module.exports = {
  router,
  initializeController
};
