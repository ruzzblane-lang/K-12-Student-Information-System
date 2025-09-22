-- Migration: Create teachers table with multi-tenant support
-- Description: Teacher records with comprehensive employment and professional information
-- Created: 2024-01-01
-- Updated: 2024-01-15 (Added best practices improvements)

-- Create teachers table with multi-tenant support
CREATE TABLE IF NOT EXISTS teachers (
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
    education_level VARCHAR(50), -- 'associate', 'bachelor', 'master', 'doctorate', 'other'
    degree_field VARCHAR(100),
    teaching_certifications TEXT[], -- Array of certification names
    subjects_taught TEXT[], -- Array of subjects this teacher can teach
    grade_levels_taught TEXT[], -- Array of grade levels this teacher can teach
    
    -- Professional Information
    years_experience INTEGER DEFAULT 0,
    bio TEXT,
    photo_url VARCHAR(500),
    resume_url VARCHAR(500),
    
    -- Schedule & Availability (JSONB structure documented below)
    work_schedule JSONB DEFAULT '{}', -- Weekly schedule information
    office_hours TEXT,
    office_location VARCHAR(100),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE, -- Soft deletion timestamp
    created_by UUID, -- Reference to user who created this teacher (within same tenant)
    
    -- Constraints
    CONSTRAINT valid_employment_status CHECK (employment_status IN ('active', 'inactive', 'terminated', 'on_leave')),
    CONSTRAINT valid_employment_type CHECK (employment_type IN ('full_time', 'part_time', 'substitute', 'contract')),
    CONSTRAINT valid_education_level CHECK (education_level IN ('associate', 'bachelor', 'master', 'doctorate', 'other')),
    CONSTRAINT valid_email CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_phone CHECK (phone IS NULL OR phone ~ '^\+?[1-9]\d{1,14}$'),
    CONSTRAINT valid_zip_code CHECK (zip_code IS NULL OR zip_code ~ '^\d{5}(-\d{4})?$'),
    CONSTRAINT valid_years_experience CHECK (years_experience >= 0 AND years_experience <= 50),
    CONSTRAINT valid_hire_date CHECK (hire_date <= CURRENT_DATE AND hire_date >= CURRENT_DATE - INTERVAL '50 years'),
    CONSTRAINT valid_title CHECK (title IS NULL OR title IN ('Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.', 'Rev.', 'Other')),
    CONSTRAINT unique_employee_id_per_tenant UNIQUE (tenant_id, employee_id),
    CONSTRAINT unique_email_per_tenant UNIQUE (tenant_id, email),
    CONSTRAINT valid_created_by CHECK (created_by IS NULL OR created_by != id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_teachers_tenant_id ON teachers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_teachers_user_id ON teachers(user_id);
CREATE INDEX IF NOT EXISTS idx_teachers_employee_id ON teachers(employee_id);
CREATE INDEX IF NOT EXISTS idx_teachers_email ON teachers(email);
CREATE INDEX IF NOT EXISTS idx_teachers_employment_status ON teachers(employment_status);
CREATE INDEX IF NOT EXISTS idx_teachers_department ON teachers(department);
CREATE INDEX IF NOT EXISTS idx_teachers_created_by ON teachers(created_by);
CREATE INDEX IF NOT EXISTS idx_teachers_deleted_at ON teachers(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_teachers_created_at ON teachers(created_at);
CREATE INDEX IF NOT EXISTS idx_teachers_hire_date ON teachers(hire_date);
CREATE INDEX IF NOT EXISTS idx_teachers_employment_type ON teachers(employment_type);
CREATE INDEX IF NOT EXISTS idx_teachers_education_level ON teachers(education_level);

-- Create GIN indexes for array and JSONB columns
CREATE INDEX IF NOT EXISTS idx_teachers_subjects ON teachers USING GIN(subjects_taught);
CREATE INDEX IF NOT EXISTS idx_teachers_grade_levels ON teachers USING GIN(grade_levels_taught);
CREATE INDEX IF NOT EXISTS idx_teachers_work_schedule ON teachers USING GIN(work_schedule);

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

-- Trigger to ensure created_by references a user within the same tenant
CREATE OR REPLACE FUNCTION validate_teachers_created_by_tenant()
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

CREATE TRIGGER trigger_validate_teachers_created_by_tenant
    BEFORE INSERT OR UPDATE ON teachers
    FOR EACH ROW
    EXECUTE FUNCTION validate_teachers_created_by_tenant();

-- Documentation for work_schedule JSONB column structure:
-- The work_schedule column stores weekly schedule information as JSONB.
-- Expected structure:
-- {
--   "monday": {
--     "start_time": "08:00",
--     "end_time": "16:00",
--     "breaks": [
--       {"start": "12:00", "end": "13:00", "type": "lunch"}
--     ],
--     "classes": [
--       {"period": "1st", "start": "08:00", "end": "08:50", "room": "A101"},
--       {"period": "2nd", "start": "09:00", "end": "09:50", "room": "A102"}
--     ]
--   },
--   "tuesday": {
--     "start_time": "08:00",
--     "end_time": "16:00",
--     "breaks": [
--       {"start": "12:00", "end": "13:00", "type": "lunch"}
--     ],
--     "classes": [
--       {"period": "1st", "start": "08:00", "end": "08:50", "room": "A101"},
--       {"period": "3rd", "start": "10:00", "end": "10:50", "room": "A103"}
--     ]
--   },
--   "wednesday": {
--     "start_time": "08:00",
--     "end_time": "16:00",
--     "breaks": [
--       {"start": "12:00", "end": "13:00", "type": "lunch"}
--     ],
--     "classes": [
--       {"period": "1st", "start": "08:00", "end": "08:50", "room": "A101"},
--       {"period": "4th", "start": "11:00", "end": "11:50", "room": "A104"}
--     ]
--   },
--   "thursday": {
--     "start_time": "08:00",
--     "end_time": "16:00",
--     "breaks": [
--       {"start": "12:00", "end": "13:00", "type": "lunch"}
--     ],
--     "classes": [
--       {"period": "1st", "start": "08:00", "end": "08:50", "room": "A101"},
--       {"period": "5th", "start": "13:00", "end": "13:50", "room": "A105"}
--     ]
--   },
--   "friday": {
--     "start_time": "08:00",
--     "end_time": "16:00",
--     "breaks": [
--       {"start": "12:00", "end": "13:00", "type": "lunch"}
--     ],
--     "classes": [
--       {"period": "1st", "start": "08:00", "end": "08:50", "room": "A101"},
--       {"period": "6th", "start": "14:00", "end": "14:50", "room": "A106"}
--     ]
--   },
--   "saturday": null,
--   "sunday": null
-- }
--
-- Example queries:
-- SELECT * FROM teachers WHERE work_schedule->'monday'->>'start_time' = '08:00';
-- SELECT * FROM teachers WHERE work_schedule->'monday'->'classes' @> '[{"room": "A101"}]';
-- UPDATE teachers SET work_schedule = work_schedule || '{"monday":{"start_time":"07:30"}}' WHERE id = 'teacher-id';
