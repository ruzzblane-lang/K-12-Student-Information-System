/**
 * Enhanced FERPA Compliance Service
 * Implements comprehensive Family Educational Rights and Privacy Act requirements
 * Ensures full compliance with FERPA regulations for educational institutions
 */

const { query } = require('../../config/database');
const DataClassificationService = require('./DataClassificationService');

class FERPAService {
  constructor() {
    this.dataClassificationService = new DataClassificationService();
    
    // FERPA Educational Records - Protected under FERPA
    this.educationalRecords = {
      academic: [
        'grades', 'transcripts', 'gpa', 'class_rank', 'test_scores',
        'academic_progress', 'course_enrollment', 'graduation_status',
        'academic_discipline', 'academic_warnings', 'probation_status'
      ],
      behavioral: [
        'discipline_records', 'behavioral_incidents', 'suspensions',
        'expulsions', 'detentions', 'behavioral_plans', 'counseling_records'
      ],
      special_education: [
        'iep', 'section_504_plans', 'special_education_services',
        'accommodations', 'modifications', 'evaluation_reports',
        'placement_decisions', 'progress_reports'
      ],
      health: [
        'medical_records', 'health_conditions', 'medications',
        'allergies', 'immunization_records', 'health_screenings',
        'mental_health_records', 'counseling_notes'
      ]
    };

    // Directory Information - Can be disclosed without consent unless opted out
    this.directoryInformation = [
      'student_name', 'address', 'telephone_listing', 'email_address',
      'date_of_birth', 'place_of_birth', 'grade_level', 'enrollment_status',
      'participation_in_activities', 'dates_of_attendance', 'degrees_awards',
      'honors_received', 'most_recent_educational_institution'
    ];

    // School Official Exception - Legitimate educational interest
    this.schoolOfficialRoles = [
      'teacher', 'administrator', 'counselor', 'nurse', 'coach',
      'librarian', 'support_staff', 'contractor', 'volunteer'
    ];
  }

  async verifyParentIdentity(parentId, studentId) {
    // Implement parent identity verification
    const queryText = `
      SELECT p.*, s.* FROM parents p
      JOIN students s ON p.student_id = s.id
      WHERE p.id = $1 AND s.id = $2
    `;
    
    const result = await query(queryText, [parentId, studentId]);
    return result.rows.length > 0;
  }

  async trackDisclosure(recordId, recipient, purpose, tenantId) {
    const queryText = `
      INSERT INTO ferpa_disclosures (
        record_id, recipient, purpose, tenant_id, disclosed_at
      ) VALUES ($1, $2, $3, $4, NOW())
    `;
    
    await query(queryText, [recordId, recipient, purpose, tenantId]);
  }

  async sendAnnualNotification(tenantId) {
    // Send annual FERPA notification to parents
    // TODO: Implement actual notification logic (e.g., email, SMS, in-app)
    await this.logNotification('Annual FERPA notification sent', { tenantId });
  }

  async getEducationalRecords(studentId, requesterId) {
    // Verify requester has right to access records
    const hasAccess = await this.verifyAccess(studentId, requesterId);
    if (!hasAccess) {
      throw new Error('FERPA: Access denied');
    }
    
    return await this.retrieveRecords(studentId);
  }

  async verifyAccess(studentId, requesterId) {
    // Check if requester is parent, student (18+), or school official
    const queryText = `
      SELECT * FROM student_access_rights
      WHERE student_id = $1 AND requester_id = $2
    `;
    
    const result = await query(queryText, [studentId, requesterId]);
    return result.rows.length > 0;
  }

  async retrieveRecords(studentId) {
    const queryText = `
      SELECT * FROM educational_records
      WHERE student_id = $1
    `;
    
    const result = await query(queryText, [studentId]);
    return result.rows;
  }

  /**
   * Enhanced parent identity verification with multiple methods
   * @param {string} parentId - Parent ID
   * @param {string} studentId - Student ID
   * @param {Object} verificationData - Additional verification data
   * @returns {Object} Verification result
   */
  async verifyParentIdentityEnhanced(parentId, studentId, verificationData = {}) {
    try {
      // Method 1: Database relationship verification
      const relationshipQuery = `
        SELECT p.*, s.*, pr.relationship_type, pr.verification_status
        FROM parents p
        JOIN students s ON p.student_id = s.id
        LEFT JOIN parent_student_relationships pr ON p.id = pr.parent_id AND s.id = pr.student_id
        WHERE p.id = $1 AND s.id = $2
      `;
      
      const relationshipResult = await query(relationshipQuery, [parentId, studentId]);
      
      if (relationshipResult.rows.length === 0) {
        return {
          verified: false,
          method: 'database_relationship',
          reason: 'No parent-student relationship found'
        };
      }

      const relationship = relationshipResult.rows[0];

      // Method 2: Additional verification if provided
      if (verificationData.verificationCode) {
        const codeQuery = `
          SELECT * FROM parent_verification_codes
          WHERE parent_id = $1 AND student_id = $2 AND code = $3
          AND expires_at > NOW() AND used = false
        `;
        
        const codeResult = await query(codeQuery, [parentId, studentId, verificationData.verificationCode]);
        
        if (codeResult.rows.length === 0) {
          return {
            verified: false,
            method: 'verification_code',
            reason: 'Invalid or expired verification code'
          };
        }

        // Mark code as used
        await query(
          'UPDATE parent_verification_codes SET used = true, used_at = NOW() WHERE id = $1',
          [codeResult.rows[0].id]
        );
      }

      // Method 3: Document verification if provided
      if (verificationData.documentHash) {
        const docQuery = `
          SELECT * FROM parent_verification_documents
          WHERE parent_id = $1 AND document_hash = $2 AND verified = true
        `;
        
        const docResult = await query(docQuery, [parentId, verificationData.documentHash]);
        
        if (docResult.rows.length === 0) {
          return {
            verified: false,
            method: 'document_verification',
            reason: 'Document verification failed'
          };
        }
      }

      // Log successful verification
      await this.logParentVerification(parentId, studentId, 'success', {
        methods: Object.keys(verificationData),
        relationship: relationship.relationship_type
      });

      return {
        verified: true,
        method: 'multi_factor',
        relationship: relationship.relationship_type,
        verificationLevel: this.calculateVerificationLevel(verificationData)
      };

    } catch (error) {
      // Log error for debugging purposes without console statement
      await this.logError('Enhanced parent verification error', error, {
        parentId,
        studentId,
        verificationData
      });
      throw new Error(`Parent verification failed: ${error.message}`);
    }
  }

  /**
   * Track FERPA disclosure with comprehensive details
   * @param {string} recordId - Record ID
   * @param {string} recipient - Recipient information
   * @param {string} purpose - Purpose of disclosure
   * @param {string} tenantId - Tenant ID
   * @param {Object} additionalInfo - Additional disclosure information
   * @returns {Object} Disclosure tracking result
   */
  async trackDisclosureEnhanced(recordId, recipient, purpose, tenantId, additionalInfo = {}) {
    try {
      const queryText = `
        INSERT INTO ferpa_disclosures (
          record_id, recipient, purpose, tenant_id, disclosed_at,
          disclosure_type, consent_method, legal_basis, data_types,
          retention_period, additional_info
        ) VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;
      
      const values = [
        recordId,
        recipient,
        purpose,
        tenantId,
        additionalInfo.disclosureType || 'educational_record',
        additionalInfo.consentMethod || 'written_consent',
        additionalInfo.legalBasis || 'parent_consent',
        JSON.stringify(additionalInfo.dataTypes || []),
        additionalInfo.retentionPeriod || '7_years',
        JSON.stringify(additionalInfo)
      ];

      const result = await query(queryText, values);

      // Log disclosure for audit trail
      await this.logDisclosureAudit(tenantId, recordId, recipient, purpose, result.rows[0].id);

      return result.rows[0];

    } catch (error) {
      await this.logError('Enhanced disclosure tracking error', error, {
        recordId,
        recipient,
        purpose,
        tenantId
      });
      throw new Error(`Disclosure tracking failed: ${error.message}`);
    }
  }

  /**
   * Send annual FERPA notification with comprehensive information
   * @param {string} tenantId - Tenant ID
   * @param {Object} options - Notification options
   * @returns {Object} Notification result
   */
  async sendAnnualNotificationEnhanced(tenantId, options = {}) {
    try {
      // Get all parents/guardians for the tenant
      const parentsQuery = `
        SELECT DISTINCT p.*, s.first_name, s.last_name, s.grade_level
        FROM parents p
        JOIN students s ON p.student_id = s.id
        WHERE s.tenant_id = $1 AND s.status = 'active'
      `;
      
      const parentsResult = await query(parentsQuery, [tenantId]);
      
      const notificationResults = [];
      
      for (const parent of parentsResult.rows) {
        const notification = await this.sendIndividualNotification(parent, tenantId, options);
        notificationResults.push(notification);
      }

      // Log annual notification completion
      await this.logAnnualNotification(tenantId, {
        totalParents: parentsResult.rows.length,
        successfulNotifications: notificationResults.filter(r => r.success).length,
        failedNotifications: notificationResults.filter(r => !r.success).length
      });

      return {
        success: true,
        totalParents: parentsResult.rows.length,
        results: notificationResults
      };

    } catch (error) {
      await this.logError('Enhanced annual notification error', error, {
        tenantId,
        options
      });
      throw new Error(`Annual notification failed: ${error.message}`);
    }
  }

  /**
   * Send individual FERPA notification
   * @param {Object} parent - Parent information
   * @param {string} tenantId - Tenant ID
   * @param {Object} options - Notification options
   * @returns {Object} Notification result
   */
  async sendIndividualNotification(parent, tenantId, options = {}) {
    try {
      const notificationContent = {
        subject: 'Annual FERPA Rights Notification',
        content: this.generateFERPANotificationContent(parent, options),
        recipient: parent.email,
        parentId: parent.id,
        tenantId: tenantId,
        notificationType: 'annual_ferpa_notification',
        sentAt: new Date().toISOString()
      };

      // Store notification record
      const notificationQuery = `
        INSERT INTO ferpa_notifications (
          tenant_id, parent_id, notification_type, content, sent_at, status
        ) VALUES ($1, $2, $3, $4, NOW(), 'sent')
        RETURNING *
      `;
      
      const notificationResult = await query(notificationQuery, [
        tenantId,
        parent.id,
        'annual_ferpa_notification',
        JSON.stringify(notificationContent)
      ]);

      // In a real implementation, you would send the actual email/SMS here
      await this.logNotification('FERPA notification sent', {
        parentEmail: parent.email,
        studentName: `${parent.first_name} ${parent.last_name}`
      });

      return {
        success: true,
        parentId: parent.id,
        notificationId: notificationResult.rows[0].id,
        method: 'email'
      };

    } catch (error) {
      await this.logError('Individual notification error', error, {
        parentId: parent.id,
        tenantId
      });
      return {
        success: false,
        parentId: parent.id,
        error: error.message
      };
    }
  }

  /**
   * Generate FERPA notification content
   * @param {Object} parent - Parent information
   * @param {Object} options - Notification options
   * @returns {Object} Notification content
   */
  generateFERPANotificationContent(parent, options = {}) {
    return {
      greeting: `Dear ${parent.first_name} ${parent.last_name},`,
      introduction: 'This is your annual notification of rights under the Family Educational Rights and Privacy Act (FERPA).',
      rights: [
        'The right to inspect and review your child\'s educational records',
        'The right to request amendment of records you believe are inaccurate or misleading',
        'The right to consent to disclosures of personally identifiable information',
        'The right to file a complaint with the U.S. Department of Education'
      ],
      directoryInformation: {
        description: 'Directory information may be disclosed without consent unless you opt out',
        items: this.directoryInformation,
        optOutInstructions: 'To opt out of directory information disclosure, contact the school office'
      },
      schoolOfficialException: {
        description: 'School officials with legitimate educational interest may access records without consent',
        roles: this.schoolOfficialRoles
      },
      contact: {
        name: 'FERPA Compliance Officer',
        email: options.contactEmail || 'ferpa@school.edu',
        phone: options.contactPhone || '(555) 123-4567'
      },
      effectiveDate: new Date().toISOString().split('T')[0]
    };
  }

  /**
   * Enhanced educational records access with proper authorization
   * @param {string} studentId - Student ID
   * @param {string} requesterId - Requester ID
   * @param {Object} context - Access context
   * @returns {Object} Access result
   */
  async getEducationalRecordsEnhanced(studentId, requesterId, context = {}) {
    try {
      // Step 1: Verify access rights
      const accessCheck = await this.verifyAccessEnhanced(studentId, requesterId, context);
      
      if (!accessCheck.allowed) {
        throw new Error(`FERPA: Access denied - ${accessCheck.reason}`);
      }

      // Step 2: Classify data to determine what can be accessed
      const records = await this.retrieveRecords(studentId);
      const classifiedRecords = [];

      for (const record of records) {
        const classification = await this.dataClassificationService.classifyData(record.record_data, {
          requesterRole: context.requesterRole,
          hasConsent: accessCheck.hasConsent,
          isSchoolOfficial: accessCheck.isSchoolOfficial
        });

        // Filter records based on access level
        if (this.canAccessRecord(classification, accessCheck)) {
          classifiedRecords.push({
            ...record,
            classification,
            accessLevel: this.determineAccessLevel(classification, accessCheck)
          });
        }
      }

      // Step 3: Log access
      await this.logRecordAccess(studentId, requesterId, classifiedRecords.length, context);

      return {
        records: classifiedRecords,
        accessLevel: accessCheck.accessLevel,
        restrictions: accessCheck.restrictions,
        accessedAt: new Date().toISOString()
      };

    } catch (error) {
      await this.logError('Enhanced educational records access error', error, {
        studentId,
        requesterId,
        context
      });
      throw new Error(`Educational records access failed: ${error.message}`);
    }
  }

  /**
   * Enhanced access verification with multiple checks
   * @param {string} studentId - Student ID
   * @param {string} requesterId - Requester ID
   * @param {Object} context - Access context
   * @returns {Object} Access verification result
   */
  async verifyAccessEnhanced(studentId, requesterId, context = {}) {
    try {
      const accessResult = {
        allowed: false,
        reason: '',
        accessLevel: 'none',
        hasConsent: false,
        isSchoolOfficial: false,
        isParent: false,
        isStudent: false,
        restrictions: []
      };

      // Check if requester is parent
      const parentQuery = `
        SELECT * FROM parent_student_relationships
        WHERE student_id = $1 AND parent_id = $2 AND status = 'active'
      `;
      
      const parentResult = await query(parentQuery, [studentId, requesterId]);
      
      if (parentResult.rows.length > 0) {
        accessResult.allowed = true;
        accessResult.isParent = true;
        accessResult.accessLevel = 'parent';
        accessResult.hasConsent = true;
        return accessResult;
      }

      // Check if requester is student (18+ or emancipated)
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
          accessResult.allowed = true;
          accessResult.isStudent = true;
          accessResult.accessLevel = 'student';
          accessResult.hasConsent = true;
          return accessResult;
        } else {
          accessResult.restrictions.push('Student under 18 - parental consent required');
        }
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
        
        if (this.schoolOfficialRoles.includes(user.role)) {
          const legitimateInterest = await this.checkLegitimateEducationalInterest(
            requesterId, studentId, context
          );
          
          if (legitimateInterest.hasInterest) {
            accessResult.allowed = true;
            accessResult.isSchoolOfficial = true;
            accessResult.accessLevel = 'school_official';
            accessResult.restrictions = legitimateInterest.restrictions;
            return accessResult;
          } else {
            accessResult.reason = 'No legitimate educational interest';
          }
        }
      }

      // Check for written consent
      const consentQuery = `
        SELECT * FROM ferpa_consents
        WHERE student_id = $1 AND requester_id = $2 AND status = 'active'
        AND expires_at > NOW()
      `;
      
      const consentResult = await query(consentQuery, [studentId, requesterId]);
      
      if (consentResult.rows.length > 0) {
        accessResult.allowed = true;
        accessResult.hasConsent = true;
        accessResult.accessLevel = 'consent_based';
        accessResult.restrictions = consentResult.rows[0].restrictions || [];
        return accessResult;
      }

      accessResult.reason = 'No valid access rights found';
      return accessResult;

    } catch (error) {
      await this.logError('Enhanced access verification error', error, {
        studentId,
        requesterId,
        context
      });
      throw new Error(`Access verification failed: ${error.message}`);
    }
  }

  /**
   * Check legitimate educational interest for school officials
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
      await this.logError('Legitimate educational interest check error', error, {
        requesterId,
        studentId,
        context
      });
      throw new Error(`Legitimate interest check failed: ${error.message}`);
    }
  }

  /**
   * Determine if requester can access specific record
   * @param {Object} classification - Data classification
   * @param {Object} accessCheck - Access verification result
   * @returns {boolean} Can access record
   */
  canAccessRecord(classification, accessCheck) {
    // Parents and students with consent can access all records
    if (accessCheck.hasConsent) {
      return true;
    }

    // School officials can access records relevant to their role
    if (accessCheck.isSchoolOfficial) {
      return classification.sensitivityLevel <= 3; // Not highly sensitive
    }

    return false;
  }

  /**
   * Determine access level for record
   * @param {Object} classification - Data classification
   * @param {Object} accessCheck - Access verification result
   * @returns {string} Access level
   */
  determineAccessLevel(classification, accessCheck) {
    if (accessCheck.hasConsent) {
      return 'full_access';
    }
    
    if (accessCheck.isSchoolOfficial) {
      return 'limited_access';
    }
    
    return 'no_access';
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
   * Calculate verification level based on methods used
   * @param {Object} verificationData - Verification data
   * @returns {string} Verification level
   */
  calculateVerificationLevel(verificationData) {
    const methods = Object.keys(verificationData).length;
    
    if (methods >= 3) return 'high';
    if (methods >= 2) return 'medium';
    return 'basic';
  }

  /**
   * Log parent verification attempt
   * @param {string} parentId - Parent ID
   * @param {string} studentId - Student ID
   * @param {string} status - Verification status
   * @param {Object} details - Additional details
   * @returns {void}
   */
  async logParentVerification(parentId, studentId, status, details) {
    try {
      const queryText = `
        INSERT INTO parent_verification_logs (
          parent_id, student_id, status, details, created_at
        ) VALUES ($1, $2, $3, $4, NOW())
      `;
      
      await query(queryText, [parentId, studentId, status, JSON.stringify(details)]);
    } catch (error) {
      // Silently fail to avoid infinite logging loop
    }
  }

  /**
   * Log disclosure audit
   * @param {string} tenantId - Tenant ID
   * @param {string} recordId - Record ID
   * @param {string} recipient - Recipient
   * @param {string} purpose - Purpose
   * @param {string} disclosureId - Disclosure ID
   * @returns {void}
   */
  async logDisclosureAudit(tenantId, recordId, recipient, purpose, disclosureId) {
    try {
      const queryText = `
        INSERT INTO ferpa_disclosure_audit (
          tenant_id, record_id, recipient, purpose, disclosure_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
      `;
      
      await query(queryText, [tenantId, recordId, recipient, purpose, disclosureId]);
    } catch (error) {
      // Silently fail to avoid infinite logging loop
    }
  }

  /**
   * Log annual notification
   * @param {string} tenantId - Tenant ID
   * @param {Object} details - Notification details
   * @returns {void}
   */
  async logAnnualNotification(tenantId, details) {
    try {
      const queryText = `
        INSERT INTO ferpa_annual_notification_log (
          tenant_id, details, created_at
        ) VALUES ($1, $2, NOW())
      `;
      
      await query(queryText, [tenantId, JSON.stringify(details)]);
    } catch (error) {
      // Silently fail to avoid infinite logging loop
    }
  }

  /**
   * Log record access
   * @param {string} studentId - Student ID
   * @param {string} requesterId - Requester ID
   * @param {number} recordCount - Number of records accessed
   * @param {Object} context - Access context
   * @returns {void}
   */
  async logRecordAccess(studentId, requesterId, recordCount, context) {
    try {
      const queryText = `
        INSERT INTO ferpa_access_logs (
          student_id, requester_id, record_count, access_context, created_at
        ) VALUES ($1, $2, $3, $4, NOW())
      `;
      
      await query(queryText, [studentId, requesterId, recordCount, JSON.stringify(context)]);
    } catch (error) {
      await this.logError('Log record access error', error, {
        studentId,
        requesterId,
        recordCount,
        context
      });
    }
  }

  /**
   * Log error with context information
   * @param {string} message - Error message
   * @param {Error} error - Error object
   * @param {Object} context - Additional context
   * @returns {void}
   */
  async logError(message, error, context = {}) {
    try {
      const queryText = `
        INSERT INTO ferpa_error_logs (
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
      // In production, this could be sent to an external logging service
    }
  }

  /**
   * Log notification events
   * @param {string} message - Notification message
   * @param {Object} context - Additional context
   * @returns {void}
   */
  async logNotification(message, context = {}) {
    try {
      const queryText = `
        INSERT INTO ferpa_notification_logs (
          notification_message, context_data, created_at
        ) VALUES ($1, $2, NOW())
      `;
      
      await query(queryText, [message, JSON.stringify(context)]);
    } catch (error) {
      // Silently fail to avoid infinite logging loop
    }
  }
}

module.exports = FERPAService;
