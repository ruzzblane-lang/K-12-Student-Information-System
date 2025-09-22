-- Migration: Optimize indexes for student grades query performance
-- Description: Adds comprehensive indexes to optimize the get_student_grades query performance
-- Created: 2024-01-15
-- Updated: 2024-01-15

-- =============================================================================
-- PERFORMANCE INDEXES FOR STUDENT GRADES QUERY
-- =============================================================================

-- 1. Composite index for the main query path (grades table)
-- This index supports the primary filtering and ordering in the grades query
CREATE INDEX IF NOT EXISTS idx_grades_student_class_performance 
ON grades(student_id, class_id, due_date DESC, assignment_type) 
WHERE deleted_at IS NULL;

-- 2. Index for tenant isolation on students table
-- Optimizes tenant-based filtering and soft delete handling
CREATE INDEX IF NOT EXISTS idx_students_tenant_id_deleted 
ON students(tenant_id, id) 
WHERE deleted_at IS NULL;

-- 3. Index for enrollment filtering
-- Supports active enrollment filtering and student-class relationships
CREATE INDEX IF NOT EXISTS idx_enrollments_student_status 
ON enrollments(student_id, status, class_id) 
WHERE status = 'active';

-- 4. Index for class filtering by status and academic year
-- Optimizes class-based filtering and academic year queries
CREATE INDEX IF NOT EXISTS idx_classes_status_academic_year 
ON classes(status, academic_year, id) 
WHERE status = 'active';

-- 5. Index for assignment type filtering
-- Supports filtering by assignment type with due date ordering
CREATE INDEX IF NOT EXISTS idx_grades_assignment_type_due_date 
ON grades(assignment_type, due_date DESC) 
WHERE deleted_at IS NULL;

-- 6. Index for grade status filtering
-- Supports filtering by grade status (graded, submitted, etc.)
CREATE INDEX IF NOT EXISTS idx_grades_status_student 
ON grades(status, student_id, class_id) 
WHERE deleted_at IS NULL;

-- 7. Index for teacher/grader lookups
-- Optimizes joins with teachers table for grader information
CREATE INDEX IF NOT EXISTS idx_grades_graded_by 
ON grades(graded_by) 
WHERE deleted_at IS NULL AND graded_by IS NOT NULL;

-- 8. Index for class teacher relationships
-- Optimizes joins between classes and teachers
CREATE INDEX IF NOT EXISTS idx_classes_teacher_id 
ON classes(teacher_id) 
WHERE deleted_at IS NULL AND teacher_id IS NOT NULL;

-- 9. Index for student user relationships
-- Optimizes joins between students and users tables
CREATE INDEX IF NOT EXISTS idx_students_user_id_active 
ON students(user_id) 
WHERE deleted_at IS NULL AND user_id IS NOT NULL;

-- 10. Index for academic year and semester filtering
-- Supports filtering by academic year and semester combinations
CREATE INDEX IF NOT EXISTS idx_classes_academic_year_semester 
ON classes(academic_year, semester, status) 
WHERE deleted_at IS NULL;

-- =============================================================================
-- ADDITIONAL PERFORMANCE INDEXES
-- =============================================================================

-- 11. Index for grade date range queries
-- Supports queries filtering by date ranges (assigned_date, due_date, graded_date)
CREATE INDEX IF NOT EXISTS idx_grades_date_range 
ON grades(assigned_date, due_date, graded_date) 
WHERE deleted_at IS NULL;

-- 12. Index for points and percentage queries
-- Supports queries filtering by grade ranges or sorting by performance
CREATE INDEX IF NOT EXISTS idx_grades_performance 
ON grades(points_earned, percentage, letter_grade) 
WHERE deleted_at IS NULL;

-- 13. Index for late and excused assignment queries
-- Supports queries filtering by assignment status flags
CREATE INDEX IF NOT EXISTS idx_grades_status_flags 
ON grades(is_late, is_excused, is_extra_credit, student_id) 
WHERE deleted_at IS NULL;

-- 14. Index for enrollment date filtering
-- Supports queries filtering by enrollment date ranges
CREATE INDEX IF NOT EXISTS idx_enrollments_date_range 
ON enrollments(enrollment_date, completion_date, student_id) 
WHERE deleted_at IS NULL;

-- 15. Index for student grade level filtering
-- Supports queries filtering by student grade level
CREATE INDEX IF NOT EXISTS idx_students_grade_level_tenant 
ON students(grade_level, tenant_id, status) 
WHERE deleted_at IS NULL;

-- =============================================================================
-- COVERING INDEXES FOR COMMON QUERY PATTERNS
-- =============================================================================

-- 16. Covering index for student grade summaries
-- Includes all commonly selected fields to avoid table lookups
CREATE INDEX IF NOT EXISTS idx_grades_student_summary_covering 
ON grades(student_id, class_id, assignment_type, points_earned, percentage, letter_grade, due_date DESC) 
INCLUDE (assignment_name, status, is_late, is_excused, graded_date) 
WHERE deleted_at IS NULL;

-- 17. Covering index for class grade summaries
-- Optimizes queries that need class-level grade statistics
CREATE INDEX IF NOT EXISTS idx_grades_class_summary_covering 
ON grades(class_id, assignment_type, due_date DESC) 
INCLUDE (student_id, points_earned, percentage, letter_grade, status) 
WHERE deleted_at IS NULL;

-- 18. Covering index for teacher grade management
-- Optimizes queries for teachers managing grades in their classes
CREATE INDEX IF NOT EXISTS idx_grades_teacher_covering 
ON grades(graded_by, class_id, due_date DESC) 
INCLUDE (student_id, assignment_name, points_earned, percentage, status, graded_date) 
WHERE deleted_at IS NULL AND graded_by IS NOT NULL;

-- =============================================================================
-- PARTIAL INDEXES FOR SPECIFIC USE CASES
-- =============================================================================

-- 19. Index for ungraded assignments
-- Optimizes queries looking for assignments that need grading
CREATE INDEX IF NOT EXISTS idx_grades_ungraded 
ON grades(class_id, due_date, student_id) 
WHERE deleted_at IS NULL AND status IN ('assigned', 'submitted') AND graded_date IS NULL;

-- 20. Index for late assignments
-- Optimizes queries for late assignment tracking
CREATE INDEX IF NOT EXISTS idx_grades_late_assignments 
ON grades(student_id, class_id, due_date) 
WHERE deleted_at IS NULL AND is_late = true;

-- 21. Index for excused assignments
-- Optimizes queries for excused assignment tracking
CREATE INDEX IF NOT EXISTS idx_grades_excused_assignments 
ON grades(student_id, class_id, due_date) 
WHERE deleted_at IS NULL AND is_excused = true;

-- 22. Index for extra credit assignments
-- Optimizes queries for extra credit tracking
CREATE INDEX IF NOT EXISTS idx_grades_extra_credit 
ON grades(student_id, class_id, due_date DESC) 
WHERE deleted_at IS NULL AND is_extra_credit = true;

-- =============================================================================
-- INDEXES FOR ANALYTICS AND REPORTING
-- =============================================================================

-- 23. Index for grade analytics by academic year
-- Supports analytics queries by academic year
CREATE INDEX IF NOT EXISTS idx_grades_analytics_academic_year 
ON grades(student_id, class_id, assignment_type, percentage) 
INCLUDE (points_earned, letter_grade, due_date, graded_date) 
WHERE deleted_at IS NULL;

-- 24. Index for grade trend analysis
-- Supports queries analyzing grade trends over time
CREATE INDEX IF NOT EXISTS idx_grades_trend_analysis 
ON grades(student_id, graded_date, assignment_type, percentage) 
WHERE deleted_at IS NULL AND graded_date IS NOT NULL;

-- 25. Index for assignment type performance analysis
-- Supports analysis of performance by assignment type
CREATE INDEX IF NOT EXISTS idx_grades_assignment_type_analysis 
ON grades(assignment_type, class_id, percentage, points_earned) 
INCLUDE (student_id, due_date, graded_date) 
WHERE deleted_at IS NULL;

-- =============================================================================
-- INDEX MAINTENANCE AND MONITORING
-- =============================================================================

-- Create a function to analyze index usage
CREATE OR REPLACE FUNCTION analyze_grades_query_indexes()
RETURNS TABLE(
    index_name TEXT,
    index_size TEXT,
    index_usage_count BIGINT,
    last_used TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.indexname::TEXT,
        pg_size_pretty(pg_relation_size(i.indexname::regclass))::TEXT,
        s.idx_scan,
        s.last_idx_scan
    FROM pg_indexes i
    JOIN pg_stat_user_indexes s ON i.indexname = s.indexrelname
    WHERE i.tablename IN ('grades', 'students', 'enrollments', 'classes')
    AND i.indexname LIKE 'idx_%'
    ORDER BY s.idx_scan DESC;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get index recommendations
CREATE OR REPLACE FUNCTION get_grades_query_index_recommendations()
RETURNS TABLE(
    table_name TEXT,
    column_name TEXT,
    recommendation TEXT,
    estimated_impact TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'grades'::TEXT,
        'student_id, class_id, due_date'::TEXT,
        'Composite index for main query path'::TEXT,
        'High - Primary query optimization'::TEXT
    UNION ALL
    SELECT 
        'students'::TEXT,
        'tenant_id, id'::TEXT,
        'Tenant isolation index'::TEXT,
        'High - Security and performance'::TEXT
    UNION ALL
    SELECT 
        'enrollments'::TEXT,
        'student_id, status, class_id'::TEXT,
        'Enrollment filtering index'::TEXT,
        'Medium - Join optimization'::TEXT
    UNION ALL
    SELECT 
        'classes'::TEXT,
        'status, academic_year, id'::TEXT,
        'Class filtering index'::TEXT,
        'Medium - Academic year queries'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON INDEX idx_grades_student_class_performance IS 'Primary index for student grades query - supports filtering by student, class, and ordering by due date and assignment type';
COMMENT ON INDEX idx_students_tenant_id_deleted IS 'Tenant isolation index for students table with soft delete support';
COMMENT ON INDEX idx_enrollments_student_status IS 'Enrollment filtering index for active student-class relationships';
COMMENT ON INDEX idx_classes_status_academic_year IS 'Class filtering index for active classes by academic year';
COMMENT ON INDEX idx_grades_assignment_type_due_date IS 'Assignment type filtering index with due date ordering';
COMMENT ON INDEX idx_grades_student_summary_covering IS 'Covering index for student grade summaries - includes commonly selected fields';
COMMENT ON INDEX idx_grades_ungraded IS 'Partial index for ungraded assignments - optimizes teacher workflow queries';
COMMENT ON INDEX idx_grades_late_assignments IS 'Partial index for late assignments - optimizes late assignment tracking';

-- =============================================================================
-- TODO: IMPLEMENTER NOTES
-- =============================================================================

-- MONITORING IMPLEMENTATION REQUIRED:
-- 1. Set up index usage monitoring to track which indexes are being used
-- 2. Monitor query performance before and after index creation
-- 3. Set up alerts for slow queries that might need additional indexes
-- 4. Regularly analyze index bloat and rebuild if necessary

-- MAINTENANCE IMPLEMENTATION REQUIRED:
-- 1. Schedule regular VACUUM and ANALYZE operations on indexed tables
-- 2. Monitor index size growth and consider partitioning for large tables
-- 3. Review and remove unused indexes to reduce maintenance overhead
-- 4. Update statistics regularly for optimal query planning

-- SECURITY IMPLEMENTATION REQUIRED:
-- 1. Ensure all indexes respect tenant isolation
-- 2. Add RLS policies that work efficiently with the indexes
-- 3. Monitor for potential index-based data leakage
-- 4. Implement proper access controls for index maintenance functions

-- PERFORMANCE TESTING REQUIRED:
-- 1. Test query performance with and without indexes
-- 2. Measure index creation time and space usage
-- 3. Test index effectiveness with different data volumes
-- 4. Validate that indexes don't negatively impact write performance
