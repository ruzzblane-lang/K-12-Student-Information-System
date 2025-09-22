# Entity Relationship Diagram (ERD)

## Database Schema Overview

The School SIS database is designed with a normalized structure to ensure data integrity and minimize redundancy. The schema supports multiple user roles, academic management, and comprehensive reporting capabilities.

## Core Entities

### 1. Users and Authentication

#### `users` Table
```sql
- id (Primary Key, UUID)
- email (Unique, String)
- password_hash (String)
- role (Enum: student, teacher, parent, admin)
- first_name (String)
- last_name (String)
- phone (String, Optional)
- address (Text, Optional)
- date_of_birth (Date, Optional)
- profile_image_url (String, Optional)
- is_active (Boolean, Default: true)
- email_verified (Boolean, Default: false)
- created_at (Timestamp)
- updated_at (Timestamp)
```

#### `user_sessions` Table
```sql
- id (Primary Key, UUID)
- user_id (Foreign Key → users.id)
- token_hash (String)
- expires_at (Timestamp)
- created_at (Timestamp)
```

### 2. Academic Structure

#### `academic_years` Table
```sql
- id (Primary Key, UUID)
- name (String, e.g., "2024-2025")
- start_date (Date)
- end_date (Date)
- is_current (Boolean, Default: false)
- created_at (Timestamp)
- updated_at (Timestamp)
```

#### `terms` Table
```sql
- id (Primary Key, UUID)
- academic_year_id (Foreign Key → academic_years.id)
- name (String, e.g., "Fall 2024")
- start_date (Date)
- end_date (Date)
- is_current (Boolean, Default: false)
- created_at (Timestamp)
- updated_at (Timestamp)
```

#### `grades` Table (Academic Levels)
```sql
- id (Primary Key, UUID)
- name (String, e.g., "Grade 9", "Grade 10")
- level (Integer, e.g., 9, 10)
- description (Text, Optional)
- created_at (Timestamp)
- updated_at (Timestamp)
```

### 3. Student Management

#### `students` Table
```sql
- id (Primary Key, UUID)
- user_id (Foreign Key → users.id)
- student_id (String, Unique, e.g., "STU2024001")
- enrollment_date (Date)
- graduation_date (Date, Optional)
- status (Enum: active, graduated, transferred, suspended)
- emergency_contact_name (String)
- emergency_contact_phone (String)
- medical_info (Text, Optional)
- created_at (Timestamp)
- updated_at (Timestamp)
```

#### `student_guardians` Table
```sql
- id (Primary Key, UUID)
- student_id (Foreign Key → students.id)
- guardian_id (Foreign Key → users.id)
- relationship (Enum: parent, guardian, emergency_contact)
- is_primary (Boolean, Default: false)
- created_at (Timestamp)
```

### 4. Teacher Management

#### `teachers` Table
```sql
- id (Primary Key, UUID)
- user_id (Foreign Key → users.id)
- employee_id (String, Unique, e.g., "TCH2024001")
- hire_date (Date)
- department (String)
- specialization (String, Optional)
- qualifications (Text, Optional)
- status (Enum: active, inactive, on_leave)
- created_at (Timestamp)
- updated_at (Timestamp)
```

### 5. Course Management

#### `subjects` Table
```sql
- id (Primary Key, UUID)
- name (String, e.g., "Mathematics", "English")
- code (String, Unique, e.g., "MATH101")
- description (Text, Optional)
- credits (Integer)
- is_active (Boolean, Default: true)
- created_at (Timestamp)
- updated_at (Timestamp)
```

#### `courses` Table
```sql
- id (Primary Key, UUID)
- subject_id (Foreign Key → subjects.id)
- grade_id (Foreign Key → grades.id)
- name (String, e.g., "Algebra I")
- code (String, Unique, e.g., "ALG101")
- description (Text, Optional)
- credits (Integer)
- prerequisites (Text, Optional)
- is_active (Boolean, Default: true)
- created_at (Timestamp)
- updated_at (Timestamp)
```

#### `course_sections` Table
```sql
- id (Primary Key, UUID)
- course_id (Foreign Key → courses.id)
- teacher_id (Foreign Key → teachers.id)
- term_id (Foreign Key → terms.id)
- section_name (String, e.g., "Section A")
- room_number (String, Optional)
- schedule (JSON, e.g., {"days": ["Mon", "Wed", "Fri"], "time": "09:00-10:00"})
- max_students (Integer)
- current_enrollment (Integer, Default: 0)
- is_active (Boolean, Default: true)
- created_at (Timestamp)
- updated_at (Timestamp)
```

### 6. Enrollment and Attendance

#### `enrollments` Table
```sql
- id (Primary Key, UUID)
- student_id (Foreign Key → students.id)
- course_section_id (Foreign Key → course_sections.id)
- enrollment_date (Date)
- status (Enum: enrolled, dropped, completed)
- final_grade (String, Optional)
- created_at (Timestamp)
- updated_at (Timestamp)
```

#### `attendance` Table
```sql
- id (Primary Key, UUID)
- student_id (Foreign Key → students.id)
- course_section_id (Foreign Key → course_sections.id)
- date (Date)
- status (Enum: present, absent, late, excused)
- notes (Text, Optional)
- recorded_by (Foreign Key → users.id)
- created_at (Timestamp)
- updated_at (Timestamp)
```

### 7. Grading System

#### `assignments` Table
```sql
- id (Primary Key, UUID)
- course_section_id (Foreign Key → course_sections.id)
- name (String)
- description (Text, Optional)
- assignment_type (Enum: homework, quiz, test, project, exam)
- total_points (Decimal)
- due_date (Date)
- weight (Decimal, percentage of final grade)
- is_published (Boolean, Default: false)
- created_at (Timestamp)
- updated_at (Timestamp)
```

#### `grades` Table (Student Grades)
```sql
- id (Primary Key, UUID)
- student_id (Foreign Key → students.id)
- assignment_id (Foreign Key → assignments.id)
- points_earned (Decimal)
- percentage (Decimal)
- letter_grade (String, Optional)
- feedback (Text, Optional)
- graded_by (Foreign Key → users.id)
- graded_at (Timestamp)
- created_at (Timestamp)
- updated_at (Timestamp)
```

### 8. Communication and Notifications

#### `announcements` Table
```sql
- id (Primary Key, UUID)
- title (String)
- content (Text)
- author_id (Foreign Key → users.id)
- target_audience (Enum: all, students, teachers, parents, specific_grade)
- target_grade_id (Foreign Key → grades.id, Optional)
- is_published (Boolean, Default: false)
- published_at (Timestamp, Optional)
- expires_at (Timestamp, Optional)
- created_at (Timestamp)
- updated_at (Timestamp)
```

#### `messages` Table
```sql
- id (Primary Key, UUID)
- sender_id (Foreign Key → users.id)
- recipient_id (Foreign Key → users.id)
- subject (String)
- content (Text)
- is_read (Boolean, Default: false)
- read_at (Timestamp, Optional)
- created_at (Timestamp)
```

## Relationships Summary

### One-to-Many Relationships
- `academic_years` → `terms`
- `users` → `students` (1:1)
- `users` → `teachers` (1:1)
- `users` → `user_sessions`
- `students` → `student_guardians`
- `students` → `enrollments`
- `students` → `attendance`
- `students` → `grades`
- `teachers` → `course_sections`
- `subjects` → `courses`
- `grades` → `courses`
- `courses` → `course_sections`
- `course_sections` → `enrollments`
- `course_sections` → `attendance`
- `course_sections` → `assignments`
- `assignments` → `grades`

### Many-to-Many Relationships
- `students` ↔ `course_sections` (through `enrollments`)
- `students` ↔ `guardians` (through `student_guardians`)

## Indexes for Performance

### Primary Indexes
- All primary keys (automatic)
- All foreign keys
- Unique constraints (email, student_id, employee_id, course codes)

### Composite Indexes
- `(student_id, course_section_id, date)` on `attendance`
- `(student_id, assignment_id)` on `grades`
- `(course_section_id, due_date)` on `assignments`
- `(term_id, is_active)` on `course_sections`

## Data Integrity Constraints

### Check Constraints
- `total_points > 0` on `assignments`
- `points_earned >= 0` on `grades`
- `percentage BETWEEN 0 AND 100` on `grades`
- `start_date < end_date` on `academic_years` and `terms`
- `current_enrollment <= max_students` on `course_sections`

### Foreign Key Constraints
- All foreign keys have proper CASCADE or RESTRICT rules
- Soft deletes for critical entities (users, students, teachers)

## Sample Queries

### Common Reporting Queries
```sql
-- Student grade report
SELECT s.student_id, u.first_name, u.last_name, 
       c.name as course, a.name as assignment, 
       g.points_earned, g.percentage, g.letter_grade
FROM students s
JOIN users u ON s.user_id = u.id
JOIN enrollments e ON s.id = e.student_id
JOIN course_sections cs ON e.course_section_id = cs.id
JOIN courses c ON cs.course_id = c.id
JOIN assignments a ON cs.id = a.course_section_id
JOIN grades g ON s.id = g.student_id AND a.id = g.assignment_id
WHERE s.id = ? AND cs.term_id = ?;

-- Attendance summary
SELECT s.student_id, u.first_name, u.last_name,
       COUNT(*) as total_days,
       SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_days,
       SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_days
FROM students s
JOIN users u ON s.user_id = u.id
JOIN attendance a ON s.id = a.student_id
WHERE a.course_section_id = ? AND a.date BETWEEN ? AND ?
GROUP BY s.id, s.student_id, u.first_name, u.last_name;
```
