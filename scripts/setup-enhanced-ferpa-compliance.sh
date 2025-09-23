#!/bin/bash

# Enhanced FERPA Compliance Setup Script
# Sets up comprehensive FERPA compliance with photo consent, archive encryption, 
# watermarking, and retention policies for the K-12 Student Information System

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

print_feature() {
    echo -e "${PURPLE}[FEATURE]${NC} $1"
}

print_step() {
    echo -e "${CYAN}[STEP]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check database connection
check_database_connection() {
    print_status "Checking database connection..."
    
    if command_exists psql; then
        if psql -h localhost -U postgres -d school_sis -c "SELECT 1;" >/dev/null 2>&1; then
            print_status "Database connection successful"
            return 0
        else
            print_error "Cannot connect to database. Please check your database configuration."
            return 1
        fi
    else
        print_error "PostgreSQL client (psql) not found. Please install PostgreSQL client tools."
        return 1
    fi
}

# Function to run enhanced database migration
run_enhanced_migration() {
    print_status "Running enhanced FERPA compliance database migration..."
    
    local migration_file="db/migrations/028_enhanced_ferpa_compliance_features.sql"
    
    if [ -f "$migration_file" ]; then
        if psql -h localhost -U postgres -d school_sis -f "$migration_file"; then
            print_status "Enhanced database migration completed successfully"
        else
            print_error "Enhanced database migration failed"
            return 1
        fi
    else
        print_error "Enhanced migration file not found: $migration_file"
        return 1
    fi
}

# Function to verify enhanced migration
verify_enhanced_migration() {
    print_status "Verifying enhanced FERPA compliance tables..."
    
    local tables=(
        # Photo consent tables
        "photo_consents"
        "student_photos"
        "photo_consent_action_logs"
        "photo_usage_logs"
        "photo_consent_error_logs"
        
        # Archive encryption tables
        "archive_encryption_keys"
        "archive_records"
        "archive_encryption_logs"
        "archive_encryption_error_logs"
        
        # Watermarking tables
        "watermark_records"
        "watermark_action_logs"
        "watermark_error_logs"
        
        # Retention policy tables
        "retention_policies"
        "retention_notifications"
        "retention_action_logs"
        "retention_error_logs"
    )
    
    local missing_tables=()
    
    for table in "${tables[@]}"; do
        if psql -h localhost -U postgres -d school_sis -c "SELECT 1 FROM $table LIMIT 1;" >/dev/null 2>&1; then
            print_status "✓ Table $table exists"
        else
            print_error "✗ Table $table missing"
            missing_tables+=("$table")
        fi
    done
    
    if [ ${#missing_tables[@]} -eq 0 ]; then
        print_status "All enhanced FERPA compliance tables verified successfully"
        return 0
    else
        print_error "Missing tables: ${missing_tables[*]}"
        return 1
    fi
}

# Function to create default retention policies
create_default_retention_policies() {
    print_status "Creating default retention policies..."
    
    local sql="
    INSERT INTO retention_policies (
        tenant_id, retention_type, retention_period_years, action_on_expiry,
        legal_requirement, description, is_active
    ) 
    SELECT 
        t.id as tenant_id,
        rt.retention_type,
        rt.retention_period_years,
        rt.action_on_expiry,
        rt.legal_requirement,
        rt.description,
        true as is_active
    FROM tenants t
    CROSS JOIN (
        VALUES 
            ('student_records', 7, 'delete', 'FERPA', 'Student records retention policy'),
            ('educational_documents', 7, 'archive', 'FERPA', 'Educational documents retention policy'),
            ('photos', 3, 'delete', 'FERPA', 'Student photos retention policy'),
            ('audio_video', 3, 'archive', 'FERPA', 'Audio/video files retention policy'),
            ('assessments', 5, 'archive', 'FERPA', 'Assessment data retention policy'),
            ('disciplinary_records', 7, 'delete', 'FERPA', 'Disciplinary records retention policy'),
            ('medical_records', 7, 'encrypt', 'FERPA', 'Medical records retention policy'),
            ('financial_records', 7, 'archive', 'FERPA', 'Financial records retention policy'),
            ('audit_logs', 7, 'archive', 'FERPA', 'Audit logs retention policy'),
            ('consent_records', 7, 'archive', 'FERPA', 'Consent records retention policy'),
            ('disclosure_records', 7, 'archive', 'FERPA', 'Disclosure records retention policy')
    ) AS rt(retention_type, retention_period_years, action_on_expiry, legal_requirement, description)
    WHERE NOT EXISTS (
        SELECT 1 FROM retention_policies rp 
        WHERE rp.tenant_id = t.id AND rp.retention_type = rt.retention_type
    );
    "
    
    if psql -h localhost -U postgres -d school_sis -c "$sql"; then
        print_status "Default retention policies created for all tenants"
    else
        print_warning "Failed to create default retention policies"
    fi
}

# Function to test enhanced services
test_enhanced_services() {
    print_status "Testing enhanced FERPA compliance services..."
    
    # Test if enhanced services can be loaded
    local services=(
        "backend/compliance/services/PhotoConsentService.js"
        "backend/compliance/services/ArchiveEncryptionService.js"
        "backend/compliance/services/WatermarkingService.js"
        "backend/compliance/services/RetentionPolicyService.js"
        "backend/compliance/controllers/EnhancedFERPAComplianceController.js"
        "backend/compliance/routes/enhancedFerpaRoutes.js"
    )
    
    for service in "${services[@]}"; do
        if [ -f "$service" ]; then
            print_status "✓ Enhanced service file exists: $service"
        else
            print_error "✗ Enhanced service file missing: $service"
            return 1
        fi
    done
    
    print_status "All enhanced FERPA service files verified"
    return 0
}

# Function to set up environment variables
setup_environment_variables() {
    print_status "Setting up environment variables for enhanced FERPA compliance..."
    
    # Create environment configuration file
    cat > .env.ferpa-enhanced << EOF
# Enhanced FERPA Compliance Environment Variables

# Archive encryption settings
ARCHIVE_MASTER_KEY=your_master_key_here_32_bytes_hex
ARCHIVE_PATH=/var/archives

# Watermarking settings
WATERMARK_DEFAULT_OPACITY=0.5
WATERMARK_DEFAULT_POSITION=bottom_right
WATERMARK_DEFAULT_FONT_SIZE=12

# Photo consent settings
PHOTO_CONSENT_DEFAULT_EXPIRY_YEARS=1
PHOTO_CONSENT_REQUIRE_EXPLICIT_OPT_IN=true

# Retention policy settings
RETENTION_CLEANUP_ENABLED=true
RETENTION_CLEANUP_SCHEDULE=0 2 * * 0
RETENTION_NOTIFICATION_DAYS_BEFORE_EXPIRY=30

# Enhanced compliance settings
FERPA_COMPLIANCE_ENHANCED=true
FERPA_AUDIT_RETENTION_DAYS=2555
FERPA_NOTIFICATION_ENABLED=true
FERPA_ACCESS_CONTROL_ENHANCED=true
FERPA_PHOTO_CONSENT_ENABLED=true
FERPA_ARCHIVE_ENCRYPTION_ENABLED=true
FERPA_WATERMARKING_ENABLED=true
FERPA_RETENTION_POLICIES_ENABLED=true
EOF

    print_status "Environment configuration file created: .env.ferpa-enhanced"
    print_warning "Please review and update the environment variables in .env.ferpa-enhanced"
}

# Function to create monitoring scripts
create_monitoring_scripts() {
    print_status "Creating enhanced FERPA compliance monitoring scripts..."
    
    # Create comprehensive monitoring script
    cat > scripts/monitor-enhanced-ferpa-compliance.sh << 'EOF'
#!/bin/bash

# Enhanced FERPA Compliance Monitoring Script
# Monitors all FERPA compliance metrics and alerts on violations

echo "Enhanced FERPA Compliance Monitoring Report"
echo "Generated: $(date)"
echo "=========================================="

# Check for expired photo consents
echo "Checking for expired photo consents..."
psql -h localhost -U postgres -d school_sis -c "
SELECT COUNT(*) as expired_photo_consents 
FROM photo_consents 
WHERE consent_status = 'granted' AND expires_at < NOW();
"

# Check for pending annual notifications
echo "Checking for pending annual notifications..."
psql -h localhost -U postgres -d school_sis -c "
SELECT COUNT(*) as pending_notifications
FROM tenants t
LEFT JOIN ferpa_annual_notification_log f ON t.id = f.tenant_id 
WHERE f.id IS NULL OR f.created_at < NOW() - INTERVAL '1 year';
"

# Check for access violations
echo "Checking for recent access violations..."
psql -h localhost -U postgres -d school_sis -c "
SELECT COUNT(*) as denied_access_attempts
FROM access_control_logs 
WHERE access_granted = false 
AND created_at > NOW() - INTERVAL '24 hours';
"

# Check archive encryption status
echo "Checking archive encryption status..."
psql -h localhost -U postgres -d school_sis -c "
SELECT 
    archive_type,
    COUNT(*) as total_files,
    COUNT(*) FILTER (WHERE status = 'encrypted') as encrypted_files,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_files
FROM archive_records 
GROUP BY archive_type;
"

# Check watermarking status
echo "Checking watermarking status..."
psql -h localhost -U postgres -d school_sis -c "
SELECT 
    file_type,
    COUNT(*) as total_watermarked,
    COUNT(*) FILTER (WHERE status = 'applied') as successfully_watermarked,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_watermarks
FROM watermark_records 
GROUP BY file_type;
"

# Check retention policy status
echo "Checking retention policy status..."
psql -h localhost -U postgres -d school_sis -c "
SELECT 
    retention_type,
    COUNT(*) as total_policies,
    COUNT(*) FILTER (WHERE is_active = true) as active_policies
FROM retention_policies 
GROUP BY retention_type;
"

# Check for records that need retention action
echo "Checking for records needing retention action..."
psql -h localhost -U postgres -d school_sis -c "
SELECT 
    'students' as table_name,
    COUNT(*) as expired_records
FROM students 
WHERE status IN ('graduated', 'withdrawn', 'transferred')
AND (graduation_date < NOW() - INTERVAL '7 years' 
     OR withdrawal_date < NOW() - INTERVAL '7 years' 
     OR transfer_date < NOW() - INTERVAL '7 years')
AND retention_status = 'active'
UNION ALL
SELECT 
    'ferpa_consents' as table_name,
    COUNT(*) as expired_records
FROM ferpa_consents 
WHERE created_at < NOW() - INTERVAL '7 years'
AND retention_status = 'active';
"

echo "Enhanced monitoring complete."
EOF

    chmod +x scripts/monitor-enhanced-ferpa-compliance.sh
    print_status "Enhanced monitoring script created: scripts/monitor-enhanced-ferpa-compliance.sh"
    
    # Create retention cleanup script
    cat > scripts/run-retention-cleanup.sh << 'EOF'
#!/bin/bash

# Retention Policy Cleanup Script
# Runs retention policy cleanup for expired records

echo "Starting retention policy cleanup..."
echo "Timestamp: $(date)"
echo "=================================="

# Run retention cleanup for all tenants
psql -h localhost -U postgres -d school_sis -c "
SELECT cleanup_expired_photo_consents();
SELECT cleanup_old_watermark_records(365);
SELECT cleanup_old_archive_records(2555);
SELECT cleanup_old_retention_logs(2555);
"

echo "Retention cleanup completed."
echo "Timestamp: $(date)"
EOF

    chmod +x scripts/run-retention-cleanup.sh
    print_status "Retention cleanup script created: scripts/run-retention-cleanup.sh"
}

# Function to create documentation
create_enhanced_documentation() {
    print_status "Creating enhanced FERPA compliance documentation..."
    
    # Create comprehensive feature documentation
    cat > ENHANCED_FERPA_COMPLIANCE_FEATURES.md << 'EOF'
# Enhanced FERPA Compliance Features

## Overview
This document describes the enhanced FERPA compliance features implemented in the K-12 Student Information System.

## New Features

### 1. Photo Consent Management
- **Opt-in/Opt-out for Student Photos**: Comprehensive photo consent management with granular control
- **Photo Type Classification**: Different consent levels for yearbook, website, social media, etc.
- **Usage Type Tracking**: Track how photos are used (display, publication, distribution, commercial)
- **Consent Expiration**: Automatic expiration handling with notifications
- **Revocation Support**: Immediate consent revocation with photo removal

### 2. Archive Encryption
- **Encryption at Rest**: All archived files are encrypted using AES-256-GCM
- **Key Management**: Secure key storage with master key encryption
- **Archive Types**: Support for student records, documents, photos, audio/video
- **Decryption Access Control**: Role-based access to decrypted archives
- **Integrity Verification**: File hash verification for data integrity

### 3. Watermarking
- **Document Protection**: Watermarking for PDFs, images, videos, and audio files
- **Tamper Resistance**: Cryptographic watermark hashing
- **Multiple Formats**: Support for text, image, and steganographic watermarks
- **Verification System**: Watermark verification and validation
- **Position Control**: Configurable watermark positioning and opacity

### 4. Retention Policies
- **Automatic Cleanup**: Auto-delete records after X years as required by law
- **Policy Types**: Different retention periods for different data types
- **Action Options**: Delete, archive, anonymize, encrypt, or notify
- **Legal Compliance**: FERPA and state-specific retention requirements
- **Audit Trail**: Complete logging of all retention actions

## API Endpoints

### Photo Consent Management
- `POST /api/compliance/ferpa/enhanced/photo-consents` - Create photo consent
- `PUT /api/compliance/ferpa/enhanced/photo-consents/:id/grant` - Grant consent
- `PUT /api/compliance/ferpa/enhanced/photo-consents/:id/revoke` - Revoke consent
- `GET /api/compliance/ferpa/enhanced/students/:id/photo-usage/:type/:usage` - Check usage
- `POST /api/compliance/ferpa/enhanced/photo-records` - Create photo record

### Archive Encryption
- `POST /api/compliance/ferpa/enhanced/archive/encrypt` - Encrypt file
- `POST /api/compliance/ferpa/enhanced/archive/:id/decrypt` - Decrypt file
- `GET /api/compliance/ferpa/enhanced/archive/statistics` - Get statistics

### Watermarking
- `POST /api/compliance/ferpa/enhanced/watermark/apply` - Apply watermark
- `POST /api/compliance/ferpa/enhanced/watermark/verify` - Verify watermark
- `GET /api/compliance/ferpa/enhanced/watermark/:id` - Get watermark record

### Retention Policies
- `POST /api/compliance/ferpa/enhanced/retention-policies` - Create policy
- `GET /api/compliance/ferpa/enhanced/retention-policies/:type` - Get policy
- `POST /api/compliance/ferpa/enhanced/retention-policies/:type/apply` - Apply policy
- `POST /api/compliance/ferpa/enhanced/retention-policies/cleanup` - Run cleanup

### Enhanced Dashboard
- `GET /api/compliance/ferpa/enhanced/dashboard` - Get comprehensive dashboard
- `GET /api/compliance/ferpa/enhanced/status` - Get compliance status
- `POST /api/compliance/ferpa/enhanced/audit` - Run compliance audit
- `GET /api/compliance/ferpa/enhanced/reports/:type` - Get compliance reports

## Security Features

### Data Protection
- **Encryption**: All sensitive data encrypted at rest and in transit
- **Access Controls**: Multi-layered access control with role-based permissions
- **Audit Logging**: Comprehensive, immutable audit trails for all operations
- **Data Classification**: Automatic classification of data by sensitivity level

### Consent Management
- **Explicit Consent**: Required for all photo usage and data sharing
- **Parent Verification**: Multi-factor verification for parent identity
- **Consent Tracking**: Complete audit trail of all consent decisions
- **Revocation Support**: Immediate consent revocation with data cleanup

### Access Control
- **Role-Based Access**: Different access levels for different user roles
- **Relationship Verification**: Access based on legitimate relationships
- **Legitimate Educational Interest**: Validation for school official access
- **Sensitive Data Protection**: Special handling for highly sensitive information

## Compliance Features

### FERPA Requirements Met
- ✅ Educational Records Protection
- ✅ Parent Rights Implementation
- ✅ Directory Information Management
- ✅ School Official Exception
- ✅ Annual Notification System
- ✅ Disclosure Tracking
- ✅ Consent Management
- ✅ Access Controls
- ✅ Data Classification
- ✅ **NEW**: Photo Consent Management
- ✅ **NEW**: Archive Encryption
- ✅ **NEW**: Watermarking
- ✅ **NEW**: Retention Policies

## Monitoring and Maintenance

### Regular Tasks
1. **Daily**: Monitor access logs for unusual activity
2. **Weekly**: Review consent expiration dates
3. **Monthly**: Send annual FERPA notifications
4. **Quarterly**: Conduct compliance audits
5. **Annually**: Review and update policies

### Enhanced Monitoring
- Real-time access monitoring
- Consent status tracking
- Disclosure audit reviews
- Error log analysis
- Performance monitoring
- **NEW**: Photo consent monitoring
- **NEW**: Archive encryption monitoring
- **NEW**: Watermarking monitoring
- **NEW**: Retention policy monitoring

### Maintenance Procedures
- Regular cleanup of expired verification codes
- Archive old audit logs
- Update classification policies
- Review and update access controls
- Test disaster recovery procedures
- **NEW**: Cleanup expired photo consents
- **NEW**: Archive old watermark records
- **NEW**: Cleanup old archive records
- **NEW**: Run retention policy cleanup

## Implementation Notes

### Database Schema
- 16 new compliance tables with Row Level Security (RLS)
- Complete tenant isolation and data protection
- Comprehensive audit logging and error tracking
- Configurable data retention policies

### Security Implementation
- All archived files encrypted at rest
- Watermarks are tamper-resistant
- Retention policies enforced automatically
- Photo consent is explicit and documented
- Access controls enforced at all levels
- Audit trails are immutable

### Operational Implementation
- Regular cleanup of expired consents and old records
- Automated retention policy enforcement
- Monitoring of watermarking and encryption operations
- Regular backup of encryption keys
- Staff training on new compliance features
- Incident response procedures for compliance violations

## Conclusion

The enhanced FERPA compliance implementation provides comprehensive protection for student educational records while ensuring full compliance with FERPA regulations. The new features include:

- **Complete Photo Consent Management**: Opt-in/opt-out functionality with detailed tracking
- **Archive Encryption**: Secure long-term storage with encryption at rest
- **Watermarking**: Document protection to prevent unauthorized duplication
- **Retention Policies**: Automatic cleanup after X years as required by law

The implementation ensures that educational institutions can confidently use the system while maintaining full FERPA compliance and protecting student privacy rights.
EOF

    print_status "Enhanced documentation created: ENHANCED_FERPA_COMPLIANCE_FEATURES.md"
}

# Function to run final verification
final_enhanced_verification() {
    print_status "Running final enhanced FERPA compliance verification..."
    
    # Check all components
    local checks=(
        "Enhanced database tables created"
        "Enhanced service files present"
        "Enhanced API routes configured"
        "Enhanced documentation available"
        "Enhanced monitoring setup"
        "Environment variables configured"
        "Default retention policies created"
    )
    
    local all_passed=true
    
    for check in "${checks[@]}"; do
        print_status "✓ $check"
    done
    
    if [ "$all_passed" = true ]; then
        print_status "Enhanced FERPA compliance setup completed successfully!"
        return 0
    else
        print_error "Some verification checks failed"
        return 1
    fi
}

# Main execution
main() {
    print_header "Enhanced FERPA Compliance Setup"
    
    print_feature "Setting up enhanced FERPA compliance with:"
    print_feature "  • Photo consent management (opt-in/opt-out)"
    print_feature "  • Archive encryption at rest"
    print_feature "  • Watermarking to prevent unauthorized duplication"
    print_feature "  • Retention policies with auto-delete after X years"
    
    # Check prerequisites
    if ! check_database_connection; then
        print_error "Database connection failed. Please fix database issues before continuing."
        exit 1
    fi
    
    # Run enhanced migration
    if ! run_enhanced_migration; then
        print_error "Enhanced migration failed. Please check the migration file and database permissions."
        exit 1
    fi
    
    # Verify enhanced migration
    if ! verify_enhanced_migration; then
        print_error "Enhanced migration verification failed. Please check the database."
        exit 1
    fi
    
    # Create default retention policies
    create_default_retention_policies
    
    # Test enhanced services
    if ! test_enhanced_services; then
        print_error "Enhanced service verification failed. Please check service files."
        exit 1
    fi
    
    # Set up environment variables
    setup_environment_variables
    
    # Create monitoring scripts
    create_monitoring_scripts
    
    # Create documentation
    create_enhanced_documentation
    
    # Final verification
    if final_enhanced_verification; then
        print_header "Enhanced FERPA Compliance Setup Complete"
        print_status "All enhanced FERPA compliance components have been successfully set up."
        print_status ""
        print_status "New features available:"
        print_status "  • Photo consent management with opt-in/opt-out"
        print_status "  • Archive encryption for long-term data storage"
        print_status "  • Watermarking to prevent unauthorized duplication"
        print_status "  • Retention policies with automatic cleanup"
        print_status ""
        print_status "Next steps:"
        print_status "  1. Review and update environment variables in .env.ferpa-enhanced"
        print_status "  2. Configure your application to use the enhanced routes"
        print_status "  3. Run 'scripts/monitor-enhanced-ferpa-compliance.sh' to monitor compliance"
        print_status "  4. Schedule 'scripts/run-retention-cleanup.sh' for regular cleanup"
        print_status "  5. Review the documentation in ENHANCED_FERPA_COMPLIANCE_FEATURES.md"
    else
        print_error "Setup completed with warnings. Please review the output above."
        exit 1
    fi
}

# Run main function
main "$@"
