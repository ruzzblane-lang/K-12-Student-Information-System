/**
 * Student Validation Middleware
 * Provides comprehensive validation for _student-related endpoints
 */

const { body, param, query, validationResult } = require('express-validator');
const validator = require('validator');

// Common validation rules
const commonValidations = {
  // UUID validation
  uuid: (field) => param(field).isUUID().withMessage(`${field} must be a valid UUID`),
  
  // Email validation
  email: (field) => body(field)
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage(`${field} must be a valid email address`),
  
  // Phone validation
  phone: (field) => body(field)
    .optional()
    .isMobilePhone()
    .withMessage(`${field} must be a valid phone number`),
  
  // Date validation
  date: (field) => body(field)
    .optional()
    .isISO8601()
    .withMessage(`${field} must be a valid ISO 8601 date`),
  
  // Grade level validation
  gradeLevel: () => body('grade_level')
    .optional()
    .isIn(['K', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'])
    .withMessage('Grade level must be K or 0-12'),
  
  // Status validation
  status: () => body('status')
    .optional()
    .isIn(['active', 'inactive', 'graduated', 'transferred', 'withdrawn'])
    .withMessage('Status must be one of: active, inactive, graduated, transferred, withdrawn'),
  
  // Gender validation
  gender: () => body('gender')
    .optional()
    .isIn(['male', 'female', 'other', 'prefer_not_to_say'])
    .withMessage('Gender must be one of: male, female, other, prefer_not_to_say')
};

// Student creation validation
const createStudentValidation = [
  // Required fields
  body('first_name')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name is required and must be 1-50 characters'),
  
  body('last_name')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name is required and must be 1-50 characters'),
  
  body('date_of_birth')
    .isISO8601()
    .withMessage('Date of birth is required and must be a valid ISO 8601 date'),
  
  body('grade_level')
    .isIn(['K', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'])
    .withMessage('Grade level is required and must be K or 0-12'),
  
  // Optional fields with validation
  body('middle_name')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Middle name must be 50 characters or less'),
  
  body('preferred_name')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Preferred name must be 50 characters or less'),
  
  commonValidations.email('email'),
  commonValidations.phone('phone'),
  commonValidations.gender(),
  commonValidations.status(),
  
  // Address fields
  body('address')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Address must be 200 characters or less'),
  
  body('city')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('City must be 100 characters or less'),
  
  body('state')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('State must be 50 characters or less'),
  
  body('zip_code')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('ZIP code must be 20 characters or less'),
  
  // Emergency contact fields
  body('emergency_contact_name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Emergency contact name must be 100 characters or less'),
  
  commonValidations.phone('emergency_contact_phone'),
  
  body('emergency_contact_relationship')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Emergency contact relationship must be 50 characters or less'),
  
  // Parent/Guardian 1 fields
  body('parent_guardian_1_name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Parent/Guardian 1 name must be 100 characters or less'),
  
  commonValidations.phone('parent_guardian_1_phone'),
  commonValidations.email('parent_guardian_1_email'),
  
  body('parent_guardian_1_relationship')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Parent/Guardian 1 relationship must be 50 characters or less'),
  
  // Parent/Guardian 2 fields
  body('parent_guardian_2_name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Parent/Guardian 2 name must be 100 characters or less'),
  
  commonValidations.phone('parent_guardian_2_phone'),
  commonValidations.email('parent_guardian_2_email'),
  
  body('parent_guardian_2_relationship')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Parent/Guardian 2 relationship must be 50 characters or less'),
  
  // Medical and special needs fields
  body('medical_conditions')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Medical conditions must be 500 characters or less'),
  
  body('allergies')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Allergies must be 500 characters or less'),
  
  body('medications')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Medications must be 500 characters or less'),
  
  body('special_needs')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Special needs must be 500 characters or less'),
  
  // IEP and 504 status
  body('iep_status')
    .optional()
    .isIn(['none', 'evaluation', 'active', 'inactive'])
    .withMessage('IEP status must be one of: none, evaluation, active, inactive'),
  
  body('section_504_status')
    .optional()
    .isIn(['none', 'evaluation', 'active', 'inactive'])
    .withMessage('Section 504 status must be one of: none, evaluation, active, inactive'),
  
  // Date fields
  commonValidations.date('enrollment_date'),
  commonValidations.date('graduation_date'),
  
  // Academic year
  body('academic_year')
    .optional()
    .isLength({ min: 4, max: 4 })
    .isNumeric()
    .withMessage('Academic year must be a 4-digit year'),
  
  // Photo URL
  body('photo_url')
    .optional()
    .isURL()
    .withMessage('Photo URL must be a valid URL')
];

// Student update validation (all fields optional)
const updateStudentValidation = createStudentValidation.map(validation => {
  // Make all validations optional for updates
  if (validation.builder && validation.builder.optional) {
    return validation;
  } else {
    return validation.optional();
  }
});

// Student ID validation
const studentIdValidation = [
  commonValidations.uuid('_id')
];

// Enrollment validation
const enrollmentValidation = [
  commonValidations.uuid('_id'),
  body('_course_section_id')
    .isUUID()
    .withMessage('Course section ID must be a valid UUID')
];

// Unenrollment validation
const unenrollmentValidation = [
  commonValidations.uuid('_id'),
  commonValidations.uuid('_enrollmentId')
];

// Query parameter validation for _student lists
const studentListQueryValidation = [
  query('page')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Page must be a number between 1 and 10000'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be a number between 1 and 100'),
  
  query('grade')
    .optional()
    .isIn(['K', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'])
    .withMessage('Grade must be K or 0-12'),
  
  query('status')
    .optional()
    .isIn(['active', 'inactive', 'graduated', 'transferred', 'withdrawn'])
    .withMessage('Status must be one of: active, inactive, graduated, transferred, withdrawn'),
  
  query('search')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Search term must be 2-100 characters')
];

// Query parameter validation for grades
const gradesQueryValidation = [
  commonValidations.uuid('_id'),
  query('_term_id')
    .optional()
    .isUUID()
    .withMessage('Term ID must be a valid UUID'),
  
  query('page')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Page must be a number between 1 and 10000'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be a number between 1 and 100')
];

// Query parameter validation for attendance
const attendanceQueryValidation = [
  commonValidations.uuid('_id'),
  query('_start_date')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  
  query('_end_date')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  
  query('_course_section_id')
    .optional()
    .isUUID()
    .withMessage('Course section ID must be a valid UUID'),
  
  query('page')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Page must be a number between 1 and 10000'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be a number between 1 and 100')
];

// Query parameter validation for enrollments
const enrollmentsQueryValidation = [
  commonValidations.uuid('_id'),
  query('_term_id')
    .optional()
    .isUUID()
    .withMessage('Term ID must be a valid UUID'),
  
  query('page')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Page must be a number between 1 and 10000'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be a number between 1 and 100')
];

// Validation result handler
const handleValidationErrors = (req, res, _next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data',
        details: errors.array()
      }
    });
  }
  _next();
};

module.exports = {
  createStudentValidation,
  updateStudentValidation,
  studentIdValidation,
  enrollmentValidation,
  unenrollmentValidation,
  studentListQueryValidation,
  gradesQueryValidation,
  attendanceQueryValidation,
  enrollmentsQueryValidation,
  handleValidationErrors
};
