# K-12 Student Information System - Database Scripts

Professional database management scripts with multinational compliance support (US, EU, Indonesia).

## Quick Start

```bash
# Full database setup
./scripts/run_all.sh

# Setup with demo data
./scripts/run_all.sh --demo

# Setup with anonymization
./scripts/run_all.sh --demo --anonymize
```

## Directory Structure

```
scripts/
├── migrations/          # Database schema migrations (timestamped)
├── seeds/              # Initial and demo data
├── validate/           # Data integrity validation
├── anonymize/          # Privacy compliance anonymization
├── run_all.sh         # Complete setup wrapper
└── README.md          # This file
```

## Scripts Overview

### Migrations (`migrations/`)

**Purpose**: Create and modify database schema with idempotent operations.

- `20240922_001_create_tenants_table.sql` - Multi-tenant architecture foundation
- `20240922_002_create_users_table.sql` - User accounts with RBAC
- `20240922_003_create_students_table.sql` - Student records with compliance

**Features**:
- ✅ Idempotent (safe to run multiple times)
- ✅ Timestamped for chronological ordering
- ✅ Multi-tenant architecture
- ✅ GDPR/FERPA compliance built-in
- ✅ Comprehensive indexing
- ✅ Audit trail support

**Usage**:
```bash
# Run all migrations
./scripts/run_all.sh --migrations-only

# Run specific migration
psql -d school_sis -f scripts/migrations/20240922_001_create_tenants_table.sql
```

### Seeds (`seeds/`)

**Purpose**: Populate database with initial or demo data.

- `initial_data.sql` - Essential starter data (admin, principal, sample student)
- `demo_data.sql` - Comprehensive demo dataset across multiple tenants

**Features**:
- ✅ Idempotent data insertion
- ✅ Multi-tenant demo data
- ✅ International compliance examples
- ✅ Realistic test scenarios

**Usage**:
```bash
# Initial data only
./scripts/run_all.sh --seeds-only

# Demo data
./scripts/run_all.sh --seeds-only --demo
```

### Validation (`validate/`)

**Purpose**: Check data integrity and identify issues.

- `check_integrity.sql` - Comprehensive data validation queries

**Checks Include**:
- ✅ Orphaned records (students without tenants)
- ✅ Duplicate identifiers
- ✅ Missing required fields
- ✅ Invalid email formats
- ✅ Future dates in historical data
- ✅ Audit trail consistency
- ✅ Cross-tenant data integrity

**Usage**:
```bash
# Run validation
./scripts/run_all.sh --validation-only

# View results
psql -d school_sis -c "SELECT * FROM integrity_check_summary;"
```

### Anonymization (`anonymize/`)

**Purpose**: Replace real data with safe fake data for privacy compliance.

- `anonymize_students.sql` - Student data anonymization

**Anonymizes**:
- ✅ Names (consistent mapping)
- ✅ Email addresses
- ✅ Phone numbers
- ✅ Addresses
- ✅ Medical information
- ✅ Emergency contacts

**Features**:
- ✅ Consistent anonymization (same input = same output)
- ✅ Preserves data relationships
- ✅ GDPR/FERPA compliant
- ✅ Reversible with mapping table

**Usage**:
```bash
# Anonymize all student data
./scripts/run_all.sh --anonymize-only

# Setup with anonymization
./scripts/run_all.sh --demo --anonymize
```

## Complete Setup Options

### Basic Setup
```bash
./scripts/run_all.sh
```
- Runs migrations
- Seeds initial data
- Validates integrity

### Demo Setup
```bash
./scripts/run_all.sh --demo
```
- Runs migrations
- Seeds demo data (multiple tenants, countries)
- Validates integrity

### Privacy-Compliant Setup
```bash
./scripts/run_all.sh --demo --anonymize
```
- Runs migrations
- Seeds demo data
- Anonymizes sensitive information
- Validates integrity

### Individual Operations
```bash
# Migrations only
./scripts/run_all.sh --migrations-only

# Seeds only
./scripts/run_all.sh --seeds-only --demo

# Validation only
./scripts/run_all.sh --validation-only

# Anonymization only
./scripts/run_all.sh --anonymize-only
```

## Environment Configuration

Set these environment variables or use defaults:

```bash
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=school_sis
export DB_USER=postgres
export DB_PASSWORD=postgres
```

## Compliance Features

### US (FERPA)
- ✅ Student data privacy controls
- ✅ Audit trail for all changes
- ✅ Parent access controls
- ✅ Data retention policies

### EU (GDPR)
- ✅ Data anonymization tools
- ✅ Right to be forgotten support
- ✅ Data portability features
- ✅ Consent management

### Indonesia (UU No. 19 Tahun 2016)
- ✅ Local data residency support
- ✅ Indonesian language support
- ✅ Local compliance fields

## Best Practices

### Development
- Always run migrations before seeds
- Use validation after data changes
- Test with anonymized data in staging

### Production
- Backup before running migrations
- Run validation regularly
- Monitor audit logs
- Use anonymization for test environments

### Security
- Use strong passwords in production
- Limit database access permissions
- Regular security audits
- Encrypt sensitive data at rest

## Troubleshooting

### Common Issues

**Connection Failed**
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Verify credentials
psql -h localhost -U postgres -d school_sis -c "SELECT 1;"
```

**Migration Errors**
```bash
# Check for conflicting data
./scripts/run_all.sh --validation-only

# Review migration logs
tail -f /var/log/postgresql/postgresql.log
```

**Validation Failures**
```bash
# View detailed results
psql -d school_sis -f scripts/validate/check_integrity.sql

# Check specific issues
psql -d school_sis -c "SELECT * FROM integrity_check_summary WHERE status = 'FAIL';"
```

## Contributing

### Adding New Migrations
1. Create timestamped file: `YYYYMMDD_NNN_description.sql`
2. Use `IF NOT EXISTS` for idempotency
3. Add comprehensive comments
4. Include compliance considerations

### Adding New Seeds
1. Use `ON CONFLICT` for idempotency
2. Include realistic test data
3. Cover multiple scenarios
4. Document data relationships

### Adding New Validations
1. Add to `check_integrity.sql`
2. Include in summary view
3. Provide clear error messages
4. Test with various data states

## Support

- **Documentation**: See `docs/` directory for detailed guides
- **Issues**: Report problems in GitHub issues
- **Compliance**: Review compliance documentation in `docs/`

---

**Professional K-12 SIS Database Management** 🏫
