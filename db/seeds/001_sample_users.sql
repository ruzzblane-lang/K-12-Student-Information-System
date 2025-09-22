-- Seed: Sample users data
-- Description: Insert sample users for testing and development
-- Created: 2024-10-01

-- Sample admin user
INSERT INTO users (email, password_hash, role, first_name, last_name, phone, is_active, email_verified) VALUES
('admin@schoolsis.com', '$2b$10$example_hash_admin', 'admin', 'John', 'Administrator', '+1234567890', true, true);

-- Sample teachers
INSERT INTO users (email, password_hash, role, first_name, last_name, phone, is_active, email_verified) VALUES
('teacher1@schoolsis.com', '$2b$10$example_hash_teacher1', 'teacher', 'Sarah', 'Johnson', '+1234567891', true, true),
('teacher2@schoolsis.com', '$2b$10$example_hash_teacher2', 'teacher', 'Michael', 'Smith', '+1234567892', true, true);

-- Sample students
INSERT INTO users (email, password_hash, role, first_name, last_name, phone, date_of_birth, is_active, email_verified) VALUES
('student1@schoolsis.com', '$2b$10$example_hash_student1', 'student', 'Emma', 'Wilson', '+1234567893', '2005-03-15', true, true),
('student2@schoolsis.com', '$2b$10$example_hash_student2', 'student', 'James', 'Brown', '+1234567894', '2005-07-22', true, true);

-- Sample parents
INSERT INTO users (email, password_hash, role, first_name, last_name, phone, is_active, email_verified) VALUES
('parent1@schoolsis.com', '$2b$10$example_hash_parent1', 'parent', 'Robert', 'Wilson', '+1234567895', true, true),
('parent2@schoolsis.com', '$2b$10$example_hash_parent2', 'parent', 'Lisa', 'Brown', '+1234567896', true, true);
