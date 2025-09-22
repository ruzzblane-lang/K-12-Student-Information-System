-- Create grades table with multi-tenant support
CREATE TABLE grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    enrollment_id UUID REFERENCES enrollments(id) ON DELETE CASCADE,
    
    -- Assignment Information
    assignment_name VARCHAR(200) NOT NULL,
    assignment_type VARCHAR(50) NOT NULL, -- 'homework', 'quiz', 'test', 'project', 'participation', 'final'
    category VARCHAR(100), -- 'homework', 'tests', 'projects', etc.
    description TEXT,
    
    -- Grade Information
    points_possible DECIMAL(8,2) NOT NULL,
    points_earned DECIMAL(8,2),
    percentage DECIMAL(5,2), -- Calculated percentage
    letter_grade VARCHAR(10), -- 'A+', 'A', 'B+', etc.
    
    -- Dates
    assigned_date DATE NOT NULL,
    due_date DATE,
    submitted_date DATE,
    graded_date DATE,
    
    -- Status & Flags
    status VARCHAR(20) DEFAULT 'assigned', -- 'assigned', 'submitted', 'graded', 'late', 'excused', 'missing'
    is_late BOOLEAN DEFAULT FALSE,
    is_excused BOOLEAN DEFAULT FALSE,
    is_extra_credit BOOLEAN DEFAULT FALSE,
    
    -- Teacher Information
    graded_by UUID REFERENCES users(id), -- Teacher who graded this
    teacher_comments TEXT,
    
    -- Attachments & Files
    attachments JSONB DEFAULT '[]', -- Array of file references
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT valid_assignment_type CHECK (assignment_type IN ('homework', 'quiz', 'test', 'project', 'participation', 'final', 'midterm', 'lab', 'presentation')),
    CONSTRAINT valid_status CHECK (status IN ('assigned', 'submitted', 'graded', 'late', 'excused', 'missing', 'incomplete')),
    CONSTRAINT valid_letter_grade CHECK (letter_grade IS NULL OR letter_grade IN ('A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F', 'P', 'NP', 'I', 'W')),
    CONSTRAINT valid_points CHECK (points_possible > 0 AND (points_earned IS NULL OR (points_earned >= 0 AND points_earned <= points_possible))),
    CONSTRAINT valid_percentage CHECK (percentage IS NULL OR (percentage >= 0 AND percentage <= 100))
);

-- Create indexes for performance
CREATE INDEX idx_grades_tenant_id ON grades(tenant_id);
CREATE INDEX idx_grades_student_id ON grades(student_id);
CREATE INDEX idx_grades_class_id ON grades(class_id);
CREATE INDEX idx_grades_enrollment_id ON grades(enrollment_id);
CREATE INDEX idx_grades_assignment_type ON grades(assignment_type);
CREATE INDEX idx_grades_category ON grades(category);
CREATE INDEX idx_grades_status ON grades(status);
CREATE INDEX idx_grades_due_date ON grades(due_date);
CREATE INDEX idx_grades_graded_date ON grades(graded_date);
CREATE INDEX idx_grades_tenant_student ON grades(tenant_id, student_id);
CREATE INDEX idx_grades_tenant_class ON grades(tenant_id, class_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_grades_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_grades_updated_at
    BEFORE UPDATE ON grades
    FOR EACH ROW
    EXECUTE FUNCTION update_grades_updated_at();
