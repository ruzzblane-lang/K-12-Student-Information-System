-- Seed: Sample tenants data
-- Description: Insert sample tenants for testing and development
-- Created: 2024-01-15
-- Updated: 2024-01-15

-- =============================================================================
-- SAMPLE TENANTS DATA
-- =============================================================================

-- Sample tenant 1: Springfield High School
INSERT INTO tenants (
    id,
    name,
    slug,
    domain,
    subdomain,
    school_name,
    school_type,
    school_level,
    address,
    phone,
    email,
    website,
    logo_url,
    primary_color,
    secondary_color,
    timezone,
    locale,
    subscription_plan,
    subscription_status,
    max_students,
    max_teachers,
    billing_email,
    features,
    created_at,
    updated_at
) VALUES (
    '550e8400-e29b-41d4-a716-446655440001'::UUID,
    'Springfield High School',
    'springfield-high',
    'springfield.sisplatform.com',
    'springfield',
    'Springfield High School',
    'public',
    'high',
    '123 Education Street, Springfield, IL 62701',
    '+1-217-555-0123',
    'admin@springfield.edu',
    'https://www.springfield.edu',
    'https://cdn.sisplatform.com/logos/springfield-high.png',
    '#1e40af',
    '#3b82f6',
    'America/Chicago',
    'en-US',
    'professional',
    'active',
    1000,
    100,
    'billing@springfield.edu',
    '{
        "modules": {
            "students": true,
            "teachers": true,
            "grades": true,
            "attendance": true,
            "reports": true,
            "analytics": true
        },
        "features": {
            "bulk_import": true,
            "advanced_analytics": true,
            "custom_reports": true,
            "api_access": true,
            "white_labeling": true,
            "custom_domains": true
        },
        "integrations": {
            "google_workspace": true,
            "microsoft_365": false,
            "canvas_lms": true,
            "parent_portal": true
        }
    }'::JSONB,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (slug) DO NOTHING;

-- Sample tenant 2: Riverside Elementary
INSERT INTO tenants (
    id,
    name,
    slug,
    domain,
    subdomain,
    school_name,
    school_type,
    school_level,
    address,
    phone,
    email,
    website,
    logo_url,
    primary_color,
    secondary_color,
    timezone,
    locale,
    subscription_plan,
    subscription_status,
    max_students,
    max_teachers,
    billing_email,
    features,
    created_at,
    updated_at
) VALUES (
    '550e8400-e29b-41d4-a716-446655440002'::UUID,
    'Riverside Elementary School',
    'riverside-elementary',
    'riverside.sisplatform.com',
    'riverside',
    'Riverside Elementary School',
    'public',
    'elementary',
    '456 Learning Lane, Riverside, CA 92501',
    '+1-951-555-0456',
    'admin@riverside.edu',
    'https://www.riverside.edu',
    'https://cdn.sisplatform.com/logos/riverside-elementary.png',
    '#059669',
    '#10b981',
    'America/Los_Angeles',
    'en-US',
    'basic',
    'active',
    500,
    50,
    'billing@riverside.edu',
    '{
        "modules": {
            "students": true,
            "teachers": true,
            "grades": true,
            "attendance": true,
            "reports": true,
            "analytics": false
        },
        "features": {
            "bulk_import": true,
            "advanced_analytics": false,
            "custom_reports": false,
            "api_access": false,
            "white_labeling": false,
            "custom_domains": false
        },
        "integrations": {
            "google_workspace": false,
            "microsoft_365": false,
            "canvas_lms": false,
            "parent_portal": true
        }
    }'::JSONB,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (slug) DO NOTHING;

-- Sample tenant 3: Private Academy (Trial)
INSERT INTO tenants (
    id,
    name,
    slug,
    domain,
    subdomain,
    school_name,
    school_type,
    school_level,
    address,
    phone,
    email,
    website,
    logo_url,
    primary_color,
    secondary_color,
    timezone,
    locale,
    subscription_plan,
    subscription_status,
    max_students,
    max_teachers,
    billing_email,
    features,
    created_at,
    updated_at
) VALUES (
    '550e8400-e29b-41d4-a716-446655440003'::UUID,
    'Private Academy',
    'private-academy',
    'academy.sisplatform.com',
    'academy',
    'Private Academy',
    'private',
    'k12',
    '789 Excellence Drive, Private City, NY 10001',
    '+1-212-555-0789',
    'admin@privateacademy.edu',
    'https://www.privateacademy.edu',
    'https://cdn.sisplatform.com/logos/private-academy.png',
    '#7c3aed',
    '#a855f7',
    'America/New_York',
    'en-US',
    'trial',
    'trial',
    200,
    25,
    'billing@privateacademy.edu',
    '{
        "modules": {
            "students": true,
            "teachers": true,
            "grades": true,
            "attendance": true,
            "reports": true,
            "analytics": true
        },
        "features": {
            "bulk_import": true,
            "advanced_analytics": true,
            "custom_reports": true,
            "api_access": true,
            "white_labeling": true,
            "custom_domains": true
        },
        "integrations": {
            "google_workspace": true,
            "microsoft_365": true,
            "canvas_lms": true,
            "parent_portal": true
        }
    }'::JSONB,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (slug) DO NOTHING;

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE tenants IS 'Sample tenant data for development and testing environments';
COMMENT ON COLUMN tenants.features IS 'JSONB object containing feature flags and module access for each tenant';

-- =============================================================================
-- TODO: IMPLEMENTER NOTES
-- =============================================================================

-- SECURITY IMPLEMENTATION REQUIRED:
-- 1. Ensure tenant data is properly isolated in production
-- 2. Implement proper access controls for tenant management
-- 3. Add audit logging for tenant creation and modifications
-- 4. Implement data retention policies for trial tenants

-- ENVIRONMENT-SPECIFIC IMPLEMENTATION REQUIRED:
-- 1. Use environment variables for tenant-specific configuration
-- 2. Implement different feature sets for different environments
-- 3. Add proper SSL certificate management for custom domains
-- 4. Implement proper backup and recovery procedures

-- INTEGRATION IMPLEMENTATION REQUIRED:
-- 1. Set up proper DNS configuration for custom domains
-- 2. Implement SSL certificate provisioning for custom domains
-- 3. Configure proper CDN settings for tenant assets
-- 4. Set up monitoring and alerting for tenant-specific issues
