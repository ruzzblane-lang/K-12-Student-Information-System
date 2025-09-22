-- Seed: Initial data for K-12 Student Information System
-- Description: Essential starter data for system initialization
-- Compliance: US (FERPA), EU (GDPR), Indonesia (UU No. 19 Tahun 2016)
-- Created: 2024-09-22
-- Idempotent: Yes (uses ON CONFLICT)

-- Insert default tenant (demo school)
INSERT INTO tenants (
    id, name, slug, school_name, school_type, school_level, 
    country_code, timezone, locale, status
) VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'Springfield High School',
    'springfield-high',
    'Springfield High School',
    'public',
    'high',
    'USA',
    'America/New_York',
    'en-US',
    'active'
) ON CONFLICT (slug) DO NOTHING;

-- Insert system admin user
INSERT INTO users (
    id, tenant_id, email, first_name, last_name, role, status, email_verified
) VALUES (
    '550e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440000',
    'admin@springfield-high.edu',
    'System',
    'Administrator',
    'admin',
    'active',
    true
) ON CONFLICT (tenant_id, email) DO NOTHING;

-- Insert principal user
INSERT INTO users (
    id, tenant_id, email, first_name, last_name, role, status, email_verified
) VALUES (
    '550e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440000',
    'principal@springfield-high.edu',
    'Jane',
    'Smith',
    'principal',
    'active',
    true
) ON CONFLICT (tenant_id, email) DO NOTHING;

-- Insert sample teacher
INSERT INTO users (
    id, tenant_id, email, first_name, last_name, role, status, email_verified
) VALUES (
    '550e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440000',
    'teacher@springfield-high.edu',
    'John',
    'Doe',
    'teacher',
    'active',
    true
) ON CONFLICT (tenant_id, email) DO NOTHING;

-- Insert sample student
INSERT INTO students (
    id, tenant_id, user_id, student_id, first_name, last_name, 
    date_of_birth, gender, grade_level, enrollment_date, status,
    primary_email, address, city, state, postal_code, country
) VALUES (
    '550e8400-e29b-41d4-a716-446655440004',
    '550e8400-e29b-41d4-a716-446655440000',
    NULL,
    'SHS-2024-001',
    'Alice',
    'Johnson',
    '2008-03-15',
    'female',
    '10',
    '2024-08-15',
    'active',
    'alice.johnson@student.springfield-high.edu',
    '123 Main Street',
    'Springfield',
    'IL',
    '62701',
    'USA'
) ON CONFLICT (tenant_id, student_id) DO NOTHING;

-- Insert sample parent
INSERT INTO users (
    id, tenant_id, email, first_name, last_name, role, status, email_verified
) VALUES (
    '550e8400-e29b-41d4-a716-446655440005',
    '550e8400-e29b-41d4-a716-446655440000',
    'parent@example.com',
    'Robert',
    'Johnson',
    'parent',
    'active',
    true
) ON CONFLICT (tenant_id, email) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE tenants IS 'Contains initial tenant data for Springfield High School';
COMMENT ON TABLE users IS 'Contains initial users: admin, principal, teacher, and parent';
COMMENT ON TABLE students IS 'Contains initial student data for Alice Johnson';
