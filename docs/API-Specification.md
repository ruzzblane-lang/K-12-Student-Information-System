# API Specification - K-12 Student Information System

## Overview

This document provides comprehensive API specifications for the K-12 Student Information System backend. The API is designed as a multi-tenant RESTful service that can be fully tested and used without any frontend components.

## Base Information

- **Base URL**: `https://api.sisplatform.com/v1` (Production)
- **Development URL**: `http://localhost:3000/api` (Local Development)
- **API Version**: v1
- **Content Type**: `application/json`
- **Authentication**: JWT Bearer Token

## Authentication

### JWT Token Authentication

All API endpoints (except public ones) require authentication via JWT Bearer token.

```http
Authorization: Bearer <jwt-token>
```

### Token Types

1. **Access Token**: Short-lived (15 minutes), used for API requests
2. **Refresh Token**: Long-lived (7 days), used to obtain new access tokens

### Multi-Tenant Context

The API automatically resolves tenant context through:

1. **Subdomain**: `https://springfield.sisplatform.com/api/students`
2. **Custom Domain**: `https://sis.springfield.edu/api/students`
3. **Header**: `X-Tenant-ID: tenant-uuid` or `X-Tenant-Slug: springfield`
4. **JWT Token**: Contains `tenantId` claim

## White-Labeling API

### Base URL: `/api/white-labeling`

The white-labeling API provides comprehensive branding and customization capabilities for tenants.

#### Get Branding Configuration
```http
GET /api/white-labeling/branding
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tenant_id": "uuid",
    "name": "Springfield High School",
    "school_name": "Springfield High School",
    "domain": "springfield.sisplatform.com",
    "subdomain": "springfield",
    "logo_url": "https://cdn.example.com/springfield-logo.png",
    "colors": {
      "primary": "#1e40af",
      "secondary": "#3b82f6",
      "header_background": "#ffffff",
      "footer_background": "#f8fafc",
      "text": "#1f2937",
      "link": "#3b82f6",
      "button": "#1e40af",
      "button_text": "#ffffff",
      "accent": "#10b981",
      "border": "#e5e7eb"
    },
    "typography": {
      "font_family": "Inter, system-ui, sans-serif",
      "font_size_base": "16px"
    },
    "custom_content": {
      "footer_text": "© 2024 Springfield High School. All rights reserved.",
      "welcome_message": "Welcome to Springfield High School Portal!",
      "login_message": "Please sign in to access your student account."
    },
    "white_label_config": {
      "enabled": true,
      "level": "advanced",
      "custom_domain_verified": true,
      "ssl_certificate_status": "active"
    }
  }
}
```

#### Update Branding Configuration
```http
PUT /api/white-labeling/branding
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "colors": {
    "primary": "#dc2626",
    "secondary": "#ef4444",
    "button": "#dc2626",
    "button_text": "#ffffff"
  },
  "logo_url": "https://cdn.example.com/new-logo.png",
  "custom_content": {
    "welcome_message": "Welcome to our updated portal!"
  }
}
```

#### Get Generated CSS
```http
GET /api/white-labeling/css/{tenantId}
```

**Response:** CSS content with custom variables and styles.

#### Upload Branding Asset
```http
POST /api/white-labeling/upload-asset
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "asset_type": "logo",
  "file_data": "base64_encoded_file_data"
}
```

#### Validate Custom Domain
```http
POST /api/white-labeling/validate-domain
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "domain": "portal.springfield.edu"
}
```

#### Setup Custom Domain
```http
POST /api/white-labeling/setup-custom-domain
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "domain": "portal.springfield.edu",
  "verification_code": "abc123def456"
}
```

#### Update Email Templates
```http
PUT /api/white-labeling/email-templates
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "templates": {
    "welcome": {
      "subject": "Welcome to {{school_name}} Student Portal",
      "template": "<html><body>Welcome {{first_name}}!</body></html>",
      "from_name": "{{school_name}} Administration"
    },
    "password_reset": {
      "subject": "Reset Your Password - {{school_name}}",
      "template": "<html><body>Click here to reset: {{reset_link}}</body></html>"
    }
  }
}
```

#### Update Dashboard Widgets
```http
PUT /api/white-labeling/dashboard-widgets
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "enabled_widgets": ["grades", "attendance", "announcements", "calendar"],
  "layout": "grid",
  "widget_order": ["announcements", "grades", "attendance", "calendar"],
  "custom_widgets": [
    {
      "id": "school_news",
      "title": "School News",
      "type": "rss_feed",
      "config": {"url": "https://springfield.edu/news/rss"}
    }
  ]
}
```

#### Update Navigation Menu
```http
PUT /api/white-labeling/navigation-menu
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "main_menu": [
    {"label": "Dashboard", "url": "/dashboard", "icon": "home"},
    {"label": "Grades", "url": "/grades", "icon": "chart"},
    {"label": "Attendance", "url": "/attendance", "icon": "calendar"}
  ],
  "footer_menu": [
    {"label": "About", "url": "/about"},
    {"label": "Contact", "url": "/contact"},
    {"label": "Privacy Policy", "url": "/privacy"}
  ]
}
```

#### Update Support Contact
```http
PUT /api/white-labeling/support-contact
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "email": "support@springfield.edu",
  "phone": "+1-555-123-4567",
  "hours": "Monday-Friday 8AM-5PM",
  "chat_enabled": true,
  "ticket_system": "zendesk",
  "knowledge_base_url": "https://help.springfield.edu"
}
```

#### Update Social Media
```http
PUT /api/white-labeling/social-media
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "facebook": "https://facebook.com/springfieldhigh",
  "twitter": "https://twitter.com/springfieldhigh",
  "instagram": "https://instagram.com/springfieldhigh",
  "linkedin": "https://linkedin.com/school/springfield-high"
}
```

#### Update Analytics Configuration
```http
PUT /api/white-labeling/analytics
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "google_analytics_id": "GA-XXXXXXXXX",
  "google_tag_manager_id": "GTM-XXXXXXX",
  "facebook_pixel_id": "123456789",
  "custom_events": ["login", "grade_view", "attendance_check"]
}
```

#### Update Legal Documents
```http
PUT /api/white-labeling/legal-documents
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "terms_of_service": "Terms of Service content...",
  "privacy_policy": "Privacy Policy content..."
}
```

#### Get Branding Preview
```http
GET /api/white-labeling/preview/{tenantId}
Authorization: Bearer <jwt_token>
```

#### Reset to Defaults
```http
POST /api/white-labeling/reset-to-defaults
Authorization: Bearer <jwt_token>
```

#### Export Configuration
```http
GET /api/white-labeling/export-config
Authorization: Bearer <jwt_token>
```

#### Import Configuration
```http
POST /api/white-labeling/import-config
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "config": {
    "version": "1.0",
    "branding_config": { /* branding configuration */ }
  },
  "overwrite_existing": false
}
```

## Common Response Format

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "meta": {
    "tenant": {
      "id": "tenant-uuid",
      "name": "Springfield High School"
    },
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    }
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error type",
  "message": "Human-readable error message",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ],
  "code": "VALIDATION_ERROR"
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Validation Error
- `429` - Rate Limited
- `500` - Internal Server Error

## API Endpoints

### 1. Authentication Endpoints

#### POST /auth/login
Authenticate user and receive JWT tokens.

**Request:**
```json
{
  "email": "admin@springfield.edu",
  "password": "secure-password",
  "tenantSlug": "springfield"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user-uuid",
      "email": "admin@springfield.edu",
      "firstName": "John",
      "lastName": "Doe",
      "role": "admin",
      "tenantId": "tenant-uuid"
    },
    "tenant": {
      "id": "tenant-uuid",
      "name": "Springfield High School",
      "slug": "springfield"
    }
  }
}
```

#### POST /auth/refresh
Refresh access token using refresh token.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### POST /auth/logout
Logout user and invalidate tokens.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### POST /auth/forgot-password
Request password reset email.

**Request:**
```json
{
  "email": "admin@springfield.edu",
  "tenantSlug": "springfield"
}
```

#### POST /auth/reset-password
Reset password using reset token.

**Request:**
```json
{
  "token": "reset-token",
  "newPassword": "new-secure-password"
}
```

### 2. Tenant Management Endpoints

#### POST /tenants
Create a new tenant (Super Admin only).

**Request:**
```json
{
  "name": "Springfield High School",
  "schoolName": "Springfield High School",
  "schoolType": "public",
  "schoolLevel": "high",
  "address": "123 School St, Springfield, IL 62701",
  "phone": "(217) 555-0123",
  "email": "info@springfield.edu",
  "website": "https://springfield.edu",
  "subscriptionPlan": "professional",
  "admin": {
    "email": "admin@springfield.edu",
    "password": "secure-password",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tenant": {
      "id": "tenant-uuid",
      "name": "Springfield High School",
      "slug": "springfield",
      "schoolName": "Springfield High School",
      "subscriptionPlan": "professional",
      "subscriptionStatus": "trial"
    },
    "adminUser": {
      "id": "user-uuid",
      "email": "admin@springfield.edu",
      "firstName": "John",
      "lastName": "Doe",
      "role": "admin"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### GET /tenants
Get current tenant information.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "tenant-uuid",
    "name": "Springfield High School",
    "slug": "springfield",
    "domain": "sis.springfield.edu",
    "subdomain": "springfield",
    "schoolName": "Springfield High School",
    "schoolType": "public",
    "schoolLevel": "high",
    "address": "123 School St, Springfield, IL 62701",
    "phone": "(217) 555-0123",
    "email": "info@springfield.edu",
    "website": "https://springfield.edu",
    "logoUrl": "https://cdn.example.com/springfield-logo.png",
    "primaryColor": "#1e40af",
    "secondaryColor": "#3b82f6",
    "timezone": "America/Chicago",
    "locale": "en-US",
    "subscriptionPlan": "professional",
    "subscriptionStatus": "active",
    "maxStudents": 2000,
    "maxTeachers": 200,
    "features": {
      "customBranding": true,
      "apiAccess": true,
      "advancedReporting": true,
      "integrations": true
    }
  }
}
```

#### PUT /tenants
Update tenant information.

**Request:**
```json
{
  "schoolName": "Springfield High School - Updated",
  "phone": "(217) 555-0124",
  "primaryColor": "#059669",
  "secondaryColor": "#10b981"
}
```

#### GET /tenants/stats
Get tenant statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "users": 45,
    "students": 500,
    "teachers": 25,
    "classes": 30,
    "utilization": {
      "students": 500,
      "teachers": 25
    }
  }
}
```

#### GET /tenants/limits
Get tenant limits and usage.

**Response:**
```json
{
  "success": true,
  "data": {
    "students": {
      "current": 500,
      "max": 2000,
      "remaining": 1500,
      "canAdd": true
    },
    "teachers": {
      "current": 25,
      "max": 200,
      "remaining": 175,
      "canAdd": true
    },
    "subscription": {
      "plan": "professional",
      "status": "active",
      "features": {
        "customBranding": true,
        "apiAccess": true,
        "advancedReporting": true
      }
    }
  }
}
```

### 3. User Management Endpoints

#### GET /users
Get all users in the tenant.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `role` (string): Filter by role
- `status` (string): Filter by status
- `search` (string): Search by name or email

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "user-uuid",
      "email": "admin@springfield.edu",
      "firstName": "John",
      "lastName": "Doe",
      "role": "admin",
      "status": "active",
      "lastLogin": "2024-01-15T10:30:00Z",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "pages": 3
    }
  }
}
```

#### POST /users
Create a new user.

**Request:**
```json
{
  "email": "teacher@springfield.edu",
  "password": "secure-password",
  "firstName": "Jane",
  "lastName": "Smith",
  "role": "teacher",
  "phone": "(217) 555-0125"
}
```

#### GET /users/:id
Get user by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "email": "teacher@springfield.edu",
    "firstName": "Jane",
    "lastName": "Smith",
    "role": "teacher",
    "status": "active",
    "phone": "(217) 555-0125",
    "avatarUrl": "https://cdn.example.com/avatar.jpg",
    "lastLogin": "2024-01-15T10:30:00Z",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

#### PUT /users/:id
Update user information.

**Request:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith-Wilson",
  "phone": "(217) 555-0126",
  "role": "teacher"
}
```

#### DELETE /users/:id
Delete user (soft delete).

### 4. Student Management Endpoints

#### GET /students
Get all students in the tenant.

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `gradeLevel` (string): Filter by grade level
- `status` (string): Filter by status
- `search` (string): Search by name or student ID

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "student-uuid",
      "studentId": "STU001",
      "firstName": "Alice",
      "lastName": "Johnson",
      "gradeLevel": "10",
      "status": "active",
      "enrollmentDate": "2024-01-01",
      "dateOfBirth": "2008-05-15",
      "email": "alice.johnson@springfield.edu",
      "phone": "(217) 555-0127",
      "parentGuardian1Name": "Bob Johnson",
      "parentGuardian1Email": "bob.johnson@email.com",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 500,
      "pages": 25
    }
  }
}
```

#### POST /students
Create a new student.

**Request:**
```json
{
  "studentId": "STU002",
  "firstName": "Bob",
  "lastName": "Wilson",
  "gradeLevel": "11",
  "dateOfBirth": "2007-03-20",
  "email": "bob.wilson@springfield.edu",
  "phone": "(217) 555-0128",
  "address": "456 Student St, Springfield, IL 62701",
  "parentGuardian1Name": "Carol Wilson",
  "parentGuardian1Email": "carol.wilson@email.com",
  "parentGuardian1Phone": "(217) 555-0129"
}
```

#### GET /students/:id
Get student by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "student-uuid",
    "studentId": "STU001",
    "firstName": "Alice",
    "lastName": "Johnson",
    "gradeLevel": "10",
    "status": "active",
    "enrollmentDate": "2024-01-01",
    "dateOfBirth": "2008-05-15",
    "email": "alice.johnson@springfield.edu",
    "phone": "(217) 555-0127",
    "address": "123 Student St, Springfield, IL 62701",
    "parentGuardian1Name": "Bob Johnson",
    "parentGuardian1Email": "bob.johnson@email.com",
    "parentGuardian1Phone": "(217) 555-0130",
    "medicalConditions": "None",
    "allergies": "Peanuts",
    "photoUrl": "https://cdn.example.com/student-photo.jpg",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

#### PUT /students/:id
Update student information.

#### DELETE /students/:id
Delete student (soft delete).

#### POST /students/bulk-import
Bulk import students from CSV.

**Request:** Multipart form data with CSV file.

**Response:**
```json
{
  "success": true,
  "data": {
    "imported": 45,
    "failed": 2,
    "errors": [
      {
        "row": 3,
        "error": "Invalid email format"
      }
    ]
  }
}
```

### 5. Teacher Management Endpoints

#### GET /teachers
Get all teachers in the tenant.

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `department` (string): Filter by department
- `employmentStatus` (string): Filter by employment status
- `search` (string): Search by name or employee ID

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "teacher-uuid",
      "employeeId": "TCH001",
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "jane.smith@springfield.edu",
      "department": "Mathematics",
      "employmentStatus": "active",
      "employmentType": "full_time",
      "hireDate": "2023-08-15",
      "subjectsTaught": ["Algebra", "Geometry", "Calculus"],
      "gradeLevelsTaught": ["9", "10", "11", "12"],
      "yearsExperience": 5,
      "createdAt": "2023-08-15T00:00:00Z"
    }
  ]
}
```

#### POST /teachers
Create a new teacher.

**Request:**
```json
{
  "employeeId": "TCH002",
  "firstName": "Mike",
  "lastName": "Davis",
  "email": "mike.davis@springfield.edu",
  "department": "Science",
  "employmentType": "full_time",
  "hireDate": "2024-01-15",
  "subjectsTaught": ["Biology", "Chemistry"],
  "gradeLevelsTaught": ["9", "10", "11"],
  "yearsExperience": 3,
  "phone": "(217) 555-0131"
}
```

#### GET /teachers/:id
Get teacher by ID.

#### PUT /teachers/:id
Update teacher information.

#### DELETE /teachers/:id
Delete teacher (soft delete).

### 6. Class Management Endpoints

#### GET /classes
Get all classes in the tenant.

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `subject` (string): Filter by subject
- `gradeLevel` (string): Filter by grade level
- `teacherId` (string): Filter by teacher
- `academicYear` (string): Filter by academic year

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "class-uuid",
      "classCode": "MATH101",
      "name": "Algebra I",
      "subject": "Mathematics",
      "gradeLevel": "9",
      "academicYear": "2024-2025",
      "semester": "full_year",
      "credits": 1.0,
      "teacherId": "teacher-uuid",
      "teacherName": "Jane Smith",
      "roomNumber": "A101",
      "schedule": {
        "monday": ["08:00-08:50"],
        "wednesday": ["08:00-08:50"],
        "friday": ["08:00-08:50"]
      },
      "maxStudents": 30,
      "currentEnrollment": 25,
      "status": "active",
      "startDate": "2024-08-15",
      "endDate": "2025-05-30"
    }
  ]
}
```

#### POST /classes
Create a new class.

**Request:**
```json
{
  "classCode": "SCI201",
  "name": "Biology I",
  "subject": "Science",
  "gradeLevel": "10",
  "academicYear": "2024-2025",
  "semester": "full_year",
  "credits": 1.0,
  "teacherId": "teacher-uuid",
  "roomNumber": "B205",
  "schedule": {
    "tuesday": ["09:00-09:50"],
    "thursday": ["09:00-09:50"]
  },
  "maxStudents": 25,
  "startDate": "2024-08-15",
  "endDate": "2025-05-30"
}
```

#### GET /classes/:id
Get class by ID.

#### PUT /classes/:id
Update class information.

#### DELETE /classes/:id
Delete class (soft delete).

#### GET /classes/:id/students
Get students enrolled in a class.

#### POST /classes/:id/enroll
Enroll student in class.

**Request:**
```json
{
  "studentId": "student-uuid"
}
```

#### DELETE /classes/:id/enroll/:studentId
Unenroll student from class.

### 7. Grade Management Endpoints

#### GET /grades
Get grades with filtering options.

**Query Parameters:**
- `studentId` (string): Filter by student
- `classId` (string): Filter by class
- `assignmentType` (string): Filter by assignment type
- `category` (string): Filter by grade category
- `dateFrom` (string): Filter from date
- `dateTo` (string): Filter to date

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "grade-uuid",
      "studentId": "student-uuid",
      "studentName": "Alice Johnson",
      "classId": "class-uuid",
      "className": "Algebra I",
      "assignmentName": "Chapter 5 Test",
      "assignmentType": "test",
      "category": "tests",
      "pointsPossible": 100,
      "pointsEarned": 85,
      "percentage": 85.0,
      "letterGrade": "B",
      "assignedDate": "2024-01-10",
      "dueDate": "2024-01-15",
      "gradedDate": "2024-01-16",
      "status": "graded",
      "isLate": false,
      "teacherComments": "Good work, but watch your signs."
    }
  ]
}
```

#### POST /grades
Create a new grade.

**Request:**
```json
{
  "studentId": "student-uuid",
  "classId": "class-uuid",
  "assignmentName": "Homework 5.1",
  "assignmentType": "homework",
  "category": "homework",
  "pointsPossible": 20,
  "pointsEarned": 18,
  "assignedDate": "2024-01-15",
  "dueDate": "2024-01-17"
}
```

#### GET /grades/:id
Get grade by ID.

#### PUT /grades/:id
Update grade.

#### DELETE /grades/:id
Delete grade.

#### POST /grades/bulk-entry
Bulk grade entry for a class.

**Request:**
```json
{
  "classId": "class-uuid",
  "assignmentName": "Quiz 3",
  "assignmentType": "quiz",
  "category": "quizzes",
  "pointsPossible": 50,
  "assignedDate": "2024-01-15",
  "dueDate": "2024-01-17",
  "grades": [
    {
      "studentId": "student-uuid-1",
      "pointsEarned": 45
    },
    {
      "studentId": "student-uuid-2",
      "pointsEarned": 50
    }
  ]
}
```

### 8. Attendance Management Endpoints

#### GET /attendance
Get attendance records.

**Query Parameters:**
- `studentId` (string): Filter by student
- `classId` (string): Filter by class
- `date` (string): Filter by specific date
- `dateFrom` (string): Filter from date
- `dateTo` (string): Filter to date
- `status` (string): Filter by attendance status

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "attendance-uuid",
      "studentId": "student-uuid",
      "studentName": "Alice Johnson",
      "classId": "class-uuid",
      "className": "Algebra I",
      "attendanceDate": "2024-01-15",
      "status": "present",
      "period": "1st",
      "markedBy": "teacher-uuid",
      "markedAt": "2024-01-15T08:05:00Z"
    }
  ]
}
```

#### POST /attendance
Create attendance record.

**Request:**
```json
{
  "studentId": "student-uuid",
  "classId": "class-uuid",
  "attendanceDate": "2024-01-15",
  "status": "present",
  "period": "1st"
}
```

#### POST /attendance/bulk
Bulk attendance entry for a class.

**Request:**
```json
{
  "classId": "class-uuid",
  "attendanceDate": "2024-01-15",
  "period": "1st",
  "records": [
    {
      "studentId": "student-uuid-1",
      "status": "present"
    },
    {
      "studentId": "student-uuid-2",
      "status": "absent",
      "reason": "Sick"
    }
  ]
}
```

#### GET /attendance/:id
Get attendance record by ID.

#### PUT /attendance/:id
Update attendance record.

#### DELETE /attendance/:id
Delete attendance record.

### 9. Onboarding Endpoints

#### GET /onboarding/progress
Get onboarding progress for current tenant.

**Response:**
```json
{
  "success": true,
  "data": {
    "progress": {
      "tenantCreated": true,
      "adminUserCreated": true,
      "emailVerified": true,
      "profileCompleted": false,
      "teachersAdded": false,
      "studentsAdded": false,
      "classesCreated": false
    },
    "completionPercentage": 43,
    "nextSteps": [
      {
        "title": "Complete School Profile",
        "description": "Add school logo, colors, and contact information",
        "priority": "medium",
        "action": "complete_profile"
      }
    ]
  }
}
```

#### GET /onboarding/checklist
Get detailed onboarding checklist.

**Response:**
```json
{
  "success": true,
  "data": {
    "checklist": [
      {
        "id": "email_verification",
        "title": "Verify Email Address",
        "description": "Verify your administrator email address",
        "completed": true,
        "priority": "high",
        "action": "verify_email"
      },
      {
        "id": "profile_setup",
        "title": "Complete School Profile",
        "description": "Add school logo, colors, and contact information",
        "completed": false,
        "priority": "medium",
        "action": "complete_profile"
      }
    ],
    "completionPercentage": 43,
    "nextSteps": []
  }
}
```

#### GET /onboarding/resources
Get onboarding resources and help materials.

**Response:**
```json
{
  "success": true,
  "data": {
    "documentation": [
      {
        "title": "Getting Started Guide",
        "description": "Complete guide to setting up your school",
        "url": "https://help.sisplatform.com/getting-started",
        "type": "guide"
      }
    ],
    "videos": [
      {
        "title": "Welcome to Your SIS",
        "description": "Overview of the system features",
        "url": "https://help.sisplatform.com/videos/welcome",
        "duration": "5:30",
        "type": "video"
      }
    ],
    "templates": [
      {
        "title": "Student Import Template",
        "description": "CSV template for importing students",
        "url": "https://sisplatform.com/templates/student-import.csv",
        "type": "template"
      }
    ],
    "support": {
      "email": "support@sisplatform.com",
      "phone": "1-800-SIS-HELP",
      "chat": "https://sisplatform.com/support/chat",
      "knowledgeBase": "https://help.sisplatform.com"
    }
  }
}
```

## Testing the API

### Using curl

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@springfield.edu",
    "password": "secure-password",
    "tenantSlug": "springfield"
  }'

# Get students (with JWT token)
curl -X GET http://localhost:3000/api/students \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# Create a student
curl -X POST http://localhost:3000/api/students \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "STU001",
    "firstName": "Alice",
    "lastName": "Johnson",
    "gradeLevel": "10",
    "dateOfBirth": "2008-05-15"
  }'
```

### Using Postman

1. Import the Postman collection (coming soon)
2. Set up environment variables:
   - `base_url`: `http://localhost:3000/api`
   - `jwt_token`: Your JWT token
   - `tenant_id`: Your tenant ID
3. Run the collection to test all endpoints

### Using Automated Tests

```bash
# Run API tests
npm run test:api

# Run specific endpoint tests
npm run test:api:students
npm run test:api:teachers
npm run test:api:grades
```

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Authentication endpoints**: 5 requests per minute per IP
- **General API endpoints**: 100 requests per minute per user
- **Bulk operations**: 10 requests per minute per user

Rate limit headers are included in responses:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Webhooks

The API supports webhooks for real-time notifications:

### Webhook Events
- `student.created`
- `student.updated`
- `student.deleted`
- `grade.created`
- `grade.updated`
- `attendance.marked`
- `user.created`
- `user.updated`

### Webhook Configuration
```json
{
  "url": "https://your-app.com/webhooks/sis",
  "events": ["student.created", "grade.updated"],
  "secret": "webhook-secret-key"
}
```

## SDKs and Client Libraries

### JavaScript/TypeScript SDK (Coming Soon)
```javascript
import { SISClient } from '@sisplatform/sdk';

const client = new SISClient({
  baseUrl: 'https://api.sisplatform.com/v1',
  apiKey: 'your-api-key'
});

const students = await client.students.list();
const newStudent = await client.students.create({
  firstName: 'Alice',
  lastName: 'Johnson',
  gradeLevel: '10'
});
```

### Python SDK (Coming Soon)
```python
from sisplatform import SISClient

client = SISClient(
    base_url='https://api.sisplatform.com/v1',
    api_key='your-api-key'
)

students = client.students.list()
new_student = client.students.create({
    'firstName': 'Alice',
    'lastName': 'Johnson',
    'gradeLevel': '10'
})
```

## Error Handling

### Common Error Codes

- `VALIDATION_ERROR`: Request validation failed
- `AUTHENTICATION_REQUIRED`: JWT token missing or invalid
- `INSUFFICIENT_PERMISSIONS`: User lacks required permissions
- `TENANT_NOT_FOUND`: Tenant context could not be resolved
- `RESOURCE_NOT_FOUND`: Requested resource does not exist
- `DUPLICATE_RESOURCE`: Resource already exists
- `TENANT_LIMIT_EXCEEDED`: Tenant has reached subscription limits
- `FEATURE_NOT_AVAILABLE`: Feature not available for tenant's subscription

### Retry Logic

For transient errors (5xx status codes), implement exponential backoff:

```javascript
const retryWithBackoff = async (fn, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status >= 500 && i < maxRetries - 1) {
        await new Promise(resolve => 
          setTimeout(resolve, Math.pow(2, i) * 1000)
        );
        continue;
      }
      throw error;
    }
  }
};
```

## Security Considerations

### HTTPS Only
All API communication must use HTTPS in production.

### JWT Security
- Tokens are signed with RS256
- Access tokens expire in 15 minutes
- Refresh tokens expire in 7 days
- Tokens are stored securely on the client

### Data Validation
- All input is validated and sanitized
- SQL injection protection via parameterized queries
- XSS protection via input sanitization

### Audit Logging
All API requests are logged for compliance and security monitoring.

## Support

For API support and questions:
- **Email**: api-support@sisplatform.com
- **Documentation**: https://docs.sisplatform.com
- **Status Page**: https://status.sisplatform.com
