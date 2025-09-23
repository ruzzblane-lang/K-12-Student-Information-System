<!-- Migrated from: docs/Enhanced-Payment-Gateway-API-Specification.md -->

# Enhanced Payment Gateway API Specification

## Overview

This document provides comprehensive API specifications for the Enhanced Payment Gateway system, including all endpoints, request/response formats, authentication, and integration examples.

## Base URLs

- **Development**: `http://localhost:3001`
- **Staging**: `https://staging-api.schoolsis.com`
- **Production**: `https://api.schoolsis.com`

## Authentication

### API Key Authentication
```http
Authorization: Bearer <api_key>
```

### JWT Token Authentication
```http
Authorization: Bearer <jwt_token>
```

### Multi-Tenant Headers
```http
X-Tenant-ID: <tenant_uuid>
X-User-ID: <user_uuid>
X-User-Roles: admin,teacher,finance_admin
```

## Payment Gateway API

### 1. Process Payment

**Endpoint**: `POST /api/v1/payments/process`

**Description**: Processes a payment through the orchestration layer with automatic provider selection and fraud detection.

**Request Body**:
```json
{
  "tenantId": "uuid",
  "userId": "uuid",
  "amount": 100.00,
  "currency": "USD",
  "paymentMethod": "card",
  "paymentDetails": {
    "cardNumber": "4111111111111111",
    "expiryMonth": "12",
    "expiryYear": "2025",
    "cvv": "123",
    "cardholderName": "John Doe"
  },
  "billingAddress": {
    "line1": "123 Main St",
    "city": "Anytown",
    "state": "CA",
    "postalCode": "12345",
    "country": "US"
  },
  "description": "School tuition payment",
  "metadata": {
    "studentId": "uuid",
    "semester": "Fall 2024"
  }
}
```

**Response**:
```json
{
  "success": true,
  "orchestrationId": "uuid",
  "transactionId": "txn_123456789",
  "provider": "stripe",
  "amount": 100.00,
  "currency": "USD",
  "status": "succeeded",
  "processingTime": 1250,
  "fraudAssessment": {
    "riskLevel": "low",
    "riskScore": 0.15,
    "riskFactors": []
  },
  "metadata": {
    "providerTransactionId": "pi_1234567890",
    "receiptUrl": "https://pay.stripe.com/receipts/..."
  },
  "createdAt": "2024-01-25T10:30:00Z"
}
```

### 2. Get Payment Status

**Endpoint**: `GET /api/v1/payments/{orchestrationId}/status`

**Description**: Retrieves the current status of a payment transaction.

**Response**:
```json
{
  "orchestrationId": "uuid",
  "status": "succeeded",
  "amount": 100.00,
  "currency": "USD",
  "provider": "stripe",
  "transactionId": "txn_123456789",
  "createdAt": "2024-01-25T10:30:00Z",
  "updatedAt": "2024-01-25T10:30:05Z",
  "metadata": {
    "providerTransactionId": "pi_1234567890",
    "receiptUrl": "https://pay.stripe.com/receipts/..."
  }
}
```

### 3. Process Refund

**Endpoint**: `POST /api/v1/payments/{orchestrationId}/refund`

**Description**: Processes a refund for a completed payment.

**Request Body**:
```json
{
  "amount": 50.00,
  "reason": "partial_refund",
  "notes": "Student dropped class"
}
```

**Response**:
```json
{
  "success": true,
  "refundId": "uuid",
  "orchestrationId": "uuid",
  "amount": 50.00,
  "currency": "USD",
  "status": "succeeded",
  "provider": "stripe",
  "providerRefundId": "re_1234567890",
  "createdAt": "2024-01-25T11:00:00Z"
}
```

### 4. List Payments

**Endpoint**: `GET /api/v1/payments`

**Description**: Lists payments with filtering and pagination.

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `status`: Filter by status (pending, succeeded, failed, refunded)
- `startDate`: Start date filter (ISO 8601)
- `endDate`: End date filter (ISO 8601)
- `userId`: Filter by user ID
- `amountMin`: Minimum amount filter
- `amountMax`: Maximum amount filter

**Response**:
```json
{
  "payments": [
    {
      "orchestrationId": "uuid",
      "status": "succeeded",
      "amount": 100.00,
      "currency": "USD",
      "provider": "stripe",
      "userId": "uuid",
      "createdAt": "2024-01-25T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

## Manual Payment Approval API

### 1. Submit Manual Payment Request

**Endpoint**: `POST /api/v1/manual-payments/requests`

**Description**: Submits a manual payment request for approval.

**Request Body**:
```json
{
  "tenantId": "uuid",
  "userId": "uuid",
  "studentId": "uuid",
  "paymentType": "bank_transfer",
  "amount": 500.00,
  "currency": "USD",
  "description": "Tuition payment via bank transfer",
  "paymentDetails": {
    "bankName": "First National Bank",
    "accountNumber": "1234567890",
    "routingNumber": "021000021",
    "referenceNumber": "TXN123456"
  },
  "supportingDocuments": [
    {
      "fileName": "bank_receipt.pdf",
      "filePath": "/uploads/bank_receipt.pdf",
      "mimeType": "application/pdf"
    }
  ]
}
```

**Response**:
```json
{
  "requestId": "uuid",
  "status": "pending",
  "priority": "normal",
  "amount": 500.00,
  "currency": "USD",
  "paymentType": "bank_transfer",
  "fraudAssessment": {
    "riskLevel": "low",
    "riskScore": 0.25,
    "riskFactors": []
  },
  "approvalTicket": {
    "ticketId": "uuid",
    "assignedTo": "uuid",
    "status": "open",
    "priority": "normal"
  },
  "createdAt": "2024-01-25T10:30:00Z"
}
```

### 2. Approve Manual Payment Request

**Endpoint**: `POST /api/v1/manual-payments/requests/{requestId}/approve`

**Description**: Approves a manual payment request.

**Request Body**:
```json
{
  "notes": "Payment verified and approved"
}
```

**Response**:
```json
{
  "requestId": "uuid",
  "status": "approved",
  "approvedBy": "uuid",
  "approvedAt": "2024-01-25T11:00:00Z",
  "notes": "Payment verified and approved"
}
```

### 3. Reject Manual Payment Request

**Endpoint**: `POST /api/v1/manual-payments/requests/{requestId}/reject`

**Description**: Rejects a manual payment request.

**Request Body**:
```json
{
  "reason": "Insufficient documentation provided"
}
```

**Response**:
```json
{
  "requestId": "uuid",
  "status": "rejected",
  "rejectedBy": "uuid",
  "rejectedAt": "2024-01-25T11:00:00Z",
  "reason": "Insufficient documentation provided"
}
```

### 4. List Manual Payment Requests

**Endpoint**: `GET /api/v1/manual-payments/requests`

**Description**: Lists manual payment requests with filtering.

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `status`: Filter by status (pending, approved, rejected)
- `priority`: Filter by priority (low, normal, high)
- `userId`: Filter by user ID
- `assignedTo`: Filter by assigned approver

**Response**:
```json
{
  "requests": [
    {
      "requestId": "uuid",
      "status": "pending",
      "priority": "normal",
      "amount": 500.00,
      "currency": "USD",
      "paymentType": "bank_transfer",
      "userId": "uuid",
      "assignedTo": "uuid",
      "createdAt": "2024-01-25T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 25,
    "totalPages": 2
  }
}
```

## Digital Archive API

### 1. Upload File

**Endpoint**: `POST /api/v1/archive/upload`

**Description**: Uploads a file to the secure archive storage.

**Request**: Multipart form data
- `file`: File to upload
- `folder`: Folder path (default: "general")
- `metadata`: JSON string with additional metadata
- `accessControl`: JSON string with access control settings

**Response**:
```json
{
  "fileId": "uuid",
  "fileName": "document.pdf",
  "fileUrl": "https://archive.schoolsis.com/files/uuid",
  "s3Key": "tenant123/documents/uuid.pdf",
  "size": 1024000,
  "type": "application/pdf",
  "folder": "documents",
  "metadata": {
    "description": "Student transcript",
    "tags": ["academic", "transcript"]
  },
  "accessControl": {
    "public": false,
    "roles": ["admin", "teacher"]
  },
  "createdAt": "2024-01-25T10:30:00Z"
}
```

### 2. Get Download URL

**Endpoint**: `GET /api/v1/archive/files/{fileId}/download`

**Description**: Generates a pre-signed download URL for a file.

**Response**:
```json
{
  "fileId": "uuid",
  "fileName": "document.pdf",
  "downloadUrl": "https://s3.amazonaws.com/bucket/path?signature=...",
  "expiresAt": "2024-01-25T11:30:00Z"
}
```

### 3. List Files

**Endpoint**: `GET /api/v1/archive/files`

**Description**: Lists files in the archive with filtering.

**Query Parameters**:
- `folder`: Folder path to list
- `fileType`: Filter by MIME type
- `uploadedBy`: Filter by uploader
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

**Response**:
```json
{
  "files": [
    {
      "fileId": "uuid",
      "fileName": "document.pdf",
      "fileType": "application/pdf",
      "fileSize": 1024000,
      "folder": "documents",
      "uploadedBy": "uuid",
      "createdAt": "2024-01-25T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

### 4. Update File Metadata

**Endpoint**: `PUT /api/v1/archive/files/{fileId}/metadata`

**Description**: Updates file metadata and access control.

**Request Body**:
```json
{
  "metadata": {
    "description": "Updated description",
    "tags": ["updated", "tags"]
  },
  "accessControl": {
    "public": true,
    "roles": ["admin", "teacher", "student"]
  }
}
```

**Response**:
```json
{
  "fileId": "uuid",
  "metadata": {
    "description": "Updated description",
    "tags": ["updated", "tags"]
  },
  "accessControl": {
    "public": true,
    "roles": ["admin", "teacher", "student"]
  },
  "updatedAt": "2024-01-25T11:00:00Z"
}
```

### 5. Delete File

**Endpoint**: `DELETE /api/v1/archive/files/{fileId}`

**Description**: Deletes a file from the archive.

**Response**:
```json
{
  "success": true,
  "fileId": "uuid",
  "deletedAt": "2024-01-25T11:00:00Z"
}
```

## White-Label Frontend API

### 1. Get Archive Items

**Endpoint**: `GET /api/v1/white-label/archive/{tenantId}/items`

**Description**: Retrieves archive items for white-label frontend display.

**Query Parameters**:
- `folder`: Folder to browse
- `fileType`: Filter by file type
- `page`: Page number
- `limit`: Items per page

**Response**:
```json
{
  "items": [
    {
      "fileId": "uuid",
      "fileName": "document.pdf",
      "fileType": "application/pdf",
      "fileSize": 1024000,
      "thumbnailUrl": "https://archive.schoolsis.com/thumbnails/uuid.jpg",
      "previewUrl": "https://archive.schoolsis.com/preview/uuid",
      "downloadUrl": "https://archive.schoolsis.com/download/uuid",
      "metadata": {
        "description": "Student transcript",
        "tags": ["academic", "transcript"]
      },
      "createdAt": "2024-01-25T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

### 2. Get Branding Configuration

**Endpoint**: `GET /api/v1/white-label/branding/{tenantId}`

**Description**: Retrieves branding configuration for white-label frontend.

**Response**:
```json
{
  "tenantId": "uuid",
  "branding": {
    "logoUrl": "https://school.com/logo.png",
    "primaryColor": "#1a73e8",
    "secondaryColor": "#5f6368",
    "fontFamily": "Roboto, sans-serif",
    "customCss": ".wl-header { background-color: var(--wl-primary-color); }"
  },
  "features": {
    "allowDownload": true,
    "allowShare": true,
    "showMetadata": true
  }
}
```

## Compliance and Audit API

### 1. Get Compliance Logs

**Endpoint**: `GET /api/v1/compliance/logs`

**Description**: Retrieves compliance logs with filtering.

**Query Parameters**:
- `eventType`: Filter by event type
- `startDate`: Start date filter
- `endDate`: End date filter
- `page`: Page number
- `limit`: Items per page

**Response**:
```json
{
  "logs": [
    {
      "id": "uuid",
      "eventType": "payment_processed",
      "eventData": {
        "orchestrationId": "uuid",
        "amount": 100.00,
        "currency": "USD"
      },
      "createdAt": "2024-01-25T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### 2. Generate Compliance Report

**Endpoint**: `POST /api/v1/compliance/reports`

**Description**: Generates a compliance report.

**Request Body**:
```json
{
  "reportType": "transaction_summary",
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-01-31T23:59:59Z",
  "tenantId": "uuid"
}
```

**Response**:
```json
{
  "reportId": "uuid",
  "reportType": "transaction_summary",
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-01-31T23:59:59Z",
  "generatedAt": "2024-01-25T10:30:00Z",
  "data": [
    {
      "date": "2024-01-01",
      "totalTransactions": 150,
      "successfulTransactions": 145,
      "failedTransactions": 5,
      "totalAmount": 15000.00,
      "avgProcessingTime": 1250
    }
  ]
}
```

## Performance Monitoring API

### 1. Get Performance Metrics

**Endpoint**: `GET /api/v1/performance/metrics`

**Description**: Retrieves current performance metrics.

**Response**:
```json
{
  "overallMetrics": {
    "totalTransactions": 1500,
    "successfulTransactions": 1450,
    "failedTransactions": 50,
    "avgLatency": "1250.50",
    "errorRate": "3.33%",
    "p95Latency": 2500,
    "p99Latency": 5000
  },
  "providerMetrics": {
    "stripe": {
      "totalRequests": 800,
      "successfulRequests": 780,
      "failedRequests": 20,
      "avgLatency": "1100.25",
      "errorRate": "2.50%"
    },
    "paypal": {
      "totalRequests": 700,
      "successfulRequests": 670,
      "failedRequests": 30,
      "avgLatency": "1400.75",
      "errorRate": "4.29%"
    }
  }
}
```

### 2. Run Load Test

**Endpoint**: `POST /api/v1/performance/load-test`

**Description**: Initiates a load test.

**Request Body**:
```json
{
  "durationSeconds": 300,
  "concurrentUsers": 100,
  "transactionsPerSecond": 10
}
```

**Response**:
```json
{
  "testId": "uuid",
  "status": "running",
  "config": {
    "durationSeconds": 300,
    "concurrentUsers": 100,
    "transactionsPerSecond": 10
  },
  "startedAt": "2024-01-25T10:30:00Z"
}
```

## Error Handling

### Standard Error Response Format

```json
{
  "error": {
    "code": "PAYMENT_FAILED",
    "message": "Payment processing failed",
    "details": "Insufficient funds",
    "requestId": "uuid",
    "timestamp": "2024-01-25T10:30:00Z"
  }
}
```

### Common Error Codes

- `INVALID_REQUEST`: Invalid request format or missing required fields
- `UNAUTHORIZED`: Authentication required or invalid credentials
- `FORBIDDEN`: Insufficient permissions for the requested action
- `NOT_FOUND`: Resource not found
- `PAYMENT_FAILED`: Payment processing failed
- `FRAUD_DETECTED`: Payment blocked due to fraud detection
- `RATE_LIMITED`: Too many requests, rate limit exceeded
- `INTERNAL_ERROR`: Internal server error

## Rate Limiting

### Limits
- **Payment API**: 100 requests per minute per user
- **Archive API**: 200 requests per minute per user
- **Compliance API**: 50 requests per minute per user
- **Performance API**: 20 requests per minute per user

### Headers
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1643123456
```

## Webhooks

### Payment Webhook

**Endpoint**: `POST /webhooks/payments`

**Description**: Receives payment status updates from providers.

**Headers**:
```http
X-Webhook-Signature: sha256=...
X-Webhook-Provider: stripe
```

**Payload**:
```json
{
  "eventType": "payment.succeeded",
  "orchestrationId": "uuid",
  "providerTransactionId": "pi_1234567890",
  "status": "succeeded",
  "amount": 100.00,
  "currency": "USD",
  "timestamp": "2024-01-25T10:30:00Z"
}
```

## SDKs and Libraries

### JavaScript SDK
```javascript
import { PaymentGateway } from '@schoolsis/payment-sdk';

const gateway = new PaymentGateway({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.schoolsis.com'
});

const payment = await gateway.payments.process({
  amount: 100.00,
  currency: 'USD',
  paymentMethod: 'card',
  paymentDetails: {
    cardNumber: '4111111111111111',
    expiryMonth: '12',
    expiryYear: '2025',
    cvv: '123'
  }
});
```

### Python SDK
```python
from schoolsis import PaymentGateway

gateway = PaymentGateway(
    api_key='your-api-key',
    base_url='https://api.schoolsis.com'
)

payment = gateway.payments.process(
    amount=100.00,
    currency='USD',
    payment_method='card',
    payment_details={
        'card_number': '4111111111111111',
        'expiry_month': '12',
        'expiry_year': '2025',
        'cvv': '123'
    }
)
```

## Testing

### Test Environment
- **Base URL**: `https://test-api.schoolsis.com`
- **Test Cards**: Use Stripe test card numbers
- **Test Mode**: All transactions are in test mode

### Test Card Numbers
- **Success**: `4242424242424242`
- **Decline**: `4000000000000002`
- **Insufficient Funds**: `4000000000009995`
- **Expired Card**: `4000000000000069`

## Security Considerations

### Data Protection
- All sensitive data is encrypted at rest and in transit
- PCI DSS compliance for payment data
- GDPR compliance for personal data
- SOC 2 Type II certification

### Authentication
- JWT tokens with short expiration
- API key rotation
- Multi-factor authentication
- Role-based access control

### Monitoring
- Real-time fraud detection
- Anomaly monitoring
- Security event logging
- Incident response procedures

## Support

### Documentation
- API documentation: `https://docs.schoolsis.com`
- Integration guides: `https://docs.schoolsis.com/integration`
- SDK documentation: `https://docs.schoolsis.com/sdk`

### Support Channels
- Email: `api-support@schoolsis.com`
- Slack: `#api-support`
- Status Page: `https://status.schoolsis.com`
- Emergency: `+1-800-SCHOOL-SIS`
