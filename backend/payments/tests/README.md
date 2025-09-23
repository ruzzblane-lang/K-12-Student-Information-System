# Payment Gateway Tests

This directory contains comprehensive tests for the Payment Gateway API (Fort Knox Edition).

## Test Structure

```
tests/
├── unit/                    # Unit tests for individual components
│   ├── paymentOrchestrationService.test.js
│   ├── fraudDetectionService.test.js
│   ├── currencyService.test.js
│   ├── whiteLabelPaymentService.test.js
│   ├── stripeProvider.test.js
│   ├── paypalProvider.test.js
│   └── adyenProvider.test.js
├── integration/             # Integration tests for API endpoints
│   ├── paymentGateway.test.js
│   ├── webhookController.test.js
│   └── paymentController.test.js
├── e2e/                     # End-to-end tests for complete flows
│   ├── paymentFlow.test.js
│   ├── fraudDetectionFlow.test.js
│   └── whiteLabelFlow.test.js
├── setup.js                 # Test setup and configuration
├── jest.config.js          # Jest configuration
└── README.md               # This file
```

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test Suites
```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# End-to-end tests only
npm run test:e2e

# Tests with coverage
npm run test:coverage
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Specific Test Files
```bash
# Run a specific test file
npm test -- paymentOrchestrationService.test.js

# Run tests matching a pattern
npm test -- --testNamePattern="Payment Processing"
```

## Test Categories

### Unit Tests
- **Purpose**: Test individual components in isolation
- **Scope**: Single functions, methods, or classes
- **Mocking**: Heavy use of mocks for external dependencies
- **Speed**: Fast execution
- **Coverage**: High code coverage

### Integration Tests
- **Purpose**: Test interactions between components
- **Scope**: API endpoints, service integrations
- **Mocking**: Limited mocking, real database connections
- **Speed**: Medium execution time
- **Coverage**: API endpoint coverage

### End-to-End Tests
- **Purpose**: Test complete user workflows
- **Scope**: Full payment flows from start to finish
- **Mocking**: Minimal mocking, real external services
- **Speed**: Slower execution
- **Coverage**: Business logic coverage

## Test Data

### Mock Data
The tests use consistent mock data defined in `setup.js`:

- `createMockPaymentData()` - Standard payment data
- `createMockRefundData()` - Refund request data
- `createMockFraudAssessmentData()` - Fraud assessment data
- `createMockPaymentFlowData()` - Payment flow configuration

### Database Mocking
Tests use a mock database that can be configured with different responses:

```javascript
// Mock successful database responses
mockSuccessfulDbQuery(mockDb);

// Mock specific database responses
mockDbQuery(mockDb, [
  { rows: [{ id: '1', name: 'Test' }] },
  { rows: [] },
  { rows: [{ error: 'Database error' }] }
]);

// Mock database errors
mockDbError(mockDb, new Error('Connection failed'));
```

## Test Configuration

### Environment Variables
Tests use mock environment variables defined in `setup.js`:

- `NODE_ENV=test`
- `BASE_URL=https://api.test.schoolsis.com`
- Mock API keys for all payment providers
- Mock encryption keys and secrets

### External Dependencies
All external dependencies are mocked:

- **Stripe**: Mocked Stripe SDK
- **PayPal**: Mocked PayPal REST SDK
- **Adyen**: Mocked Adyen API Library
- **Axios**: Mocked HTTP client
- **Crypto**: Mocked encryption functions
- **UUID**: Mocked UUID generation

## Writing Tests

### Test Structure
Follow the AAA pattern (Arrange, Act, Assert):

```javascript
describe('Component Name', () => {
  it('should do something specific', async () => {
    // Arrange - Set up test data and mocks
    const mockData = createMockPaymentData();
    mockDb.query.mockResolvedValue({ rows: [] });

    // Act - Execute the code under test
    const result = await service.processPayment(mockData);

    // Assert - Verify the results
    expect(result.success).toBe(true);
    expect(result.transactionId).toBeDefined();
  });
});
```

### Test Naming
Use descriptive test names that explain the expected behavior:

```javascript
// Good
it('should process payment successfully with valid data')
it('should throw error when payment amount is negative')
it('should retry payment with next provider when first fails')

// Bad
it('should work')
it('should handle error')
it('should test payment')
```

### Assertions
Use specific assertions that clearly indicate what is being tested:

```javascript
// Good
expect(result.success).toBe(true);
expect(result.transactionId).toMatch(/^txn_/);
expect(mockProvider.processPayment).toHaveBeenCalledWith(
  expect.objectContaining({
    amount: 100.00,
    currency: 'USD'
  })
);

// Bad
expect(result).toBeTruthy();
expect(result).toBeDefined();
```

## Coverage Requirements

### Minimum Coverage
- **Unit Tests**: 90% code coverage
- **Integration Tests**: 80% API endpoint coverage
- **E2E Tests**: 70% business flow coverage

### Coverage Reports
Coverage reports are generated in the `coverage/` directory:

- `coverage/lcov-report/index.html` - HTML coverage report
- `coverage/lcov.info` - LCOV coverage data
- `coverage/coverage-summary.txt` - Text summary

## Continuous Integration

### GitHub Actions
Tests run automatically on:

- Pull request creation
- Push to main branch
- Scheduled nightly runs

### Test Matrix
Tests run against:

- Node.js 18.x
- Node.js 20.x
- Node.js 21.x

### Quality Gates
Pull requests must pass:

- All unit tests
- All integration tests
- All end-to-end tests
- Minimum coverage requirements
- Linting checks

## Debugging Tests

### Running Tests in Debug Mode
```bash
# Run tests with debug output
DEBUG=* npm test

# Run specific test with debug
DEBUG=* npm test -- paymentOrchestrationService.test.js
```

### Common Issues

1. **Timeout Errors**: Increase timeout in `jest.config.js`
2. **Mock Issues**: Check mock setup in `setup.js`
3. **Database Errors**: Verify mock database configuration
4. **Async Issues**: Ensure proper async/await usage

### Test Debugging Tips

1. Use `console.log()` for debugging (mocked in tests)
2. Check mock call counts with `toHaveBeenCalledTimes()`
3. Verify mock call arguments with `toHaveBeenCalledWith()`
4. Use `jest.clearAllMocks()` between tests
5. Check test isolation and cleanup

## Performance Testing

### Load Testing
For performance testing, use dedicated tools:

- **Artillery**: Load testing framework
- **K6**: Performance testing tool
- **JMeter**: Apache performance testing

### Performance Benchmarks
- Payment processing: < 2 seconds
- Fraud assessment: < 500ms
- Currency conversion: < 200ms
- Webhook processing: < 100ms

## Security Testing

### Security Test Categories
- Input validation testing
- Authentication and authorization
- Data encryption and decryption
- Fraud detection accuracy
- Webhook signature verification

### Security Test Tools
- **OWASP ZAP**: Security vulnerability scanner
- **Burp Suite**: Web application security testing
- **Nmap**: Network security scanner

## Maintenance

### Test Maintenance Tasks
- Update mocks when external APIs change
- Refresh test data periodically
- Review and update test coverage
- Clean up obsolete tests
- Update test documentation

### Test Review Process
- Code review for all test changes
- Regular test suite performance review
- Coverage report analysis
- Test failure investigation and resolution
