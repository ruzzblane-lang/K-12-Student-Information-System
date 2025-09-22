// Jest setup file for backend tests
const { TextEncoder, TextDecoder } = require('util');

// Mock global objects that isomorphic-dompurify might need
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock DOMPurify for tests
jest.mock('isomorphic-dompurify', () => ({
  sanitize: jest.fn((input) => input),
  sanitizeWithResult: jest.fn((input) => ({ html: input, changed: false })),
}));

// Mock authentication middleware
jest.mock('../middleware/auth', () => ({
  authMiddleware: (req, res, next) => {
    req.user = { id: 1, role: 'admin' };
    next();
  },
  optionalAuth: (req, res, next) => {
    req.user = { id: 1, role: 'admin' };
    next();
  },
  generateToken: jest.fn(() => 'mock-jwt-token'),
  generateRefreshToken: jest.fn(() => 'mock-refresh-token')
}));

// Mock tenant context middleware
jest.mock('../middleware/tenantContext', () => ({
  tenantContextMiddleware: (req, res, next) => {
    req.tenant = { id: 1, name: 'Test Tenant' };
    next();
  }
}));

// Mock RBAC middleware
jest.mock('../middleware/rbac', () => ({
  rbacMiddleware: (roles) => (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: { code: 'AUTHENTICATION_REQUIRED' } });
    }
    // Allow all roles for testing
    next();
  }
}));

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
};
