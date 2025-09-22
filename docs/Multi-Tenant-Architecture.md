# Multi-Tenant Architecture Documentation

## Overview

This document describes the multi-tenant architecture implementation for the K-12 Student Information System, designed for commercial resale to multiple schools and districts.

## Architecture Principles

### 1. **Tenant Isolation**
- Complete data isolation between tenants (schools)
- Each tenant has its own data namespace
- No cross-tenant data access possible

### 2. **Scalability**
- Support for thousands of tenants
- Efficient resource utilization
- Horizontal scaling capabilities

### 3. **Security**
- Role-based access control per tenant
- Audit logging for all operations
- Compliance with FERPA, COPPA, and GDPR

### 4. **Customization**
- White-labeling capabilities
- Custom branding per tenant
- Feature toggles per subscription plan

## Database Schema

### Core Tables

#### `tenants`
Stores tenant (school) information and configuration.

```sql
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    domain VARCHAR(255) UNIQUE,
    subdomain VARCHAR(100) UNIQUE,
    school_name VARCHAR(255) NOT NULL,
    school_type VARCHAR(50) NOT NULL,
    school_level VARCHAR(50) NOT NULL,
    subscription_plan VARCHAR(50) DEFAULT 'basic',
    subscription_status VARCHAR(20) DEFAULT 'active',
    max_students INTEGER DEFAULT 500,
    max_teachers INTEGER DEFAULT 50,
    features JSONB DEFAULT '{}',
    -- ... other fields
);
```

#### `users`
All users belong to a specific tenant.

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    -- ... other fields
    CONSTRAINT unique_email_per_tenant UNIQUE (tenant_id, email)
);
```

#### `students`, `teachers`, `classes`, `grades`, `attendance`
All core entities include `tenant_id` for isolation.

```sql
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    -- ... other fields
);
```

### Data Isolation Strategy

**Database-per-Tenant** (Recommended for Enterprise)
- Complete isolation
- Custom configurations per tenant
- Easier backup/restore
- Higher resource usage

**Schema-per-Tenant** (Balanced Approach)
- Good isolation
- Shared database resources
- Tenant-specific schemas
- Moderate complexity

**Row-Level Security** (Cost-Effective)
- Shared tables with tenant filtering
- Lowest resource usage
- Requires careful query design
- Higher complexity

## Tenant Context Resolution

### 1. **Subdomain Resolution**
```
https://springfield.sisplatform.com
→ Extract "springfield" as subdomain
→ Look up tenant by subdomain
```

### 2. **Custom Domain Resolution**
```
https://sis.springfield.edu
→ Look up tenant by domain
→ Route to appropriate tenant
```

### 3. **Header-Based Resolution**
```
X-Tenant-ID: 123e4567-e89b-12d3-a456-426614174000
X-Tenant-Slug: springfield
```

### 4. **JWT Token Resolution**
```javascript
{
  "userId": "user-123",
  "tenantId": "tenant-456",
  "role": "admin"
}
```

## Role-Based Access Control (RBAC)

### Role Hierarchy

```
Super Admin (100)
├── Admin (80)
├── Principal (60)
├── Teacher (40)
├── Parent (20)
└── Student (10)
```

### Permission System

#### Role-Based Permissions
```javascript
const ROLE_PERMISSIONS = {
  super_admin: [
    'tenant.create', 'tenant.read', 'tenant.update', 'tenant.delete',
    'user.create', 'user.read', 'user.update', 'user.delete',
    // ... all permissions
  ],
  admin: [
    'user.create', 'user.read', 'user.update', 'user.delete',
    'student.create', 'student.read', 'student.update', 'student.delete',
    // ... tenant-scoped permissions
  ],
  teacher: [
    'student.read',
    'grade.create', 'grade.read', 'grade.update',
    'attendance.create', 'attendance.read', 'attendance.update'
  ],
  // ... other roles
};
```

#### Explicit Permissions
```javascript
// User can have additional permissions beyond their role
user.permissions = {
  'report.export': true,
  'integration.manage': true
};
```

### Resource Ownership

#### Student Access
- **Teachers**: Can access students in their classes
- **Parents**: Can access their own children
- **Students**: Can access their own data
- **Admins**: Can access all students in tenant

#### Grade Access
- **Teachers**: Can manage grades for their classes
- **Students/Parents**: Can view their own grades
- **Admins**: Can view all grades in tenant

## Middleware Stack

### 1. **Authentication Middleware**
```javascript
app.use('/api', authenticate);
```

### 2. **Tenant Context Middleware**
```javascript
app.use('/api', tenantContext);
```

### 3. **Permission Middleware**
```javascript
app.get('/api/students', requirePermission('student.read'));
```

### 4. **Resource Ownership Middleware**
```javascript
app.get('/api/students/:id', requireResourceOwnership('student'));
```

## API Design

### Tenant-Scoped Endpoints

All API endpoints automatically include tenant context:

```javascript
// GET /api/students
// Automatically filters by req.tenantId

// POST /api/students
// Automatically sets tenantId from req.tenantId

// GET /api/students/:id
// Automatically checks tenant ownership
```

### Request Headers

```javascript
// Required headers for API calls
{
  'Authorization': 'Bearer <jwt-token>',
  'X-Tenant-ID': '<tenant-id>', // Optional if in JWT
  'Content-Type': 'application/json'
}
```

### Response Format

```javascript
{
  "success": true,
  "data": {
    // Tenant-scoped data
  },
  "meta": {
    "tenant": {
      "id": "tenant-123",
      "name": "Springfield High School"
    },
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150
    }
  }
}
```

## Tenant Management

### Creating a New Tenant

```javascript
POST /api/tenants
{
  "name": "Springfield High School",
  "schoolName": "Springfield High School",
  "schoolType": "public",
  "schoolLevel": "high",
  "subscriptionPlan": "professional",
  "admin": {
    "email": "admin@springfield.edu",
    "password": "secure-password",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

### Tenant Configuration

```javascript
PUT /api/tenants
{
  "logoUrl": "https://cdn.example.com/springfield-logo.png",
  "primaryColor": "#1e40af",
  "secondaryColor": "#3b82f6",
  "customCss": ".header { background: #1e40af; }"
}
```

### Subscription Management

```javascript
PUT /api/tenants/subscription
{
  "plan": "enterprise",
  "status": "active",
  "maxStudents": 5000,
  "maxTeachers": 500
}
```

## White-Labeling

### Custom Branding

```javascript
// Tenant branding configuration
{
  "logoUrl": "https://cdn.example.com/school-logo.png",
  "primaryColor": "#1e40af",
  "secondaryColor": "#3b82f6",
  "customCss": `
    .header { background: #1e40af; }
    .button-primary { background: #3b82f6; }
  `,
  "schoolName": "Springfield High School"
}
```

### Custom Domains

```javascript
// Domain configuration
{
  "domain": "sis.springfield.edu",
  "subdomain": "springfield",
  "slug": "springfield-high"
}
```

### Feature Toggles

```javascript
// Feature configuration per tenant
{
  "features": {
    "customBranding": true,
    "apiAccess": true,
    "advancedReporting": true,
    "integrations": true,
    "whiteLabel": true,
    "customDomain": true,
    "sso": true
  }
}
```

## Security Considerations

### Data Isolation

1. **Database Level**
   - Foreign key constraints ensure tenant isolation
   - Row-level security policies
   - Tenant-scoped indexes

2. **Application Level**
   - Middleware enforces tenant context
   - All queries include tenant filtering
   - Permission checks per tenant

3. **API Level**
   - Tenant context in all requests
   - Resource ownership validation
   - Audit logging per tenant

### Compliance

#### FERPA (Family Educational Rights and Privacy Act)
- Student data encryption
- Access logging
- Parent consent tracking
- Data retention policies

#### COPPA (Children's Online Privacy Protection Act)
- Parental consent for students under 13
- Limited data collection
- Secure data handling
- Parent access controls

#### GDPR (General Data Protection Regulation)
- Data subject rights (access, rectification, erasure)
- Consent management
- Data portability
- Privacy by design

## Performance Optimization

### Database Optimization

1. **Indexing Strategy**
   ```sql
   -- Tenant-scoped indexes
   CREATE INDEX idx_students_tenant_id ON students(tenant_id);
   CREATE INDEX idx_students_tenant_grade ON students(tenant_id, grade_level);
   ```

2. **Query Optimization**
   ```javascript
   // Always include tenant filter
   const students = await Student.findAll({
     where: { tenantId: req.tenantId }
   });
   ```

3. **Connection Pooling**
   ```javascript
   // Separate connection pools per tenant type
   const basicPool = new Pool({ max: 10 });
   const enterprisePool = new Pool({ max: 50 });
   ```

### Caching Strategy

1. **Tenant Configuration Caching**
   ```javascript
   // Cache tenant config for 1 hour
   const tenantConfig = await redis.get(`tenant:${tenantId}:config`);
   ```

2. **User Session Caching**
   ```javascript
   // Cache user permissions for 30 minutes
   const userPermissions = await redis.get(`user:${userId}:permissions`);
   ```

## Monitoring and Analytics

### Tenant Metrics

```javascript
// Per-tenant metrics
{
  "tenantId": "tenant-123",
  "metrics": {
    "activeUsers": 45,
    "students": 500,
    "teachers": 25,
    "apiCalls": 1250,
    "storageUsed": "2.5GB",
    "lastActivity": "2024-01-15T10:30:00Z"
  }
}
```

### System Metrics

```javascript
// System-wide metrics
{
  "totalTenants": 150,
  "activeTenants": 145,
  "totalUsers": 15000,
  "totalStudents": 75000,
  "systemUptime": "99.9%",
  "averageResponseTime": "150ms"
}
```

## Deployment Architecture

### Production Setup

```
┌─────────────────────────────────────────────────────────────┐
│                    Load Balancer                            │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────┐
│                Application Servers                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │   Server 1  │ │   Server 2  │ │   Server 3  │   ...     │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────┐
│                Database Cluster                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │   Primary   │ │   Replica 1 │ │   Replica 2 │   ...     │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

### Environment Configuration

```bash
# Environment variables
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/sis_db
REDIS_URL=redis://redis:6379
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
SMTP_HOST=smtp.gmail.com
SMTP_USER=noreply@sisplatform.com
SMTP_PASSWORD=your-smtp-password
```

## Best Practices

### Development

1. **Always Include Tenant Context**
   ```javascript
   // Good
   const students = await Student.findAll({
     where: { tenantId: req.tenantId }
   });
   
   // Bad
   const students = await Student.findAll();
   ```

2. **Use Middleware Consistently**
   ```javascript
   // Apply tenant context to all routes
   app.use('/api', tenantContext);
   ```

3. **Validate Permissions**
   ```javascript
   // Check permissions before operations
   if (!hasPermission(req.user, 'student.create')) {
     return res.status(403).json({ error: 'Insufficient permissions' });
   }
   ```

### Security

1. **Never Trust Client Data**
   ```javascript
   // Always validate and sanitize input
   const { name } = req.body;
   if (!name || typeof name !== 'string') {
     return res.status(400).json({ error: 'Invalid name' });
   }
   ```

2. **Log All Operations**
   ```javascript
   // Log all data modifications
   await AuditLog.create({
     tenantId: req.tenantId,
     userId: req.userId,
     action: 'student.create',
     resourceType: 'student',
     resourceId: student.id
   });
   ```

3. **Use HTTPS Everywhere**
   ```javascript
   // Enforce HTTPS in production
   if (process.env.NODE_ENV === 'production') {
     app.use(require('helmet')());
   }
   ```

## Troubleshooting

### Common Issues

1. **Tenant Context Not Found**
   - Check subdomain/domain configuration
   - Verify tenant exists and is active
   - Check JWT token for tenantId

2. **Permission Denied**
   - Verify user role and permissions
   - Check resource ownership
   - Review tenant subscription status

3. **Performance Issues**
   - Check database indexes
   - Review query patterns
   - Monitor connection pool usage

### Debugging Tools

```javascript
// Enable debug logging
DEBUG=tenant:*,rbac:*,auth:* npm start

// Check tenant context
console.log('Tenant:', req.tenant);
console.log('User:', req.user);
console.log('Permissions:', req.userPermissions);
```

## Conclusion

This multi-tenant architecture provides a robust, scalable, and secure foundation for the K-12 Student Information System. It enables efficient resource utilization while maintaining complete data isolation between tenants, making it ideal for commercial resale to multiple schools and districts.

The architecture supports white-labeling, custom branding, and flexible subscription models, providing a competitive advantage in the educational technology market.
