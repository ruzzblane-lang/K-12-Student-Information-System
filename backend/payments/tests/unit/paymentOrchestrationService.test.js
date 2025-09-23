/**
 * Payment Orchestration Service Unit Tests
 */

const PaymentOrchestrationService = require('../../services/PaymentOrchestrationService');

// Mock database
const mockDb = {
  query: jest.fn()
};

// Mock providers
const mockProvider = {
  providerName: 'test',
  processPayment: jest.fn(),
  processRefund: jest.fn(),
  getPaymentStatus: jest.fn(),
  isCurrencySupported: jest.fn(),
  isPaymentMethodSupported: jest.fn(),
  getCapabilities: jest.fn()
};

describe('PaymentOrchestrationService', () => {
  let orchestrationService;

  beforeEach(() => {
    orchestrationService = new PaymentOrchestrationService(mockDb);
    jest.clearAllMocks();
  });

  describe('processPayment', () => {
    it('should process payment successfully', async () => {
      // Arrange
      const paymentData = {
        tenantId: 'tenant-123',
        amount: 100.00,
        currency: 'USD',
        paymentMethod: 'card'
      };

      mockProvider.isCurrencySupported.mockReturnValue(true);
      mockProvider.isPaymentMethodSupported.mockReturnValue(true);
      mockProvider.processPayment.mockResolvedValue({
        success: true,
        transactionId: 'txn-123',
        result: {
          status: 'succeeded',
          providerTransactionId: 'provider-123',
          amount: 100.00,
          currency: 'USD'
        }
      });

      mockDb.query.mockResolvedValue({ rows: [] });

      orchestrationService.registerProvider('test', mockProvider);

      // Act
      const result = await orchestrationService.processPayment(paymentData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.provider).toBe('test');
      expect(result.transactionId).toBe('txn-123');
      expect(mockProvider.processPayment).toHaveBeenCalledWith(
        expect.objectContaining(paymentData)
      );
    });

    it('should handle provider failure and try next provider', async () => {
      // Arrange
      const paymentData = {
        tenantId: 'tenant-123',
        amount: 100.00,
        currency: 'USD',
        paymentMethod: 'card'
      };

      const mockProvider2 = { ...mockProvider, providerName: 'test2' };

      mockProvider.isCurrencySupported.mockReturnValue(true);
      mockProvider.isPaymentMethodSupported.mockReturnValue(true);
      mockProvider.processPayment.mockRejectedValue(new Error('Provider 1 failed'));

      mockProvider2.isCurrencySupported.mockReturnValue(true);
      mockProvider2.isPaymentMethodSupported.mockReturnValue(true);
      mockProvider2.processPayment.mockResolvedValue({
        success: true,
        transactionId: 'txn-456',
        result: {
          status: 'succeeded',
          providerTransactionId: 'provider-456',
          amount: 100.00,
          currency: 'USD'
        }
      });

      mockDb.query.mockResolvedValue({ rows: [] });

      orchestrationService.registerProvider('test', mockProvider);
      orchestrationService.registerProvider('test2', mockProvider2);

      // Act
      const result = await orchestrationService.processPayment(paymentData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.provider).toBe('test2');
      expect(result.transactionId).toBe('txn-456');
    });

    it('should throw error when all providers fail', async () => {
      // Arrange
      const paymentData = {
        tenantId: 'tenant-123',
        amount: 100.00,
        currency: 'USD',
        paymentMethod: 'card'
      };

      mockProvider.isCurrencySupported.mockReturnValue(true);
      mockProvider.isPaymentMethodSupported.mockReturnValue(true);
      mockProvider.processPayment.mockRejectedValue(new Error('Provider failed'));

      mockDb.query.mockResolvedValue({ rows: [] });

      orchestrationService.registerProvider('test', mockProvider);

      // Act & Assert
      await expect(orchestrationService.processPayment(paymentData))
        .rejects.toThrow('All payment providers failed');
    });

    it('should validate payment data', async () => {
      // Arrange
      const invalidPaymentData = {
        tenantId: 'tenant-123',
        amount: -100.00, // Invalid amount
        currency: 'USD',
        paymentMethod: 'card'
      };

      // Act & Assert
      await expect(orchestrationService.processPayment(invalidPaymentData))
        .rejects.toThrow('Payment amount must be greater than 0');
    });
  });

  describe('processRefund', () => {
    it('should process refund successfully', async () => {
      // Arrange
      const refundData = {
        originalTransactionId: 'txn-123',
        amount: 50.00,
        tenantId: 'tenant-123'
      };

      const originalTransaction = {
        provider: 'test',
        providerTransactionId: 'provider-123',
        currency: 'USD'
      };

      mockDb.query.mockResolvedValue({ rows: [originalTransaction] });
      mockProvider.processRefund.mockResolvedValue({
        success: true,
        refundId: 'refund-123',
        amount: 50.00,
        currency: 'USD'
      });

      orchestrationService.registerProvider('test', mockProvider);

      // Act
      const result = await orchestrationService.processRefund(refundData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.refundId).toBe('refund-123');
      expect(mockProvider.processRefund).toHaveBeenCalledWith(
        expect.objectContaining({
          originalTransactionId: 'provider-123',
          amount: 50.00,
          tenantId: 'tenant-123'
        })
      );
    });

    it('should throw error when original transaction not found', async () => {
      // Arrange
      const refundData = {
        originalTransactionId: 'txn-nonexistent',
        amount: 50.00,
        tenantId: 'tenant-123'
      };

      mockDb.query.mockResolvedValue({ rows: [] });

      // Act & Assert
      await expect(orchestrationService.processRefund(refundData))
        .rejects.toThrow('Original transaction not found');
    });
  });

  describe('getPaymentStatus', () => {
    it('should get payment status successfully', async () => {
      // Arrange
      const transactionId = 'txn-123';
      const transaction = {
        provider: 'test',
        providerTransactionId: 'provider-123'
      };

      mockDb.query.mockResolvedValue({ rows: [transaction] });
      mockProvider.getPaymentStatus.mockResolvedValue({
        success: true,
        status: 'succeeded',
        amount: 100.00,
        currency: 'USD'
      });

      orchestrationService.registerProvider('test', mockProvider);

      // Act
      const result = await orchestrationService.getPaymentStatus(transactionId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.status).toBe('succeeded');
      expect(mockProvider.getPaymentStatus).toHaveBeenCalledWith('provider-123');
    });

    it('should throw error when transaction not found', async () => {
      // Arrange
      const transactionId = 'txn-nonexistent';
      mockDb.query.mockResolvedValue({ rows: [] });

      // Act & Assert
      await expect(orchestrationService.getPaymentStatus(transactionId))
        .rejects.toThrow('Transaction not found');
    });
  });

  describe('getOrchestrationStats', () => {
    it('should return orchestration statistics', async () => {
      // Arrange
      const mockStats = {
        total_payments: 100,
        successful_payments: 95,
        failed_payments: 5,
        avg_processing_time: 1500,
        providers_used: 3
      };

      mockDb.query.mockResolvedValue({ rows: [mockStats] });

      // Act
      const result = await orchestrationService.getOrchestrationStats('tenant-123', '30d');

      // Assert
      expect(result).toEqual(mockStats);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['tenant-123']
      );
    });
  });

  describe('getProviderMetrics', () => {
    it('should return provider metrics', async () => {
      // Arrange
      const mockMetrics = [
        {
          provider: 'stripe',
          total_attempts: 50,
          successful_attempts: 48,
          success_rate: 96.00,
          avg_processing_time: 1200
        },
        {
          provider: 'paypal',
          total_attempts: 30,
          successful_attempts: 28,
          success_rate: 93.33,
          avg_processing_time: 1800
        }
      ];

      mockDb.query.mockResolvedValue({ rows: mockMetrics });

      // Act
      const result = await orchestrationService.getProviderMetrics('tenant-123');

      // Assert
      expect(result).toEqual(mockMetrics);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['tenant-123']
      );
    });
  });
});
