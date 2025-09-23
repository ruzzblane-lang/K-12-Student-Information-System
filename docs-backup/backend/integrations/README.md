# Third-Party API Integrations

This module provides a comprehensive, modular framework for integrating third-party APIs with the School SIS system. It includes role-based access control, tenant-specific configuration, security features, and compliance monitoring.

## Features

- **Modular Architecture**: Each integration is self-contained and can be enabled/disabled per tenant
- **Role-Based Access Control**: Fine-grained permissions for different user roles
- **Tenant Configuration**: Isolated configurations for multi-tenant environments
- **Security & Compliance**: Encryption, audit logging, and FERPA/GDPR compliance
- **Rate Limiting**: Built-in protection against API abuse
- **Health Monitoring**: Real-time health checks and status monitoring
- **Webhook Support**: Secure webhook handling for real-time updates

## Supported Integrations

### Education & Productivity
- **Google Workspace for Education**
  - Google Drive (file storage and sharing)
  - Google Docs (document collaboration)
  - Google Calendar (scheduling and events)
  - Gmail (email communication)
  - Google Classroom (course management)
  - Google Meet (video conferencing)

- **Microsoft 365 Education**
  - Microsoft Teams (collaboration and meetings)
  - Outlook (email and calendar)
  - OneDrive (file storage and sharing)
  - SharePoint (document management)
  - Microsoft Graph (user and group management)

### Communication
- **Twilio**
  - SMS messaging
  - Voice calls
  - WhatsApp messaging
  - Emergency alerts

- **SendGrid**
  - Email delivery
  - Email templates
  - Marketing campaigns
  - Email analytics

### Payment Processing
- **Stripe**
  - Payment processing
  - Subscription management
  - Invoice generation
  - Refund processing

### Learning Platforms
- **Khan Academy**
  - Course content access
  - Student progress tracking
  - Exercise completion
  - Badge and achievement tracking

### Utility Services
- **Weather APIs**
  - School closure notifications
  - Athletic event planning
  - Field trip weather monitoring
  - Emergency weather alerts

## Architecture

```
integrations/
├── index.js                          # Main exports and constants
├── integrations.js                   # Main module initialization
├── services/
│   ├── IntegrationManager.js         # Central integration management
│   ├── TenantConfigService.js        # Tenant configuration management
│   ├── SecurityService.js            # Security and encryption
│   └── AuditService.js               # Audit logging and compliance
├── providers/
│   ├── google/
│   │   └── GoogleWorkspaceIntegration.js
│   ├── microsoft/
│   │   └── Microsoft365Integration.js
│   ├── communication/
│   │   ├── TwilioIntegration.js
│   │   └── SendGridIntegration.js
│   ├── payment/
│   │   └── StripeIntegration.js
│   ├── learning/
│   │   └── KhanAcademyIntegration.js
│   └── utility/
│       └── WeatherIntegration.js
├── controllers/
│   └── IntegrationController.js      # HTTP request handlers
├── routes/
│   └── integrations.js               # API routes
└── scripts/
    └── initializeIntegrations.js     # Integration initialization
```

## Installation

1. Install required dependencies:
```bash
npm install googleapis @microsoft/microsoft-graph-client twilio @sendgrid/mail stripe axios
```

2. Run database migration:
```bash
npm run db:migrate
```

3. Initialize integrations in your application:
```javascript
const { initializeIntegrations } = require('./integrations');

// Initialize all integrations
await initializeIntegrations();
```

## Configuration

### Environment Variables

Add the following environment variables to your `.env` file:

```env
# Integration Security
INTEGRATION_ENCRYPTION_KEY=your-32-character-encryption-key

# Google Workspace
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=your-redirect-uri

# Microsoft 365
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
MICROSOFT_TENANT_ID=your-tenant-id

# Twilio
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_FROM_NUMBER=your-twilio-phone-number

# SendGrid
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=your-from-email

# Stripe
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret

# Weather API
WEATHER_API_KEY=your-weather-api-key
```

### Tenant Configuration

Configure integrations for each tenant through the API:

```javascript
// Enable Google Workspace for a tenant
PUT /api/integrations/{tenantId}/google_workspace/config
{
  "enabled": true,
  "config": {
    "client_id": "tenant-specific-client-id",
    "client_secret": "tenant-specific-client-secret",
    "refresh_token": "tenant-refresh-token"
  }
}
```

## API Usage

### Get Available Integrations

```javascript
GET /api/integrations/{tenantId}
```

### Execute Integration Method

```javascript
POST /api/integrations/{tenantId}/{provider}/{method}
{
  "args": ["arg1", "arg2", "arg3"]
}
```

### Get Integration Health

```javascript
GET /api/integrations/{tenantId}/{provider}/health
```

### Get Usage Statistics

```javascript
GET /api/integrations/{tenantId}/stats?provider=google_workspace
```

## Security Features

### Data Encryption
- All sensitive configuration data is encrypted using AES-256-GCM
- Tenant-specific encryption keys derived using PBKDF2
- API keys and tokens are encrypted at rest

### Rate Limiting
- Provider-specific rate limits
- Tenant-based rate limiting
- Method-specific rate limits

### Audit Logging
- All integration activities are logged
- Data access logging for compliance
- Configuration change tracking
- Security event monitoring

### Webhook Security
- Signature validation for all webhooks
- Provider-specific validation methods
- Secure webhook processing

## Compliance

### FERPA Compliance
- Student data access logging
- Consent management
- Data retention policies
- Audit trail maintenance

### GDPR Compliance
- Data processing records
- User consent tracking
- Right to be forgotten
- Data portability

### PCI DSS Compliance
- Secure payment processing
- Tokenization of sensitive data
- Regular security assessments
- Incident response procedures

## Monitoring and Health Checks

### Health Check Endpoints
- Individual integration health: `/api/integrations/{tenantId}/{provider}/health`
- All integrations health: `/api/integrations/{tenantId}/health`

### Metrics and Analytics
- API usage statistics
- Performance metrics
- Error rates and patterns
- Cost tracking

### Alerting
- Integration failure alerts
- Rate limit violations
- Security incident notifications
- Performance degradation warnings

## Development

### Adding New Integrations

1. Create integration class in appropriate provider directory
2. Implement required methods: `initialize`, `authenticate`, `healthCheck`
3. Register integration in `initializeIntegrations.js`
4. Add provider constant to `index.js`
5. Create database migration if needed
6. Add tests

### Integration Class Template

```javascript
class NewIntegration {
  constructor() {
    this.name = 'Integration Name';
    this.provider = 'provider_key';
    this.version = '1.0.0';
    this.category = 'category';
  }

  async initialize(config) {
    // Initialize the integration
  }

  async authenticate(config) {
    // Authenticate with the service
  }

  async healthCheck() {
    // Check integration health
  }

  // Add provider-specific methods
}
```

## Testing

Run integration tests:

```bash
npm test integrations/
```

Run specific integration tests:

```bash
npm test integrations/providers/google/
```

## Troubleshooting

### Common Issues

1. **Authentication Failures**
   - Check API credentials
   - Verify token expiration
   - Ensure proper scopes/permissions

2. **Rate Limiting**
   - Check rate limit configuration
   - Implement exponential backoff
   - Consider upgrading API plans

3. **Webhook Failures**
   - Verify webhook signatures
   - Check endpoint accessibility
   - Review webhook payload format

### Debug Mode

Enable debug logging:

```javascript
process.env.LOG_LEVEL = 'debug';
```

### Health Check Failures

Check integration health:

```javascript
const health = await integrationManager.performHealthCheck();
console.log(health);
```

## Support

For integration-specific issues:

1. Check the provider's API documentation
2. Review integration logs in `logs/` directory
3. Verify configuration and credentials
4. Check rate limits and quotas
5. Contact support with detailed error logs

## License

This integration framework is part of the School SIS project and is licensed under the MIT License.
