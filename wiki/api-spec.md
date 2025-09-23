<!-- Migrated from: docs/api-spec.md -->

# API Specification

## Overview

The School SIS API follows RESTful principles and provides comprehensive endpoints for managing all aspects of the student information system. All endpoints return JSON responses and use standard HTTP status codes.

## Base URL

```
Development: http://localhost:3000/api
Production: https://api.schoolsis.com/api
```

## Authentication

All protected endpoints require a valid JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": { ... }
  }
}
```

## Status Codes

- `200` - OK
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Unprocessable Entity
- `500` - Internal Server Error

## API Endpoints

### Authentication

#### POST /auth/login
Authenticate user and return JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "jwt_token_here",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "role": "student",
      "first_name": "John",
      "last_name": "Doe"
    }
  }
}
```

#### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "first_name": "John",
  "last_name": "Doe",
  "role": "student"
}
```

#### POST /auth/logout
Logout user and invalidate token.

#### POST /auth/refresh
Refresh JWT token.

### Users

#### GET /users
Get list of users (admin only).

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)
- `role` - Filter by role
- `search` - Search by name or email

#### GET /users/:id
Get user by ID.

#### PUT /users/:id
Update user information.

#### DELETE /users/:id
Delete user (admin only).

### Students

#### GET /students
Get list of students.

**Query Parameters:**
- `page`, `limit` - Pagination
- `grade` - Filter by grade level
- `status` - Filter by enrollment status
- `search` - Search by name or student ID

#### GET /students/:id
Get student details.

#### POST /students
Create new student (admin only).

**Request Body:**
```json
{
  "user_id": "uuid",
  "student_id": "STU2024001",
  "enrollment_date": "2024-09-01",
  "emergency_contact_name": "Jane Doe",
  "emergency_contact_phone": "+1234567890"
}
```

#### PUT /students/:id
Update student information.

#### GET /students/:id/grades
Get student's grades.

#### GET /students/:id/attendance
Get student's attendance record.

### Teachers

#### GET /teachers
Get list of teachers.

#### GET /teachers/:id
Get teacher details.

#### POST /teachers
Create new teacher (admin only).

#### PUT /teachers/:id
Update teacher information.

#### GET /teachers/:id/courses
Get teacher's assigned courses.

### Courses

#### GET /courses
Get list of courses.

**Query Parameters:**
- `grade` - Filter by grade level
- `subject` - Filter by subject
- `term` - Filter by term

#### GET /courses/:id
Get course details.

#### POST /courses
Create new course (admin only).

#### PUT /courses/:id
Update course information.

#### GET /courses/:id/sections
Get course sections.

### Course Sections

#### GET /course-sections
Get list of course sections.

#### GET /course-sections/:id
Get course section details.

#### POST /course-sections
Create new course section (admin only).

#### PUT /course-sections/:id
Update course section.

#### GET /course-sections/:id/students
Get enrolled students.

#### GET /course-sections/:id/assignments
Get section assignments.

### Enrollments

#### GET /enrollments
Get enrollment list.

#### POST /enrollments
Enroll student in course section.

**Request Body:**
```json
{
  "student_id": "uuid",
  "course_section_id": "uuid"
}
```

#### DELETE /enrollments/:id
Drop enrollment.

### Assignments

#### GET /assignments
Get list of assignments.

#### GET /assignments/:id
Get assignment details.

#### POST /assignments
Create new assignment (teacher only).

**Request Body:**
```json
{
  "course_section_id": "uuid",
  "name": "Algebra Quiz 1",
  "description": "Basic algebra concepts",
  "assignment_type": "quiz",
  "total_points": 100,
  "due_date": "2024-10-15",
  "weight": 15.0
}
```

#### PUT /assignments/:id
Update assignment.

#### DELETE /assignments/:id
Delete assignment.

### Grades

#### GET /grades
Get grades list.

#### GET /grades/:id
Get grade details.

#### POST /grades
Create/update grade (teacher only).

**Request Body:**
```json
{
  "student_id": "uuid",
  "assignment_id": "uuid",
  "points_earned": 85,
  "feedback": "Good work, but check your calculations"
}
```

#### PUT /grades/:id
Update grade.

### Attendance

#### GET /attendance
Get attendance records.

#### POST /attendance
Record attendance (teacher only).

**Request Body:**
```json
{
  "student_id": "uuid",
  "course_section_id": "uuid",
  "date": "2024-10-01",
  "status": "present"
}
```

#### PUT /attendance/:id
Update attendance record.

### Academic Years & Terms

#### GET /academic-years
Get list of academic years.

#### GET /academic-years/current
Get current academic year.

#### GET /terms
Get list of terms.

#### GET /terms/current
Get current term.

### Announcements

#### GET /announcements
Get list of announcements.

#### GET /announcements/:id
Get announcement details.

#### POST /announcements
Create announcement (admin/teacher only).

#### PUT /announcements/:id
Update announcement.

#### DELETE /announcements/:id
Delete announcement.

### Messages

#### GET /messages
Get user's messages.

#### GET /messages/:id
Get message details.

#### POST /messages
Send message.

**Request Body:**
```json
{
  "recipient_id": "uuid",
  "subject": "Message Subject",
  "content": "Message content here"
}
```

#### PUT /messages/:id/read
Mark message as read.

## Error Codes

### Authentication Errors
- `AUTH_INVALID_CREDENTIALS` - Invalid email/password
- `AUTH_TOKEN_EXPIRED` - JWT token has expired
- `AUTH_TOKEN_INVALID` - Invalid JWT token
- `AUTH_INSUFFICIENT_PERMISSIONS` - User lacks required permissions

### Validation Errors
- `VALIDATION_REQUIRED_FIELD` - Required field is missing
- `VALIDATION_INVALID_FORMAT` - Field format is invalid
- `VALIDATION_UNIQUE_CONSTRAINT` - Field value must be unique
- `VALIDATION_OUT_OF_RANGE` - Value is outside allowed range

### Business Logic Errors
- `ENROLLMENT_FULL` - Course section is at capacity
- `ENROLLMENT_ALREADY_EXISTS` - Student already enrolled
- `GRADE_ALREADY_EXISTS` - Grade already recorded
- `ASSIGNMENT_DUE_DATE_PASSED` - Cannot modify assignment after due date

### System Errors
- `DATABASE_CONNECTION_ERROR` - Database connection failed
- `FILE_UPLOAD_ERROR` - File upload failed
- `EMAIL_SEND_ERROR` - Email notification failed
- `INTERNAL_SERVER_ERROR` - Unexpected server error

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **Authentication endpoints**: 5 requests per minute per IP
- **General endpoints**: 100 requests per minute per user
- **File upload endpoints**: 10 requests per minute per user

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Pagination

List endpoints support pagination with the following parameters:

- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10, max: 100)

Response includes pagination metadata:
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "pages": 15,
    "has_next": true,
    "has_prev": false
  }
}
```

## Filtering and Sorting

Many endpoints support filtering and sorting:

### Filtering
Use query parameters to filter results:
```
GET /students?grade=9&status=active&search=john
```

### Sorting
Use `sort` parameter with field name and direction:
```
GET /students?sort=last_name:asc
GET /grades?sort=created_at:desc
```

## File Uploads

### POST /upload/profile-image
Upload user profile image.

**Request:** Multipart form data with `image` field.

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://cdn.schoolsis.com/images/profile_123.jpg",
    "filename": "profile_123.jpg"
  }
}
```

### POST /upload/documents
Upload student documents.

**Request:** Multipart form data with `document` field and `student_id`.

## Webhooks

The API supports webhooks for real-time notifications:

### Webhook Events
- `student.enrolled` - Student enrolled in course
- `grade.recorded` - New grade recorded
- `attendance.marked` - Attendance marked
- `assignment.created` - New assignment created
- `message.sent` - New message sent

### Webhook Payload
```json
{
  "event": "student.enrolled",
  "timestamp": "2024-10-01T10:00:00Z",
  "data": {
    "student_id": "uuid",
    "course_section_id": "uuid",
    "enrollment_date": "2024-10-01"
  }
}
```

## SDK and Libraries

Official SDKs are available for:
- JavaScript/Node.js
- Python
- PHP
- Java

Example usage with JavaScript:
```javascript
import { SchoolSISClient } from '@schoolsis/sdk';

const client = new SchoolSISClient({
  baseUrl: 'https://api.schoolsis.com',
  apiKey: 'your_api_key'
});

// Get students
const students = await client.students.list({
  page: 1,
  limit: 10
});

// Create grade
const grade = await client.grades.create({
  student_id: 'uuid',
  assignment_id: 'uuid',
  points_earned: 85
});
```
