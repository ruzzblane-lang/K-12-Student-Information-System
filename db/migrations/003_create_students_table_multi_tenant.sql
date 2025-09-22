-- Create students table with multi-tenant support
CREATE TABLE students (
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
    
    -- Photo & Documents
    photo_url VARCHAR(500),
    documents JSONB DEFAULT '[]', -- Array of document references
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT valid_gender CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
    CONSTRAINT valid_status CHECK (status IN ('active', 'inactive', 'graduated', 'transferred', 'withdrawn')),
    CONSTRAINT valid_grade CHECK (grade_level IN ('K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12')),
    CONSTRAINT unique_student_id_per_tenant UNIQUE (tenant_id, student_id)
);

-- Create indexes for performance
CREATE INDEX idx_students_tenant_id ON students(tenant_id);
CREATE INDEX idx_students_user_id ON students(user_id);
CREATE INDEX idx_students_student_id ON students(student_id);
CREATE INDEX idx_students_grade_level ON students(grade_level);
CREATE INDEX idx_students_status ON students(status);
CREATE INDEX idx_students_academic_year ON students(academic_year);
CREATE INDEX idx_students_enrollment_date ON students(enrollment_date);
CREATE INDEX idx_students_tenant_grade ON students(tenant_id, grade_level);

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
