-- Migration: Create students table with multi-tenant support
-- Description: Student records with comprehensive academic and personal information
-- Compliance: US (FERPA), EU (GDPR), Indonesia (UU No. 19 Tahun 2016)
-- Created: 2024-09-22
-- Idempotent: Yes (uses IF NOT EXISTS)

-- Create students table with multi-tenant support
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Link to user account if student has login access
    
    -- Student Information
    student_id VARCHAR(50) NOT NULL, -- School-specific student ID
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    preferred_name VARCHAR(100),
    date_of_birth DATE NOT NULL,
    gender VARCHAR(20),
    grade_level VARCHAR(20) NOT NULL,
    
    -- Academic Information
    enrollment_date DATE NOT NULL,
    graduation_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'graduated', 'transferred', 'withdrawn', 'suspended'
    academic_program VARCHAR(100), -- e.g., "IB", "AP", "Honors", "Standard"
    
    -- Contact Information
    primary_email VARCHAR(255),
    primary_phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    
    -- Emergency Contacts
    emergency_contact_1_name VARCHAR(255),
    emergency_contact_1_relationship VARCHAR(100),
    emergency_contact_1_phone VARCHAR(20),
    emergency_contact_1_email VARCHAR(255),
    emergency_contact_2_name VARCHAR(255),
    emergency_contact_2_relationship VARCHAR(100),
    emergency_contact_2_phone VARCHAR(20),
    emergency_contact_2_email VARCHAR(255),
    
    -- Medical Information
    medical_conditions TEXT,
    allergies TEXT,
    medications TEXT,
    medical_insurance VARCHAR(255),
    medical_insurance_number VARCHAR(100),
    physician_name VARCHAR(255),
    physician_phone VARCHAR(20),
    
    -- Academic Records
    gpa DECIMAL(4,3), -- Grade Point Average
    credits_earned INTEGER DEFAULT 0,
    credits_required INTEGER DEFAULT 120, -- Varies by program
    class_rank INTEGER,
    graduation_plan VARCHAR(100), -- e.g., "College Prep", "Career Tech", "IB"
    
    -- Special Programs
    special_education BOOLEAN DEFAULT FALSE,
    iep BOOLEAN DEFAULT FALSE, -- Individualized Education Program
    section_504 BOOLEAN DEFAULT FALSE, -- Section 504 Plan
    ell BOOLEAN DEFAULT FALSE, -- English Language Learner
    gifted BOOLEAN DEFAULT FALSE, -- Gifted and Talented
    
    -- Transportation
    transportation_method VARCHAR(50), -- 'bus', 'parent', 'walk', 'bike', 'car'
    bus_route VARCHAR(50),
    bus_stop VARCHAR(255),
    
    -- Documentation
    profile_picture_url TEXT,
    documents JSONB DEFAULT '[]', -- Array of document references
    
    -- Privacy and Compliance
    privacy_level VARCHAR(20) DEFAULT 'standard', -- 'standard', 'restricted', 'public'
    data_sharing_consent BOOLEAN DEFAULT FALSE,
    photo_release BOOLEAN DEFAULT FALSE,
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_students_tenant_id ON students(tenant_id);
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(tenant_id, student_id);
CREATE INDEX IF NOT EXISTS idx_students_name ON students(tenant_id, last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_students_grade_level ON students(tenant_id, grade_level);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_students_enrollment_date ON students(tenant_id, enrollment_date);
CREATE INDEX IF NOT EXISTS idx_students_date_of_birth ON students(date_of_birth);

-- Create unique constraint for student_id per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_tenant_student_id ON students(tenant_id, student_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_students_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_students_updated_at ON students;
CREATE TRIGGER trigger_update_students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW
    EXECUTE FUNCTION update_students_updated_at();

-- Add comments for documentation
COMMENT ON TABLE students IS 'Student records with comprehensive academic and personal information';
COMMENT ON COLUMN students.student_id IS 'School-specific student identifier';
COMMENT ON COLUMN students.grade_level IS 'Current grade level (e.g., 9, 10, 11, 12)';
COMMENT ON COLUMN students.academic_program IS 'Academic program (IB, AP, Honors, Standard)';
COMMENT ON COLUMN students.documents IS 'Array of document references in JSON format';
COMMENT ON COLUMN students.privacy_level IS 'Privacy level for FERPA/GDPR compliance';
