<!-- Migrated from: backend/payments/README_MANUAL_PAYMENTS.md -->

# Manual Payment Request System

## Overview

The Manual Payment Request System provides an alternative payment submission method for users who need to make payments through non-standard payment methods such as bank transfers, checks, cryptocurrency, or other manual payment methods.

## Features

### Core Functionality
- **Multiple Payment Types**: Support for bank transfers, card payments, e-wallets, cryptocurrency, checks, and cash
- **Fraud Prevention**: Advanced fraud detection and risk assessment for all manual payment requests
- **Approval Workflow**: Admin approval system with ticket-based workflow management
- **Audit Logging**: Comprehensive audit trail for all payment decisions and workflow actions
- **Notifications**: Automated notifications for status changes and approval requirements

### Payment Types Supported
1. **Bank Transfer**: Direct bank transfers with IBAN, routing numbers, and account details
2. **Card Payment**: Credit/debit card payments with card details and CVV
3. **E-Wallet**: Electronic wallet payments (PayPal, Venmo, etc.)
4. **Cryptocurrency**: Bitcoin, Ethereum, and other cryptocurrency payments
5. **Check**: Check payments with check numbers and bank details
6. **Cash**: Cash payments with receipt numbers and location details
7. **Other**: Custom payment methods with flexible detail fields

### Fraud Prevention Features
- **Risk Scoring**: 0-100 risk score based on multiple factors
- **Velocity Checks**: Frequency and amount limits per user/timeframe
- **Pattern Detection**: Suspicious payment detail patterns
- **Blacklist Checking**: Integration with fraud blacklists
- **Behavioral Analysis**: User payment history analysis
- **Geolocation Analysis**: Location-based risk assessment

## API Endpoints

### Payment Request Management
- `POST /api/payments/manual/request` - Submit a manual payment request
- `GET /api/payments/manual/requests` - Get user's payment requests
- `GET /api/payments/manual/requests/:requestId` - Get payment request details
- `GET /api/payments/manual/types` - Get available payment request types

### Admin Approval
- `POST /api/payments/manual/requests/:requestId/approve` - Approve payment request (Admin)
- `POST /api/payments/manual/requests/:requestId/reject` - Reject payment request (Admin)
- `GET /api/payments/manual/approvals` - Get pending approval tickets (Admin)
- `POST /api/payments/manual/approvals/:ticketId/assign` - Assign approval ticket (Admin)

### Document Management
- `POST /api/payments/manual/requests/:requestId/documents` - Upload supporting document

### Notifications
- `GET /api/payments/manual/notifications` - Get user notifications
- `PUT /api/payments/manual/notifications/:notificationId/read` - Mark notification as read

### Statistics
- `GET /api/payments/manual/stats` - Get payment request statistics
- `GET /api/payments/manual/notifications/stats` - Get notification statistics
- `GET /api/payments/manual/approvals/stats` - Get approval statistics (Admin)

## Database Schema

### Core Tables
- `payment_request_types` - Payment type definitions and validation rules
- `manual_payment_requests` - Main payment request records
- `payment_approval_tickets` - Approval workflow tickets
- `payment_approval_workflow_logs` - Audit log for workflow actions
- `payment_request_fraud_assessments` - Fraud risk assessments
- `payment_request_documents` - Supporting documents
- `payment_request_notifications` - User notifications
- `payment_request_escalation_rules` - Escalation rules for overdue tickets

## Workflow Process

### 1. Payment Request Submission
1. User selects payment type and fills required details
2. System validates payment details against type requirements
3. Fraud assessment is performed automatically
4. Payment request is created with risk score and level
5. Approval ticket is created if risk level is medium or higher
6. Notifications are sent to user and relevant admins

### 2. Admin Review Process
1. Admin receives notification of new payment request
2. Admin views request details and fraud assessment
3. Admin can approve, reject, or request additional information
4. System logs all decisions and sends notifications
5. Payment request status is updated accordingly

### 3. Fraud Prevention
1. Real-time fraud assessment on submission
2. Multiple risk factors evaluated (velocity, amount, location, etc.)
3. Risk score calculated (0-100)
4. Risk level determined (low, medium, high, critical)
5. Automatic flagging of suspicious requests
6. Integration with existing fraud detection system

## Configuration

### Payment Type Configuration
Payment types are configurable through the `payment_request_types` table:
- Required fields for each payment type
- Validation rules (patterns, length limits)
- Display names and descriptions

### Fraud Detection Rules
Fraud detection rules can be configured through the API:
- Velocity limits (transactions per hour/day, amounts)
- Risk thresholds and scoring weights
- Blacklist management
- Suspicious pattern detection rules

### Notification Settings
Notifications can be configured for:
- Email templates and preferences
- Notification triggers and recipients
- Escalation rules for overdue approvals

## Security Considerations

### Data Protection
- All payment details are encrypted in transit and at rest
- Sensitive fields (card numbers, CVV) are masked in logs
- Access controls based on user roles and permissions
- Audit logging for all sensitive operations

### Fraud Prevention
- Multiple layers of fraud detection
- Real-time risk assessment
- Machine learning integration capabilities
- Blacklist management and monitoring
- Behavioral analysis and pattern recognition

### Access Control
- Role-based access control (RBAC)
- Admin-only approval endpoints
- Tenant isolation for multi-tenant environments
- API rate limiting and authentication

## Frontend Components

### User Components
- `ManualPaymentRequestForm` - Payment request submission form
- Payment type selection with dynamic field rendering
- Real-time validation and error handling
- Fraud assessment display
- Document upload functionality

### Admin Components
- `PaymentApprovalDashboard` - Admin approval interface
- Pending requests table with filtering and sorting
- Risk assessment visualization
- Approval/rejection workflows
- Statistics and reporting

## Installation and Setup

### 1. Database Migration
```bash
# Run the migration script
node scripts/run-manual-payment-migration.js
```

### 2. Backend Configuration
The manual payment system is automatically initialized when the payment service starts. Ensure the following services are available:
- Payment Orchestration Service
- Fraud Detection Service
- Notification Service

### 3. Frontend Integration
Import and use the provided React components:
```jsx
import ManualPaymentRequestForm from './components/ManualPaymentRequestForm';
import PaymentApprovalDashboard from './components/PaymentApprovalDashboard';
```

### 4. Admin Role Configuration
Ensure admin users have the following roles:
- `admin`
- `super_admin`
- `payment_admin`
- `finance_admin`

## Testing

### Unit Tests
- Service layer tests for all business logic
- Controller tests for API endpoints
- Validation tests for payment details
- Fraud detection algorithm tests

### Integration Tests
- End-to-end payment request workflow
- Admin approval process
- Notification delivery
- Database transaction integrity

### Manual Testing
- Payment type validation
- Fraud detection accuracy
- Admin workflow efficiency
- Notification delivery reliability

## Monitoring and Maintenance

### Key Metrics
- Payment request volume and success rates
- Fraud detection accuracy and false positive rates
- Admin approval response times
- System performance and error rates

### Maintenance Tasks
- Regular fraud rule updates
- Blacklist management
- Performance optimization
- Security audits and updates

## Troubleshooting

### Common Issues
1. **Migration failures**: Check database permissions and connectivity
2. **Fraud false positives**: Adjust risk thresholds and rules
3. **Notification delivery**: Verify email configuration and templates
4. **Performance issues**: Check database indexes and query optimization

### Debug Mode
Enable debug logging by setting `NODE_ENV=development` to see detailed fraud assessment logs and workflow actions.

## Future Enhancements

### Planned Features
- Machine learning fraud detection improvements
- Advanced analytics and reporting
- Mobile app integration
- Webhook support for external systems
- Multi-language support
- Advanced document verification
- Integration with external fraud prevention services

### API Versioning
The manual payment API follows semantic versioning. Current version: `v1.0.0`

## Support

For technical support or feature requests, please contact the development team or create an issue in the project repository.

## License

This manual payment system is part of the School SIS project and follows the same licensing terms.
