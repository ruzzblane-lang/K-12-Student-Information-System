/**
 * Webhook Controller
 * 
 * Handles webhook events from payment providers for real-time
 * payment status updates and event processing.
 */

const { v4: uuidv4 } = require('uuid');

class WebhookController {
  constructor(db) {
    this.db = db;
    this.providers = new Map();
  }

  /**
   * Register a payment provider
   * @param {string} name - Provider name
   * @param {BasePaymentProvider} provider - Provider instance
   */
  registerProvider(name, provider) {
    this.providers.set(name, provider);
    console.log(`Webhook provider registered: ${name}`);
  }

  /**
   * Handle Stripe webhook
   * POST /api/webhooks/stripe
   */
  async handleStripeWebhook(req, res) {
    try {
      const signature = req.get('stripe-signature');
      const payload = JSON.stringify(req.body);

      if (!signature) {
        return res.status(400).json({
          success: false,
          error: 'Missing Stripe signature'
        });
      }

      const provider = this.providers.get('stripe');
      if (!provider) {
        return res.status(500).json({
          success: false,
          error: 'Stripe provider not available'
        });
      }

      // Verify webhook signature
      const isValid = await provider.verifyWebhookSignature(payload, signature);
      if (!isValid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid webhook signature'
        });
      }

      // Process webhook event
      const result = await provider.processWebhookEvent(req.body);

      // Log webhook event
      await this.logWebhookEvent('stripe', req.body.type, req.body.id, result);

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Stripe webhook error:', error);
      
      // Log webhook error
      await this.logWebhookError('stripe', req.body?.id || 'unknown', error);

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Handle PayPal webhook
   * POST /api/webhooks/paypal
   */
  async handlePayPalWebhook(req, res) {
    try {
      const signature = req.get('paypal-transmission-sig');
      const payload = JSON.stringify(req.body);

      if (!signature) {
        return res.status(400).json({
          success: false,
          error: 'Missing PayPal signature'
        });
      }

      const provider = this.providers.get('paypal');
      if (!provider) {
        return res.status(500).json({
          success: false,
          error: 'PayPal provider not available'
        });
      }

      // Verify webhook signature
      const isValid = await provider.verifyWebhookSignature(payload, signature);
      if (!isValid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid webhook signature'
        });
      }

      // Process webhook event
      const result = await provider.processWebhookEvent(req.body);

      // Log webhook event
      await this.logWebhookEvent('paypal', req.body.event_type, req.body.id, result);

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('PayPal webhook error:', error);
      
      // Log webhook error
      await this.logWebhookError('paypal', req.body?.id || 'unknown', error);

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Handle Adyen webhook
   * POST /api/webhooks/adyen
   */
  async handleAdyenWebhook(req, res) {
    try {
      const signature = req.get('adyen-signature');
      const payload = JSON.stringify(req.body);

      if (!signature) {
        return res.status(400).json({
          success: false,
          error: 'Missing Adyen signature'
        });
      }

      const provider = this.providers.get('adyen');
      if (!provider) {
        return res.status(500).json({
          success: false,
          error: 'Adyen provider not available'
        });
      }

      // Verify webhook signature
      const isValid = await provider.verifyWebhookSignature(payload, signature);
      if (!isValid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid webhook signature'
        });
      }

      // Process webhook event
      const result = await provider.processWebhookEvent(req.body);

      // Log webhook event
      await this.logWebhookEvent('adyen', req.body.eventCode, req.body.pspReference, result);

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Adyen webhook error:', error);
      
      // Log webhook error
      await this.logWebhookError('adyen', req.body?.pspReference || 'unknown', error);

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Handle generic webhook
   * POST /api/webhooks/:provider
   */
  async handleGenericWebhook(req, res) {
    try {
      const { provider } = req.params;
      const signature = req.get('signature') || req.get('x-signature');
      const payload = JSON.stringify(req.body);

      if (!signature) {
        return res.status(400).json({
          success: false,
          error: 'Missing webhook signature'
        });
      }

      const providerInstance = this.providers.get(provider);
      if (!providerInstance) {
        return res.status(404).json({
          success: false,
          error: `Provider ${provider} not found`
        });
      }

      // Verify webhook signature
      const isValid = await providerInstance.verifyWebhookSignature(payload, signature);
      if (!isValid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid webhook signature'
        });
      }

      // Process webhook event
      const result = await providerInstance.processWebhookEvent(req.body);

      // Log webhook event
      const eventType = req.body.type || req.body.event_type || req.body.eventCode || 'unknown';
      const eventId = req.body.id || req.body.pspReference || 'unknown';
      await this.logWebhookEvent(provider, eventType, eventId, result);

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error(`Webhook error for ${req.params.provider}:`, error);
      
      // Log webhook error
      const eventId = req.body?.id || req.body?.pspReference || 'unknown';
      await this.logWebhookError(req.params.provider, eventId, error);

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get webhook events
   * GET /api/webhooks/events
   */
  async getWebhookEvents(req, res) {
    try {
      const { provider, eventType, limit = 50, offset = 0 } = req.query;
      const tenantId = req.tenant?.id;

      let query = `
        SELECT id, provider, event_type, event_id, status, 
               error_message, created_at
        FROM webhook_events
        WHERE 1=1
      `;
      
      const params = [];
      let paramIndex = 1;

      if (provider) {
        query += ` AND provider = $${paramIndex++}`;
        params.push(provider);
      }

      if (eventType) {
        query += ` AND event_type = $${paramIndex++}`;
        params.push(eventType);
      }

      if (tenantId) {
        query += ` AND tenant_id = $${paramIndex++}`;
        params.push(tenantId);
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      params.push(parseInt(limit), parseInt(offset));

      const result = await this.db.query(query, params);

      res.status(200).json({
        success: true,
        data: result.rows
      });

    } catch (error) {
      console.error('Webhook events retrieval error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get webhook event details
   * GET /api/webhooks/events/:eventId
   */
  async getWebhookEventDetails(req, res) {
    try {
      const { eventId } = req.params;

      const query = `
        SELECT * FROM webhook_events 
        WHERE id = $1
      `;

      const result = await this.db.query(query, [eventId]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Webhook event not found'
        });
      }

      res.status(200).json({
        success: true,
        data: result.rows[0]
      });

    } catch (error) {
      console.error('Webhook event details error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Retry webhook event
   * POST /api/webhooks/events/:eventId/retry
   */
  async retryWebhookEvent(req, res) {
    try {
      const { eventId } = req.params;

      // Get webhook event
      const query = `
        SELECT * FROM webhook_events 
        WHERE id = $1
      `;

      const result = await this.db.query(query, [eventId]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Webhook event not found'
        });
      }

      const event = result.rows[0];

      // Get provider
      const provider = this.providers.get(event.provider);
      if (!provider) {
        return res.status(500).json({
          success: false,
          error: `Provider ${event.provider} not available`
        });
      }

      // Retry webhook processing
      const retryResult = await provider.processWebhookEvent({
        type: event.event_type,
        id: event.event_id
      });

      // Update event status
      const updateQuery = `
        UPDATE webhook_events 
        SET status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `;

      await this.db.query(updateQuery, ['retried', eventId]);

      res.status(200).json({
        success: true,
        data: retryResult
      });

    } catch (error) {
      console.error('Webhook retry error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get webhook statistics
   * GET /api/webhooks/stats
   */
  async getWebhookStats(req, res) {
    try {
      const { provider, period = '30d' } = req.query;
      const tenantId = req.tenant?.id;

      let query = `
        SELECT 
          provider,
          event_type,
          status,
          COUNT(*) as count,
          AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_processing_time
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

      const result = await this.db.query(query, params);

      res.status(200).json({
        success: true,
        data: result.rows
      });

    } catch (error) {
      console.error('Webhook statistics error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Log webhook event
   * @param {string} provider - Provider name
   * @param {string} eventType - Event type
   * @param {string} eventId - Event ID
   * @param {Object} result - Processing result
   */
  async logWebhookEvent(provider, eventType, eventId, result) {
    try {
      const query = `
        INSERT INTO webhook_events (
          id, provider, event_type, event_id, status, 
          processing_result, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      `;

      await this.db.query(query, [
        uuidv4(),
        provider,
        eventType,
        eventId,
        result.status || 'processed',
        JSON.stringify(result)
      ]);
    } catch (error) {
      console.error('Failed to log webhook event:', error);
    }
  }

  /**
   * Log webhook error
   * @param {string} provider - Provider name
   * @param {string} eventId - Event ID
   * @param {Error} error - Error object
   */
  async logWebhookError(provider, eventId, error) {
    try {
      const query = `
        INSERT INTO webhook_events (
          id, provider, event_type, event_id, status, 
          error_message, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      `;

      await this.db.query(query, [
        uuidv4(),
        provider,
        'unknown',
        eventId,
        'failed',
        error.message
      ]);
    } catch (dbError) {
      console.error('Failed to log webhook error:', dbError);
    }
  }

  /**
   * Validate webhook payload
   * @param {Object} payload - Webhook payload
   * @param {string} provider - Provider name
   * @returns {boolean} Is valid
   */
  validateWebhookPayload(payload, provider) {
    if (!payload || typeof payload !== 'object') {
      return false;
    }

    // Provider-specific validation
    switch (provider) {
      case 'stripe':
        return payload.type && payload.id;
      case 'paypal':
        return payload.event_type && payload.id;
      case 'adyen':
        return payload.eventCode && payload.pspReference;
      default:
        return true; // Generic validation
    }
  }

  /**
   * Extract event information from payload
   * @param {Object} payload - Webhook payload
   * @param {string} provider - Provider name
   * @returns {Object} Event information
   */
  extractEventInfo(payload, provider) {
    switch (provider) {
      case 'stripe':
        return {
          type: payload.type,
          id: payload.id,
          data: payload.data
        };
      case 'paypal':
        return {
          type: payload.event_type,
          id: payload.id,
          data: payload.resource
        };
      case 'adyen':
        return {
          type: payload.eventCode,
          id: payload.pspReference,
          data: payload.notificationItems
        };
      default:
        return {
          type: payload.type || 'unknown',
          id: payload.id || 'unknown',
          data: payload
        };
    }
  }
}

module.exports = WebhookController;
