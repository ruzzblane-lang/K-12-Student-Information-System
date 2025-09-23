/**
 * Payment Gateway Integration Tests
 */

const request = require('supertest');
const express = require('express');
const { PaymentGateway } = require('../../index');

// Mock database
const mockDb = {
  query: jest.fn()
};

// Mock configuration
const mockConfig = {
  providers: {
    stripe: {
      secretKey: 'sk_test_mock',
      publishableKey: 'pk_test_mock',
      webhookSecret: 'whsec_mock',
      sandbox: true
    },
    paypal: {
      clientId: 'mock_client_id',
      clientSecret: 'mock_client_secret',
      webhookSecret: 'mock_webhook_secret',
      sandbox: true
    },
    adyen: {
      apiKey: 'mock_api_key',
      merchantAccount: 'mock_merchant',
      webhookSecret: 'mock_webhook_secret',
      sandbox: true
    }
  }
};

describe('Payment Gateway Integration', () => {
  let app;
  let paymentGateway;

  beforeAll(async () => {
    // Create Express app
    app = express();
    app.use(express.json());

    // Initialize payment gateway
    paymentGateway = new PaymentGateway(mockDb, mockConfig);
    
    // Mount payment gateway routes
    app.use('/api', paymentGateway.getRouter());

    // Mock authentication middleware
    app.use((req, res, next) => {
      req.user = { id: 'user-123' };
      req.tenant = { id: 'tenant-123' };
      next();
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Payment Gateway is healthy');
      expect(response.body.providers).toBeDefined();
      expect(response.body.features).toBeDefined();
    });
  });

  describe('Payment Processing', () => {
    it('should process payment successfully', async () => {
      // Mock database responses
      mockDb.query.mockResolvedValue({ rows: [] });

      const paymentData = {
        amount: 100.00,
        currency: 'USD',
        paymentMethod: 'card',
        description: 'Test payment'
      };

      const response = await request(app)
        .post('/api/payments/process')
        .send(paymentData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should validate payment data', async () => {
      const invalidPaymentData = {
        amount: -100.00, // Invalid amount
        currency: 'USD',
        paymentMethod: 'card'
      };

      const response = await request(app)
        .post('/api/payments/process')
        .send(invalidPaymentData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation failed');
    });

    it('should handle missing required fields', async () => {
      const incompletePaymentData = {
        amount: 100.00
        // Missing currency and paymentMethod
      };

      const response = await request(app)
        .post('/api/payments/process')
        .send(incompletePaymentData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation failed');
    });
  });

  describe('Refund Processing', () => {
    it('should process refund successfully', async () => {
      // Mock database responses
      mockDb.query.mockResolvedValue({ 
        rows: [{
          provider: 'stripe',
          providerTransactionId: 'provider-123',
          currency: 'USD'
        }]
      });

      const refundData = {
        originalTransactionId: 'txn-123',
        amount: 50.00,
        reason: 'Customer request'
      };

      const response = await request(app)
        .post('/api/payments/refund')
        .send(refundData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should validate refund data', async () => {
      const invalidRefundData = {
        originalTransactionId: 'txn-123',
        amount: -50.00 // Invalid amount
      };

      const response = await request(app)
        .post('/api/payments/refund')
        .send(invalidRefundData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation failed');
    });
  });

  describe('Payment Status', () => {
    it('should get payment status successfully', async () => {
      // Mock database responses
      mockDb.query.mockResolvedValue({ 
        rows: [{
          provider: 'stripe',
          providerTransactionId: 'provider-123'
        }]
      });

      const response = await request(app)
        .get('/api/payments/status/txn-123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should handle invalid transaction ID', async () => {
      const response = await request(app)
        .get('/api/payments/status/')
        .expect(404);
    });
  });

  describe('Currency Conversion', () => {
    it('should convert currency successfully', async () => {
      const conversionData = {
        amount: 100.00,
        fromCurrency: 'USD',
        toCurrency: 'EUR'
      };

      const response = await request(app)
        .post('/api/payments/convert-currency')
        .send(conversionData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should validate currency conversion data', async () => {
      const invalidConversionData = {
        amount: -100.00, // Invalid amount
        fromCurrency: 'USD',
        toCurrency: 'EUR'
      };

      const response = await request(app)
        .post('/api/payments/convert-currency')
        .send(invalidConversionData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation failed');
    });
  });

  describe('Supported Currencies', () => {
    it('should return supported currencies', async () => {
      const response = await request(app)
        .get('/api/payments/currencies')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(typeof response.body.data).toBe('object');
    });
  });

  describe('Regional Payment Methods', () => {
    it('should return regional payment methods for currency', async () => {
      const response = await request(app)
        .get('/api/payments/methods/USD')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should validate currency code', async () => {
      const response = await request(app)
        .get('/api/payments/methods/INVALID')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid currency code format');
    });
  });

  describe('Payment Flows', () => {
    it('should create payment flow successfully', async () => {
      // Mock database responses
      mockDb.query.mockResolvedValue({ rows: [] });

      const flowData = {
        paymentConfig: {
          amount: 100.00,
          currency: 'USD',
          description: 'Test flow'
        },
        branding: {
          primaryColor: '#1e40af',
          schoolName: 'Test School'
        }
      };

      const response = await request(app)
        .post('/api/payments/flows')
        .send(flowData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should get tenant payment flows', async () => {
      // Mock database responses
      mockDb.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .get('/api/payments/flows')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Fraud Assessment', () => {
    it('should assess fraud risk successfully', async () => {
      // Mock database responses
      mockDb.query.mockResolvedValue({ rows: [] });

      const assessmentData = {
        amount: 100.00,
        currency: 'USD',
        paymentMethod: 'card'
      };

      const response = await request(app)
        .post('/api/payments/fraud-assessment')
        .send(assessmentData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.riskScore).toBeDefined();
      expect(response.body.data.riskLevel).toBeDefined();
    });

    it('should validate fraud assessment data', async () => {
      const invalidAssessmentData = {
        amount: -100.00, // Invalid amount
        currency: 'USD',
        paymentMethod: 'card'
      };

      const response = await request(app)
        .post('/api/payments/fraud-assessment')
        .send(invalidAssessmentData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation failed');
    });
  });

  describe('Payment Statistics', () => {
    it('should return payment statistics', async () => {
      // Mock database responses
      mockDb.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .get('/api/payments/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.orchestration).toBeDefined();
      expect(response.body.data.providers).toBeDefined();
      expect(response.body.data.fraud).toBeDefined();
    });
  });

  describe('Webhook Endpoints', () => {
    it('should handle Stripe webhook', async () => {
      const webhookData = {
        type: 'payment_intent.succeeded',
        id: 'evt_123',
        data: {
          object: {
            id: 'pi_123',
            status: 'succeeded'
          }
        }
      };

      const response = await request(app)
        .post('/api/webhooks/stripe')
        .send(webhookData)
        .expect(400); // Expect 400 due to missing signature

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Missing Stripe signature');
    });

    it('should handle PayPal webhook', async () => {
      const webhookData = {
        event_type: 'PAYMENT.SALE.COMPLETED',
        id: 'evt_123',
        resource: {
          id: 'sale_123',
          state: 'completed'
        }
      };

      const response = await request(app)
        .post('/api/webhooks/paypal')
        .send(webhookData)
        .expect(400); // Expect 400 due to missing signature

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Missing PayPal signature');
    });

    it('should handle Adyen webhook', async () => {
      const webhookData = {
        eventCode: 'AUTHORISATION',
        pspReference: 'psp_123',
        notificationItems: [{
          NotificationRequestItem: {
            eventCode: 'AUTHORISATION',
            pspReference: 'psp_123',
            merchantReference: 'ref_123'
          }
        }]
      };

      const response = await request(app)
        .post('/api/webhooks/adyen')
        .send(webhookData)
        .expect(400); // Expect 400 due to missing signature

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Missing Adyen signature');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock database error
      mockDb.query.mockRejectedValue(new Error('Database connection failed'));

      const paymentData = {
        amount: 100.00,
        currency: 'USD',
        paymentMethod: 'card'
      };

      const response = await request(app)
        .post('/api/payments/process')
        .send(paymentData)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should handle invalid JSON', async () => {
      const response = await request(app)
        .post('/api/payments/process')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);
    });
  });
});
