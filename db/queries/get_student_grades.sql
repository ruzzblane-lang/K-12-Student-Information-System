-- Query: Get student grades with course information
-- Description: Retrieves all grades for a specific student with course and assignment details
-- Parameters: student_id, term_id (optional)

SELECT 
    s.student_id,
    u.first_name,
    u.last_name,
    c.name as course_name,
    c.code as course_code,
    a.name as assignment_name,
    a.assignment_type,
    a.total_points,
    g.points_earned,
    g.percentage,
    g.letter_grade,
    g.feedback,
    g.graded_at,
    t.name as term_name
FROM students s
JOIN users u ON s.user_id = u.id
JOIN enrollments e ON s.id = e.student_id
JOIN course_sections cs ON e.course_section_id = cs.id
JOIN courses c ON cs.course_id = c.id
JOIN terms t ON cs.term_id = t.id
JOIN assignments a ON cs.id = a.course_section_id
JOIN grades g ON s.id = g.student_id AND a.id = g.assignment_id
WHERE s.id = $1
  AND ($2 IS NULL OR t.id = $2)
ORDER BY t.start_date DESC, c.name, a.due_date DESC;
