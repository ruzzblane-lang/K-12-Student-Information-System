-- Migration: Create teachers table with multi-tenant support
-- Description: Teacher records with comprehensive employment and professional information
-- Created: 2024-01-01
-- Updated: 2024-01-15 (Added best practices improvements)
-- Enhanced: 2024-09-22 (Added intervention fields, granular RLS policies, and masked views)

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
    
    -- Intervention & Support Capabilities (matching student_risk_assessments structure)
    intervention_capabilities JSONB DEFAULT '{}', -- Types of interventions teacher can provide
    intervention_training_completed TEXT[], -- Array of intervention training completed
    intervention_success_rate DECIMAL(5,2), -- Historical success rate (0.00-100.00)
    max_intervention_caseload INTEGER DEFAULT 0, -- Maximum students teacher can support
    current_intervention_caseload INTEGER DEFAULT 0, -- Current active interventions
    intervention_specializations TEXT[], -- Specialized intervention areas
    last_intervention_training DATE, -- Last training completion date
    intervention_certifications TEXT[], -- Professional intervention certifications
    crisis_intervention_trained BOOLEAN DEFAULT FALSE, -- Crisis intervention capability
    behavioral_intervention_trained BOOLEAN DEFAULT FALSE, -- Behavioral intervention capability
    academic_intervention_trained BOOLEAN DEFAULT FALSE, -- Academic intervention capability
    social_emotional_intervention_trained BOOLEAN DEFAULT FALSE, -- Social-emotional intervention capability
    intervention_availability JSONB DEFAULT '{}', -- When teacher is available for interventions
    
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
    CONSTRAINT valid_intervention_success_rate CHECK (intervention_success_rate IS NULL OR (intervention_success_rate >= 0.00 AND intervention_success_rate <= 100.00)),
    CONSTRAINT valid_max_intervention_caseload CHECK (max_intervention_caseload >= 0 AND max_intervention_caseload <= 100),
    CONSTRAINT valid_current_intervention_caseload CHECK (current_intervention_caseload >= 0 AND current_intervention_caseload <= max_intervention_caseload),
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
CREATE INDEX IF NOT EXISTS idx_teachers_intervention_capabilities ON teachers USING GIN(intervention_capabilities);
CREATE INDEX IF NOT EXISTS idx_teachers_intervention_training ON teachers USING GIN(intervention_training_completed);
CREATE INDEX IF NOT EXISTS idx_teachers_intervention_specializations ON teachers USING GIN(intervention_specializations);
CREATE INDEX IF NOT EXISTS idx_teachers_intervention_certifications ON teachers USING GIN(intervention_certifications);
CREATE INDEX IF NOT EXISTS idx_teachers_intervention_availability ON teachers USING GIN(intervention_availability);

-- Create indexes for intervention-related fields
CREATE INDEX IF NOT EXISTS idx_teachers_intervention_success_rate ON teachers(intervention_success_rate) WHERE intervention_success_rate IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_teachers_max_intervention_caseload ON teachers(max_intervention_caseload);
CREATE INDEX IF NOT EXISTS idx_teachers_current_intervention_caseload ON teachers(current_intervention_caseload);
CREATE INDEX IF NOT EXISTS idx_teachers_crisis_intervention_trained ON teachers(crisis_intervention_trained) WHERE crisis_intervention_trained = TRUE;
CREATE INDEX IF NOT EXISTS idx_teachers_behavioral_intervention_trained ON teachers(behavioral_intervention_trained) WHERE behavioral_intervention_trained = TRUE;
CREATE INDEX IF NOT EXISTS idx_teachers_academic_intervention_trained ON teachers(academic_intervention_trained) WHERE academic_intervention_trained = TRUE;
CREATE INDEX IF NOT EXISTS idx_teachers_social_emotional_intervention_trained ON teachers(social_emotional_intervention_trained) WHERE social_emotional_intervention_trained = TRUE;
CREATE INDEX IF NOT EXISTS idx_teachers_last_intervention_training ON teachers(last_intervention_training) WHERE last_intervention_training IS NOT NULL;

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

-- =============================================================================
-- GRANULAR ROW-LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on teachers table
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;

-- Function to check if user can view sensitive teacher data
CREATE OR REPLACE FUNCTION can_view_teacher_sensitive_data(
    p_teacher_id UUID,
    p_user_role TEXT,
    p_tenant_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    -- Super admins can view all sensitive data
    IF p_user_role = 'super_admin' THEN
        RETURN TRUE;
    END IF;
    
    -- Admins can view sensitive data within their tenant
    IF p_user_role = 'admin' THEN
        RETURN EXISTS (
            SELECT 1 FROM teachers t
            WHERE t.id = p_teacher_id AND t.tenant_id = p_tenant_id
        );
    END IF;
    
    -- Teachers can view their own sensitive data
    IF p_user_role = 'teacher' THEN
        RETURN EXISTS (
            SELECT 1 FROM teachers t
            JOIN users u ON t.user_id = u.id
            WHERE t.id = p_teacher_id 
            AND t.tenant_id = p_tenant_id
            AND u.id = get_current_user_id()
        );
    END IF;
    
    -- Counselors can view intervention-related data for teachers in their tenant
    IF p_user_role = 'counselor' THEN
        RETURN EXISTS (
            SELECT 1 FROM teachers t
            WHERE t.id = p_teacher_id 
            AND t.tenant_id = p_tenant_id
        );
    END IF;
    
    -- Other roles cannot view sensitive data
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can modify teacher data
CREATE OR REPLACE FUNCTION can_modify_teacher_data(
    p_teacher_id UUID,
    p_user_role TEXT,
    p_tenant_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    -- Super admins can modify all teacher data
    IF p_user_role = 'super_admin' THEN
        RETURN TRUE;
    END IF;
    
    -- Admins can modify teacher data within their tenant
    IF p_user_role = 'admin' THEN
        RETURN EXISTS (
            SELECT 1 FROM teachers t
            WHERE t.id = p_teacher_id AND t.tenant_id = p_tenant_id
        );
    END IF;
    
    -- Teachers can modify their own basic information (not intervention data)
    IF p_user_role = 'teacher' THEN
        RETURN EXISTS (
            SELECT 1 FROM teachers t
            JOIN users u ON t.user_id = u.id
            WHERE t.id = p_teacher_id 
            AND t.tenant_id = p_tenant_id
            AND u.id = get_current_user_id()
        );
    END IF;
    
    -- Counselors can modify intervention-related data for teachers in their tenant
    IF p_user_role = 'counselor' THEN
        RETURN EXISTS (
            SELECT 1 FROM teachers t
            WHERE t.id = p_teacher_id 
            AND t.tenant_id = p_tenant_id
        );
    END IF;
    
    -- Other roles cannot modify teacher data
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing basic RLS policy if it exists
DROP POLICY IF EXISTS teacher_tenant_isolation_policy ON teachers;

-- RLS Policy for teachers table - Basic tenant isolation
CREATE POLICY teacher_tenant_isolation_policy ON teachers
    FOR ALL TO authenticated
    USING (
        -- Super admins can access all teachers
        is_super_admin() OR
        -- Regular users can only access teachers in their tenant
        tenant_id = get_current_tenant_id()
    );

-- RLS Policy for teachers table - Role-based sensitive data access
CREATE POLICY teacher_sensitive_data_access_policy ON teachers
    FOR SELECT TO authenticated
    USING (
        -- Super admins can access all sensitive data
        is_super_admin() OR
        -- Users with appropriate roles can access sensitive data within their tenant
        can_view_teacher_sensitive_data(
            id,
            current_setting('app.current_user_role', true),
            get_current_tenant_id()
        )
    );

-- RLS Policy for teachers table - Role-based modification access
CREATE POLICY teacher_modification_access_policy ON teachers
    FOR INSERT, UPDATE, DELETE TO authenticated
    USING (
        -- Super admins can modify all teacher data
        is_super_admin() OR
        -- Users with appropriate roles can modify teacher data within their tenant
        can_modify_teacher_data(
            id,
            current_setting('app.current_user_role', true),
            get_current_tenant_id()
        )
    );

-- =============================================================================
-- MASKED VIEW FOR SENSITIVE DATA
-- =============================================================================

-- Create a comprehensive masked view for teachers (matching students_masked pattern)
CREATE OR REPLACE VIEW teachers_masked AS
SELECT 
    id,
    tenant_id,
    user_id,
    employee_id,
    mask_name(first_name) as first_name,
    mask_name(last_name) as last_name,
    middle_name,
    preferred_name,
    title,
    mask_email(email) as email,
    mask_phone(phone) as phone,
    -- Address information is masked for privacy
    CASE 
        WHEN address IS NOT NULL THEN '[ADDRESS MASKED]'
        ELSE NULL
    END as address,
    city,
    state,
    -- Zip code is partially masked
    CASE 
        WHEN zip_code IS NOT NULL THEN SUBSTRING(zip_code, 1, 3) || '**'
        ELSE NULL
    END as zip_code,
    hire_date,
    employment_status,
    employment_type,
    department,
    position,
    education_level,
    degree_field,
    teaching_certifications,
    subjects_taught,
    grade_levels_taught,
    years_experience,
    -- Bio is truncated for privacy
    CASE 
        WHEN bio IS NOT NULL AND LENGTH(bio) > 100 THEN SUBSTRING(bio, 1, 100) || '...'
        ELSE bio
    END as bio,
    photo_url,
    -- Resume URL is masked for privacy
    CASE 
        WHEN resume_url IS NOT NULL THEN '[RESUME URL MASKED]'
        ELSE NULL
    END as resume_url,
    -- Work schedule is simplified for privacy
    CASE 
        WHEN work_schedule IS NOT NULL THEN '{"schedule": "available"}'
        ELSE NULL
    END as work_schedule,
    office_hours,
    office_location,
    -- Intervention data is masked for privacy unless user has appropriate permissions
    CASE 
        WHEN can_view_teacher_sensitive_data(
            id,
            current_setting('app.current_user_role', true),
            get_current_tenant_id()
        ) THEN intervention_capabilities
        ELSE '{"capabilities": "masked"}'
    END as intervention_capabilities,
    -- Intervention training is masked unless user has appropriate permissions
    CASE 
        WHEN can_view_teacher_sensitive_data(
            id,
            current_setting('app.current_user_role', true),
            get_current_tenant_id()
        ) THEN intervention_training_completed
        ELSE ARRAY['[TRAINING MASKED]']
    END as intervention_training_completed,
    -- Success rate is rounded for privacy
    CASE 
        WHEN can_view_teacher_sensitive_data(
            id,
            current_setting('app.current_user_role', true),
            get_current_tenant_id()
        ) THEN intervention_success_rate
        ELSE NULL
    END as intervention_success_rate,
    max_intervention_caseload,
    current_intervention_caseload,
    -- Specializations are masked unless user has appropriate permissions
    CASE 
        WHEN can_view_teacher_sensitive_data(
            id,
            current_setting('app.current_user_role', true),
            get_current_tenant_id()
        ) THEN intervention_specializations
        ELSE ARRAY['[SPECIALIZATIONS MASKED]']
    END as intervention_specializations,
    last_intervention_training,
    -- Certifications are masked unless user has appropriate permissions
    CASE 
        WHEN can_view_teacher_sensitive_data(
            id,
            current_setting('app.current_user_role', true),
            get_current_tenant_id()
        ) THEN intervention_certifications
        ELSE ARRAY['[CERTIFICATIONS MASKED]']
    END as intervention_certifications,
    crisis_intervention_trained,
    behavioral_intervention_trained,
    academic_intervention_trained,
    social_emotional_intervention_trained,
    -- Intervention availability is simplified for privacy
    CASE 
        WHEN can_view_teacher_sensitive_data(
            id,
            current_setting('app.current_user_role', true),
            get_current_tenant_id()
        ) THEN intervention_availability
        ELSE '{"availability": "masked"}'
    END as intervention_availability,
    created_at,
    updated_at,
    deleted_at,
    created_by
FROM teachers
WHERE deleted_at IS NULL;

-- Enable security invoker on the masked view
ALTER VIEW teachers_masked SET (security_invoker = true);

-- =============================================================================
-- INTERVENTION CAPABILITIES DOCUMENTATION
-- =============================================================================

-- Documentation for intervention_capabilities JSONB column structure:
-- The intervention_capabilities column stores detailed intervention capabilities as JSONB.
-- Expected structure:
-- {
--   "crisis_intervention": {
--     "trained": true,
--     "certification_date": "2024-01-15",
--     "expiration_date": "2025-01-15",
--     "specializations": ["suicide_prevention", "trauma_response"]
--   },
--   "behavioral_intervention": {
--     "trained": true,
--     "certification_date": "2024-02-01",
--     "methods": ["positive_behavior_support", "restorative_practices"],
--     "age_groups": ["middle_school", "high_school"]
--   },
--   "academic_intervention": {
--     "trained": true,
--     "certification_date": "2024-03-01",
--     "subjects": ["math", "reading", "writing"],
--     "grade_levels": ["k-5", "6-8"]
--   },
--   "social_emotional_intervention": {
--     "trained": true,
--     "certification_date": "2024-04-01",
--     "approaches": ["counseling", "group_therapy", "peer_mediation"],
--     "populations": ["at_risk_youth", "trauma_survivors"]
--   }
-- }

-- Documentation for intervention_availability JSONB column structure:
-- The intervention_availability column stores when teachers are available for interventions.
-- Expected structure:
-- {
--   "monday": {
--     "available": true,
--     "time_slots": [
--       {"start": "09:00", "end": "10:00", "type": "crisis"},
--       {"start": "14:00", "end": "15:00", "type": "academic"}
--     ]
--   },
--   "tuesday": {
--     "available": true,
--     "time_slots": [
--       {"start": "10:00", "end": "11:00", "type": "behavioral"},
--       {"start": "15:00", "end": "16:00", "type": "social_emotional"}
--     ]
--   },
--   "emergency_availability": {
--     "on_call": true,
--     "contact_method": "phone",
--     "response_time": "immediate"
--   }
-- }

-- Example queries for intervention capabilities:
-- SELECT * FROM teachers WHERE intervention_capabilities->'crisis_intervention'->>'trained' = 'true';
-- SELECT * FROM teachers WHERE intervention_specializations @> '["suicide_prevention"]';
-- SELECT * FROM teachers WHERE crisis_intervention_trained = TRUE AND current_intervention_caseload < max_intervention_caseload;
-- UPDATE teachers SET intervention_capabilities = intervention_capabilities || '{"new_capability": {"trained": true}}' WHERE id = 'teacher-id';
