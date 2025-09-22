-- Seed: Demo data for K-12 Student Information System
-- Description: Larger dataset for testing and demonstration
-- Compliance: US (FERPA), EU (GDPR), Indonesia (UU No. 19 Tahun 2016)
-- Created: 2024-09-22
-- Idempotent: Yes (uses ON CONFLICT)

-- Insert additional tenants for multi-tenant demo
INSERT INTO tenants (
    id, name, slug, school_name, school_type, school_level, 
    country_code, timezone, locale, status
) VALUES 
(
    '550e8400-e29b-41d4-a716-446655440010',
    'Madrid International School',
    'madrid-international',
    'Madrid International School',
    'private',
    'k12',
    'ESP',
    'Europe/Madrid',
    'es-ES',
    'active'
),
(
    '550e8400-e29b-41d4-a716-446655440011',
    'Jakarta Elementary School',
    'jakarta-elementary',
    'Jakarta Elementary School',
    'public',
    'elementary',
    'IDN',
    'Asia/Jakarta',
    'id-ID',
    'active'
) ON CONFLICT (slug) DO NOTHING;

-- Insert demo teachers
INSERT INTO users (
    id, tenant_id, email, first_name, last_name, role, status, email_verified
) VALUES 
-- Springfield High School teachers
('550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440000', 'math@springfield-high.edu', 'Sarah', 'Wilson', 'teacher', 'active', true),
('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440000', 'science@springfield-high.edu', 'Michael', 'Brown', 'teacher', 'active', true),
('550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440000', 'english@springfield-high.edu', 'Emily', 'Davis', 'teacher', 'active', true),
-- Madrid International School teachers
('550e8400-e29b-41d4-a716-446655440023', '550e8400-e29b-41d4-a716-446655440010', 'teacher@madrid-international.edu', 'Carlos', 'Rodriguez', 'teacher', 'active', true),
-- Jakarta Elementary School teachers
('550e8400-e29b-41d4-a716-446655440024', '550e8400-e29b-41d4-a716-446655440011', 'teacher@jakarta-elementary.edu', 'Siti', 'Rahayu', 'teacher', 'active', true)
ON CONFLICT (tenant_id, email) DO NOTHING;

-- Insert demo students
INSERT INTO students (
    id, tenant_id, student_id, first_name, last_name, 
    date_of_birth, gender, grade_level, enrollment_date, status,
    primary_email, city, state, country
) VALUES 
-- Springfield High School students
('550e8400-e29b-41d4-a716-446655440030', '550e8400-e29b-41d4-a716-446655440000', 'SHS-2024-002', 'Bob', 'Smith', '2007-06-20', 'male', '11', '2024-08-15', 'active', 'bob.smith@student.springfield-high.edu', 'Springfield', 'IL', 'USA'),
('550e8400-e29b-41d4-a716-446655440031', '550e8400-e29b-41d4-a716-446655440000', 'SHS-2024-003', 'Carol', 'Williams', '2008-11-10', 'female', '10', '2024-08-15', 'active', 'carol.williams@student.springfield-high.edu', 'Springfield', 'IL', 'USA'),
('550e8400-e29b-41d4-a716-446655440032', '550e8400-e29b-41d4-a716-446655440000', 'SHS-2024-004', 'David', 'Jones', '2006-02-14', 'male', '12', '2024-08-15', 'active', 'david.jones@student.springfield-high.edu', 'Springfield', 'IL', 'USA'),
-- Madrid International School students
('550e8400-e29b-41d4-a716-446655440033', '550e8400-e29b-41d4-a716-446655440010', 'MIS-2024-001', 'Ana', 'Garcia', '2008-04-25', 'female', '10', '2024-09-01', 'active', 'ana.garcia@student.madrid-international.edu', 'Madrid', 'Madrid', 'Spain'),
('550e8400-e29b-41d4-a716-446655440034', '550e8400-e29b-41d4-a716-446655440010', 'MIS-2024-002', 'Luis', 'Martinez', '2007-08-30', 'male', '11', '2024-09-01', 'active', 'luis.martinez@student.madrid-international.edu', 'Madrid', 'Madrid', 'Spain'),
-- Jakarta Elementary School students
('550e8400-e29b-41d4-a716-446655440035', '550e8400-e29b-41d4-a716-446655440011', 'JES-2024-001', 'Ahmad', 'Pratama', '2015-01-15', 'male', '3', '2024-07-15', 'active', 'ahmad.pratama@student.jakarta-elementary.edu', 'Jakarta', 'DKI Jakarta', 'Indonesia'),
('550e8400-e29b-41d4-a716-446655440036', '550e8400-e29b-41d4-a716-446655440011', 'JES-2024-002', 'Sari', 'Dewi', '2015-05-20', 'female', '3', '2024-07-15', 'active', 'sari.dewi@student.jakarta-elementary.edu', 'Jakarta', 'DKI Jakarta', 'Indonesia')
ON CONFLICT (tenant_id, student_id) DO NOTHING;

-- Insert demo parents
INSERT INTO users (
    id, tenant_id, email, first_name, last_name, role, status, email_verified
) VALUES 
('550e8400-e29b-41d4-a716-446655440040', '550e8400-e29b-41d4-a716-446655440000', 'parent1@example.com', 'Mary', 'Smith', 'parent', 'active', true),
('550e8400-e29b-41d4-a716-446655440041', '550e8400-e29b-41d4-a716-446655440000', 'parent2@example.com', 'Robert', 'Williams', 'parent', 'active', true),
('550e8400-e29b-41d4-a716-446655440042', '550e8400-e29b-41d4-a716-446655440010', 'parent3@example.com', 'Maria', 'Garcia', 'parent', 'active', true),
('550e8400-e29b-41d4-a716-446655440043', '550e8400-e29b-41d4-a716-446655440011', 'parent4@example.com', 'Budi', 'Pratama', 'parent', 'active', true)
ON CONFLICT (tenant_id, email) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE tenants IS 'Contains demo tenant data for multi-tenant testing';
COMMENT ON TABLE users IS 'Contains demo users across multiple tenants';
COMMENT ON TABLE students IS 'Contains demo students across multiple tenants and grade levels';
