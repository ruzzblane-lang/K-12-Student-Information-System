-- Create teachers table with multi-tenant support
CREATE TABLE teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Link to user account
    
    -- Teacher Information
    employee_id VARCHAR(50) NOT NULL, -- School-specific employee ID
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    preferred_name VARCHAR(100),
    title VARCHAR(50), -- Mr., Mrs., Dr., etc.
    
    -- Contact Information
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    
    -- Employment Information
    hire_date DATE NOT NULL,
    employment_status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive', 'terminated', 'on_leave'
    employment_type VARCHAR(20) DEFAULT 'full_time', -- 'full_time', 'part_time', 'substitute', 'contract'
    department VARCHAR(100),
    position VARCHAR(100),
    
    -- Qualifications & Certifications
    education_level VARCHAR(50), -- 'bachelor', 'master', 'doctorate'
    degree_field VARCHAR(100),
    teaching_certifications TEXT[], -- Array of certification names
    subjects_taught TEXT[], -- Array of subjects this teacher can teach
    grade_levels_taught TEXT[], -- Array of grade levels this teacher can teach
    
    -- Professional Information
    years_experience INTEGER DEFAULT 0,
    bio TEXT,
    photo_url VARCHAR(500),
    resume_url VARCHAR(500),
    
    -- Schedule & Availability
    work_schedule JSONB DEFAULT '{}', -- Weekly schedule information
    office_hours TEXT,
    office_location VARCHAR(100),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT valid_employment_status CHECK (employment_status IN ('active', 'inactive', 'terminated', 'on_leave')),
    CONSTRAINT valid_employment_type CHECK (employment_type IN ('full_time', 'part_time', 'substitute', 'contract')),
    CONSTRAINT valid_education_level CHECK (education_level IN ('associate', 'bachelor', 'master', 'doctorate', 'other')),
    CONSTRAINT unique_employee_id_per_tenant UNIQUE (tenant_id, employee_id),
    CONSTRAINT unique_email_per_tenant UNIQUE (tenant_id, email)
);

-- Create indexes for performance
CREATE INDEX idx_teachers_tenant_id ON teachers(tenant_id);
CREATE INDEX idx_teachers_user_id ON teachers(user_id);
CREATE INDEX idx_teachers_employee_id ON teachers(employee_id);
CREATE INDEX idx_teachers_email ON teachers(email);
CREATE INDEX idx_teachers_employment_status ON teachers(employment_status);
CREATE INDEX idx_teachers_department ON teachers(department);
CREATE INDEX idx_teachers_subjects ON teachers USING GIN(subjects_taught);
CREATE INDEX idx_teachers_grade_levels ON teachers USING GIN(grade_levels_taught);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_teachers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_teachers_updated_at
    BEFORE UPDATE ON teachers
    FOR EACH ROW
    EXECUTE FUNCTION update_teachers_updated_at();
