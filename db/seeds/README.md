# Database Seeding Guide

## Overview
This directory contains enhanced database seeding scripts for the School SIS application with proper security, data integrity, and multi-tenant support.

## Files Structure

```
db/seeds/
├── 001_sample_tenants.sql              # Sample tenant data
├── 002_sample_users_enhanced.sql       # Enhanced user data with security
├── scripts/
│   ├── generate_secure_passwords.js    # Secure password generation script
│   ├── package.json                    # Node.js dependencies
│   └── generated/                      # Generated password files (gitignored)
├── ENHANCEMENT_RECOMMENDATIONS.md      # Detailed enhancement documentation
└── README.md                          # This file
```

## Quick Start

### 1. Install Dependencies
```bash
cd db/seeds/scripts
npm install
```

### 2. Generate Secure Passwords
```bash
# Generate passwords for development environment
npm run generate-passwords:dev

# Generate passwords for testing environment
npm run generate-passwords:test

# Generate passwords for staging environment
npm run generate-passwords:staging

# Generate passwords for production environment
npm run generate-passwords:prod
```

### 3. Run Database Seeding
```bash
# Run tenant seeding first
psql -d your_database -f 001_sample_tenants.sql

# Run user seeding with generated passwords
psql -d your_database -f 002_sample_users_enhanced.sql
```

## Security Features

### ✅ **Secure Password Handling**
- No hard-coded passwords in seed files
- Environment-specific password generation
- Proper bcrypt hashing with configurable salt rounds
- Secure random salt generation

### ✅ **Multi-Tenant Support**
- Proper tenant isolation
- Tenant-specific user data
- Tenant-specific permissions and configurations

### ✅ **Data Integrity**
- Unique constraint handling with `ON CONFLICT`
- Proper foreign key relationships
- Complete audit trail with timestamps
- Soft delete support

### ✅ **Role-Based Access Control**
- Comprehensive permissions structure
- Role-specific session timeouts
- Proper role hierarchy alignment
- Environment-specific role configurations

## Environment-Specific Configuration

### Development Environment
```bash
# Generate development passwords
npm run generate-passwords:dev

# Features:
# - Lower security requirements for development
# - Full feature access for testing
# - Longer session timeouts
# - Comprehensive permissions
```

### Testing Environment
```bash
# Generate testing passwords
npm run generate-passwords:test

# Features:
# - Isolated test data
# - Limited permissions for security testing
# - Shorter session timeouts
# - Test-specific configurations
```

### Staging Environment
```bash
# Generate staging passwords
npm run generate-passwords:staging

# Features:
# - Production-like security
# - Full feature testing
# - Production-like configurations
# - Performance testing data
```

### Production Environment
```bash
# Generate production passwords
npm run generate-passwords:prod

# Features:
# - Maximum security settings
# - Production-specific configurations
# - Proper audit trails
# - Compliance-ready data
```

## Generated Files

The password generation script creates the following files in `scripts/generated/`:

### JSON Files
- `development_passwords.json` - Development environment passwords
- `testing_passwords.json` - Testing environment passwords
- `staging_passwords.json` - Staging environment passwords
- `production_passwords.json` - Production environment passwords

### SQL Files
- `development_password_functions.sql` - SQL functions for development
- `testing_password_functions.sql` - SQL functions for testing
- `staging_password_functions.sql` - SQL functions for staging
- `production_password_functions.sql` - SQL functions for production

### Environment Files
- `.env.development` - Development environment variables
- `.env.testing` - Testing environment variables
- `.env.staging` - Staging environment variables
- `.env.production` - Production environment variables

## Sample Data Structure

### Tenants
- **Springfield High School** - Public high school with full features
- **Riverside Elementary** - Public elementary school with basic features
- **Private Academy** - Private K-12 school on trial plan

### Users by Role
- **Super Admin** - System-wide access across all tenants
- **Tenant Admin** - Tenant-level administration
- **Principal** - School administration
- **Teachers** - Subject-specific teaching staff
- **Students** - Grade-level student access
- **Parents** - Child-specific parent access

## Security Best Practices

### 🔒 **Password Security**
```bash
# Never commit generated password files
echo "generated/*.json" >> .gitignore
echo "generated/*.sql" >> .gitignore
echo "generated/.env.*" >> .gitignore
```

### 🔒 **Environment Variables**
```bash
# Use environment variables in production
export DEFAULT_SUPER_ADMIN_PASSWORD="YourSecurePassword123!"
export DEFAULT_TENANT_ADMIN_PASSWORD="YourSecurePassword123!"
```

### 🔒 **Access Control**
```bash
# Restrict access to generated files
chmod 600 generated/*.json
chmod 600 generated/*.sql
chmod 600 generated/.env.*
```

## Troubleshooting

### Common Issues

#### 1. Missing Dependencies
```bash
# Install Node.js dependencies
cd db/seeds/scripts
npm install
```

#### 2. Permission Errors
```bash
# Fix file permissions
chmod +x generate_secure_passwords.js
chmod 755 generated/
```

#### 3. Database Connection Issues
```bash
# Check database connection
psql -d your_database -c "SELECT 1;"
```

#### 4. Constraint Violations
```bash
# Check for existing data
psql -d your_database -c "SELECT COUNT(*) FROM users;"
psql -d your_database -c "SELECT COUNT(*) FROM tenants;"
```

### Validation

#### 1. Validate Generated Data
```bash
# Run validation script
npm run validate
```

#### 2. Check Data Integrity
```sql
-- Check tenant data
SELECT id, name, slug, subscription_status FROM tenants;

-- Check user data
SELECT id, tenant_id, email, role, status FROM users;

-- Check permissions
SELECT role, permissions FROM users WHERE role = 'super_admin';
```

## Development Workflow

### 1. Local Development
```bash
# Generate development passwords
npm run generate-passwords:dev

# Run seeding
psql -d school_sis_dev -f 001_sample_tenants.sql
psql -d school_sis_dev -f 002_sample_users_enhanced.sql
```

### 2. Testing
```bash
# Generate testing passwords
npm run generate-passwords:test

# Run seeding
psql -d school_sis_test -f 001_sample_tenants.sql
psql -d school_sis_test -f 002_sample_users_enhanced.sql
```

### 3. Staging Deployment
```bash
# Generate staging passwords
npm run generate-passwords:staging

# Deploy to staging
# (Use your deployment pipeline)
```

### 4. Production Deployment
```bash
# Generate production passwords
npm run generate-passwords:prod

# Deploy to production
# (Use your deployment pipeline)
```

## Monitoring and Maintenance

### 1. Password Rotation
```bash
# Rotate passwords monthly
npm run generate-passwords:prod
# Update production environment variables
```

### 2. Data Validation
```bash
# Validate seeded data
npm run validate

# Check data integrity
psql -d your_database -f validate_seed_data.sql
```

### 3. Security Auditing
```bash
# Audit password security
npm audit

# Check file permissions
ls -la generated/
```

## Contributing

### 1. Adding New User Roles
1. Update `USER_ROLES` in `generate_secure_passwords.js`
2. Add role-specific permissions in seed files
3. Update documentation

### 2. Adding New Tenants
1. Add tenant data to `001_sample_tenants.sql`
2. Add corresponding users to `002_sample_users_enhanced.sql`
3. Update documentation

### 3. Modifying Permissions
1. Update permissions structure in seed files
2. Update documentation
3. Test with different user roles

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review the enhancement recommendations
3. Create an issue in the project repository
4. Contact the development team

## License

This project is licensed under the MIT License - see the LICENSE file for details.
