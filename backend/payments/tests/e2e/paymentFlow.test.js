/**
 * Payment Flow End-to-End Tests
 * 
 * Tests complete payment flows from initiation to completion
 * including fraud detection, currency conversion, and webhook handling.
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

describe('Payment Flow E2E Tests', () => {
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

  describe('Complete Payment Flow', () => {
    it('should complete a full payment flow with fraud assessment', async () => {
      // Mock database responses
      mockDb.query.mockResolvedValue({ rows: [] });

      // Step 1: Create payment flow
      const flowData = {
        paymentConfig: {
          amount: 100.00,
          currency: 'USD',
          description: 'Tuition Payment',
          allowedPaymentMethods: ['card', 'paypal']
        },
        branding: {
          primaryColor: '#1e40af',
          schoolName: 'Test School',
          logo: 'https://example.com/logo.png'
        },
        features: {
          savePaymentMethod: true,
          recurringPayments: false
        },
        security: {
          fraudDetection: true,
          requireAuthentication: true
        }
      };

      const flowResponse = await request(app)
        .post('/api/payments/flows')
        .send(flowData)
        .expect(201);

      expect(flowResponse.body.success).toBe(true);
      expect(flowResponse.body.data.flowId).toBeDefined();

      const flowId = flowResponse.body.data.flowId;

      // Step 2: Get payment flow
      const getFlowResponse = await request(app)
        .get(`/api/payments/flows/${flowId}`)
        .expect(200);

      expect(getFlowResponse.body.success).toBe(true);
      expect(getFlowResponse.body.data.id).toBe(flowId);

      // Step 3: Assess fraud risk
      const fraudAssessmentData = {
        amount: 100.00,
        currency: 'USD',
        paymentMethod: 'card',
        location: {
          country: 'US',
          city: 'New York',
          latitude: 40.7128,
          longitude: -74.0060
        },
        device: {
          fingerprint: 'device-123',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          isVPN: false,
          isProxy: false
        }
      };

      const fraudResponse = await request(app)
        .post('/api/payments/fraud-assessment')
        .send(fraudAssessmentData)
        .expect(200);

      expect(fraudResponse.body.success).toBe(true);
      expect(fraudResponse.body.data.riskScore).toBeDefined();
      expect(fraudResponse.body.data.riskLevel).toBeDefined();

      // Step 4: Process payment
      const paymentData = {
        amount: 100.00,
        currency: 'USD',
        paymentMethod: 'card',
        paymentMethodId: 'pm_123',
        description: 'Tuition Payment',
        metadata: {
          studentId: 'student-123',
          feeType: 'tuition',
          flowId: flowId
        },
        browserInfo: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          acceptHeader: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          language: 'en-US',
          colorDepth: 24,
          screenHeight: 1080,
          screenWidth: 1920,
          timeZoneOffset: -300,
          javaEnabled: false
        },
        shopperInfo: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          telephoneNumber: '+1234567890'
        }
      };

      const paymentResponse = await request(app)
        .post('/api/payments/process')
        .send(paymentData)
        .expect(200);

      expect(paymentResponse.body.success).toBe(true);
      expect(paymentResponse.body.data.transactionId).toBeDefined();
      expect(paymentResponse.body.data.provider).toBeDefined();

      const transactionId = paymentResponse.body.data.transactionId;

      // Step 5: Check payment status
      const statusResponse = await request(app)
        .get(`/api/payments/status/${transactionId}`)
        .expect(200);

      expect(statusResponse.body.success).toBe(true);
      expect(statusResponse.body.data.status).toBeDefined();

      // Step 6: Get payment statistics
      const statsResponse = await request(app)
        .get('/api/payments/stats')
        .expect(200);

      expect(statsResponse.body.success).toBe(true);
      expect(statsResponse.body.data.orchestration).toBeDefined();
      expect(statsResponse.body.data.providers).toBeDefined();
      expect(statsResponse.body.data.fraud).toBeDefined();
    });

    it('should handle payment flow with currency conversion', async () => {
      // Mock database responses
      mockDb.query.mockResolvedValue({ rows: [] });

      // Step 1: Convert currency
      const conversionData = {
        amount: 100.00,
        fromCurrency: 'USD',
        toCurrency: 'EUR'
      };

      const conversionResponse = await request(app)
        .post('/api/payments/convert-currency')
        .send(conversionData)
        .expect(200);

      expect(conversionResponse.body.success).toBe(true);
      expect(conversionResponse.body.data.convertedAmount).toBeDefined();
      expect(conversionResponse.body.data.exchangeRate).toBeDefined();

      // Step 2: Process payment with converted currency
      const paymentData = {
        amount: conversionResponse.body.data.convertedAmount,
        currency: 'EUR',
        paymentMethod: 'card',
        targetCurrency: 'EUR',
        description: 'International Payment'
      };

      const paymentResponse = await request(app)
        .post('/api/payments/process')
        .send(paymentData)
        .expect(200);

      expect(paymentResponse.body.success).toBe(true);
      expect(paymentResponse.body.data.currency).toBe('EUR');
    });

    it('should handle payment flow with refund', async () => {
      // Mock database responses
      mockDb.query.mockResolvedValue({ 
        rows: [{
          provider: 'stripe',
          providerTransactionId: 'provider-123',
          currency: 'USD'
        }]
      });

      // Step 1: Process payment
      const paymentData = {
        amount: 100.00,
        currency: 'USD',
        paymentMethod: 'card',
        description: 'Test Payment'
      };

      const paymentResponse = await request(app)
        .post('/api/payments/process')
        .send(paymentData)
        .expect(200);

      expect(paymentResponse.body.success).toBe(true);
      const transactionId = paymentResponse.body.data.transactionId;

      // Step 2: Process refund
      const refundData = {
        originalTransactionId: transactionId,
        amount: 50.00,
        reason: 'Partial refund request'
      };

      const refundResponse = await request(app)
        .post('/api/payments/refund')
        .send(refundData)
        .expect(200);

      expect(refundResponse.body.success).toBe(true);
      expect(refundResponse.body.data.refundId).toBeDefined();
    });

    it('should handle payment flow with white-label branding', async () => {
      // Mock database responses
      mockDb.query.mockResolvedValue({ rows: [] });

      // Step 1: Create branded payment flow
      const flowData = {
        paymentConfig: {
          amount: 250.00,
          currency: 'USD',
          description: 'School Fees',
          allowedPaymentMethods: ['card', 'paypal', 'apple_pay']
        },
        branding: {
          primaryColor: '#e11d48',
          secondaryColor: '#f43f5e',
          fontFamily: 'Inter, system-ui, sans-serif',
          schoolName: 'Prestige Academy',
          logo: 'https://prestige-academy.edu/logo.png',
          customCss: `
            .payment-container {
              border-radius: 20px;
              box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
            }
            .payment-header {
              background: linear-gradient(135deg, #e11d48 0%, #f43f5e 100%);
            }
          `
        },
        features: {
          savePaymentMethod: true,
          recurringPayments: true,
          installments: true,
          multiCurrency: true
        },
        security: {
          fraudDetection: true,
          requireAuthentication: true,
          allowedCountries: ['US', 'CA', 'GB'],
          blockedCountries: []
        }
      };

      const flowResponse = await request(app)
        .post('/api/payments/flows')
        .send(flowData)
        .expect(201);

      expect(flowResponse.body.success).toBe(true);
      expect(flowResponse.body.data.paymentPageHtml).toBeDefined();
      expect(flowResponse.body.data.embedCode).toBeDefined();

      // Step 2: Update payment flow
      const updateData = {
        branding: {
          primaryColor: '#059669',
          secondaryColor: '#10b981'
        }
      };

      const updateResponse = await request(app)
        .put(`/api/payments/flows/${flowResponse.body.data.flowId}`)
        .send(updateData)
        .expect(200);

      expect(updateResponse.body.success).toBe(true);

      // Step 3: Get updated flow
      const getFlowResponse = await request(app)
        .get(`/api/payments/flows/${flowResponse.body.data.flowId}`)
        .expect(200);

      expect(getFlowResponse.body.success).toBe(true);
      expect(getFlowResponse.body.data.branding.primaryColor).toBe('#059669');
    });

    it('should handle payment flow with fraud detection and high risk', async () => {
      // Mock database responses
      mockDb.query.mockResolvedValue({ rows: [] });

      // Step 1: Assess high-risk payment
      const highRiskPaymentData = {
        amount: 50000.00, // High amount
        currency: 'USD',
        paymentMethod: 'card',
        location: {
          country: 'XX', // Suspicious country
          city: 'Unknown',
          latitude: 0,
          longitude: 0
        },
        device: {
          fingerprint: 'suspicious-device',
          userAgent: 'bot/crawler', // Suspicious user agent
          isVPN: true,
          isProxy: true
        }
      };

      const fraudResponse = await request(app)
        .post('/api/payments/fraud-assessment')
        .send(highRiskPaymentData)
        .expect(200);

      expect(fraudResponse.body.success).toBe(true);
      expect(fraudResponse.body.data.riskScore).toBeGreaterThan(50);
      expect(fraudResponse.body.data.riskLevel).toMatch(/high|critical/);

      // Step 2: Attempt payment (should be blocked or flagged)
      const paymentData = {
        ...highRiskPaymentData,
        description: 'High-risk payment attempt'
      };

      const paymentResponse = await request(app)
        .post('/api/payments/process')
        .send(paymentData);

      // Payment might be blocked or flagged based on fraud assessment
      if (paymentResponse.status === 200) {
        expect(paymentResponse.body.data.fraudAssessment.riskLevel).toMatch(/high|critical/);
      } else {
        expect(paymentResponse.status).toBe(400);
        expect(paymentResponse.body.error).toContain('fraud risk');
      }
    });

    it('should handle payment flow with multiple providers and fallback', async () => {
      // Mock database responses
      mockDb.query.mockResolvedValue({ rows: [] });

      // Step 1: Process payment (should try multiple providers)
      const paymentData = {
        amount: 100.00,
        currency: 'USD',
        paymentMethod: 'card',
        description: 'Multi-provider test'
      };

      const paymentResponse = await request(app)
        .post('/api/payments/process')
        .send(paymentData)
        .expect(200);

      expect(paymentResponse.body.success).toBe(true);
      expect(paymentResponse.body.data.provider).toBeDefined();
      expect(paymentResponse.body.data.orchestrationId).toBeDefined();

      // Step 2: Get orchestration statistics
      const statsResponse = await request(app)
        .get('/api/payments/stats')
        .expect(200);

      expect(statsResponse.body.success).toBe(true);
      expect(statsResponse.body.data.providers).toBeDefined();
      expect(Array.isArray(statsResponse.body.data.providers)).toBe(true);
    });

    it('should handle payment flow with webhook processing', async () => {
      // Mock database responses
      mockDb.query.mockResolvedValue({ rows: [] });

      // Step 1: Process payment
      const paymentData = {
        amount: 100.00,
        currency: 'USD',
        paymentMethod: 'card',
        description: 'Webhook test payment'
      };

      const paymentResponse = await request(app)
        .post('/api/payments/process')
        .send(paymentData)
        .expect(200);

      expect(paymentResponse.body.success).toBe(true);
      const transactionId = paymentResponse.body.data.transactionId;

      // Step 2: Simulate webhook event
      const webhookData = {
        type: 'payment_intent.succeeded',
        id: 'evt_123',
        data: {
          object: {
            id: 'pi_123',
            status: 'succeeded',
            metadata: {
              transaction_id: transactionId
            }
          }
        }
      };

      // Note: In a real scenario, this would include proper signature verification
      const webhookResponse = await request(app)
        .post('/api/webhooks/stripe')
        .send(webhookData)
        .expect(400); // Expect 400 due to missing signature in test

      expect(webhookResponse.body.success).toBe(false);
      expect(webhookResponse.body.error).toContain('Missing Stripe signature');

      // Step 3: Get webhook events
      const eventsResponse = await request(app)
        .get('/api/webhooks/events')
        .expect(200);

      expect(eventsResponse.body.success).toBe(true);
      expect(Array.isArray(eventsResponse.body.data)).toBe(true);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle payment flow with database errors', async () => {
      // Mock database error
      mockDb.query.mockRejectedValue(new Error('Database connection failed'));

      const paymentData = {
        amount: 100.00,
        currency: 'USD',
        paymentMethod: 'card',
        description: 'Database error test'
      };

      const paymentResponse = await request(app)
        .post('/api/payments/process')
        .send(paymentData)
        .expect(500);

      expect(paymentResponse.body.success).toBe(false);
      expect(paymentResponse.body.error).toBeDefined();
    });

    it('should handle payment flow with invalid data', async () => {
      const invalidPaymentData = {
        amount: 'invalid', // Invalid amount type
        currency: 'INVALID', // Invalid currency
        paymentMethod: '', // Empty payment method
        description: 'Invalid data test'
      };

      const paymentResponse = await request(app)
        .post('/api/payments/process')
        .send(invalidPaymentData)
        .expect(400);

      expect(paymentResponse.body.success).toBe(false);
      expect(paymentResponse.body.error).toContain('Validation failed');
    });

    it('should handle payment flow with missing authentication', async () => {
      // Create app without authentication middleware
      const appNoAuth = express();
      appNoAuth.use(express.json());
      appNoAuth.use('/api', paymentGateway.getRouter());

      const paymentData = {
        amount: 100.00,
        currency: 'USD',
        paymentMethod: 'card',
        description: 'No auth test'
      };

      const paymentResponse = await request(appNoAuth)
        .post('/api/payments/process')
        .send(paymentData)
        .expect(401);

      expect(paymentResponse.body.success).toBe(false);
    });
  });
});
