# SDK Documentation

Client SDKs and libraries

## Overview

This page contains documentation migrated from the repository to provide better organization and collaboration capabilities.

## Content

*Content will be populated during migration process*

---

*This page was automatically generated during the documentation migration process.*


---

## From sdk/README.md

<!-- Migrated from: sdk/README.md -->

# School SIS SDK Collection

Official SDKs and client libraries for the K-12 Student Information System API.

## 📦 Available SDKs

### JavaScript/TypeScript SDK
- **Package**: `@school-sis/sdk`
- **Features**: Full API coverage, TypeScript support, automatic token refresh
- **Usage**: Perfect for web applications, Node.js backends, and React applications

### React Hooks
- **Package**: `@school-sis/react-hooks`
- **Features**: React hooks for seamless integration, context provider, state management
- **Usage**: React applications with built-in authentication and data management

### Python SDK
- **Package**: `school-sis-sdk`
- **Features**: Full API coverage, Pydantic models, async support
- **Usage**: Python applications, data analysis, backend integrations

### Webhook Client
- **Package**: `@school-sis/webhooks`
- **Features**: Real-time events, WebSocket connection, automatic reconnection
- **Usage**: Real-time notifications, live updates, event-driven applications

## 🚀 Quick Start

### JavaScript/TypeScript

```bash
npm install @school-sis/sdk
```

```javascript
import { SchoolSIS } from '@school-sis/sdk';

const client = new SchoolSIS({
  baseUrl: 'https://api.schoolsis.com',
  tenantSlug: 'springfield-high'
});

// Login
await client.login('admin@springfield.edu', 'password');

// Get students
const students = await client.students.list();

// Create a student
const newStudent = await client.students.create({
  firstName: 'Alice',
  lastName: 'Johnson',
  gradeLevel: '10',
  dateOfBirth: '2008-05-15'
});
```

### React Hooks

```bash
npm install @school-sis/react-hooks
```

```jsx
import React from 'react';
import { SISProvider, useStudents } from '@school-sis/react-hooks';

function App() {
  return (
    <SISProvider config={{ baseUrl: 'https://api.schoolsis.com' }}>
      <StudentList />
    </SISProvider>
  );
}

function StudentList() {
  const { students, isLoading, create } = useStudents();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {students.map(student => (
        <div key={student.id}>
          {student.firstName} {student.lastName} - Grade {student.gradeLevel}
        </div>
      ))}
    </div>
  );
}
```

### Python

```bash
pip install school-sis-sdk
```

```python
from school_sis_sdk import SISClient

client = SISClient({
    'base_url': 'https://api.schoolsis.com',
    'tenant_slug': 'springfield-high'
})

# Login
client.login('admin@springfield.edu', 'password')

# Get students
students = client.students.list()

# Create a student
new_student = client.students.create({
    'first_name': 'Alice',
    'last_name': 'Johnson',
    'grade_level': '10',
    'date_of_birth': '2008-05-15'
})
```

### Webhooks

```bash
npm install @school-sis/webhooks
```

```javascript
import { WebhookClient } from '@school-sis/webhooks';

const webhook = new WebhookClient({
  baseUrl: 'https://api.schoolsis.com',
  token: 'your-jwt-token'
});

// Subscribe to student events
webhook.subscribeToStudents((event) => {
  console.log('Student event:', event.event, event.data);
});

// Connect to receive events
await webhook.connect();
```

## 📚 Documentation

### JavaScript/TypeScript SDK
- [Full API Reference](/readme)
- [Authentication Guide](/auth)
- [Error Handling](/errors)
- [Examples](./javascript/examples/)

### React Hooks
- [Hook Reference](/readme)
- [Authentication with Context](/auth)
- [Data Management](/data)
- [Examples](./react-hooks/examples/)

### Python SDK
- [API Reference](/readme)
- [Models and Types](/models)
- [Async Support](/async)
- [Examples](./python/examples/)

### Webhooks
- [Webhook Guide](/readme)
- [Event Types](/events)
- [Security](/security)
- [Examples](./webhooks/examples/)

## 🔧 Configuration

### Environment Variables

All SDKs support configuration through environment variables:

```bash
SIS_BASE_URL=https://api.schoolsis.com
SIS_API_KEY=your-api-key
SIS_TENANT_SLUG=springfield-high
SIS_TOKEN=your-jwt-token
```

### Multi-Tenant Support

All SDKs support multi-tenant architecture:

```javascript
// Subdomain-based
const client = new SchoolSIS({
  baseUrl: 'https://springfield.sisplatform.com/api'
});

// Header-based
const client = new SchoolSIS({
  baseUrl: 'https://api.sisplatform.com',
  tenantSlug: 'springfield'
});

// Custom domain
const client = new SchoolSIS({
  baseUrl: 'https://sis.springfield.edu/api'
});
```

## 🔐 Authentication

### JWT Token Authentication

```javascript
// Login and get tokens
const auth = await client.login('email', 'password');

// Use token for subsequent requests
client.setToken(auth.data.accessToken);

// Tokens are automatically refreshed
```

### API Key Authentication

```javascript
const client = new SchoolSIS({
  baseUrl: 'https://api.schoolsis.com',
  apiKey: 'your-api-key'
});
```

## 📊 Features

### Data Management
- ✅ Full CRUD operations for all entities
- ✅ Bulk operations (create, update, delete)
- ✅ Advanced filtering and sorting
- ✅ Pagination support
- ✅ Search functionality

### File Operations
- ✅ Upload documents and images
- ✅ Download files and exports
- ✅ CSV import/export
- ✅ Bulk data operations

### Real-time Updates
- ✅ WebSocket connections
- ✅ Event subscriptions
- ✅ Automatic reconnection
- ✅ Heartbeat monitoring

### Error Handling
- ✅ Comprehensive error types
- ✅ Automatic retry logic
- ✅ Rate limiting support
- ✅ Network error handling

## 🧪 Testing

Each SDK includes comprehensive test suites:

```bash
# JavaScript/TypeScript
cd sdk/javascript
npm test

# React Hooks
cd sdk/react-hooks
npm test

# Python
cd sdk/python
pytest

# Webhooks
cd sdk/webhooks
npm test
```

## 🤝 Contributing

We welcome contributions to all SDKs! Please see our [Contributing Guide](/contributing) for details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/school-sis/sdk-collection.git

# Install dependencies for all SDKs
npm run install:all

# Run tests for all SDKs
npm run test:all

# Build all SDKs
npm run build:all
```

## 📄 License

All SDKs are licensed under the MIT License. See [LICENSE](./LICENSE) for details.

## 🆘 Support

- **Documentation**: [docs.schoolsis.com](https://docs.schoolsis.com)
- **Issues**: [GitHub Issues](https://github.com/school-sis/sdk-collection/issues)
- **Discussions**: [GitHub Discussions](https://github.com/school-sis/sdk-collection/discussions)
- **Email**: support@schoolsis.com

## 🏫 About School SIS

The K-12 Student Information System is a comprehensive platform for managing student data, grades, attendance, and more. Our SDKs make it easy to integrate with the platform from any application.

**Professional • Secure • Multinational • Open Source**
