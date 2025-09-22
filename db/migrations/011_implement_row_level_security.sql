-- Migration: Implement Row-Level Security (RLS) policies
-- Description: Database-level multi-tenant data isolation using RLS policies
-- Created: 2024-01-15

-- Enable Row-Level Security on all tenant-specific tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create a function to get the current tenant ID from application context
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
    -- Try to get tenant ID from application context
    RETURN current_setting('app.current_tenant_id', true)::UUID;
EXCEPTION
    WHEN OTHERS THEN
        -- Return NULL if no tenant context is set
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get the current user ID from application context
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
BEGIN
    -- Try to get user ID from application context
    RETURN current_setting('app.current_user_id', true)::UUID;
EXCEPTION
    WHEN OTHERS THEN
        -- Return NULL if no user context is set
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if current user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
DECLARE
    user_role VARCHAR(50);
BEGIN
    -- Get user role from application context
    user_role := current_setting('app.current_user_role', true);
    
    -- Return true if user is super admin
    RETURN user_role = 'super_admin';
EXCEPTION
    WHEN OTHERS THEN
        -- Return false if no user context is set
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policy for tenants table
-- Super admins can access all tenants, others can only access their own tenant
CREATE POLICY tenant_isolation_policy ON tenants
    FOR ALL TO authenticated
    USING (
        -- Super admins can access all tenants
        is_super_admin() OR
        -- Regular users can only access their own tenant
        id = get_current_tenant_id()
    );

-- RLS Policy for users table
-- Super admins can access all users, others can only access users in their tenant
CREATE POLICY user_tenant_isolation_policy ON users
    FOR ALL TO authenticated
    USING (
        -- Super admins can access all users
        is_super_admin() OR
        -- Regular users can only access users in their tenant
        tenant_id = get_current_tenant_id()
    );

-- RLS Policy for students table
-- Users can only access students in their tenant
CREATE POLICY student_tenant_isolation_policy ON students
    FOR ALL TO authenticated
    USING (
        -- Super admins can access all students
        is_super_admin() OR
        -- Regular users can only access students in their tenant
        tenant_id = get_current_tenant_id()
    );

-- RLS Policy for teachers table
-- Users can only access teachers in their tenant
CREATE POLICY teacher_tenant_isolation_policy ON teachers
    FOR ALL TO authenticated
    USING (
        -- Super admins can access all teachers
        is_super_admin() OR
        -- Regular users can only access teachers in their tenant
        tenant_id = get_current_tenant_id()
    );

-- RLS Policy for classes table
-- Users can only access classes in their tenant
CREATE POLICY class_tenant_isolation_policy ON classes
    FOR ALL TO authenticated
    USING (
        -- Super admins can access all classes
        is_super_admin() OR
        -- Regular users can only access classes in their tenant
        tenant_id = get_current_tenant_id()
    );

-- RLS Policy for enrollments table
-- Users can only access enrollments in their tenant
CREATE POLICY enrollment_tenant_isolation_policy ON enrollments
    FOR ALL TO authenticated
    USING (
        -- Super admins can access all enrollments
        is_super_admin() OR
        -- Regular users can only access enrollments in their tenant
        tenant_id = get_current_tenant_id()
    );

-- RLS Policy for grades table
-- Users can only access grades in their tenant
CREATE POLICY grade_tenant_isolation_policy ON grades
    FOR ALL TO authenticated
    USING (
        -- Super admins can access all grades
        is_super_admin() OR
        -- Regular users can only access grades in their tenant
        tenant_id = get_current_tenant_id()
    );

-- RLS Policy for attendance table
-- Users can only access attendance records in their tenant
CREATE POLICY attendance_tenant_isolation_policy ON attendance
    FOR ALL TO authenticated
    USING (
        -- Super admins can access all attendance records
        is_super_admin() OR
        -- Regular users can only access attendance records in their tenant
        tenant_id = get_current_tenant_id()
    );

-- RLS Policy for audit_logs table
-- Users can only access audit logs in their tenant
CREATE POLICY audit_log_tenant_isolation_policy ON audit_logs
    FOR ALL TO authenticated
    USING (
        -- Super admins can access all audit logs
        is_super_admin() OR
        -- Regular users can only access audit logs in their tenant
        tenant_id = get_current_tenant_id()
    );

-- Create a function to set tenant context for database operations
-- This function should be called by the application before any database operations
CREATE OR REPLACE FUNCTION set_tenant_context(
    p_tenant_id UUID,
    p_user_id UUID DEFAULT NULL,
    p_user_role VARCHAR(50) DEFAULT NULL,
    p_request_id VARCHAR(255) DEFAULT NULL,
    p_session_id VARCHAR(255) DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    -- Set application context variables
    PERFORM set_config('app.current_tenant_id', p_tenant_id::TEXT, false);
    
    IF p_user_id IS NOT NULL THEN
        PERFORM set_config('app.current_user_id', p_user_id::TEXT, false);
    END IF;
    
    IF p_user_role IS NOT NULL THEN
        PERFORM set_config('app.current_user_role', p_user_role, false);
    END IF;
    
    IF p_request_id IS NOT NULL THEN
        PERFORM set_config('app.current_request_id', p_request_id, false);
    END IF;
    
    IF p_session_id IS NOT NULL THEN
        PERFORM set_config('app.current_session_id', p_session_id, false);
    END IF;
    
    IF p_ip_address IS NOT NULL THEN
        PERFORM set_config('app.current_ip_address', p_ip_address::TEXT, false);
    END IF;
    
    IF p_user_agent IS NOT NULL THEN
        PERFORM set_config('app.current_user_agent', p_user_agent, false);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to clear tenant context
CREATE OR REPLACE FUNCTION clear_tenant_context()
RETURNS VOID AS $$
BEGIN
    -- Clear all application context variables
    PERFORM set_config('app.current_tenant_id', NULL, false);
    PERFORM set_config('app.current_user_id', NULL, false);
    PERFORM set_config('app.current_user_role', NULL, false);
    PERFORM set_config('app.current_request_id', NULL, false);
    PERFORM set_config('app.current_session_id', NULL, false);
    PERFORM set_config('app.current_ip_address', NULL, false);
    PERFORM set_config('app.current_user_agent', NULL, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
-- Note: These grants should be adjusted based on your application's role structure
GRANT EXECUTE ON FUNCTION get_current_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION set_tenant_context(UUID, UUID, VARCHAR, VARCHAR, VARCHAR, INET, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION clear_tenant_context() TO authenticated;

-- Documentation for RLS Implementation:
-- 
-- Row-Level Security (RLS) provides database-level multi-tenant data isolation.
-- 
-- How it works:
-- 1. Application calls set_tenant_context() before any database operations
-- 2. RLS policies automatically filter data based on tenant_id
-- 3. Users can only see/modify data within their tenant
-- 4. Super admins can access all tenant data
-- 
-- Usage in application:
-- SELECT set_tenant_context('tenant-uuid-here', 'user-uuid-here', 'teacher');
-- SELECT * FROM students; -- Only returns students from the specified tenant
-- SELECT clear_tenant_context();
-- 
-- Security benefits:
-- - Prevents accidental cross-tenant data access
-- - Works even if application logic has bugs
-- - Provides defense in depth
-- - Complies with data isolation requirements
-- 
-- Performance considerations:
-- - RLS policies are evaluated for every query
-- - Ensure proper indexing on tenant_id columns
-- - Consider using prepared statements for better performance
-- - Monitor query performance with RLS enabled
