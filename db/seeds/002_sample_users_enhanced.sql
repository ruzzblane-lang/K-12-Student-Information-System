-- Seed: Enhanced sample users data
-- Description: Insert sample users for testing and development with proper security and data integrity
-- Created: 2024-01-15
-- Updated: 2024-01-15

-- =============================================================================
-- ENHANCED SAMPLE USERS DATA
-- =============================================================================

-- Function to generate secure password hash (placeholder - should be generated dynamically)
-- TODO: IMPLEMENTER - Replace with actual password hashing in application layer
CREATE OR REPLACE FUNCTION generate_sample_password_hash()
RETURNS TEXT AS $$
BEGIN
    -- This is a placeholder - in production, use proper password hashing
    -- Example: bcrypt.hash('SamplePassword123!', 10)
    RETURN '$2b$10$sample.hash.placeholder.for.development.only';
END;
$$ LANGUAGE plpgsql;

-- Function to generate secure password salt
CREATE OR REPLACE FUNCTION generate_sample_password_salt()
RETURNS TEXT AS $$
BEGIN
    -- This is a placeholder - in production, use proper salt generation
    RETURN 'sample_salt_placeholder_for_development';
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- SPRINGFIELD HIGH SCHOOL USERS
-- =============================================================================

-- Super Admin (System-wide access)
INSERT INTO users (
    id,
    tenant_id,
    email,
    password_hash,
    password_salt,
    password_last_changed_at,
    email_verified,
    first_name,
    last_name,
    phone,
    role,
    permissions,
    status,
    session_timeout_minutes,
    created_at,
    updated_at
) VALUES (
    '650e8400-e29b-41d4-a716-446655440001'::UUID,
    '550e8400-e29b-41d4-a716-446655440001'::UUID, -- Springfield High School
    'superadmin@springfield.edu',
    generate_sample_password_hash(),
    generate_sample_password_salt(),
    CURRENT_TIMESTAMP,
    true,
    'Super',
    'Administrator',
    '+1-217-555-0001',
    'super_admin',
    '{
        "modules": {
            "students": ["create", "read", "update", "delete"],
            "teachers": ["create", "read", "update", "delete"],
            "grades": ["create", "read", "update", "delete"],
            "attendance": ["create", "read", "update", "delete"],
            "reports": ["create", "read", "update", "delete", "export"],
            "analytics": ["create", "read", "update", "delete"],
            "system": ["create", "read", "update", "delete"]
        },
        "features": {
            "bulk_import": true,
            "advanced_analytics": true,
            "custom_reports": true,
            "api_access": true,
            "system_administration": true,
            "tenant_management": true
        },
        "restrictions": {},
        "overrides": {
            "bypass_approval_workflows": true,
            "access_all_tenants": true,
            "modify_system_settings": true
        }
    }'::JSONB,
    'active',
    480, -- 8 hours
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (tenant_id, email) DO NOTHING;

-- Tenant Admin
INSERT INTO users (
    id,
    tenant_id,
    email,
    password_hash,
    password_salt,
    password_last_changed_at,
    email_verified,
    first_name,
    last_name,
    phone,
    role,
    permissions,
    status,
    session_timeout_minutes,
    created_at,
    updated_at
) VALUES (
    '650e8400-e29b-41d4-a716-446655440002'::UUID,
    '550e8400-e29b-41d4-a716-446655440001'::UUID, -- Springfield High School
    'admin@springfield.edu',
    generate_sample_password_hash(),
    generate_sample_password_salt(),
    CURRENT_TIMESTAMP,
    true,
    'John',
    'Administrator',
    '+1-217-555-0002',
    'tenant_admin',
    '{
        "modules": {
            "students": ["create", "read", "update", "delete"],
            "teachers": ["create", "read", "update", "delete"],
            "grades": ["create", "read", "update", "delete"],
            "attendance": ["create", "read", "update", "delete"],
            "reports": ["create", "read", "update", "delete", "export"],
            "analytics": ["create", "read", "update", "delete"]
        },
        "features": {
            "bulk_import": true,
            "advanced_analytics": true,
            "custom_reports": true,
            "api_access": true,
            "white_labeling": true
        },
        "restrictions": {
            "grade_levels": ["9", "10", "11", "12"],
            "departments": ["All"]
        },
        "overrides": {
            "bypass_approval_workflows": true,
            "access_all_tenants": false,
            "modify_system_settings": false
        }
    }'::JSONB,
    'active',
    480, -- 8 hours
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (tenant_id, email) DO NOTHING;

-- Principal
INSERT INTO users (
    id,
    tenant_id,
    email,
    password_hash,
    password_salt,
    password_last_changed_at,
    email_verified,
    first_name,
    last_name,
    phone,
    role,
    permissions,
    status,
    session_timeout_minutes,
    created_at,
    updated_at
) VALUES (
    '650e8400-e29b-41d4-a716-446655440003'::UUID,
    '550e8400-e29b-41d4-a716-446655440001'::UUID, -- Springfield High School
    'principal@springfield.edu',
    generate_sample_password_hash(),
    generate_sample_password_salt(),
    CURRENT_TIMESTAMP,
    true,
    'Dr. Sarah',
    'Principal',
    '+1-217-555-0003',
    'principal',
    '{
        "modules": {
            "students": ["read", "update"],
            "teachers": ["read", "update"],
            "grades": ["read", "update"],
            "attendance": ["read", "update"],
            "reports": ["read", "export"],
            "analytics": ["read"]
        },
        "features": {
            "bulk_import": false,
            "advanced_analytics": true,
            "custom_reports": true,
            "api_access": false
        },
        "restrictions": {
            "grade_levels": ["9", "10", "11", "12"],
            "departments": ["All"]
        },
        "overrides": {
            "bypass_approval_workflows": false,
            "access_all_tenants": false,
            "modify_system_settings": false
        }
    }'::JSONB,
    'active',
    480, -- 8 hours
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (tenant_id, email) DO NOTHING;

-- Teachers
INSERT INTO users (
    id,
    tenant_id,
    email,
    password_hash,
    password_salt,
    password_last_changed_at,
    email_verified,
    first_name,
    last_name,
    phone,
    role,
    permissions,
    status,
    session_timeout_minutes,
    created_at,
    updated_at
) VALUES 
(
    '650e8400-e29b-41d4-a716-446655440004'::UUID,
    '550e8400-e29b-41d4-a716-446655440001'::UUID, -- Springfield High School
    'sarah.johnson@springfield.edu',
    generate_sample_password_hash(),
    generate_sample_password_salt(),
    CURRENT_TIMESTAMP,
    true,
    'Sarah',
    'Johnson',
    '+1-217-555-0004',
    'teacher',
    '{
        "modules": {
            "students": ["read"],
            "teachers": ["read"],
            "grades": ["create", "read", "update"],
            "attendance": ["create", "read", "update"],
            "reports": ["read"]
        },
        "features": {
            "bulk_import": false,
            "advanced_analytics": false,
            "custom_reports": false,
            "api_access": false
        },
        "restrictions": {
            "grade_levels": ["9", "10", "11", "12"],
            "departments": ["Mathematics"],
            "max_students_per_class": 30
        },
        "overrides": {
            "bypass_approval_workflows": false,
            "access_all_tenants": false,
            "modify_system_settings": false
        }
    }'::JSONB,
    'active',
    480, -- 8 hours
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    '650e8400-e29b-41d4-a716-446655440005'::UUID,
    '550e8400-e29b-41d4-a716-446655440001'::UUID, -- Springfield High School
    'michael.smith@springfield.edu',
    generate_sample_password_hash(),
    generate_sample_password_salt(),
    CURRENT_TIMESTAMP,
    true,
    'Michael',
    'Smith',
    '+1-217-555-0005',
    'teacher',
    '{
        "modules": {
            "students": ["read"],
            "teachers": ["read"],
            "grades": ["create", "read", "update"],
            "attendance": ["create", "read", "update"],
            "reports": ["read"]
        },
        "features": {
            "bulk_import": false,
            "advanced_analytics": false,
            "custom_reports": false,
            "api_access": false
        },
        "restrictions": {
            "grade_levels": ["9", "10", "11", "12"],
            "departments": ["Science"],
            "max_students_per_class": 30
        },
        "overrides": {
            "bypass_approval_workflows": false,
            "access_all_tenants": false,
            "modify_system_settings": false
        }
    }'::JSONB,
    'active',
    480, -- 8 hours
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (tenant_id, email) DO NOTHING;

-- Students
INSERT INTO users (
    id,
    tenant_id,
    email,
    password_hash,
    password_salt,
    password_last_changed_at,
    email_verified,
    first_name,
    last_name,
    phone,
    role,
    permissions,
    status,
    session_timeout_minutes,
    created_at,
    updated_at
) VALUES 
(
    '650e8400-e29b-41d4-a716-446655440006'::UUID,
    '550e8400-e29b-41d4-a716-446655440001'::UUID, -- Springfield High School
    'emma.wilson@springfield.edu',
    generate_sample_password_hash(),
    generate_sample_password_salt(),
    CURRENT_TIMESTAMP,
    true,
    'Emma',
    'Wilson',
    '+1-217-555-0006',
    'student',
    '{
        "modules": {
            "students": ["read"],
            "grades": ["read"],
            "attendance": ["read"],
            "reports": ["read"]
        },
        "features": {
            "bulk_import": false,
            "advanced_analytics": false,
            "custom_reports": false,
            "api_access": false
        },
        "restrictions": {
            "grade_levels": ["11"],
            "departments": [],
            "access_own_data_only": true
        },
        "overrides": {
            "bypass_approval_workflows": false,
            "access_all_tenants": false,
            "modify_system_settings": false
        }
    }'::JSONB,
    'active',
    240, -- 4 hours (shorter for students)
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    '650e8400-e29b-41d4-a716-446655440007'::UUID,
    '550e8400-e29b-41d4-a716-446655440001'::UUID, -- Springfield High School
    'james.brown@springfield.edu',
    generate_sample_password_hash(),
    generate_sample_password_salt(),
    CURRENT_TIMESTAMP,
    true,
    'James',
    'Brown',
    '+1-217-555-0007',
    'student',
    '{
        "modules": {
            "students": ["read"],
            "grades": ["read"],
            "attendance": ["read"],
            "reports": ["read"]
        },
        "features": {
            "bulk_import": false,
            "advanced_analytics": false,
            "custom_reports": false,
            "api_access": false
        },
        "restrictions": {
            "grade_levels": ["10"],
            "departments": [],
            "access_own_data_only": true
        },
        "overrides": {
            "bypass_approval_workflows": false,
            "access_all_tenants": false,
            "modify_system_settings": false
        }
    }'::JSONB,
    'active',
    240, -- 4 hours (shorter for students)
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (tenant_id, email) DO NOTHING;

-- Parents
INSERT INTO users (
    id,
    tenant_id,
    email,
    password_hash,
    password_salt,
    password_last_changed_at,
    email_verified,
    first_name,
    last_name,
    phone,
    role,
    permissions,
    status,
    session_timeout_minutes,
    created_at,
    updated_at
) VALUES 
(
    '650e8400-e29b-41d4-a716-446655440008'::UUID,
    '550e8400-e29b-41d4-a716-446655440001'::UUID, -- Springfield High School
    'robert.wilson@springfield.edu',
    generate_sample_password_hash(),
    generate_sample_password_salt(),
    CURRENT_TIMESTAMP,
    true,
    'Robert',
    'Wilson',
    '+1-217-555-0008',
    'parent',
    '{
        "modules": {
            "students": ["read"],
            "grades": ["read"],
            "attendance": ["read"],
            "reports": ["read"]
        },
        "features": {
            "bulk_import": false,
            "advanced_analytics": false,
            "custom_reports": false,
            "api_access": false
        },
        "restrictions": {
            "grade_levels": [],
            "departments": [],
            "access_children_data_only": true
        },
        "overrides": {
            "bypass_approval_workflows": false,
            "access_all_tenants": false,
            "modify_system_settings": false
        }
    }'::JSONB,
    'active',
    480, -- 8 hours
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    '650e8400-e29b-41d4-a716-446655440009'::UUID,
    '550e8400-e29b-41d4-a716-446655440001'::UUID, -- Springfield High School
    'lisa.brown@springfield.edu',
    generate_sample_password_hash(),
    generate_sample_password_salt(),
    CURRENT_TIMESTAMP,
    true,
    'Lisa',
    'Brown',
    '+1-217-555-0009',
    'parent',
    '{
        "modules": {
            "students": ["read"],
            "grades": ["read"],
            "attendance": ["read"],
            "reports": ["read"]
        },
        "features": {
            "bulk_import": false,
            "advanced_analytics": false,
            "custom_reports": false,
            "api_access": false
        },
        "restrictions": {
            "grade_levels": [],
            "departments": [],
            "access_children_data_only": true
        },
        "overrides": {
            "bypass_approval_workflows": false,
            "access_all_tenants": false,
            "modify_system_settings": false
        }
    }'::JSONB,
    'active',
    480, -- 8 hours
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (tenant_id, email) DO NOTHING;

-- =============================================================================
-- RIVERSIDE ELEMENTARY USERS
-- =============================================================================

-- Tenant Admin for Riverside
INSERT INTO users (
    id,
    tenant_id,
    email,
    password_hash,
    password_salt,
    password_last_changed_at,
    email_verified,
    first_name,
    last_name,
    phone,
    role,
    permissions,
    status,
    session_timeout_minutes,
    created_at,
    updated_at
) VALUES (
    '650e8400-e29b-41d4-a716-446655440010'::UUID,
    '550e8400-e29b-41d4-a716-446655440002'::UUID, -- Riverside Elementary
    'admin@riverside.edu',
    generate_sample_password_hash(),
    generate_sample_password_salt(),
    CURRENT_TIMESTAMP,
    true,
    'Maria',
    'Garcia',
    '+1-951-555-0010',
    'tenant_admin',
    '{
        "modules": {
            "students": ["create", "read", "update", "delete"],
            "teachers": ["create", "read", "update", "delete"],
            "grades": ["create", "read", "update", "delete"],
            "attendance": ["create", "read", "update", "delete"],
            "reports": ["create", "read", "update", "delete", "export"]
        },
        "features": {
            "bulk_import": true,
            "advanced_analytics": false,
            "custom_reports": false,
            "api_access": false
        },
        "restrictions": {
            "grade_levels": ["K", "1", "2", "3", "4", "5"],
            "departments": ["All"]
        },
        "overrides": {
            "bypass_approval_workflows": true,
            "access_all_tenants": false,
            "modify_system_settings": false
        }
    }'::JSONB,
    'active',
    480, -- 8 hours
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (tenant_id, email) DO NOTHING;

-- =============================================================================
-- PRIVATE ACADEMY USERS (TRIAL)
-- =============================================================================

-- Trial Admin
INSERT INTO users (
    id,
    tenant_id,
    email,
    password_hash,
    password_salt,
    password_last_changed_at,
    email_verified,
    first_name,
    last_name,
    phone,
    role,
    permissions,
    status,
    session_timeout_minutes,
    created_at,
    updated_at
) VALUES (
    '650e8400-e29b-41d4-a716-446655440011'::UUID,
    '550e8400-e29b-41d4-a716-446655440003'::UUID, -- Private Academy
    'admin@privateacademy.edu',
    generate_sample_password_hash(),
    generate_sample_password_salt(),
    CURRENT_TIMESTAMP,
    true,
    'David',
    'Thompson',
    '+1-212-555-0011',
    'tenant_admin',
    '{
        "modules": {
            "students": ["create", "read", "update", "delete"],
            "teachers": ["create", "read", "update", "delete"],
            "grades": ["create", "read", "update", "delete"],
            "attendance": ["create", "read", "update", "delete"],
            "reports": ["create", "read", "update", "delete", "export"],
            "analytics": ["create", "read", "update", "delete"]
        },
        "features": {
            "bulk_import": true,
            "advanced_analytics": true,
            "custom_reports": true,
            "api_access": true,
            "white_labeling": true
        },
        "restrictions": {
            "grade_levels": ["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
            "departments": ["All"]
        },
        "overrides": {
            "bypass_approval_workflows": true,
            "access_all_tenants": false,
            "modify_system_settings": false
        }
    }'::JSONB,
    'active',
    480, -- 8 hours
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (tenant_id, email) DO NOTHING;

-- =============================================================================
-- CLEANUP FUNCTIONS
-- =============================================================================

-- Remove the temporary functions after seeding
DROP FUNCTION IF EXISTS generate_sample_password_hash();
DROP FUNCTION IF EXISTS generate_sample_password_salt();

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE users IS 'Enhanced sample user data with proper security, permissions, and tenant isolation';
COMMENT ON COLUMN users.permissions IS 'JSONB object containing role-based permissions and restrictions for each user';

-- =============================================================================
-- TODO: IMPLEMENTER NOTES
-- =============================================================================

-- SECURITY IMPLEMENTATION REQUIRED:
-- 1. Replace placeholder password hashes with actual bcrypt hashes
-- 2. Implement proper password salt generation
-- 3. Add environment-specific password policies
-- 4. Implement proper session management and timeout handling
-- 5. Add two-factor authentication setup for admin users

-- DATA INTEGRITY IMPLEMENTATION REQUIRED:
-- 1. Add proper foreign key constraints for created_by relationships
-- 2. Implement proper audit logging for user creation and modifications
-- 3. Add data validation for permissions JSONB structure
-- 4. Implement proper soft delete handling
-- 5. Add proper tenant isolation validation

-- ROLE MANAGEMENT IMPLEMENTATION REQUIRED:
-- 1. Validate that all roles align with application role management structure
-- 2. Implement proper permission inheritance and overrides
-- 3. Add role-based access control (RBAC) validation
-- 4. Implement proper permission escalation controls
-- 5. Add role change audit trails

-- ENVIRONMENT-SPECIFIC IMPLEMENTATION REQUIRED:
-- 1. Use environment variables for sensitive configuration
-- 2. Implement different user sets for different environments
-- 3. Add proper development/testing user isolation
-- 4. Implement proper production user provisioning workflows
-- 5. Add proper user data anonymization for testing

-- INTEGRATION IMPLEMENTATION REQUIRED:
-- 1. Set up proper email verification workflows
-- 2. Implement proper password reset functionality
-- 3. Add proper user onboarding processes
-- 4. Implement proper user deactivation workflows
-- 5. Add proper user data export/import functionality
