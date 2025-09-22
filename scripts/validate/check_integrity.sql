-- Validation: Data integrity checks for K-12 Student Information System
-- Description: Comprehensive validation queries to check for broken or missing relationships
-- Compliance: US (FERPA), EU (GDPR), Indonesia (UU No. 19 Tahun 2016)
-- Created: 2024-09-22
-- Idempotent: Yes (read-only queries)

-- =============================================================================
-- DATA INTEGRITY CHECKS
-- =============================================================================

-- Check 1: Students without valid tenant references
SELECT 
    'STUDENTS_WITHOUT_TENANT' as check_name,
    COUNT(*) as issue_count,
    'Students with invalid tenant_id references' as description
FROM students s
LEFT JOIN tenants t ON s.tenant_id = t.id
WHERE t.id IS NULL;

-- Check 2: Users without valid tenant references
SELECT 
    'USERS_WITHOUT_TENANT' as check_name,
    COUNT(*) as issue_count,
    'Users with invalid tenant_id references' as description
FROM users u
LEFT JOIN tenants t ON u.tenant_id = t.id
WHERE t.id IS NULL;

-- Check 3: Students with invalid user_id references
SELECT 
    'STUDENTS_WITH_INVALID_USER' as check_name,
    COUNT(*) as issue_count,
    'Students with invalid user_id references' as description
FROM students s
LEFT JOIN users u ON s.user_id = u.id
WHERE s.user_id IS NOT NULL AND u.id IS NULL;

-- Check 4: Duplicate student IDs within same tenant
SELECT 
    'DUPLICATE_STUDENT_IDS' as check_name,
    COUNT(*) as issue_count,
    'Duplicate student_id values within same tenant' as description
FROM (
    SELECT tenant_id, student_id, COUNT(*) as cnt
    FROM students
    GROUP BY tenant_id, student_id
    HAVING COUNT(*) > 1
) duplicates;

-- Check 5: Duplicate email addresses within same tenant
SELECT 
    'DUPLICATE_USER_EMAILS' as check_name,
    COUNT(*) as issue_count,
    'Duplicate email addresses within same tenant' as description
FROM (
    SELECT tenant_id, email, COUNT(*) as cnt
    FROM users
    GROUP BY tenant_id, email
    HAVING COUNT(*) > 1
) duplicates;

-- Check 6: Students with missing required fields
SELECT 
    'STUDENTS_MISSING_REQUIRED_FIELDS' as check_name,
    COUNT(*) as issue_count,
    'Students with missing required fields (first_name, last_name, date_of_birth)' as description
FROM students
WHERE first_name IS NULL 
   OR last_name IS NULL 
   OR date_of_birth IS NULL
   OR student_id IS NULL;

-- Check 7: Users with missing required fields
SELECT 
    'USERS_MISSING_REQUIRED_FIELDS' as check_name,
    COUNT(*) as issue_count,
    'Users with missing required fields (first_name, last_name, email)' as description
FROM users
WHERE first_name IS NULL 
   OR last_name IS NULL 
   OR email IS NULL;

-- Check 8: Invalid email formats
SELECT 
    'INVALID_EMAIL_FORMATS' as check_name,
    COUNT(*) as issue_count,
    'Users with invalid email format' as description
FROM users
WHERE email NOT SIMILAR TO '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}';

-- Check 9: Students with future birth dates
SELECT 
    'STUDENTS_FUTURE_BIRTH_DATE' as check_name,
    COUNT(*) as issue_count,
    'Students with birth dates in the future' as description
FROM students
WHERE date_of_birth > CURRENT_DATE;

-- Check 10: Students with enrollment dates in future
SELECT 
    'STUDENTS_FUTURE_ENROLLMENT' as check_name,
    COUNT(*) as issue_count,
    'Students with enrollment dates in the future' as description
FROM students
WHERE enrollment_date > CURRENT_DATE;

-- Check 11: Orphaned audit records (created_by/updated_by without valid users)
SELECT 
    'ORPHANED_AUDIT_RECORDS' as check_name,
    COUNT(*) as issue_count,
    'Audit records with invalid created_by/updated_by references' as description
FROM (
    SELECT created_by FROM students WHERE created_by IS NOT NULL
    UNION
    SELECT updated_by FROM students WHERE updated_by IS NOT NULL
    UNION
    SELECT created_by FROM users WHERE created_by IS NOT NULL
    UNION
    SELECT updated_by FROM users WHERE updated_by IS NOT NULL
) audit_refs
WHERE audit_refs.created_by NOT IN (SELECT id FROM users);

-- Check 12: Data consistency across tenants
SELECT 
    'TENANT_DATA_CONSISTENCY' as check_name,
    COUNT(*) as issue_count,
    'Tenants with inconsistent data' as description
FROM tenants
WHERE (country_code = 'USA' AND timezone NOT LIKE 'America/%')
   OR (country_code = 'ESP' AND timezone NOT LIKE 'Europe/%')
   OR (country_code = 'IDN' AND timezone NOT LIKE 'Asia/%');

-- =============================================================================
-- SUMMARY REPORT
-- =============================================================================

-- Create a summary view of all integrity checks
CREATE OR REPLACE VIEW integrity_check_summary AS
WITH checks AS (
    -- Include all the above checks here (abbreviated for space)
    SELECT 'STUDENTS_WITHOUT_TENANT' as check_name, COUNT(*) as issue_count FROM students s LEFT JOIN tenants t ON s.tenant_id = t.id WHERE t.id IS NULL
    UNION ALL
    SELECT 'USERS_WITHOUT_TENANT', COUNT(*) FROM users u LEFT JOIN tenants t ON u.tenant_id = t.id WHERE t.id IS NULL
    UNION ALL
    SELECT 'DUPLICATE_STUDENT_IDS', COUNT(*) FROM (SELECT tenant_id, student_id, COUNT(*) as cnt FROM students GROUP BY tenant_id, student_id HAVING COUNT(*) > 1) duplicates
    UNION ALL
    SELECT 'DUPLICATE_USER_EMAILS', COUNT(*) FROM (SELECT tenant_id, email, COUNT(*) as cnt FROM users GROUP BY tenant_id, email HAVING COUNT(*) > 1) duplicates
    UNION ALL
    SELECT 'STUDENTS_MISSING_REQUIRED_FIELDS', COUNT(*) FROM students WHERE first_name IS NULL OR last_name IS NULL OR date_of_birth IS NULL OR student_id IS NULL
    UNION ALL
    SELECT 'USERS_MISSING_REQUIRED_FIELDS', COUNT(*) FROM users WHERE first_name IS NULL OR last_name IS NULL OR email IS NULL
    UNION ALL
    SELECT 'INVALID_EMAIL_FORMATS', COUNT(*) FROM users WHERE email NOT SIMILAR TO '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
    UNION ALL
    SELECT 'STUDENTS_FUTURE_BIRTH_DATE', COUNT(*) FROM students WHERE date_of_birth > CURRENT_DATE
    UNION ALL
    SELECT 'STUDENTS_FUTURE_ENROLLMENT', COUNT(*) FROM students WHERE enrollment_date > CURRENT_DATE
    UNION ALL
    SELECT 'TENANT_DATA_CONSISTENCY', COUNT(*) FROM tenants WHERE (country_code = 'USA' AND timezone NOT LIKE 'America/%') OR (country_code = 'ESP' AND timezone NOT LIKE 'Europe/%') OR (country_code = 'IDN' AND timezone NOT LIKE 'Asia/%')
)
SELECT 
    check_name,
    issue_count,
    CASE 
        WHEN issue_count = 0 THEN 'PASS'
        ELSE 'FAIL'
    END as status,
    CASE 
        WHEN issue_count = 0 THEN 'No issues found'
        ELSE CONCAT(issue_count::text, ' issues found')
    END as message
FROM checks
ORDER BY issue_count DESC, check_name;

-- Add comments for documentation
COMMENT ON VIEW integrity_check_summary IS 'Summary of all data integrity checks with pass/fail status';
