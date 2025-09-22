-- Create attendance table with multi-tenant support
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    
    -- Attendance Information
    attendance_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL, -- 'present', 'absent', 'tardy', 'excused', 'late'
    period VARCHAR(50), -- Class period or time slot
    
    -- Details
    reason VARCHAR(200), -- Reason for absence/tardiness
    notes TEXT,
    is_excused BOOLEAN DEFAULT FALSE,
    
    -- Teacher Information
    marked_by UUID REFERENCES users(id), -- Teacher who marked attendance
    marked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Parent Notification
    parent_notified BOOLEAN DEFAULT FALSE,
    notification_sent_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT valid_status CHECK (status IN ('present', 'absent', 'tardy', 'excused', 'late', 'early_departure')),
    CONSTRAINT unique_student_date_period UNIQUE (tenant_id, student_id, attendance_date, period)
);

-- Create indexes for performance
CREATE INDEX idx_attendance_tenant_id ON attendance(tenant_id);
CREATE INDEX idx_attendance_student_id ON attendance(student_id);
CREATE INDEX idx_attendance_class_id ON attendance(class_id);
CREATE INDEX idx_attendance_date ON attendance(attendance_date);
CREATE INDEX idx_attendance_status ON attendance(status);
CREATE INDEX idx_attendance_tenant_student ON attendance(tenant_id, student_id);
CREATE INDEX idx_attendance_tenant_date ON attendance(tenant_id, attendance_date);
CREATE INDEX idx_attendance_marked_by ON attendance(marked_by);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_attendance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_attendance_updated_at
    BEFORE UPDATE ON attendance
    FOR EACH ROW
    EXECUTE FUNCTION update_attendance_updated_at();
