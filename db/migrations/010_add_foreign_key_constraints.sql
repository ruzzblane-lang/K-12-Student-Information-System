-- Migration: Add foreign key constraints for created_by columns
-- Description: Add foreign key constraints that were deferred until after users table creation
-- Created: 2024-01-15

-- Add foreign key constraint for tenants.created_by
-- This constraint was deferred in 001_create_tenants_table.sql
ALTER TABLE tenants 
ADD CONSTRAINT fk_tenants_created_by 
FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- Add foreign key constraint for users.created_by (self-reference)
-- This ensures created_by references a valid user within the same tenant
ALTER TABLE users 
ADD CONSTRAINT fk_users_created_by 
FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- Add foreign key constraint for students.created_by
ALTER TABLE students 
ADD CONSTRAINT fk_students_created_by 
FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- Add foreign key constraint for teachers.created_by (if exists)
-- This will be added when the teachers table is updated
-- ALTER TABLE teachers 
-- ADD CONSTRAINT fk_teachers_created_by 
-- FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- Add foreign key constraint for classes.created_by (if exists)
-- This will be added when the classes table is updated
-- ALTER TABLE classes 
-- ADD CONSTRAINT fk_classes_created_by 
-- FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- Add foreign key constraint for grades.created_by (if exists)
-- This will be added when the grades table is updated
-- ALTER TABLE grades 
-- ADD CONSTRAINT fk_grades_created_by 
-- FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- Add foreign key constraint for attendance.created_by (if exists)
-- This will be added when the attendance table is updated
-- ALTER TABLE attendance 
-- ADD CONSTRAINT fk_attendance_created_by 
-- FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- Add foreign key constraint for audit_logs.user_id (if exists)
-- This will be added when the audit_logs table is updated
-- ALTER TABLE audit_logs 
-- ADD CONSTRAINT fk_audit_logs_user_id 
-- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
