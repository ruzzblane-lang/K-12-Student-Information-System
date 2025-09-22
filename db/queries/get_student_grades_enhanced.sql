-- Enhanced Query: Get student grades with course information
-- Description: Retrieves all grades for a specific student with course and assignment details
-- Parameters: 
--   $1: student_id (UUID) - The UUID of the student
--   $2: term_id (UUID, optional) - The UUID of the term to filter by
--   $3: course_id (UUID, optional) - The UUID of the course to filter by
--   $4: assignment_type (VARCHAR, optional) - Type of assignment to filter by
--   $5: include_feedback (BOOLEAN, default false) - Whether to include teacher feedback
--   $6: include_sensitive_data (BOOLEAN, default false) - Whether to include sensitive fields like graded_at

-- TODO: IMPLEMENTER - Add proper authorization checks in application layer
-- This query should only be called after verifying:
-- 1. User has permission to view student grades
-- 2. User belongs to the same tenant as the student
-- 3. User has appropriate role (student viewing own grades, parent viewing child's grades, teacher viewing student grades, admin)

SELECT 
    -- Student Information
    s.id as student_uuid,
    s.student_id,
    s.first_name,
    s.last_name,
    s.grade_level,
    
    -- Course Information
    c.id as course_uuid,
    c.name as course_name,
    c.code as course_code,
    c.subject,
    c.credits,
    
    -- Assignment Information
    g.id as grade_uuid,
    g.assignment_name,
    g.assignment_type,
    g.category,
    g.description as assignment_description,
    g.points_possible,
    g.points_earned,
    g.percentage,
    g.letter_grade,
    
    -- Dates
    g.assigned_date,
    g.due_date,
    g.submitted_date,
    g.graded_date,
    
    -- Status and Flags
    g.status,
    g.is_late,
    g.is_excused,
    g.is_extra_credit,
    
    -- Teacher Information
    g.graded_by,
    t_teacher.first_name as grader_first_name,
    t_teacher.last_name as grader_last_name,
    
    -- Conditional sensitive data (only included if authorized)
    CASE 
        WHEN $6 = true THEN g.teacher_comments 
        ELSE NULL 
    END as feedback,
    
    CASE 
        WHEN $6 = true THEN g.graded_date 
        ELSE NULL 
    END as graded_at,
    
    -- Term Information (if terms table exists)
    -- Note: The original query references a terms table that doesn't exist in current schema
    -- Using academic_year and semester from classes table instead
    c.academic_year,
    c.semester,
    
    -- Enrollment Information
    e.id as enrollment_uuid,
    e.enrollment_date,
    e.status as enrollment_status,
    e.final_grade as course_final_grade,
    e.gpa_points,
    e.credits_earned,
    
    -- Class Information
    cls.id as class_uuid,
    cls.name as class_name,
    cls.room_number,
    cls.building,
    
    -- Teacher Information
    cls.teacher_id,
    t_class.first_name as teacher_first_name,
    t_class.last_name as teacher_last_name,
    
    -- Metadata
    g.created_at as grade_created_at,
    g.updated_at as grade_updated_at

FROM students s
-- Join with users table for student name (if user_id exists)
LEFT JOIN users u ON s.user_id = u.id
-- Join with enrollments to get course relationships
JOIN enrollments e ON s.id = e.student_id AND e.status = 'active'
-- Join with classes to get course information
JOIN classes cls ON e.class_id = cls.id AND cls.status = 'active'
-- Join with courses (assuming courses table exists - if not, use classes directly)
-- Note: The original query references a courses table that may not exist
-- Using classes table directly for course information
LEFT JOIN classes c ON cls.id = c.id
-- Join with grades table
JOIN grades g ON s.id = g.student_id AND cls.id = g.class_id
-- Join with teachers for class teacher information
LEFT JOIN teachers t_class ON cls.teacher_id = t_class.id
-- Join with teachers for grader information
LEFT JOIN teachers t_teacher ON g.graded_by = t_teacher.id

WHERE 
    -- Primary filters
    s.id = $1
    AND s.tenant_id = current_setting('app.current_tenant_id')::UUID  -- Tenant isolation
    AND s.deleted_at IS NULL  -- Exclude soft-deleted students
    AND g.deleted_at IS NULL  -- Exclude soft-deleted grades
    
    -- Optional filters
    AND ($2 IS NULL OR c.academic_year = $2)  -- Filter by academic year (replacing term_id)
    AND ($3 IS NULL OR cls.id = $3)  -- Filter by class/course
    AND ($4 IS NULL OR g.assignment_type = $4)  -- Filter by assignment type
    
    -- Additional security filters
    AND e.status = 'active'  -- Only active enrollments
    AND cls.status = 'active'  -- Only active classes

-- Enhanced ordering for better performance and user experience
ORDER BY 
    -- Primary sort: Most recent academic year first
    c.academic_year DESC,
    -- Secondary sort: Course name for consistent grouping
    c.name ASC,
    -- Tertiary sort: Assignment due date (most recent first)
    g.due_date DESC NULLS LAST,
    -- Quaternary sort: Assignment name for consistent ordering within same due date
    g.assignment_name ASC;

-- =============================================================================
-- PERFORMANCE OPTIMIZATION RECOMMENDATIONS
-- =============================================================================

-- TODO: IMPLEMENTER - Add the following indexes if they don't exist:

-- 1. Composite index for the main query path
-- CREATE INDEX IF NOT EXISTS idx_grades_student_class_performance 
-- ON grades(student_id, class_id, due_date DESC, assignment_type) 
-- WHERE deleted_at IS NULL;

-- 2. Index for tenant isolation
-- CREATE INDEX IF NOT EXISTS idx_students_tenant_id_deleted 
-- ON students(tenant_id, id) 
-- WHERE deleted_at IS NULL;

-- 3. Index for enrollment filtering
-- CREATE INDEX IF NOT EXISTS idx_enrollments_student_status 
-- ON enrollments(student_id, status, class_id) 
-- WHERE status = 'active';

-- 4. Index for class filtering
-- CREATE INDEX IF NOT EXISTS idx_classes_status_academic_year 
-- ON classes(status, academic_year, id) 
-- WHERE status = 'active';

-- 5. Index for assignment type filtering
-- CREATE INDEX IF NOT EXISTS idx_grades_assignment_type_due_date 
-- ON grades(assignment_type, due_date DESC) 
-- WHERE deleted_at IS NULL;

-- =============================================================================
-- SECURITY RECOMMENDATIONS
-- =============================================================================

-- TODO: IMPLEMENTER - Implement the following security measures:

-- 1. Row Level Security (RLS) Policies
-- ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE students ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- 2. Create RLS policies for tenant isolation
-- CREATE POLICY grades_tenant_isolation ON grades 
-- FOR ALL TO authenticated 
-- USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- 3. Create RLS policies for role-based access
-- CREATE POLICY grades_role_access ON grades 
-- FOR ALL TO authenticated 
-- USING (
--     -- Students can only see their own grades
--     (current_setting('app.current_user_role') = 'student' AND student_id = current_setting('app.current_user_id')::UUID) OR
--     -- Teachers can see grades for their classes
--     (current_setting('app.current_user_role') = 'teacher' AND class_id IN (
--         SELECT id FROM classes WHERE teacher_id = current_setting('app.current_user_id')::UUID
--     )) OR
--     -- Parents can see grades for their children
--     (current_setting('app.current_user_role') = 'parent' AND student_id IN (
--         SELECT student_id FROM parent_student_relationships WHERE parent_id = current_setting('app.current_user_id')::UUID
--     )) OR
--     -- Admins can see all grades in their tenant
--     current_setting('app.current_user_role') IN ('admin', 'super_admin')
-- );

-- =============================================================================
-- ALTERNATIVE QUERY STRUCTURES
-- =============================================================================

-- Alternative 1: Simplified version without course_sections (if they don't exist)
/*
SELECT 
    s.student_id,
    s.first_name,
    s.last_name,
    cls.name as course_name,
    cls.code as course_code,
    g.assignment_name,
    g.assignment_type,
    g.points_possible,
    g.points_earned,
    g.percentage,
    g.letter_grade,
    CASE WHEN $5 = true THEN g.teacher_comments ELSE NULL END as feedback,
    CASE WHEN $6 = true THEN g.graded_date ELSE NULL END as graded_at,
    cls.academic_year,
    cls.semester
FROM students s
JOIN enrollments e ON s.id = e.student_id
JOIN classes cls ON e.class_id = cls.id
JOIN grades g ON s.id = g.student_id AND cls.id = g.class_id
WHERE s.id = $1
  AND s.tenant_id = current_setting('app.current_tenant_id')::UUID
  AND ($2 IS NULL OR cls.academic_year = $2)
  AND ($3 IS NULL OR cls.id = $3)
  AND ($4 IS NULL OR g.assignment_type = $4)
ORDER BY cls.academic_year DESC, cls.name, g.due_date DESC;
*/

-- Alternative 2: With pagination support
/*
-- Add LIMIT and OFFSET for pagination
-- LIMIT $7 OFFSET $8
-- Where $7 = page_size and $8 = (page_number - 1) * page_size
*/

-- =============================================================================
-- USAGE EXAMPLES
-- =============================================================================

-- Example 1: Get all grades for a student
-- SELECT * FROM get_student_grades('student-uuid-here', NULL, NULL, NULL, false, false);

-- Example 2: Get grades for a specific academic year
-- SELECT * FROM get_student_grades('student-uuid-here', '2024-2025', NULL, NULL, false, false);

-- Example 3: Get only test grades with feedback (requires authorization)
-- SELECT * FROM get_student_grades('student-uuid-here', NULL, NULL, 'test', true, true);

-- Example 4: Get grades for a specific course
-- SELECT * FROM get_student_grades('student-uuid-here', NULL, 'class-uuid-here', NULL, false, false);
