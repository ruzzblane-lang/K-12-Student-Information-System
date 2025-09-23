/**
 * Enhanced Access Control Service
 * Implements comprehensive access controls for FERPA compliance
 * Ensures proper authorization and review processes for sensitive student data
 */

const { query } = require('../../config/database');
const DataClassificationService = require('./DataClassificationService');
const ConsentManagementService = require('./ConsentManagementService');

class AccessControlService {
  constructor() {
    this.dataClassificationService = new DataClassificationService();
    this.consentManagementService = new ConsentManagementService();
    
    // Access levels for different user roles
    this.accessLevels = {
      NONE: 'none',
      READ_ONLY: 'read_only',
      LIMITED: 'limited',
      FULL: 'full',
      ADMIN: 'admin'
    };

    // User roles and their default access levels
    this.roleAccessLevels = {
      student: this.accessLevels.READ_ONLY,
      parent: this.accessLevels.LIMITED,
      teacher: this.accessLevels.LIMITED,
      counselor: this.accessLevels.LIMITED,
      administrator: this.accessLevels.FULL,
      principal: this.accessLevels.FULL,
      superintendent: this.accessLevels.ADMIN,
      super_admin: this.accessLevels.ADMIN
    };

    // Sensitive data access requirements
    this.sensitiveDataRequirements = {
      ssn: ['explicit_consent', 'audit_logging', 'encryption'],
      medical_records: ['explicit_consent', 'audit_logging', 'encryption', 'health_authorization'],
      disciplinary_records: ['explicit_consent', 'audit_logging', 'administrative_approval'],
      special_education: ['explicit_consent', 'audit_logging', 'special_education_authorization'],
      financial_information: ['explicit_consent', 'audit_logging', 'encryption', 'financial_authorization']
    };
  }

  /**
   * Check access permissions for student data
   * @param {string} requesterId - User ID requesting access
   * @param {string} studentId - Student ID
   * @param {string} dataType - Type of data being accessed
   * @param {Object} context - Access context
   * @returns {Object} Access control result
   */
  async checkAccessPermissions(requesterId, studentId, dataType, context = {}) {
    try {
      const accessResult = {
        allowed: false,
        accessLevel: this.accessLevels.NONE,
        reason: '',
        restrictions: [],
        auditRequired: false,
        consentRequired: false,
        approvalRequired: false
      };

      // Step 1: Get requester information
      const requester = await this.getRequesterInfo(requesterId);
      if (!requester) {
        accessResult.reason = 'Requester not found';
        return accessResult;
      }

      // Step 2: Get student information
      const student = await this.getStudentInfo(studentId);
      if (!student) {
        accessResult.reason = 'Student not found';
        return accessResult;
      }

      // Step 3: Check tenant isolation
      if (requester.tenant_id !== student.tenant_id) {
        accessResult.reason = 'Cross-tenant access not allowed';
        return accessResult;
      }

      // Step 4: Classify the data being accessed
      const dataClassification = await this.dataClassificationService.classifyData(
        { [dataType]: 'sample' }, 
        context
      );

      // Step 5: Determine access level based on role and relationship
      const relationshipAccess = await this.checkRelationshipAccess(requesterId, studentId, context);
      
      // Step 6: Check consent requirements
      const consentCheck = await this.checkConsentRequirements(
        studentId, 
        requesterId, 
        dataType, 
        context
      );

      // Step 7: Check sensitive data requirements
      const sensitiveDataCheck = await this.checkSensitiveDataRequirements(
        dataType, 
        requester, 
        context
      );

      // Step 8: Determine final access decision
      accessResult.allowed = this.determineAccessDecision(
        relationshipAccess,
        consentCheck,
        sensitiveDataCheck,
        dataClassification
      );

      if (accessResult.allowed) {
        accessResult.accessLevel = this.determineAccessLevel(
          requester.role,
          relationshipAccess,
          dataClassification
        );
        accessResult.restrictions = this.determineRestrictions(
          dataClassification,
          sensitiveDataCheck
        );
      } else {
        accessResult.reason = this.determineAccessDenialReason(
          relationshipAccess,
          consentCheck,
          sensitiveDataCheck
        );
      }

      // Step 9: Set audit and approval requirements
      accessResult.auditRequired = this.requiresAudit(dataClassification, context);
      accessResult.consentRequired = consentCheck.required;
      accessResult.approvalRequired = sensitiveDataCheck.approvalRequired;

      // Step 10: Log access attempt
      await this.logAccessAttempt(requesterId, studentId, dataType, accessResult, context);

      return accessResult;

    } catch (error) {
      await this.logError('Check access permissions error', error, {
        requesterId,
        studentId,
        dataType,
        context
      });
      throw new Error(`Access permission check failed: ${error.message}`);
    }
  }

  /**
   * Check relationship-based access
   * @param {string} requesterId - Requester ID
   * @param {string} studentId - Student ID
   * @param {Object} context - Context
   * @returns {Object} Relationship access result
   */
  async checkRelationshipAccess(requesterId, studentId, context) {
    try {
      const relationshipResult = {
        hasAccess: false,
        relationshipType: 'none',
        accessLevel: this.accessLevels.NONE,
        restrictions: []
      };

      // Check if requester is the student (18+ or emancipated)
      const studentQuery = `
        SELECT s.*, u.role FROM students s
        LEFT JOIN users u ON s.user_id = u.id
        WHERE s.id = $1 AND (s.user_id = $2 OR u.id = $2)
      `;
      
      const studentResult = await query(studentQuery, [studentId, requesterId]);
      
      if (studentResult.rows.length > 0) {
        const student = studentResult.rows[0];
        const age = this.calculateAge(student.date_of_birth);
        
        if (age >= 18 || student.emancipated) {
          relationshipResult.hasAccess = true;
          relationshipResult.relationshipType = 'self';
          relationshipResult.accessLevel = this.accessLevels.FULL;
          return relationshipResult;
        } else {
          relationshipResult.restrictions.push('Student under 18 - parental consent required');
        }
      }

      // Check if requester is parent/guardian
      const parentQuery = `
        SELECT pr.*, p.relationship_type FROM parent_student_relationships pr
        JOIN parents p ON pr.parent_id = p.id
        WHERE pr.student_id = $1 AND pr.parent_id = $2 AND pr.status = 'active'
      `;
      
      const parentResult = await query(parentQuery, [studentId, requesterId]);
      
      if (parentResult.rows.length > 0) {
        relationshipResult.hasAccess = true;
        relationshipResult.relationshipType = 'parent';
        relationshipResult.accessLevel = this.accessLevels.FULL;
        return relationshipResult;
      }

      // Check if requester is school official with legitimate educational interest
      const schoolOfficialQuery = `
        SELECT u.*, ur.role FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        WHERE u.id = $1 AND u.tenant_id = (SELECT tenant_id FROM students WHERE id = $2)
      `;
      
      const schoolOfficialResult = await query(schoolOfficialQuery, [requesterId, studentId]);
      
      if (schoolOfficialResult.rows.length > 0) {
        const user = schoolOfficialResult.rows[0];
        
        if (this.isSchoolOfficial(user.role)) {
          const legitimateInterest = await this.checkLegitimateEducationalInterest(
            requesterId, studentId, context
          );
          
          if (legitimateInterest.hasInterest) {
            relationshipResult.hasAccess = true;
            relationshipResult.relationshipType = 'school_official';
            relationshipResult.accessLevel = this.determineSchoolOfficialAccessLevel(user.role);
            relationshipResult.restrictions = legitimateInterest.restrictions;
            return relationshipResult;
          }
        }
      }

      return relationshipResult;

    } catch (error) {
      await this.logError('Check relationship access error', error, {
        requesterId,
        studentId,
        context
      });
      throw new Error(`Relationship access check failed: ${error.message}`);
    }
  }

  /**
   * Check consent requirements
   * @param {string} studentId - Student ID
   * @param {string} requesterId - Requester ID
   * @param {string} dataType - Data type
   * @param {Object} context - Context
   * @returns {Object} Consent check result
   */
  async checkConsentRequirements(studentId, requesterId, dataType, context) {
    try {
      const consentResult = {
        required: false,
        hasConsent: false,
        consentType: null,
        restrictions: []
      };

      // Determine if consent is required based on data type
      const consentType = this.getConsentTypeForDataType(dataType);
      
      if (consentType) {
        consentResult.required = true;
        consentResult.consentType = consentType;

        // Check for active consent
        const consent = await this.consentManagementService.getActiveConsent(studentId, consentType);
        
        if (consent) {
          consentResult.hasConsent = true;
          consentResult.restrictions = consent.restrictions || [];
        }
      }

      return consentResult;

    } catch (error) {
      await this.logError('Check consent requirements error', error, {
        studentId,
        requesterId,
        dataType,
        context
      });
      throw new Error(`Consent requirements check failed: ${error.message}`);
    }
  }

  /**
   * Check sensitive data requirements
   * @param {string} dataType - Data type
   * @param {Object} requester - Requester information
   * @param {Object} context - Context
   * @returns {Object} Sensitive data check result
   */
  async checkSensitiveDataRequirements(dataType, requester, context) {
    try {
      const sensitiveResult = {
        isSensitive: false,
        requirements: [],
        approvalRequired: false,
        restrictions: []
      };

      // Check if data type is sensitive
      if (this.sensitiveDataRequirements[dataType]) {
        sensitiveResult.isSensitive = true;
        sensitiveResult.requirements = this.sensitiveDataRequirements[dataType];

        // Check if requester has required authorizations
        for (const requirement of sensitiveResult.requirements) {
          const hasRequirement = await this.checkRequirement(requester, requirement, context);
          
          if (!hasRequirement) {
            sensitiveResult.restrictions.push(`Missing requirement: ${requirement}`);
            
            if (requirement.includes('authorization') || requirement.includes('approval')) {
              sensitiveResult.approvalRequired = true;
            }
          }
        }
      }

      return sensitiveResult;

    } catch (error) {
      await this.logError('Check sensitive data requirements error', error, {
        dataType,
        requester,
        context
      });
      throw new Error(`Sensitive data requirements check failed: ${error.message}`);
    }
  }

  /**
   * Check legitimate educational interest
   * @param {string} requesterId - Requester ID
   * @param {string} studentId - Student ID
   * @param {Object} context - Context
   * @returns {Object} Legitimate interest result
   */
  async checkLegitimateEducationalInterest(requesterId, studentId, context) {
    try {
      const interestResult = {
        hasInterest: false,
        reason: '',
        restrictions: []
      };

      // Check if requester is teacher of the student
      const teacherQuery = `
        SELECT * FROM class_enrollments ce
        JOIN classes c ON ce.class_id = c.id
        WHERE ce.student_id = $1 AND c.teacher_id = $2
      `;
      
      const teacherResult = await query(teacherQuery, [studentId, requesterId]);
      
      if (teacherResult.rows.length > 0) {
        interestResult.hasInterest = true;
        interestResult.reason = 'Teacher of student';
        interestResult.restrictions.push('Access limited to educational records relevant to teaching');
        return interestResult;
      }

      // Check if requester is counselor assigned to student
      const counselorQuery = `
        SELECT * FROM student_counselor_assignments
        WHERE student_id = $1 AND counselor_id = $2 AND status = 'active'
      `;
      
      const counselorResult = await query(counselorQuery, [studentId, requesterId]);
      
      if (counselorResult.rows.length > 0) {
        interestResult.hasInterest = true;
        interestResult.reason = 'Assigned counselor';
        interestResult.restrictions.push('Access limited to records relevant to counseling services');
        return interestResult;
      }

      // Check if requester is administrator with oversight responsibility
      const adminQuery = `
        SELECT u.role FROM users u
        WHERE u.id = $1 AND u.role IN ('admin', 'principal', 'superintendent')
      `;
      
      const adminResult = await query(adminQuery, [requesterId]);
      
      if (adminResult.rows.length > 0) {
        interestResult.hasInterest = true;
        interestResult.reason = 'Administrative oversight';
        interestResult.restrictions.push('Access limited to records necessary for administrative functions');
        return interestResult;
      }

      interestResult.reason = 'No legitimate educational interest found';
      return interestResult;

    } catch (error) {
      await this.logError('Check legitimate educational interest error', error, {
        requesterId,
        studentId,
        context
      });
      throw new Error(`Legitimate educational interest check failed: ${error.message}`);
    }
  }

  /**
   * Determine access decision
   * @param {Object} relationshipAccess - Relationship access result
   * @param {Object} consentCheck - Consent check result
   * @param {Object} sensitiveDataCheck - Sensitive data check result
   * @param {Object} dataClassification - Data classification result
   * @returns {boolean} Access allowed
   */
  determineAccessDecision(relationshipAccess, consentCheck, sensitiveDataCheck, dataClassification) {
    // Must have relationship access
    if (!relationshipAccess.hasAccess) {
      return false;
    }

    // Must have consent if required
    if (consentCheck.required && !consentCheck.hasConsent) {
      return false;
    }

    // Must meet sensitive data requirements
    if (sensitiveDataCheck.isSensitive && sensitiveDataCheck.restrictions.length > 0) {
      return false;
    }

    // Check data classification restrictions
    if (dataClassification.sensitivityLevel >= 4) { // RESTRICTED level
      return relationshipAccess.relationshipType === 'parent' || 
             relationshipAccess.relationshipType === 'self';
    }

    return true;
  }

  /**
   * Determine access level
   * @param {string} userRole - User role
   * @param {Object} relationshipAccess - Relationship access result
   * @param {Object} dataClassification - Data classification result
   * @returns {string} Access level
   */
  determineAccessLevel(userRole, relationshipAccess, dataClassification) {
    // Parents and students get full access to their own data
    if (relationshipAccess.relationshipType === 'parent' || 
        relationshipAccess.relationshipType === 'self') {
      return this.accessLevels.FULL;
    }

    // School officials get limited access based on role and data sensitivity
    if (relationshipAccess.relationshipType === 'school_official') {
      if (dataClassification.sensitivityLevel >= 3) { // CONFIDENTIAL or higher
        return this.accessLevels.READ_ONLY;
      }
      return this.accessLevels.LIMITED;
    }

    return this.accessLevels.NONE;
  }

  /**
   * Determine access restrictions
   * @param {Object} dataClassification - Data classification result
   * @param {Object} sensitiveDataCheck - Sensitive data check result
   * @returns {Array} Restrictions
   */
  determineRestrictions(dataClassification, sensitiveDataCheck) {
    const restrictions = [];

    // Add data classification restrictions
    if (dataClassification.restrictions) {
      restrictions.push(...dataClassification.restrictions);
    }

    // Add sensitive data restrictions
    if (sensitiveDataCheck.restrictions) {
      restrictions.push(...sensitiveDataCheck.restrictions);
    }

    return restrictions;
  }

  /**
   * Determine access denial reason
   * @param {Object} relationshipAccess - Relationship access result
   * @param {Object} consentCheck - Consent check result
   * @param {Object} sensitiveDataCheck - Sensitive data check result
   * @returns {string} Denial reason
   */
  determineAccessDenialReason(relationshipAccess, consentCheck, sensitiveDataCheck) {
    if (!relationshipAccess.hasAccess) {
      return 'No valid relationship or legitimate educational interest';
    }

    if (consentCheck.required && !consentCheck.hasConsent) {
      return 'Required consent not obtained';
    }

    if (sensitiveDataCheck.restrictions.length > 0) {
      return `Sensitive data requirements not met: ${sensitiveDataCheck.restrictions.join(', ')}`;
    }

    return 'Access denied';
  }

  /**
   * Check if audit is required
   * @param {Object} dataClassification - Data classification result
   * @param {Object} context - Context
   * @returns {boolean} Audit required
   */
  requiresAudit(dataClassification, context) {
    return dataClassification.sensitivityLevel >= 2 || // INTERNAL or higher
           context.auditRequired === true;
  }

  /**
   * Get requester information
   * @param {string} requesterId - Requester ID
   * @returns {Object} Requester information
   */
  async getRequesterInfo(requesterId) {
    try {
      const queryText = `
        SELECT u.*, ur.role FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        WHERE u.id = $1 AND u.deleted_at IS NULL
      `;

      const result = await query(queryText, [requesterId]);
      return result.rows[0] || null;

    } catch (error) {
      await this.logError('Get requester info error', error, { requesterId });
      throw new Error(`Failed to get requester info: ${error.message}`);
    }
  }

  /**
   * Get student information
   * @param {string} studentId - Student ID
   * @returns {Object} Student information
   */
  async getStudentInfo(studentId) {
    try {
      const queryText = `
        SELECT * FROM students WHERE id = $1 AND deleted_at IS NULL
      `;

      const result = await query(queryText, [studentId]);
      return result.rows[0] || null;

    } catch (error) {
      await this.logError('Get student info error', error, { studentId });
      throw new Error(`Failed to get student info: ${error.message}`);
    }
  }

  /**
   * Check if user is school official
   * @param {string} role - User role
   * @returns {boolean} Is school official
   */
  isSchoolOfficial(role) {
    const schoolOfficialRoles = [
      'teacher', 'administrator', 'counselor', 'nurse', 'coach',
      'librarian', 'support_staff', 'contractor', 'volunteer',
      'principal', 'superintendent'
    ];
    
    return schoolOfficialRoles.includes(role);
  }

  /**
   * Determine school official access level
   * @param {string} role - User role
   * @returns {string} Access level
   */
  determineSchoolOfficialAccessLevel(role) {
    const accessLevels = {
      teacher: this.accessLevels.LIMITED,
      counselor: this.accessLevels.LIMITED,
      nurse: this.accessLevels.LIMITED,
      administrator: this.accessLevels.FULL,
      principal: this.accessLevels.FULL,
      superintendent: this.accessLevels.ADMIN
    };

    return accessLevels[role] || this.accessLevels.READ_ONLY;
  }

  /**
   * Get consent type for data type
   * @param {string} dataType - Data type
   * @returns {string|null} Consent type
   */
  getConsentTypeForDataType(dataType) {
    const consentTypeMap = {
      'ssn': 'FERPA_EDUCATIONAL_RECORDS',
      'medical_records': 'FERPA_EDUCATIONAL_RECORDS',
      'disciplinary_records': 'FERPA_EDUCATIONAL_RECORDS',
      'special_education': 'SPECIAL_EDUCATION',
      'financial_information': 'THIRD_PARTY_SHARING',
      'directory_information': 'DIRECTORY_INFORMATION'
    };

    return consentTypeMap[dataType] || null;
  }

  /**
   * Check if requester has specific requirement
   * @param {Object} requester - Requester information
   * @param {string} requirement - Requirement to check
   * @param {Object} context - Context
   * @returns {boolean} Has requirement
   */
  async checkRequirement(requester, requirement, context) {
    try {
      switch (requirement) {
        case 'explicit_consent':
          return context.hasExplicitConsent === true;
        
        case 'audit_logging':
          return true; // Always enabled
        
        case 'encryption':
          return true; // Always enabled
        
        case 'health_authorization':
          return requester.role === 'nurse' || 
                 requester.role === 'administrator' ||
                 requester.role === 'principal';
        
        case 'administrative_approval':
          return requester.role === 'administrator' ||
                 requester.role === 'principal' ||
                 requester.role === 'superintendent';
        
        case 'special_education_authorization':
          return requester.role === 'counselor' ||
                 requester.role === 'administrator' ||
                 requester.role === 'principal';
        
        case 'financial_authorization':
          return requester.role === 'administrator' ||
                 requester.role === 'principal' ||
                 requester.role === 'superintendent';
        
        default:
          return false;
      }

    } catch (error) {
      await this.logError('Check requirement error', error, {
        requester,
        requirement,
        context
      });
      return false;
    }
  }

  /**
   * Calculate age from birth date
   * @param {string} birthDate - Birth date
   * @returns {number} Age in years
   */
  calculateAge(birthDate) {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  }

  /**
   * Log access attempt
   * @param {string} requesterId - Requester ID
   * @param {string} studentId - Student ID
   * @param {string} dataType - Data type
   * @param {Object} accessResult - Access result
   * @param {Object} context - Context
   * @returns {void}
   */
  async logAccessAttempt(requesterId, studentId, dataType, accessResult, context) {
    try {
      const queryText = `
        INSERT INTO access_control_logs (
          requester_id, student_id, data_type, access_granted, access_level,
          restrictions, audit_required, consent_required, approval_required,
          context_data, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      `;

      await query(queryText, [
        requesterId,
        studentId,
        dataType,
        accessResult.allowed,
        accessResult.accessLevel,
        JSON.stringify(accessResult.restrictions),
        accessResult.auditRequired,
        accessResult.consentRequired,
        accessResult.approvalRequired,
        JSON.stringify(context)
      ]);

    } catch (error) {
      await this.logError('Log access attempt error', error, {
        requesterId,
        studentId,
        dataType,
        accessResult,
        context
      });
    }
  }

  /**
   * Log error with context
   * @param {string} message - Error message
   * @param {Error} error - Error object
   * @param {Object} context - Additional context
   * @returns {void}
   */
  async logError(message, error, context = {}) {
    try {
      const queryText = `
        INSERT INTO access_control_error_logs (
          error_message, error_stack, context_data, created_at
        ) VALUES ($1, $2, $3, NOW())
      `;

      await query(queryText, [
        message,
        error.stack || error.message,
        JSON.stringify(context)
      ]);

    } catch (logError) {
      // If logging fails, we can't use console.error, so we silently fail
    }
  }
}

module.exports = AccessControlService;
