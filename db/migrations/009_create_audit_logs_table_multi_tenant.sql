-- Create audit logs table for compliance and security tracking
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- User Information
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_email VARCHAR(255),
    user_role VARCHAR(50),
    
    -- Action Information
    action VARCHAR(100) NOT NULL, -- 'create', 'update', 'delete', 'login', 'logout', 'export', etc.
    resource_type VARCHAR(100) NOT NULL, -- 'student', 'teacher', 'grade', 'attendance', etc.
    resource_id UUID, -- ID of the affected resource
    
    -- Request Information
    ip_address INET,
    user_agent TEXT,
    request_method VARCHAR(10), -- 'GET', 'POST', 'PUT', 'DELETE'
    request_url TEXT,
    
    -- Data Changes
    old_values JSONB, -- Previous values (for updates/deletes)
    new_values JSONB, -- New values (for creates/updates)
    
    -- Result Information
    success BOOLEAN NOT NULL DEFAULT TRUE,
    error_message TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_action CHECK (action IN ('create', 'update', 'delete', 'login', 'logout', 'export', 'import', 'view', 'search', 'print', 'email', 'sms', 'backup', 'restore', 'config_change', 'user_management', 'permission_change')),
    CONSTRAINT valid_method CHECK (request_method IS NULL OR request_method IN ('GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'))
);

-- Create indexes for performance and compliance queries
CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_resource_id ON audit_logs(resource_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_tenant_date ON audit_logs(tenant_id, created_at);
CREATE INDEX idx_audit_logs_user_date ON audit_logs(user_id, created_at);
CREATE INDEX idx_audit_logs_ip_address ON audit_logs(ip_address);

-- Create a function to automatically log data changes
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    tenant_uuid UUID;
    user_uuid UUID;
    user_email_val VARCHAR(255);
    user_role_val VARCHAR(50);
BEGIN
    -- Get tenant_id from the record
    IF TG_OP = 'DELETE' THEN
        tenant_uuid := OLD.tenant_id;
    ELSE
        tenant_uuid := NEW.tenant_id;
    END IF;
    
    -- Try to get current user context (this would be set by application)
    -- For now, we'll use NULL as we'll set this in the application layer
    user_uuid := NULL;
    user_email_val := NULL;
    user_role_val := NULL;
    
    -- Insert audit log
    INSERT INTO audit_logs (
        tenant_id,
        user_id,
        user_email,
        user_role,
        action,
        resource_type,
        resource_id,
        old_values,
        new_values,
        success
    ) VALUES (
        tenant_uuid,
        user_uuid,
        user_email_val,
        user_role_val,
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END,
        TRUE
    );
    
    -- Return appropriate record
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create audit triggers for sensitive tables
CREATE TRIGGER audit_users_trigger
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_students_trigger
    AFTER INSERT OR UPDATE OR DELETE ON students
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_teachers_trigger
    AFTER INSERT OR UPDATE OR DELETE ON teachers
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_grades_trigger
    AFTER INSERT OR UPDATE OR DELETE ON grades
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_attendance_trigger
    AFTER INSERT OR UPDATE OR DELETE ON attendance
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
