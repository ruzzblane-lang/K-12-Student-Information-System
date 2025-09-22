-- Create enrollments table for student-class relationships with multi-tenant support
CREATE TABLE enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    
    -- Enrollment Information
    enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'dropped', 'completed', 'withdrawn'
    drop_date DATE,
    completion_date DATE,
    
    -- Academic Information
    final_grade VARCHAR(10), -- 'A', 'B', 'C', 'D', 'F', 'P', 'NP', etc.
    gpa_points DECIMAL(3,2), -- GPA points earned (e.g., 4.0 for A)
    credits_earned DECIMAL(3,1) DEFAULT 0.0,
    
    -- Attendance
    total_days INTEGER DEFAULT 0,
    days_present INTEGER DEFAULT 0,
    days_absent INTEGER DEFAULT 0,
    days_tardy INTEGER DEFAULT 0,
    
    -- Notes & Comments
    notes TEXT,
    teacher_comments TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT valid_status CHECK (status IN ('active', 'dropped', 'completed', 'withdrawn')),
    CONSTRAINT valid_final_grade CHECK (final_grade IS NULL OR final_grade IN ('A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F', 'P', 'NP', 'I', 'W')),
    CONSTRAINT valid_gpa_points CHECK (gpa_points IS NULL OR (gpa_points >= 0 AND gpa_points <= 4.0)),
    CONSTRAINT valid_attendance CHECK (days_present + days_absent + days_tardy <= total_days),
    CONSTRAINT unique_student_class UNIQUE (tenant_id, student_id, class_id)
);

-- Create indexes for performance
CREATE INDEX idx_enrollments_tenant_id ON enrollments(tenant_id);
CREATE INDEX idx_enrollments_student_id ON enrollments(student_id);
CREATE INDEX idx_enrollments_class_id ON enrollments(class_id);
CREATE INDEX idx_enrollments_status ON enrollments(status);
CREATE INDEX idx_enrollments_final_grade ON enrollments(final_grade);
CREATE INDEX idx_enrollments_tenant_student ON enrollments(tenant_id, student_id);
CREATE INDEX idx_enrollments_tenant_class ON enrollments(tenant_id, class_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_enrollments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_enrollments_updated_at
    BEFORE UPDATE ON enrollments
    FOR EACH ROW
    EXECUTE FUNCTION update_enrollments_updated_at();
