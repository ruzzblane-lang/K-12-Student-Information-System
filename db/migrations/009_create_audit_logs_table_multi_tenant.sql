-- Migration: Create audit logs table for compliance and security tracking
-- Description: Comprehensive audit logging with enhanced user context and request tracing
-- Created: 2024-01-01
-- Updated: 2024-01-15 (Added best practices improvements)

-- Create audit logs table for compliance and security tracking
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- User Information
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_email VARCHAR(255),
    user_role VARCHAR(50),
    session_id VARCHAR(255), -- Session identifier for request tracing
    
    -- Action Information
    action VARCHAR(100) NOT NULL, -- 'create', 'update', 'delete', 'login', 'logout', 'export', etc.
    resource_type VARCHAR(100) NOT NULL, -- 'student', 'teacher', 'grade', 'attendance', etc.
    resource_id UUID, -- ID of the affected resource
    
    -- Request Information
    request_id VARCHAR(255), -- Unique request identifier for tracing
    ip_address INET,
    user_agent TEXT,
    request_method VARCHAR(10), -- 'GET', 'POST', 'PUT', 'DELETE'
    request_url TEXT,
    request_headers JSONB, -- Request headers for debugging
    
    -- Data Changes
    old_values JSONB, -- Previous values (for updates/deletes)
    new_values JSONB, -- New values (for creates/updates)
    changed_fields TEXT[], -- Array of field names that changed
    
    -- Result Information
    success BOOLEAN NOT NULL DEFAULT TRUE,
    error_message TEXT,
    response_status INTEGER, -- HTTP response status code
    
    -- Performance Information
    execution_time_ms INTEGER, -- Request execution time in milliseconds
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE, -- Soft deletion timestamp
    created_by UUID, -- Reference to user who created this audit record (system or admin)
    
    -- Constraints
    CONSTRAINT valid_action CHECK (action IN ('create', 'update', 'delete', 'login', 'logout', 'export', 'import', 'view', 'search', 'print', 'email', 'sms', 'backup', 'restore', 'config_change', 'user_management', 'permission_change', 'data_access', 'file_upload', 'file_download', 'report_generation', 'bulk_operation')),
    CONSTRAINT valid_method CHECK (request_method IS NULL OR request_method IN ('GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS')),
    CONSTRAINT valid_response_status CHECK (response_status IS NULL OR (response_status >= 100 AND response_status <= 599)),
    CONSTRAINT valid_execution_time CHECK (execution_time_ms IS NULL OR execution_time_ms >= 0),
    CONSTRAINT valid_created_by CHECK (created_by IS NULL OR created_by != id)
);

-- Create indexes for performance and compliance queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_id ON audit_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_date ON audit_logs(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_date ON audit_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_address ON audit_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_by ON audit_logs(created_by);
CREATE INDEX IF NOT EXISTS idx_audit_logs_deleted_at ON audit_logs(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_request_id ON audit_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_session_id ON audit_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_success ON audit_logs(success);
CREATE INDEX IF NOT EXISTS idx_audit_logs_response_status ON audit_logs(response_status);

-- GIN indexes for JSONB columns
CREATE INDEX IF NOT EXISTS idx_audit_logs_old_values ON audit_logs USING GIN (old_values);
CREATE INDEX IF NOT EXISTS idx_audit_logs_new_values ON audit_logs USING GIN (new_values);
CREATE INDEX IF NOT EXISTS idx_audit_logs_request_headers ON audit_logs USING GIN (request_headers);

-- Composite indexes for common compliance queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_user_date ON audit_logs(tenant_id, user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_action_date ON audit_logs(tenant_id, action, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_resource_date ON audit_logs(tenant_id, resource_type, created_at);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_audit_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_audit_logs_updated_at
    BEFORE UPDATE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_audit_logs_updated_at();

-- Enhanced function to automatically log data changes with better context
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    tenant_uuid UUID;
    user_uuid UUID;
    user_email_val VARCHAR(255);
    user_role_val VARCHAR(50);
    request_id_val VARCHAR(255);
    session_id_val VARCHAR(255);
    ip_address_val INET;
    user_agent_val TEXT;
    changed_fields_array TEXT[];
BEGIN
    -- Get tenant_id from the record
    IF TG_OP = 'DELETE' THEN
        tenant_uuid := OLD.tenant_id;
    ELSE
        tenant_uuid := NEW.tenant_id;
    END IF;
    
    -- Try to get current user context from application settings
    -- These would be set by the application layer using SET LOCAL
    user_uuid := current_setting('app.current_user_id', true)::UUID;
    user_email_val := current_setting('app.current_user_email', true);
    user_role_val := current_setting('app.current_user_role', true);
    request_id_val := current_setting('app.current_request_id', true);
    session_id_val := current_setting('app.current_session_id', true);
    ip_address_val := current_setting('app.current_ip_address', true)::INET;
    user_agent_val := current_setting('app.current_user_agent', true);
    
    -- Calculate changed fields for UPDATE operations
    IF TG_OP = 'UPDATE' THEN
        SELECT array_agg(key) INTO changed_fields_array
        FROM (
            SELECT key FROM jsonb_each(to_jsonb(NEW))
            EXCEPT
            SELECT key FROM jsonb_each(to_jsonb(OLD))
        ) AS changed_keys;
    END IF;
    
    -- Insert audit log
    INSERT INTO audit_logs (
        tenant_id,
        user_id,
        user_email,
        user_role,
        session_id,
        action,
        resource_type,
        resource_id,
        request_id,
        ip_address,
        user_agent,
        old_values,
        new_values,
        changed_fields,
        success,
        created_by
    ) VALUES (
        tenant_uuid,
        user_uuid,
        user_email_val,
        user_role_val,
        session_id_val,
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        request_id_val,
        ip_address_val,
        user_agent_val,
        CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END,
        changed_fields_array,
        TRUE,
        user_uuid
    );
    
    -- Return appropriate record
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the original operation
        INSERT INTO audit_logs (
            tenant_id,
            action,
            resource_type,
            resource_id,
            error_message,
            success
        ) VALUES (
            tenant_uuid,
            TG_OP,
            TG_TABLE_NAME,
            COALESCE(NEW.id, OLD.id),
            SQLERRM,
            FALSE
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

-- Documentation for JSONB columns in audit_logs:
-- 
-- old_values and new_values columns store complete record snapshots as JSONB.
-- Example structure:
-- {
--   "id": "uuid-here",
--   "tenant_id": "tenant-uuid",
--   "first_name": "John",
--   "last_name": "Doe",
--   "email": "john.doe@example.com",
--   "status": "active",
--   "created_at": "2024-01-15T10:30:00Z",
--   "updated_at": "2024-01-15T10:30:00Z"
-- }
--
-- request_headers column stores HTTP request headers as JSONB.
-- Example structure:
-- {
--   "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
--   "Accept": "application/json",
--   "Authorization": "Bearer jwt-token-here",
--   "Content-Type": "application/json",
--   "X-Forwarded-For": "192.168.1.1",
--   "X-Request-ID": "req-uuid-here"
-- }
--
-- Example queries:
-- SELECT * FROM audit_logs WHERE old_values->>'email' = 'old@example.com';
-- SELECT * FROM audit_logs WHERE new_values->>'status' = 'inactive';
-- SELECT * FROM audit_logs WHERE request_headers->>'User-Agent' LIKE '%Chrome%';
-- SELECT * FROM audit_logs WHERE changed_fields @> ARRAY['email', 'status'];
