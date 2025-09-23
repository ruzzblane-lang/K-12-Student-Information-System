/**
 * Manual Payment Request System Tests
 * 
 * Tests for the manual payment request functionality including
 * submission, validation, fraud detection, and approval workflows.
 */

const { expect } = require('chai');
const ManualPaymentRequestService = require('../services/ManualPaymentRequestService');
const PaymentApprovalService = require('../services/PaymentApprovalService');
const NotificationService = require('../services/NotificationService');

// Mock database for testing
class MockDatabase {
  constructor() {
    this.queries = [];
    this.results = {};
  }

  query(sql, params = []) {
    this.queries.push({ sql, params });
    
    // Return mock results based on query type
    if (sql.includes('payment_request_types')) {
      return Promise.resolve({
        rows: [
          {
            id: '1',
            name: 'bank_transfer',
            display_name: 'Bank Transfer',
            description: 'Direct bank transfer payment',
            required_fields: '["account_holder_name", "bank_name", "account_number", "routing_number"]',
            validation_rules: '{"account_number": {"min_length": 8, "max_length": 20}}',
            is_active: true
          }
        ]
      });
    }
    
    if (sql.includes('INSERT INTO manual_payment_requests')) {
      return Promise.resolve({
        rows: [{
          id: 'test-request-id',
          tenant_id: 'test-tenant',
          user_id: 'test-user',
          payment_type: 'bank_transfer',
          amount: 100.00,
          currency: 'USD',
          status: 'pending',
          fraud_risk_score: 25,
          fraud_risk_level: 'low',
          created_at: new Date()
        }]
      });
    }
    
    return Promise.resolve({ rows: [] });
  }
}

describe('Manual Payment Request System', () => {
  let mockDb;
  let manualPaymentService;
  let approvalService;
  let notificationService;

  beforeEach(() => {
    mockDb = new MockDatabase();
    manualPaymentService = new ManualPaymentRequestService(mockDb);
    approvalService = new PaymentApprovalService(mockDb);
    notificationService = new NotificationService(mockDb);
  });

  describe('ManualPaymentRequestService', () => {
    describe('getPaymentRequestTypes', () => {
      it('should return available payment types', async () => {
        const types = await manualPaymentService.getPaymentRequestTypes();
        
        expect(types).to.be.an('array');
        expect(types[0]).to.have.property('name', 'bank_transfer');
        expect(types[0]).to.have.property('display_name', 'Bank Transfer');
        expect(types[0]).to.have.property('required_fields');
        expect(types[0]).to.have.property('validation_rules');
      });
    });

    describe('validatePaymentDetails', () => {
      it('should validate payment details against type requirements', async () => {
        const paymentDetails = {
          account_holder_name: 'John Doe',
          bank_name: 'Test Bank',
          account_number: '123456789',
          routing_number: '123456789'
        };

        const result = await manualPaymentService.validatePaymentDetails('bank_transfer', paymentDetails);
        
        expect(result).to.have.property('isValid', true);
        expect(result).to.have.property('errors');
        expect(result.errors).to.be.an('array');
      });

      it('should return validation errors for missing required fields', async () => {
        const paymentDetails = {
          account_holder_name: 'John Doe'
          // Missing required fields
        };

        const result = await manualPaymentService.validatePaymentDetails('bank_transfer', paymentDetails);
        
        expect(result).to.have.property('isValid', false);
        expect(result.errors).to.include('Field \'bank_name\' is required');
      });
    });

    describe('createPaymentRequest', () => {
      it('should create a payment request with valid data', async () => {
        const requestData = {
          tenantId: 'test-tenant',
          userId: 'test-user',
          paymentType: 'bank_transfer',
          amount: 100.00,
          currency: 'USD',
          description: 'Test payment',
          paymentDetails: {
            account_holder_name: 'John Doe',
            bank_name: 'Test Bank',
            account_number: '123456789',
            routing_number: '123456789'
          },
          fraudRiskScore: 25,
          fraudRiskLevel: 'low',
          fraudFlags: []
        };

        const result = await manualPaymentService.createPaymentRequest(requestData);
        
        expect(result).to.have.property('id');
        expect(result).to.have.property('payment_type', 'bank_transfer');
        expect(result).to.have.property('amount', 100.00);
        expect(result).to.have.property('status', 'pending');
      });
    });

    describe('checkDuplicatePaymentDetails', () => {
      it('should check for duplicate payment details', async () => {
        const paymentDetails = {
          account_number: '123456789',
          routing_number: '123456789'
        };

        const result = await manualPaymentService.checkDuplicatePaymentDetails(
          'test-tenant',
          paymentDetails,
          'bank_transfer'
        );
        
        expect(result).to.have.property('isDuplicate');
        expect(result).to.have.property('duplicateCount');
        expect(result).to.have.property('duplicateFields');
        expect(result).to.have.property('severity');
      });
    });

    describe('checkUnusualAmounts', () => {
      it('should check for unusual payment amounts', async () => {
        const result = await manualPaymentService.checkUnusualAmounts(
          'test-tenant',
          'test-user',
          10000.00,
          'USD'
        );
        
        expect(result).to.have.property('isUnusual');
        expect(result).to.have.property('currentAmount', 10000.00);
      });
    });
  });

  describe('PaymentApprovalService', () => {
    describe('createApprovalTicket', () => {
      it('should create an approval ticket for high-risk payment', async () => {
        const ticketData = {
          paymentRequestId: 'test-request-id',
          tenantId: 'test-tenant',
          priority: 'high',
          fraudAssessment: {
            riskLevel: 'high',
            riskScore: 75
          }
        };

        const result = await approvalService.createApprovalTicket(ticketData);
        
        expect(result).to.have.property('id');
        expect(result).to.have.property('priority', 'high');
        expect(result).to.have.property('status', 'open');
      });
    });

    describe('approvePaymentRequest', () => {
      it('should approve a payment request', async () => {
        const approvalData = {
          paymentRequestId: 'test-request-id',
          tenantId: 'test-tenant',
          adminId: 'admin-user',
          notes: 'Approved after review'
        };

        // Mock the database queries for approval
        mockDb.query = async (sql, params) => {
          if (sql.includes('UPDATE manual_payment_requests')) {
            return Promise.resolve({
              rows: [{
                id: 'test-request-id',
                status: 'approved',
                approved_by: 'admin-user',
                approved_at: new Date()
              }]
            });
          }
          if (sql.includes('UPDATE payment_approval_tickets')) {
            return Promise.resolve({
              rows: [{
                id: 'test-ticket-id',
                status: 'resolved'
              }]
            });
          }
          return Promise.resolve({ rows: [] });
        };

        const result = await approvalService.approvePaymentRequest(approvalData);
        
        expect(result).to.have.property('success', true);
        expect(result).to.have.property('paymentRequest');
        expect(result.paymentRequest).to.have.property('status', 'approved');
      });
    });
  });

  describe('NotificationService', () => {
    describe('sendPaymentRequestNotifications', () => {
      it('should send notifications for payment request status changes', async () => {
        const notificationData = {
          paymentRequestId: 'test-request-id',
          tenantId: 'test-tenant',
          userId: 'test-user',
          status: 'submitted',
          fraudRiskLevel: 'low'
        };

        // Mock the database queries for notifications
        mockDb.query = async (sql, params) => {
          if (sql.includes('manual_payment_requests')) {
            return Promise.resolve({
              rows: [{
                id: 'test-request-id',
                amount: 100.00,
                currency: 'USD',
                payment_type: 'bank_transfer',
                description: 'Test payment'
              }]
            });
          }
          return Promise.resolve({ rows: [] });
        };

        // This should not throw an error
        await notificationService.sendPaymentRequestNotifications(notificationData);
        
        // Verify that database queries were made
        expect(mockDb.queries.length).to.be.greaterThan(0);
      });
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete payment request workflow', async () => {
      // 1. Submit payment request
      const requestData = {
        tenantId: 'test-tenant',
        userId: 'test-user',
        paymentType: 'bank_transfer',
        amount: 500.00,
        currency: 'USD',
        description: 'Integration test payment',
        paymentDetails: {
          account_holder_name: 'John Doe',
          bank_name: 'Test Bank',
          account_number: '987654321',
          routing_number: '987654321'
        },
        fraudRiskScore: 45,
        fraudRiskLevel: 'medium',
        fraudFlags: ['unusual_amount']
      };

      const paymentRequest = await manualPaymentService.createPaymentRequest(requestData);
      expect(paymentRequest).to.have.property('id');

      // 2. Create approval ticket for medium risk
      const ticketData = {
        paymentRequestId: paymentRequest.id,
        tenantId: 'test-tenant',
        priority: 'normal',
        fraudAssessment: {
          riskLevel: 'medium',
          riskScore: 45
        }
      };

      const ticket = await approvalService.createApprovalTicket(ticketData);
      expect(ticket).to.have.property('id');

      // 3. Approve the payment request
      const approvalData = {
        paymentRequestId: paymentRequest.id,
        tenantId: 'test-tenant',
        adminId: 'admin-user',
        notes: 'Approved after manual review'
      };

      // Mock approval queries
      mockDb.query = async (sql, params) => {
        if (sql.includes('UPDATE manual_payment_requests')) {
          return Promise.resolve({
            rows: [{
              id: paymentRequest.id,
              status: 'approved',
              approved_by: 'admin-user'
            }]
          });
        }
        if (sql.includes('UPDATE payment_approval_tickets')) {
          return Promise.resolve({
            rows: [{
              id: ticket.id,
              status: 'resolved'
            }]
          });
        }
        return Promise.resolve({ rows: [] });
      };

      const approvalResult = await approvalService.approvePaymentRequest(approvalData);
      expect(approvalResult).to.have.property('success', true);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock database error
      mockDb.query = async () => {
        throw new Error('Database connection failed');
      };

      try {
        await manualPaymentService.getPaymentRequestTypes();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Failed to fetch payment request types');
      }
    });

    it('should handle invalid payment types', async () => {
      const result = await manualPaymentService.getPaymentRequestType('invalid_type');
      expect(result).to.be.null;
    });

    it('should handle validation errors', async () => {
      const result = await manualPaymentService.validatePaymentDetails('invalid_type', {});
      expect(result).to.have.property('isValid', false);
      expect(result.errors).to.include('Invalid payment type');
    });
  });
});

module.exports = {
  ManualPaymentRequestService,
  PaymentApprovalService,
  NotificationService
};
