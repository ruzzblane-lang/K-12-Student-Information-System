-- Create classes table with multi-tenant support
CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Class Information
    class_code VARCHAR(50) NOT NULL, -- School-specific class code (e.g., "MATH101")
    name VARCHAR(200) NOT NULL,
    description TEXT,
    subject VARCHAR(100) NOT NULL,
    grade_level VARCHAR(20) NOT NULL,
    
    -- Academic Information
    academic_year VARCHAR(20) NOT NULL, -- e.g., '2024-2025'
    semester VARCHAR(20), -- 'fall', 'spring', 'summer', 'full_year'
    credits DECIMAL(3,1) DEFAULT 1.0,
    
    -- Teacher Assignment
    teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
    co_teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
    
    -- Schedule Information
    room_number VARCHAR(50),
    building VARCHAR(100),
    schedule JSONB DEFAULT '{}', -- Weekly schedule with days/times
    
    -- Capacity & Enrollment
    max_students INTEGER DEFAULT 30,
    current_enrollment INTEGER DEFAULT 0,
    
    -- Status & Dates
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive', 'cancelled', 'completed'
    start_date DATE NOT NULL,
    end_date DATE,
    
    -- Grading Configuration
    grading_scale JSONB DEFAULT '{}', -- Custom grading scale for this class
    grade_categories JSONB DEFAULT '[]', -- Categories like 'homework', 'tests', 'projects'
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT valid_semester CHECK (semester IN ('fall', 'spring', 'summer', 'full_year')),
    CONSTRAINT valid_status CHECK (status IN ('active', 'inactive', 'cancelled', 'completed')),
    CONSTRAINT valid_grade CHECK (grade_level IN ('K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 'all')),
    CONSTRAINT valid_credits CHECK (credits > 0 AND credits <= 10),
    CONSTRAINT valid_enrollment CHECK (current_enrollment >= 0 AND current_enrollment <= max_students),
    CONSTRAINT unique_class_code_per_tenant UNIQUE (tenant_id, class_code, academic_year)
);

-- Create indexes for performance
CREATE INDEX idx_classes_tenant_id ON classes(tenant_id);
CREATE INDEX idx_classes_teacher_id ON classes(teacher_id);
CREATE INDEX idx_classes_subject ON classes(subject);
CREATE INDEX idx_classes_grade_level ON classes(grade_level);
CREATE INDEX idx_classes_academic_year ON classes(academic_year);
CREATE INDEX idx_classes_status ON classes(status);
CREATE INDEX idx_classes_tenant_year ON classes(tenant_id, academic_year);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_classes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_classes_updated_at
    BEFORE UPDATE ON classes
    FOR EACH ROW
    EXECUTE FUNCTION update_classes_updated_at();
