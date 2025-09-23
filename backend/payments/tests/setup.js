/**
 * Jest Test Setup
 * 
 * Global test configuration and setup for payment gateway tests.
 */

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.BASE_URL = 'https://api.test.schoolsis.com';
process.env.STRIPE_SECRET_KEY = 'sk_test_mock';
process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_mock';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_mock';
process.env.PAYPAL_CLIENT_ID = 'mock_client_id';
process.env.PAYPAL_CLIENT_SECRET = 'mock_client_secret';
process.env.PAYPAL_WEBHOOK_SECRET = 'mock_webhook_secret';
process.env.ADYEN_API_KEY = 'mock_api_key';
process.env.ADYEN_MERCHANT_ACCOUNT = 'mock_merchant';
process.env.ADYEN_WEBHOOK_SECRET = 'mock_webhook_secret';
process.env.PAYMENT_ENCRYPTION_KEY = 'mock_encryption_key';
process.env.FRAUD_DETECTION_ENABLED = 'true';
process.env.EXCHANGE_RATE_API_KEY = 'mock_exchange_api_key';
process.env.DEFAULT_CURRENCY = 'USD';

// Global test timeout
jest.setTimeout(30000);

// Mock external dependencies
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: jest.fn(),
      retrieve: jest.fn(),
      update: jest.fn()
    },
    customers: {
      create: jest.fn(),
      retrieve: jest.fn(),
      update: jest.fn()
    },
    paymentMethods: {
      create: jest.fn(),
      retrieve: jest.fn(),
      list: jest.fn(),
      detach: jest.fn()
    },
    refunds: {
      create: jest.fn(),
      retrieve: jest.fn()
    },
    webhooks: {
      constructEvent: jest.fn()
    },
    accounts: {
      retrieve: jest.fn()
    }
  }));
});

jest.mock('paypal-rest-sdk', () => ({
  configure: jest.fn(),
  request: jest.fn()
}));

jest.mock('@adyen/api-library', () => ({
  Client: jest.fn().mockImplementation(() => ({
    checkout: {
      payments: jest.fn(),
      getPaymentMethods: jest.fn(),
      getPaymentDetails: jest.fn(),
      storeDetail: jest.fn()
    },
    payments: {
      authorise: jest.fn(),
      capture: jest.fn(),
      refund: jest.fn()
    },
    payouts: {
      storeDetailAndSubmitThirdParty: jest.fn()
    }
  })),
  Config: jest.fn().mockImplementation(() => ({}))
}));

jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn()
}));

// Mock crypto module
jest.mock('crypto', () => ({
  createHmac: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'mock_signature')
  })),
  createCipherGCM: jest.fn(() => ({
    setAAD: jest.fn().mockReturnThis(),
    update: jest.fn(() => 'encrypted_data'),
    final: jest.fn(() => 'final_data'),
    getAuthTag: jest.fn(() => 'auth_tag')
  })),
  createDecipherGCM: jest.fn(() => ({
    setAAD: jest.fn().mockReturnThis(),
    setAuthTag: jest.fn().mockReturnThis(),
    update: jest.fn(() => 'decrypted_data'),
    final: jest.fn(() => 'final_data')
  })),
  randomBytes: jest.fn(() => Buffer.from('random_bytes'))
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234-5678-9012-345678901234')
}));

// Mock express-validator
jest.mock('express-validator', () => ({
  body: jest.fn(() => ({
    isFloat: jest.fn().mockReturnThis(),
    isLength: jest.fn().mockReturnThis(),
    isUppercase: jest.fn().mockReturnThis(),
    isIn: jest.fn().mockReturnThis(),
    isObject: jest.fn().mockReturnThis(),
    isURL: jest.fn().mockReturnThis(),
    isCreditCard: jest.fn().mockReturnThis(),
    isInt: jest.fn().mockReturnThis(),
    isNumeric: jest.fn().mockReturnThis(),
    matches: jest.fn().mockReturnThis(),
    withMessage: jest.fn().mockReturnThis(),
    optional: jest.fn().mockReturnThis()
  })),
  validationResult: jest.fn(() => ({
    isEmpty: jest.fn(() => true),
    array: jest.fn(() => [])
  }))
}));

// Global test utilities
global.createMockPaymentData = (overrides = {}) => ({
  tenantId: 'tenant-123',
  userId: 'user-123',
  amount: 100.00,
  currency: 'USD',
  paymentMethod: 'card',
  description: 'Test payment',
  metadata: {
    studentId: 'student-123',
    feeType: 'tuition'
  },
  ...overrides
});

global.createMockRefundData = (overrides = {}) => ({
  tenantId: 'tenant-123',
  originalTransactionId: 'txn-123',
  amount: 50.00,
  reason: 'Customer request',
  ...overrides
});

global.createMockFraudAssessmentData = (overrides = {}) => ({
  tenantId: 'tenant-123',
  userId: 'user-123',
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
  },
  ...overrides
});

global.createMockPaymentFlowData = (overrides = {}) => ({
  tenantId: 'tenant-123',
  branding: {
    primaryColor: '#1e40af',
    secondaryColor: '#3b82f6',
    fontFamily: 'Inter, system-ui, sans-serif',
    schoolName: 'Test School',
    logo: 'https://example.com/logo.png'
  },
  paymentConfig: {
    amount: 100.00,
    currency: 'USD',
    description: 'Test payment flow',
    allowedPaymentMethods: ['card', 'paypal']
  },
  features: {
    savePaymentMethod: true,
    recurringPayments: false,
    installments: false,
    multiCurrency: true
  },
  security: {
    fraudDetection: true,
    requireAuthentication: true,
    allowedCountries: ['US', 'CA', 'GB'],
    blockedCountries: []
  },
  ...overrides
});

// Mock database query responses
global.mockDbQuery = (mockDb, responses = []) => {
  let callCount = 0;
  mockDb.query.mockImplementation(() => {
    const response = responses[callCount] || { rows: [] };
    callCount++;
    return Promise.resolve(response);
  });
};

// Mock successful database responses
global.mockSuccessfulDbQuery = (mockDb) => {
  mockDb.query.mockResolvedValue({ rows: [] });
};

// Mock database error
global.mockDbError = (mockDb, error = new Error('Database error')) => {
  mockDb.query.mockRejectedValue(error);
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Global error handler for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
