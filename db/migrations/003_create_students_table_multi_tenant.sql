-- Migration: Create students table with multi-tenant support
-- Description: Student records with comprehensive academic and personal information
-- Created: 2024-01-01
-- Updated: 2024-01-15 (Added best practices improvements)

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
    
    -- Contact Information
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    phone VARCHAR(20),
    email VARCHAR(255),
    emergency_contact_name VARCHAR(200),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_relationship VARCHAR(50),
    
    -- Academic Information
    enrollment_date DATE NOT NULL,
    graduation_date DATE,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive', 'graduated', 'transferred', 'withdrawn'
    academic_year VARCHAR(20) NOT NULL, -- e.g., '2024-2025'
    
    -- Medical & Special Needs
    medical_conditions TEXT,
    allergies TEXT,
    medications TEXT,
    special_needs TEXT,
    iep_status BOOLEAN DEFAULT FALSE, -- Individualized Education Program
    section_504_status BOOLEAN DEFAULT FALSE, -- Section 504 Plan
    
    -- Parent/Guardian Information
    parent_guardian_1_name VARCHAR(200),
    parent_guardian_1_phone VARCHAR(20),
    parent_guardian_1_email VARCHAR(255),
    parent_guardian_1_relationship VARCHAR(50),
    parent_guardian_2_name VARCHAR(200),
    parent_guardian_2_phone VARCHAR(20),
    parent_guardian_2_email VARCHAR(255),
    parent_guardian_2_relationship VARCHAR(50),
    
    -- Photo & Documents (JSONB structure documented below)
    photo_url VARCHAR(500),
    documents JSONB DEFAULT '[]', -- Array of document references
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE, -- Soft deletion timestamp
    created_by UUID, -- Reference to user who created this student (within same tenant)
    
    -- Constraints
    CONSTRAINT valid_gender CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
    CONSTRAINT valid_status CHECK (status IN ('active', 'inactive', 'graduated', 'transferred', 'withdrawn')),
    CONSTRAINT valid_grade CHECK (grade_level IN ('K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12')),
    CONSTRAINT valid_phone CHECK (phone IS NULL OR phone ~ '^\+?[1-9]\d{1,14}$'),
    CONSTRAINT valid_emergency_phone CHECK (emergency_contact_phone IS NULL OR emergency_contact_phone ~ '^\+?[1-9]\d{1,14}$'),
    CONSTRAINT valid_email CHECK (email IS NULL OR email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_parent_email CHECK (
        (parent_guardian_1_email IS NULL OR parent_guardian_1_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$') AND
        (parent_guardian_2_email IS NULL OR parent_guardian_2_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
    ),
    CONSTRAINT valid_zip_code CHECK (zip_code IS NULL OR zip_code ~ '^\d{5}(-\d{4})?$'),
    CONSTRAINT valid_academic_year CHECK (academic_year ~ '^\d{4}-\d{4}$'),
    CONSTRAINT valid_dates CHECK (
        graduation_date IS NULL OR 
        (graduation_date >= enrollment_date AND graduation_date <= CURRENT_DATE + INTERVAL '10 years')
    ),
    CONSTRAINT valid_birth_date CHECK (
        date_of_birth <= CURRENT_DATE AND 
        date_of_birth >= CURRENT_DATE - INTERVAL '25 years'
    ),
    CONSTRAINT unique_student_id_per_tenant UNIQUE (tenant_id, student_id),
    CONSTRAINT valid_created_by CHECK (created_by IS NULL OR created_by != id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_students_tenant_id ON students(tenant_id);
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id);
CREATE INDEX IF NOT EXISTS idx_students_grade_level ON students(grade_level);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_students_academic_year ON students(academic_year);
CREATE INDEX IF NOT EXISTS idx_students_enrollment_date ON students(enrollment_date);
CREATE INDEX IF NOT EXISTS idx_students_tenant_grade ON students(tenant_id, grade_level);
CREATE INDEX IF NOT EXISTS idx_students_created_by ON students(created_by);
CREATE INDEX IF NOT EXISTS idx_students_deleted_at ON students(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_students_created_at ON students(created_at);
CREATE INDEX IF NOT EXISTS idx_students_date_of_birth ON students(date_of_birth);
CREATE INDEX IF NOT EXISTS idx_students_iep_status ON students(iep_status);
CREATE INDEX IF NOT EXISTS idx_students_section_504_status ON students(section_504_status);

-- Create GIN index for documents JSONB column for efficient querying
CREATE INDEX IF NOT EXISTS idx_students_documents ON students USING GIN (documents);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_students_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW
    EXECUTE FUNCTION update_students_updated_at();

-- Trigger to ensure created_by references a user within the same tenant
CREATE OR REPLACE FUNCTION validate_students_created_by_tenant()
RETURNS TRIGGER AS $$
BEGIN
    -- If created_by is set, ensure it references a user within the same tenant
    IF NEW.created_by IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM users 
            WHERE id = NEW.created_by 
            AND tenant_id = NEW.tenant_id 
            AND deleted_at IS NULL
        ) THEN
            RAISE EXCEPTION 'created_by must reference a user within the same tenant';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_students_created_by_tenant
    BEFORE INSERT OR UPDATE ON students
    FOR EACH ROW
    EXECUTE FUNCTION validate_students_created_by_tenant();

-- Documentation for documents JSONB column structure:
-- The documents column stores an array of document references as JSONB.
-- Expected structure:
-- [
--   {
--     "id": "doc-uuid-1",
--     "name": "Birth Certificate",
--     "type": "birth_certificate",
--     "url": "https://storage.example.com/documents/birth-cert-123.pdf",
--     "uploaded_at": "2024-01-15T10:30:00Z",
--     "uploaded_by": "user-uuid",
--     "file_size": 1024000,
--     "mime_type": "application/pdf",
--     "is_required": true,
--     "is_verified": false,
--     "expires_at": null
--   },
--   {
--     "id": "doc-uuid-2",
--     "name": "Immunization Record",
--     "type": "immunization",
--     "url": "https://storage.example.com/documents/immunization-456.pdf",
--     "uploaded_at": "2024-01-15T11:00:00Z",
--     "uploaded_by": "user-uuid",
--     "file_size": 512000,
--     "mime_type": "application/pdf",
--     "is_required": true,
--     "is_verified": true,
--     "expires_at": "2025-01-15T00:00:00Z"
--   }
-- ]
--
-- Document types: birth_certificate, immunization, transcript, photo, medical_form, 
--                 emergency_contact_form, transportation_form, other
--
-- Example queries:
-- SELECT * FROM students WHERE documents @> '[{"type": "birth_certificate"}]';
-- SELECT * FROM students WHERE documents @> '[{"is_verified": true}]';
-- UPDATE students SET documents = documents || '[{"id": "new-doc", "name": "New Document"}]' WHERE id = 'student-id';
