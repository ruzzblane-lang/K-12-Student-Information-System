# K-12 Student Information System - Backend API

## Overview

This is the backend API for the K-12 Student Information System, providing comprehensive student management, multi-tenant architecture, and white-labeling capabilities.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm 8+
- PostgreSQL 13+

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Test the server:**
   ```bash
   node test-server.js
   ```

## 📁 Project Structure

```
backend/
├── api/
│   ├── controllers/          # API controllers
│   │   ├── studentController.js
│   │   └── whiteLabelingController.js
│   ├── middleware/           # API middleware
│   │   └── auth.js
│   └── routes/              # API routes
│       ├── students.js
│       └── whiteLabeling.js
├── config/
│   └── database.js          # Database configuration
├── controllers/             # Business logic controllers
│   ├── onboardingController.js
│   └── tenantController.js
├── middleware/              # Application middleware
│   ├── auth.js              # Authentication
│   ├── rbac.js              # Role-based access control
│   ├── rateLimiting.js      # Rate limiting
│   ├── studentValidation.js # Student validation
│   └── tenantContext.js     # Tenant context
├── models/                  # Data models
│   ├── Tenant.js
│   └── User.js
├── routes/                  # Application routes
│   ├── onboarding.js
│   └── tenants.js
├── services/                # Business logic services
│   ├── onboardingService.js
│   ├── studentService.js
│   ├── tenantService.js
│   └── whiteLabelingService.js
├── tests/                   # Test files
│   └── student.test.js
├── server.js                # Main server file
├── test-server.js           # Test server script
├── package.json             # Dependencies and scripts
└── env.example              # Environment variables template
```

## 🔧 Configuration

### Environment Variables

Copy `env.example` to `.env` and configure:

```bash
# Server Configuration
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:3001

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=school_sis
DB_USER=postgres
DB_PASSWORD=your_password_here

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_REFRESH_SECRET=your_super_secret_refresh_key_here

# Encryption
ENCRYPTION_KEY=your_32_character_encryption_key_here
```

## 🛡️ Security Features

### Authentication & Authorization
- JWT-based authentication
- Role-based access control (RBAC)
- Multi-tenant context validation
- Rate limiting on all endpoints

### Input Validation & Sanitization
- Comprehensive input validation
- XSS prevention with DOMPurify
- SQL injection prevention
- Data type validation

### Rate Limiting
- **General**: 100 requests/15min
- **Strict**: 10 requests/15min (sensitive operations)
- **Moderate**: 200 requests/15min (read operations)
- **Role-based**: Higher limits for privileged users

## 📊 API Endpoints

### Students
- `GET /api/students` - Get all students (paginated)
- `GET /api/students/:id` - Get student by ID
- `POST /api/students` - Create new student
- `PUT /api/students/:id` - Update student
- `DELETE /api/students/:id` - Delete student
- `GET /api/students/:id/grades` - Get student grades
- `GET /api/students/:id/attendance` - Get student attendance
- `GET /api/students/:id/enrollments` - Get student enrollments

### White-Labeling
- `GET /api/white-labeling/:tenantId/branding` - Get branding config
- `PUT /api/white-labeling/:tenantId/branding` - Update branding
- `GET /api/white-labeling/:tenantId/css` - Generate CSS
- `GET /api/white-labeling/:tenantId/preview` - Get preview
- `POST /api/white-labeling/:tenantId/reset` - Reset to defaults
- `GET /api/white-labeling/:tenantId/export` - Export config
- `POST /api/white-labeling/:tenantId/import` - Import config

### Tenants
- `GET /api/tenants` - Get all tenants (Super Admin)
- `GET /api/tenants/:id` - Get tenant by ID (Super Admin)

### Onboarding
- `POST /api/onboarding/tenants` - Create new tenant
- `GET /api/onboarding/:tenantId/status` - Get onboarding status

## 🧪 Testing

### Run Tests
```bash
npm test
```

### Test Server
```bash
node test-server.js
```

### Manual Testing
```bash
# Health check
curl http://localhost:3000/health

# Get students (requires authentication)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "X-Tenant-ID: your-tenant-id" \
     http://localhost:3000/api/students
```

## 📝 Scripts

```bash
# Development
npm run dev              # Start development server
npm run start            # Start production server

# Testing
npm test                 # Run tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues

# Database
npm run db:migrate       # Run database migrations
npm run db:seed          # Seed database
npm run db:reset         # Reset database
```

## 🔒 Security Best Practices

### Implemented
- ✅ JWT authentication with refresh tokens
- ✅ Role-based access control
- ✅ Input validation and sanitization
- ✅ Rate limiting
- ✅ CORS configuration
- ✅ Helmet security headers
- ✅ Request logging
- ✅ Error handling

### Headers Required
```bash
# Authentication
Authorization: Bearer <jwt_token>

# Tenant Context
X-Tenant-ID: <tenant_id>
# OR
X-Tenant-Slug: <tenant_slug>
```

## 🚀 Deployment

### Production Build
```bash
npm run build
```

### Environment Setup
1. Set `NODE_ENV=production`
2. Configure production database
3. Set secure JWT secrets
4. Configure SSL certificates
5. Set up monitoring and logging

### Docker Deployment
```bash
# Build image
docker build -t school-sis-backend .

# Run container
docker run -p 3000:3000 --env-file .env school-sis-backend
```

## 📚 Documentation

- [API Specification](../docs/API-Specification.md)
- [Database Schema](../docs/Database-Schema.md)
- [Authentication & RBAC](../docs/Authentication-RBAC.md)
- [Multi-Tenant Architecture](../docs/Multi-Tenant-Architecture.md)
- [White-Labeling Implementation](../docs/White-Labeling-Implementation-Guide.md)
- [Student Controller Security Enhancements](../docs/Student-Controller-Security-Enhancements.md)

## 🤝 Contributing

1. Follow the existing code structure
2. Add tests for new features
3. Update documentation
4. Follow security best practices
5. Use proper error handling

## 📄 License

MIT License - see [LICENSE](../LICENSE) file for details.

## 🆘 Support

For support and questions:
- Check the documentation
- Review the test files
- Check the console logs
- Verify environment configuration
