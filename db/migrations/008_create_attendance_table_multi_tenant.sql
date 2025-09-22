-- Migration: Create attendance table with multi-tenant support
-- Description: Daily attendance tracking with comprehensive status and notification features
-- Created: 2024-01-01
-- Updated: 2024-01-15 (Added best practices improvements)

-- Create attendance table with multi-tenant support
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    
    -- Attendance Information
    attendance_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL, -- 'present', 'absent', 'tardy', 'excused', 'late', 'early_departure'
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
    deleted_at TIMESTAMP WITH TIME ZONE, -- Soft deletion timestamp
    created_by UUID, -- Reference to user who created this attendance record (within same tenant)
    
    -- Constraints
    CONSTRAINT valid_status CHECK (status IN ('present', 'absent', 'tardy', 'excused', 'late', 'early_departure')),
    CONSTRAINT valid_period CHECK (period IS NULL OR LENGTH(TRIM(period)) > 0),
    CONSTRAINT valid_reason CHECK (reason IS NULL OR LENGTH(TRIM(reason)) > 0),
    CONSTRAINT valid_attendance_date CHECK (attendance_date <= CURRENT_DATE AND attendance_date >= CURRENT_DATE - INTERVAL '1 year'),
    CONSTRAINT valid_marked_at CHECK (marked_at IS NULL OR marked_at <= CURRENT_TIMESTAMP),
    CONSTRAINT valid_notification_sent_at CHECK (notification_sent_at IS NULL OR notification_sent_at <= CURRENT_TIMESTAMP),
    CONSTRAINT unique_student_date_period UNIQUE (tenant_id, student_id, attendance_date, period),
    CONSTRAINT valid_created_by CHECK (created_by IS NULL OR created_by != id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_attendance_tenant_id ON attendance(tenant_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_class_id ON attendance(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance(status);
CREATE INDEX IF NOT EXISTS idx_attendance_tenant_student ON attendance(tenant_id, student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_tenant_date ON attendance(tenant_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_marked_by ON attendance(marked_by);
CREATE INDEX IF NOT EXISTS idx_attendance_created_by ON attendance(created_by);
CREATE INDEX IF NOT EXISTS idx_attendance_deleted_at ON attendance(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_attendance_created_at ON attendance(created_at);
CREATE INDEX IF NOT EXISTS idx_attendance_period ON attendance(period);
CREATE INDEX IF NOT EXISTS idx_attendance_is_excused ON attendance(is_excused);
CREATE INDEX IF NOT EXISTS idx_attendance_parent_notified ON attendance(parent_notified);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_attendance_tenant_student_date ON attendance(tenant_id, student_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_tenant_date_status ON attendance(tenant_id, attendance_date, status);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date_status ON attendance(student_id, attendance_date, status);

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

-- Trigger to ensure created_by references a user within the same tenant
CREATE OR REPLACE FUNCTION validate_attendance_created_by_tenant()
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

CREATE TRIGGER trigger_validate_attendance_created_by_tenant
    BEFORE INSERT OR UPDATE ON attendance
    FOR EACH ROW
    EXECUTE FUNCTION validate_attendance_created_by_tenant();
