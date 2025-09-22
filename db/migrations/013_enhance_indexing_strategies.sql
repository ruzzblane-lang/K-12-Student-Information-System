-- Migration: Enhance indexing strategies for optimal performance
-- Description: Add covering, partial, and composite indexes for common query patterns
-- Created: 2024-01-15

-- =============================================================================
-- COVERING INDEXES
-- =============================================================================
-- Covering indexes include all columns needed for a query, avoiding table lookups

-- Covering index for user authentication queries
CREATE INDEX IF NOT EXISTS idx_users_auth_covering ON users(tenant_id, email) 
INCLUDE (id, password_hash, password_salt, status, role, email_verified, two_factor_enabled);

-- Covering index for student lookup with basic info
CREATE INDEX IF NOT EXISTS idx_students_lookup_covering ON students(tenant_id, student_id) 
INCLUDE (id, first_name, last_name, grade_level, status, enrollment_date);

-- Covering index for teacher lookup with basic info
CREATE INDEX IF NOT EXISTS idx_teachers_lookup_covering ON teachers(tenant_id, employee_id) 
INCLUDE (id, first_name, last_name, department, employment_status, hire_date);

-- Covering index for attendance summary queries
CREATE INDEX IF NOT EXISTS idx_attendance_summary_covering ON attendance(tenant_id, student_id, attendance_date) 
INCLUDE (status, is_excused, period, marked_by);

-- Covering index for audit log compliance queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_compliance_covering ON audit_logs(tenant_id, created_at) 
INCLUDE (user_id, action, resource_type, resource_id, success, ip_address);

-- =============================================================================
-- PARTIAL INDEXES
-- =============================================================================
-- Partial indexes only include rows that meet specific conditions

-- Partial index for active users only
CREATE INDEX IF NOT EXISTS idx_users_active_partial ON users(tenant_id, email) 
WHERE status = 'active' AND deleted_at IS NULL;

-- Partial index for active students only
CREATE INDEX IF NOT EXISTS idx_students_active_partial ON students(tenant_id, grade_level) 
WHERE status = 'active' AND deleted_at IS NULL;

-- Partial index for active teachers only
CREATE INDEX IF NOT EXISTS idx_teachers_active_partial ON teachers(tenant_id, department) 
WHERE employment_status = 'active' AND deleted_at IS NULL;

-- Partial index for recent attendance records (last 6 months)
CREATE INDEX IF NOT EXISTS idx_attendance_recent_partial ON attendance(tenant_id, student_id, attendance_date) 
WHERE attendance_date >= CURRENT_DATE - INTERVAL '6 months' AND deleted_at IS NULL;

-- Partial index for failed audit log entries
CREATE INDEX IF NOT EXISTS idx_audit_logs_failed_partial ON audit_logs(tenant_id, created_at) 
WHERE success = FALSE;

-- Partial index for login/logout audit events
CREATE INDEX IF NOT EXISTS idx_audit_logs_auth_partial ON audit_logs(tenant_id, user_id, created_at) 
WHERE action IN ('login', 'logout');

-- Partial index for data modification audit events
CREATE INDEX IF NOT EXISTS idx_audit_logs_modifications_partial ON audit_logs(tenant_id, resource_type, created_at) 
WHERE action IN ('create', 'update', 'delete');

-- =============================================================================
-- COMPOSITE INDEXES FOR COMMON QUERY PATTERNS
-- =============================================================================

-- Multi-tenant + role-based queries
CREATE INDEX IF NOT EXISTS idx_users_tenant_role_status ON users(tenant_id, role, status, created_at);

-- Student enrollment queries
CREATE INDEX IF NOT EXISTS idx_students_tenant_grade_status ON students(tenant_id, grade_level, status, enrollment_date);

-- Teacher department and employment queries
CREATE INDEX IF NOT EXISTS idx_teachers_tenant_dept_status ON teachers(tenant_id, department, employment_status, hire_date);

-- Attendance reporting queries
CREATE INDEX IF NOT EXISTS idx_attendance_tenant_date_status ON attendance(tenant_id, attendance_date, status, is_excused);

-- Grade queries by student and academic period
CREATE INDEX IF NOT EXISTS idx_grades_tenant_student_period ON grades(tenant_id, student_id, academic_period, created_at);

-- Audit log queries by user and time range
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_user_time ON audit_logs(tenant_id, user_id, created_at, action);

-- =============================================================================
-- FUNCTIONAL INDEXES
-- =============================================================================
-- Indexes on expressions and functions

-- Index on lowercase email for case-insensitive searches
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email));

-- Index on student name concatenation for full name searches
CREATE INDEX IF NOT EXISTS idx_students_full_name ON students(tenant_id, (first_name || ' ' || last_name));

-- Index on teacher name concatenation for full name searches
CREATE INDEX IF NOT EXISTS idx_teachers_full_name ON teachers(tenant_id, (first_name || ' ' || last_name));

-- Index on attendance date parts for monthly/yearly reports
CREATE INDEX IF NOT EXISTS idx_attendance_date_parts ON attendance(tenant_id, EXTRACT(YEAR FROM attendance_date), EXTRACT(MONTH FROM attendance_date));

-- Index on audit log date parts for time-based analysis
CREATE INDEX IF NOT EXISTS idx_audit_logs_date_parts ON audit_logs(tenant_id, EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at), EXTRACT(DAY FROM created_at));

-- =============================================================================
-- SPECIALIZED INDEXES FOR JSONB COLUMNS
-- =============================================================================

-- Index on specific JSONB paths for tenant features
CREATE INDEX IF NOT EXISTS idx_tenants_features_modules ON tenants USING GIN ((features->'modules'));

-- Index on specific JSONB paths for user permissions
CREATE INDEX IF NOT EXISTS idx_users_permissions_modules ON users USING GIN ((permissions->'modules'));

-- Index on specific JSONB paths for student documents
CREATE INDEX IF NOT EXISTS idx_students_documents_type ON students USING GIN ((documents->'type'));

-- Index on specific JSONB paths for teacher work schedule
CREATE INDEX IF NOT EXISTS idx_teachers_schedule_days ON teachers USING GIN ((work_schedule->'monday'), (work_schedule->'tuesday'), (work_schedule->'wednesday'), (work_schedule->'thursday'), (work_schedule->'friday'));

-- =============================================================================
-- UNIQUE INDEXES WITH CONDITIONS
-- =============================================================================

-- Unique index for active student IDs per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_active_id_unique ON students(tenant_id, student_id) 
WHERE status = 'active' AND deleted_at IS NULL;

-- Unique index for active teacher employee IDs per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_teachers_active_employee_id_unique ON teachers(tenant_id, employee_id) 
WHERE employment_status = 'active' AND deleted_at IS NULL;

-- Unique index for active user emails per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_active_email_unique ON users(tenant_id, email) 
WHERE status = 'active' AND deleted_at IS NULL;

-- =============================================================================
-- INDEXES FOR FULL-TEXT SEARCH
-- =============================================================================

-- Full-text search index for student names
CREATE INDEX IF NOT EXISTS idx_students_name_fts ON students USING GIN (to_tsvector('english', first_name || ' ' || last_name));

-- Full-text search index for teacher names
CREATE INDEX IF NOT EXISTS idx_teachers_name_fts ON teachers USING GIN (to_tsvector('english', first_name || ' ' || last_name));

-- Full-text search index for audit log error messages
CREATE INDEX IF NOT EXISTS idx_audit_logs_error_fts ON audit_logs USING GIN (to_tsvector('english', error_message)) 
WHERE error_message IS NOT NULL;

-- =============================================================================
-- INDEXES FOR ARRAY COLUMNS
-- =============================================================================

-- Index for teacher subjects taught
CREATE INDEX IF NOT EXISTS idx_teachers_subjects_gin ON teachers USING GIN (subjects_taught);

-- Index for teacher grade levels taught
CREATE INDEX IF NOT EXISTS idx_teachers_grade_levels_gin ON teachers USING GIN (grade_levels_taught);

-- Index for teacher certifications
CREATE INDEX IF NOT EXISTS idx_teachers_certifications_gin ON teachers USING GIN (teaching_certifications);

-- Index for audit log changed fields
CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_fields_gin ON audit_logs USING GIN (changed_fields);

-- =============================================================================
-- PERFORMANCE MONITORING FUNCTIONS
-- =============================================================================

-- Function to analyze index usage
CREATE OR REPLACE FUNCTION analyze_index_usage()
RETURNS TABLE(
    schemaname TEXT,
    tablename TEXT,
    indexname TEXT,
    idx_scan BIGINT,
    idx_tup_read BIGINT,
    idx_tup_fetch BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.schemaname,
        s.tablename,
        s.indexname,
        s.idx_scan,
        s.idx_tup_read,
        s.idx_tup_fetch
    FROM pg_stat_user_indexes s
    JOIN pg_index i ON s.indexrelid = i.indexrelid
    WHERE s.schemaname = 'public'
    ORDER BY s.idx_scan DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to find unused indexes
CREATE OR REPLACE FUNCTION find_unused_indexes()
RETURNS TABLE(
    schemaname TEXT,
    tablename TEXT,
    indexname TEXT,
    index_size TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.schemaname,
        s.tablename,
        s.indexname,
        pg_size_pretty(pg_relation_size(s.indexrelid)) as index_size
    FROM pg_stat_user_indexes s
    JOIN pg_index i ON s.indexrelid = i.indexrelid
    WHERE s.schemaname = 'public'
    AND s.idx_scan = 0
    AND NOT i.indisunique
    ORDER BY pg_relation_size(s.indexrelid) DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get index statistics
CREATE OR REPLACE FUNCTION get_index_statistics()
RETURNS TABLE(
    table_name TEXT,
    index_name TEXT,
    index_size TEXT,
    index_usage BIGINT,
    index_effectiveness NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.tablename::TEXT,
        s.indexname::TEXT,
        pg_size_pretty(pg_relation_size(s.indexrelid))::TEXT as index_size,
        s.idx_scan as index_usage,
        CASE 
            WHEN s.idx_scan > 0 THEN 
                ROUND((s.idx_tup_fetch::NUMERIC / s.idx_scan::NUMERIC), 2)
            ELSE 0
        END as index_effectiveness
    FROM pg_stat_user_indexes s
    WHERE s.schemaname = 'public'
    ORDER BY s.idx_scan DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions for monitoring functions
GRANT EXECUTE ON FUNCTION analyze_index_usage() TO authenticated;
GRANT EXECUTE ON FUNCTION find_unused_indexes() TO authenticated;
GRANT EXECUTE ON FUNCTION get_index_statistics() TO authenticated;

-- =============================================================================
-- DOCUMENTATION
-- =============================================================================

-- Indexing Strategy Documentation:
-- 
-- 1. COVERING INDEXES:
--    - Include frequently accessed columns to avoid table lookups
--    - Reduce I/O operations for common queries
--    - Examples: authentication, student/teacher lookups
-- 
-- 2. PARTIAL INDEXES:
--    - Only index rows that meet specific conditions
--    - Reduce index size and maintenance overhead
--    - Examples: active users, recent records, failed operations
-- 
-- 3. COMPOSITE INDEXES:
--    - Optimize multi-column queries
--    - Follow leftmost prefix rule
--    - Examples: tenant + role + status combinations
-- 
-- 4. FUNCTIONAL INDEXES:
--    - Index on expressions and function results
--    - Enable efficient searches on computed values
--    - Examples: lowercase emails, concatenated names, date parts
-- 
-- 5. JSONB INDEXES:
--    - GIN indexes for JSONB path queries
--    - Optimize nested JSON searches
--    - Examples: tenant features, user permissions, documents
-- 
-- 6. FULL-TEXT SEARCH INDEXES:
--    - Enable efficient text search capabilities
--    - Use GIN indexes with tsvector
--    - Examples: name searches, error message searches
-- 
-- 7. ARRAY INDEXES:
--    - GIN indexes for array operations
--    - Enable efficient array containment queries
--    - Examples: subjects taught, grade levels, certifications
-- 
-- MONITORING:
-- - Use analyze_index_usage() to see which indexes are being used
-- - Use find_unused_indexes() to identify indexes that can be dropped
-- - Use get_index_statistics() to analyze index effectiveness
-- 
-- MAINTENANCE:
-- - Regularly analyze index usage patterns
-- - Drop unused indexes to reduce maintenance overhead
-- - Monitor index bloat and rebuild when necessary
-- - Consider index-only scans for covering indexes
