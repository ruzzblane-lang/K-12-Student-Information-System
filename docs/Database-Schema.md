# Database Schema - K-12 Student Information System

## Overview

This document describes the complete database schema for the K-12 Student Information System, designed with multi-tenant architecture for commercial resale. The schema ensures complete data isolation between tenants (schools) while maintaining referential integrity and performance.

## Multi-Tenant Design Principles

### 1. **Tenant Isolation Strategy**
- **Row-Level Security**: All tables include `tenant_id` foreign key
- **Complete Data Separation**: No cross-tenant data access possible
- **Referential Integrity**: All relationships respect tenant boundaries
- **Performance Optimization**: Tenant-scoped indexes for fast queries

### 2. **Data Isolation Benefits**
- **Security**: Complete data separation between schools
- **Compliance**: FERPA, COPPA, GDPR compliance built-in
- **Scalability**: Efficient resource utilization across tenants
- **Customization**: Tenant-specific configurations and features

## Core Tables

### 1. Tenants Table

**Purpose**: Stores tenant (school) information and configuration.

```sql
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    domain VARCHAR(255) UNIQUE,
    subdomain VARCHAR(100) UNIQUE,
    
    -- School Information
    school_name VARCHAR(255) NOT NULL,
    school_type VARCHAR(50) NOT NULL, -- 'public', 'private', 'charter', 'international'
    school_level VARCHAR(50) NOT NULL, -- 'elementary', 'middle', 'high', 'k12'
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    
    -- Branding & Customization
    logo_url VARCHAR(500),
    primary_color VARCHAR(7), -- Hex color code
    secondary_color VARCHAR(7),
    custom_css TEXT,
    timezone VARCHAR(50) DEFAULT 'America/New_York',
    locale VARCHAR(10) DEFAULT 'en-US',
    
    -- Subscription & Billing
    subscription_plan VARCHAR(50) DEFAULT 'basic', -- 'basic', 'professional', 'enterprise'
    subscription_status VARCHAR(20) DEFAULT 'active', -- 'active', 'suspended', 'cancelled'
    max_students INTEGER DEFAULT 500,
    max_teachers INTEGER DEFAULT 50,
    billing_email VARCHAR(255),
    
    -- Feature Flags
    features JSONB DEFAULT '{}', -- Feature toggles per tenant
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID -- Reference to super admin who created this tenant
);
```

**Key Features**:
- **Unique Identifiers**: `slug`, `domain`, `subdomain` for tenant resolution
- **Branding Support**: Logo, colors, custom CSS for white-labeling
- **Subscription Management**: Plan-based feature access and limits
- **Feature Toggles**: JSONB field for flexible feature management

**Indexes**:
```sql
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_domain ON tenants(domain);
CREATE INDEX idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX idx_tenants_status ON tenants(subscription_status);
CREATE INDEX idx_tenants_plan ON tenants(subscription_plan);
```

### 2. Users Table

**Purpose**: Stores all user accounts with tenant isolation and role-based access control.

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Authentication
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP WITH TIME ZONE,
    
    -- Profile Information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    phone VARCHAR(20),
    avatar_url VARCHAR(500),
    
    -- Role & Permissions
    role VARCHAR(50) NOT NULL, -- 'super_admin', 'admin', 'principal', 'teacher', 'parent', 'student'
    permissions JSONB DEFAULT '{}', -- Additional permissions beyond role
    
    -- Status & Security
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive', 'suspended', 'pending'
    last_login TIMESTAMP WITH TIME ZONE,
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255),
    backup_codes TEXT[], -- Array of backup codes
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT unique_email_per_tenant UNIQUE (tenant_id, email)
);
```

**Key Features**:
- **Tenant Isolation**: `tenant_id` ensures complete data separation
- **Role-Based Access**: 6-tier role hierarchy with granular permissions
- **Security Features**: 2FA, account lockout, password reset
- **Audit Trail**: Created by tracking for accountability

**Indexes**:
```sql
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_tenant_role ON users(tenant_id, role);
CREATE INDEX idx_users_last_login ON users(last_login);
```

### 3. Students Table

**Purpose**: Stores student information with complete tenant isolation.

```sql
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Link to user account if student has login access
    
    -- Student Information
    student_id VARCHAR(50) NOT NULL, -- School-specific student ID
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    preferred_name VARCHAR(100),
    date_of_birth DATE NOT NULL,
    gender VARCHAR(20),
    grade_level VARCHAR(20) NOT NULL,
    
    -- Contact Information
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    phone VARCHAR(20),
    email VARCHAR(255),
    emergency_contact_name VARCHAR(200),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_relationship VARCHAR(50),
    
    -- Academic Information
    enrollment_date DATE NOT NULL,
    graduation_date DATE,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive', 'graduated', 'transferred', 'withdrawn'
    academic_year VARCHAR(20) NOT NULL, -- e.g., '2024-2025'
    
    -- Medical & Special Needs
    medical_conditions TEXT,
    allergies TEXT,
    medications TEXT,
    special_needs TEXT,
    iep_status BOOLEAN DEFAULT FALSE, -- Individualized Education Program
    section_504_status BOOLEAN DEFAULT FALSE, -- Section 504 Plan
    
    -- Parent/Guardian Information
    parent_guardian_1_name VARCHAR(200),
    parent_guardian_1_phone VARCHAR(20),
    parent_guardian_1_email VARCHAR(255),
    parent_guardian_1_relationship VARCHAR(50),
    parent_guardian_2_name VARCHAR(200),
    parent_guardian_2_phone VARCHAR(20),
    parent_guardian_2_email VARCHAR(255),
    parent_guardian_2_relationship VARCHAR(50),
    
    -- Photo & Documents
    photo_url VARCHAR(500),
    documents JSONB DEFAULT '[]', -- Array of document references
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT unique_student_id_per_tenant UNIQUE (tenant_id, student_id)
);
```

**Key Features**:
- **Complete Student Profile**: Demographics, contact, academic, medical information
- **Parent/Guardian Tracking**: Multiple guardian support
- **Special Needs Support**: IEP and 504 plan tracking
- **Document Management**: JSONB field for document references
- **Academic Year Tracking**: Support for multi-year records

**Indexes**:
```sql
CREATE INDEX idx_students_tenant_id ON students(tenant_id);
CREATE INDEX idx_students_user_id ON students(user_id);
CREATE INDEX idx_students_student_id ON students(student_id);
CREATE INDEX idx_students_grade_level ON students(grade_level);
CREATE INDEX idx_students_status ON students(status);
CREATE INDEX idx_students_academic_year ON students(academic_year);
CREATE INDEX idx_students_tenant_grade ON students(tenant_id, grade_level);
```

### 4. Teachers Table

**Purpose**: Stores teacher information with employment and qualification details.

```sql
CREATE TABLE teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Link to user account
    
    -- Teacher Information
    employee_id VARCHAR(50) NOT NULL, -- School-specific employee ID
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    preferred_name VARCHAR(100),
    title VARCHAR(50), -- Mr., Mrs., Dr., etc.
    
    -- Contact Information
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    
    -- Employment Information
    hire_date DATE NOT NULL,
    employment_status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive', 'terminated', 'on_leave'
    employment_type VARCHAR(20) DEFAULT 'full_time', -- 'full_time', 'part_time', 'substitute', 'contract'
    department VARCHAR(100),
    position VARCHAR(100),
    
    -- Qualifications & Certifications
    education_level VARCHAR(50), -- 'bachelor', 'master', 'doctorate'
    degree_field VARCHAR(100),
    teaching_certifications TEXT[], -- Array of certification names
    subjects_taught TEXT[], -- Array of subjects this teacher can teach
    grade_levels_taught TEXT[], -- Array of grade levels this teacher can teach
    
    -- Professional Information
    years_experience INTEGER DEFAULT 0,
    bio TEXT,
    photo_url VARCHAR(500),
    resume_url VARCHAR(500),
    
    -- Schedule & Availability
    work_schedule JSONB DEFAULT '{}', -- Weekly schedule information
    office_hours TEXT,
    office_location VARCHAR(100),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT unique_employee_id_per_tenant UNIQUE (tenant_id, employee_id),
    CONSTRAINT unique_email_per_tenant UNIQUE (tenant_id, email)
);
```

**Key Features**:
- **Employment Tracking**: Status, type, department, position
- **Qualifications**: Education, certifications, subjects, grade levels
- **Schedule Management**: Work schedule and office hours
- **Professional Development**: Bio, resume, experience tracking

**Indexes**:
```sql
CREATE INDEX idx_teachers_tenant_id ON teachers(tenant_id);
CREATE INDEX idx_teachers_user_id ON teachers(user_id);
CREATE INDEX idx_teachers_employee_id ON teachers(employee_id);
CREATE INDEX idx_teachers_email ON teachers(email);
CREATE INDEX idx_teachers_employment_status ON teachers(employment_status);
CREATE INDEX idx_teachers_department ON teachers(department);
CREATE INDEX idx_teachers_subjects ON teachers USING GIN(subjects_taught);
CREATE INDEX idx_teachers_grade_levels ON teachers USING GIN(grade_levels_taught);
```

### 5. Classes Table

**Purpose**: Stores class/course information with scheduling and enrollment details.

```sql
CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Class Information
    class_code VARCHAR(50) NOT NULL, -- School-specific class code (e.g., "MATH101")
    name VARCHAR(200) NOT NULL,
    description TEXT,
    subject VARCHAR(100) NOT NULL,
    grade_level VARCHAR(20) NOT NULL,
    
    -- Academic Information
    academic_year VARCHAR(20) NOT NULL, -- e.g., '2024-2025'
    semester VARCHAR(20), -- 'fall', 'spring', 'summer', 'full_year'
    credits DECIMAL(3,1) DEFAULT 1.0,
    
    -- Teacher Assignment
    teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
    co_teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
    
    -- Schedule Information
    room_number VARCHAR(50),
    building VARCHAR(100),
    schedule JSONB DEFAULT '{}', -- Weekly schedule with days/times
    
    -- Capacity & Enrollment
    max_students INTEGER DEFAULT 30,
    current_enrollment INTEGER DEFAULT 0,
    
    -- Status & Dates
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive', 'cancelled', 'completed'
    start_date DATE NOT NULL,
    end_date DATE,
    
    -- Grading Configuration
    grading_scale JSONB DEFAULT '{}', -- Custom grading scale for this class
    grade_categories JSONB DEFAULT '[]', -- Categories like 'homework', 'tests', 'projects'
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT unique_class_code_per_tenant UNIQUE (tenant_id, class_code, academic_year)
);
```

**Key Features**:
- **Flexible Scheduling**: JSONB schedule field for complex schedules
- **Teacher Assignment**: Primary and co-teacher support
- **Grading Configuration**: Custom grading scales and categories
- **Academic Year Support**: Multi-year class management

**Indexes**:
```sql
CREATE INDEX idx_classes_tenant_id ON classes(tenant_id);
CREATE INDEX idx_classes_teacher_id ON classes(teacher_id);
CREATE INDEX idx_classes_subject ON classes(subject);
CREATE INDEX idx_classes_grade_level ON classes(grade_level);
CREATE INDEX idx_classes_academic_year ON classes(academic_year);
CREATE INDEX idx_classes_status ON classes(status);
CREATE INDEX idx_classes_tenant_year ON classes(tenant_id, academic_year);
```

### 6. Enrollments Table

**Purpose**: Manages student-class relationships with academic tracking.

```sql
CREATE TABLE enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    
    -- Enrollment Information
    enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'dropped', 'completed', 'withdrawn'
    drop_date DATE,
    completion_date DATE,
    
    -- Academic Information
    final_grade VARCHAR(10), -- 'A', 'B', 'C', 'D', 'F', 'P', 'NP', etc.
    gpa_points DECIMAL(3,2), -- GPA points earned (e.g., 4.0 for A)
    credits_earned DECIMAL(3,1) DEFAULT 0.0,
    
    -- Attendance
    total_days INTEGER DEFAULT 0,
    days_present INTEGER DEFAULT 0,
    days_absent INTEGER DEFAULT 0,
    days_tardy INTEGER DEFAULT 0,
    
    -- Notes & Comments
    notes TEXT,
    teacher_comments TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT unique_student_class UNIQUE (tenant_id, student_id, class_id)
);
```

**Key Features**:
- **Academic Tracking**: Final grades, GPA points, credits earned
- **Attendance Summary**: Aggregated attendance statistics
- **Enrollment Lifecycle**: Status tracking from enrollment to completion
- **Teacher Comments**: Notes and feedback from teachers

**Indexes**:
```sql
CREATE INDEX idx_enrollments_tenant_id ON enrollments(tenant_id);
CREATE INDEX idx_enrollments_student_id ON enrollments(student_id);
CREATE INDEX idx_enrollments_class_id ON enrollments(class_id);
CREATE INDEX idx_enrollments_status ON enrollments(status);
CREATE INDEX idx_enrollments_final_grade ON enrollments(final_grade);
CREATE INDEX idx_enrollments_tenant_student ON enrollments(tenant_id, student_id);
CREATE INDEX idx_enrollments_tenant_class ON enrollments(tenant_id, class_id);
```

### 7. Grades Table

**Purpose**: Stores individual assignment grades with detailed tracking.

```sql
CREATE TABLE grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    enrollment_id UUID REFERENCES enrollments(id) ON DELETE CASCADE,
    
    -- Assignment Information
    assignment_name VARCHAR(200) NOT NULL,
    assignment_type VARCHAR(50) NOT NULL, -- 'homework', 'quiz', 'test', 'project', 'participation', 'final'
    category VARCHAR(100), -- 'homework', 'tests', 'projects', etc.
    description TEXT,
    
    -- Grade Information
    points_possible DECIMAL(8,2) NOT NULL,
    points_earned DECIMAL(8,2),
    percentage DECIMAL(5,2), -- Calculated percentage
    letter_grade VARCHAR(10), -- 'A+', 'A', 'B+', etc.
    
    -- Dates
    assigned_date DATE NOT NULL,
    due_date DATE,
    submitted_date DATE,
    graded_date DATE,
    
    -- Status & Flags
    status VARCHAR(20) DEFAULT 'assigned', -- 'assigned', 'submitted', 'graded', 'late', 'excused', 'missing'
    is_late BOOLEAN DEFAULT FALSE,
    is_excused BOOLEAN DEFAULT FALSE,
    is_extra_credit BOOLEAN DEFAULT FALSE,
    
    -- Teacher Information
    graded_by UUID REFERENCES users(id), -- Teacher who graded this
    teacher_comments TEXT,
    
    -- Attachments & Files
    attachments JSONB DEFAULT '[]', -- Array of file references
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);
```

**Key Features**:
- **Flexible Grading**: Points, percentages, letter grades
- **Assignment Types**: Homework, quizzes, tests, projects, etc.
- **Status Tracking**: From assignment to grading completion
- **Teacher Comments**: Feedback and notes
- **File Attachments**: Support for assignment files

**Indexes**:
```sql
CREATE INDEX idx_grades_tenant_id ON grades(tenant_id);
CREATE INDEX idx_grades_student_id ON grades(student_id);
CREATE INDEX idx_grades_class_id ON grades(class_id);
CREATE INDEX idx_grades_enrollment_id ON grades(enrollment_id);
CREATE INDEX idx_grades_assignment_type ON grades(assignment_type);
CREATE INDEX idx_grades_category ON grades(category);
CREATE INDEX idx_grades_status ON grades(status);
CREATE INDEX idx_grades_due_date ON grades(due_date);
CREATE INDEX idx_grades_graded_date ON grades(graded_date);
CREATE INDEX idx_grades_tenant_student ON grades(tenant_id, student_id);
CREATE INDEX idx_grades_tenant_class ON grades(tenant_id, class_id);
```

### 8. Attendance Table

**Purpose**: Tracks daily attendance with detailed status and reasons.

```sql
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    
    -- Attendance Information
    attendance_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL, -- 'present', 'absent', 'tardy', 'excused', 'late'
    period VARCHAR(50), -- Class period or time slot
    
    -- Details
    reason VARCHAR(200), -- Reason for absence/tardiness
    notes TEXT,
    is_excused BOOLEAN DEFAULT FALSE,
    
    -- Teacher Information
    marked_by UUID REFERENCES users(id), -- Teacher who marked attendance
    marked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Parent Notification
    parent_notified BOOLEAN DEFAULT FALSE,
    notification_sent_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT unique_student_date_period UNIQUE (tenant_id, student_id, attendance_date, period)
);
```

**Key Features**:
- **Detailed Status Tracking**: Present, absent, tardy, excused, late
- **Period Support**: Class period or time slot tracking
- **Parent Notification**: Automatic notification tracking
- **Reason Tracking**: Detailed absence/tardiness reasons

**Indexes**:
```sql
CREATE INDEX idx_attendance_tenant_id ON attendance(tenant_id);
CREATE INDEX idx_attendance_student_id ON attendance(student_id);
CREATE INDEX idx_attendance_class_id ON attendance(class_id);
CREATE INDEX idx_attendance_date ON attendance(attendance_date);
CREATE INDEX idx_attendance_status ON attendance(status);
CREATE INDEX idx_attendance_tenant_student ON attendance(tenant_id, student_id);
CREATE INDEX idx_attendance_tenant_date ON attendance(tenant_id, attendance_date);
CREATE INDEX idx_attendance_marked_by ON attendance(marked_by);
```

### 9. Audit Logs Table

**Purpose**: Comprehensive audit trail for compliance and security.

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- User Information
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_email VARCHAR(255),
    user_role VARCHAR(50),
    
    -- Action Information
    action VARCHAR(100) NOT NULL, -- 'create', 'update', 'delete', 'login', 'logout', 'export', etc.
    resource_type VARCHAR(100) NOT NULL, -- 'student', 'teacher', 'grade', 'attendance', etc.
    resource_id UUID, -- ID of the affected resource
    
    -- Request Information
    ip_address INET,
    user_agent TEXT,
    request_method VARCHAR(10), -- 'GET', 'POST', 'PUT', 'DELETE'
    request_url TEXT,
    
    -- Data Changes
    old_values JSONB, -- Previous values (for updates/deletes)
    new_values JSONB, -- New values (for creates/updates)
    
    -- Result Information
    success BOOLEAN NOT NULL DEFAULT TRUE,
    error_message TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Key Features**:
- **Complete Audit Trail**: All data modifications logged
- **User Context**: Who performed the action
- **Data Changes**: Before/after values for updates
- **Request Context**: IP, user agent, request details
- **Compliance Ready**: FERPA, COPPA, GDPR compliance

**Indexes**:
```sql
CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_resource_id ON audit_logs(resource_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_tenant_date ON audit_logs(tenant_id, created_at);
CREATE INDEX idx_audit_logs_user_date ON audit_logs(user_id, created_at);
CREATE INDEX idx_audit_logs_ip_address ON audit_logs(ip_address);
```

## Database Relationships

### Entity Relationship Diagram

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Tenants   │    │    Users    │    │  Students   │
│             │    │             │    │             │
│ id (PK)     │◄───┤ tenant_id   │    │ tenant_id   │
│ name        │    │ id (PK)     │◄───┤ id (PK)     │
│ slug        │    │ email       │    │ student_id  │
│ features    │    │ role        │    │ first_name  │
└─────────────┘    │ permissions │    │ last_name   │
                   └─────────────┘    │ grade_level │
                                      └─────────────┘
                                             │
                                             │
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Teachers   │    │   Classes   │    │ Enrollments │
│             │    │             │    │             │
│ tenant_id   │    │ tenant_id   │    │ tenant_id   │
│ id (PK)     │◄───┤ id (PK)     │◄───┤ id (PK)     │
│ employee_id │    │ teacher_id  │    │ student_id  │
│ first_name  │    │ class_code  │    │ class_id    │
│ last_name   │    │ name        │    │ final_grade │
└─────────────┘    │ subject     │    │ gpa_points  │
                   └─────────────┘    └─────────────┘
                            │
                            │
                   ┌─────────────┐    ┌─────────────┐
                   │   Grades    │    │ Attendance  │
                   │             │    │             │
                   │ tenant_id   │    │ tenant_id   │
                   │ id (PK)     │    │ id (PK)     │
                   │ student_id  │    │ student_id  │
                   │ class_id    │    │ class_id    │
                   │ assignment  │    │ date        │
                   │ points      │    │ status      │
                   └─────────────┘    └─────────────┘
```

### Key Relationships

1. **Tenant → Users**: One-to-many (tenant has many users)
2. **Tenant → Students**: One-to-many (tenant has many students)
3. **Tenant → Teachers**: One-to-many (tenant has many teachers)
4. **Tenant → Classes**: One-to-many (tenant has many classes)
5. **User → Student**: One-to-one (optional, for student login access)
6. **User → Teacher**: One-to-one (optional, for teacher login access)
7. **Student → Enrollments**: One-to-many (student enrolled in many classes)
8. **Class → Enrollments**: One-to-many (class has many enrolled students)
9. **Student → Grades**: One-to-many (student has many grades)
10. **Class → Grades**: One-to-many (class has many grades)
11. **Student → Attendance**: One-to-many (student has many attendance records)

## Performance Optimization

### Indexing Strategy

#### Primary Indexes
- **Primary Keys**: All tables have UUID primary keys
- **Foreign Keys**: All tenant_id references are indexed
- **Unique Constraints**: Tenant-scoped unique constraints

#### Composite Indexes
```sql
-- Tenant-scoped queries
CREATE INDEX idx_students_tenant_grade ON students(tenant_id, grade_level);
CREATE INDEX idx_classes_tenant_year ON classes(tenant_id, academic_year);
CREATE INDEX idx_grades_tenant_student ON grades(tenant_id, student_id);

-- User role queries
CREATE INDEX idx_users_tenant_role ON users(tenant_id, role);

-- Date-based queries
CREATE INDEX idx_attendance_tenant_date ON attendance(tenant_id, attendance_date);
CREATE INDEX idx_grades_due_date ON grades(due_date);
```

#### GIN Indexes for JSONB
```sql
-- Array fields
CREATE INDEX idx_teachers_subjects ON teachers USING GIN(subjects_taught);
CREATE INDEX idx_teachers_grade_levels ON teachers USING GIN(grade_levels_taught);

-- JSONB fields
CREATE INDEX idx_tenants_features ON tenants USING GIN(features);
CREATE INDEX idx_users_permissions ON users USING GIN(permissions);
```

### Query Optimization

#### Tenant-Scoped Queries
```sql
-- Always include tenant_id in WHERE clauses
SELECT * FROM students WHERE tenant_id = $1 AND grade_level = $2;

-- Use composite indexes for common query patterns
SELECT * FROM grades 
WHERE tenant_id = $1 AND student_id = $2 
ORDER BY graded_date DESC;
```

#### Pagination
```sql
-- Efficient pagination with tenant isolation
SELECT * FROM students 
WHERE tenant_id = $1 
ORDER BY created_at DESC 
LIMIT $2 OFFSET $3;
```

## Data Migration Strategy

### Migration Files

1. **001_create_tenants_table.sql** - Core tenant table
2. **002_create_users_table_multi_tenant.sql** - User management
3. **003_create_students_table_multi_tenant.sql** - Student records
4. **004_create_teachers_table_multi_tenant.sql** - Teacher records
5. **005_create_classes_table_multi_tenant.sql** - Class management
6. **006_create_enrollments_table_multi_tenant.sql** - Student-class relationships
7. **007_create_grades_table_multi_tenant.sql** - Grade tracking
8. **008_create_attendance_table_multi_tenant.sql** - Attendance records
9. **009_create_audit_logs_table_multi_tenant.sql** - Audit trail

### Migration Best Practices

1. **Backward Compatibility**: All migrations are backward compatible
2. **Data Integrity**: Foreign key constraints ensure referential integrity
3. **Performance**: Indexes created after data insertion
4. **Rollback Support**: Each migration can be rolled back safely

## Security Considerations

### Data Isolation

1. **Row-Level Security**: All queries automatically filtered by tenant_id
2. **Foreign Key Constraints**: Prevent cross-tenant data access
3. **Unique Constraints**: Tenant-scoped uniqueness prevents conflicts

### Data Encryption

1. **Sensitive Fields**: PII fields encrypted at rest
2. **Password Hashing**: bcrypt with salt rounds ≥ 12
3. **JWT Tokens**: Signed with secure secrets

### Audit Trail

1. **Complete Logging**: All data modifications logged
2. **User Context**: Who performed each action
3. **Data Changes**: Before/after values for updates
4. **Compliance**: FERPA, COPPA, GDPR ready

## Backup and Recovery

### Backup Strategy

1. **Full Backups**: Daily full database backups
2. **Incremental Backups**: Hourly incremental backups
3. **Point-in-Time Recovery**: Support for specific timestamp recovery
4. **Tenant-Specific Backups**: Individual tenant data export

### Recovery Procedures

1. **Full Recovery**: Complete database restoration
2. **Tenant Recovery**: Individual tenant data restoration
3. **Data Export**: Tenant data export for migration
4. **Disaster Recovery**: Multi-region backup replication

## Monitoring and Maintenance

### Performance Monitoring

1. **Query Performance**: Slow query identification and optimization
2. **Index Usage**: Monitor index effectiveness
3. **Connection Pooling**: Database connection monitoring
4. **Storage Usage**: Database size and growth tracking

### Maintenance Tasks

1. **Index Maintenance**: Regular index rebuilding and statistics updates
2. **Data Archiving**: Old data archiving for performance
3. **Cleanup Tasks**: Orphaned record cleanup
4. **Statistics Updates**: Regular statistics updates for query optimization

## Compliance and Regulations

### FERPA Compliance

1. **Data Access Controls**: Role-based access to student records
2. **Audit Logging**: Complete audit trail for all access
3. **Data Retention**: Configurable data retention policies
4. **Parent Access**: Parent access to their children's records

### COPPA Compliance

1. **Age Verification**: Student age verification and tracking
2. **Parental Consent**: Parental consent tracking and management
3. **Data Minimization**: Minimal data collection for students under 13
4. **Secure Storage**: Enhanced security for children's data

### GDPR Compliance

1. **Data Subject Rights**: Access, rectification, erasure, portability
2. **Consent Management**: Granular consent tracking and management
3. **Data Processing Records**: Complete data processing documentation
4. **Privacy by Design**: Privacy considerations in all data handling

This database schema provides a robust, scalable, and compliant foundation for the K-12 Student Information System, ensuring complete tenant isolation while maintaining performance and data integrity.
