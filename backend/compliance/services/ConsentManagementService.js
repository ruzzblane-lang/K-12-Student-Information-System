/**
 * Consent Management Service
 * Implements comprehensive consent management for FERPA compliance
 * Handles explicit consent for data sharing, directory information opt-outs, and parental consent
 */

const { query } = require('../../config/database');

class ConsentManagementService {
  constructor() {
    this.consentTypes = {
      FERPA_EDUCATIONAL_RECORDS: 'ferpa_educational_records',
      DIRECTORY_INFORMATION: 'directory_information',
      THIRD_PARTY_SHARING: 'third_party_sharing',
      RESEARCH_PARTICIPATION: 'research_participation',
      PHOTO_VIDEO_RELEASE: 'photo_video_release',
      TRANSPORTATION: 'transportation',
      MEDICAL_TREATMENT: 'medical_treatment',
      EMERGENCY_CONTACT: 'emergency_contact',
      SPECIAL_EDUCATION: 'special_education',
      DISCIPLINARY_ACTION: 'disciplinary_action'
    };

    this.consentStatuses = {
      PENDING: 'pending',
      GRANTED: 'granted',
      DENIED: 'denied',
      EXPIRED: 'expired',
      REVOKED: 'revoked',
      WITHDRAWN: 'withdrawn'
    };

    this.consentMethods = {
      WRITTEN: 'written',
      ELECTRONIC: 'electronic',
      VERBAL: 'verbal',
      IMPLIED: 'implied',
      PARENTAL_SIGNATURE: 'parental_signature',
      STUDENT_SIGNATURE: 'student_signature'
    };
  }

  /**
   * Create consent record for student/parent
   * @param {string} studentId - Student ID
   * @param {string} parentId - Parent ID (optional for students 18+)
   * @param {string} consentType - Type of consent
   * @param {string} tenantId - Tenant ID
   * @param {Object} options - Consent options
   * @returns {Object} Created consent record
   */
  async createConsent(studentId, parentId, consentType, tenantId, options = {}) {
    try {
      // Validate consent type
      if (!Object.values(this.consentTypes).includes(consentType)) {
        throw new Error(`Invalid consent type: ${consentType}`);
      }

      // Check if student is 18+ and can provide their own consent
      const student = await this.getStudentInfo(studentId);
      const canStudentConsent = this.canStudentProvideConsent(student);

      if (!parentId && !canStudentConsent) {
        throw new Error('Parental consent required for students under 18');
      }

      // Check for existing consent
      const existingConsent = await this.getActiveConsent(studentId, consentType);
      if (existingConsent) {
        throw new Error('Active consent already exists for this type');
      }

      const queryText = `
        INSERT INTO ferpa_consents (
          student_id, parent_id, consent_type, tenant_id, status, consent_method,
          granted_at, expires_at, restrictions, data_types, purpose, legal_basis,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
        RETURNING *
      `;

      const values = [
        studentId,
        parentId,
        consentType,
        tenantId,
        this.consentStatuses.PENDING,
        options.consentMethod || this.consentMethods.WRITTEN,
        null, // granted_at - will be set when consent is granted
        options.expiresAt || this.calculateExpirationDate(consentType),
        JSON.stringify(options.restrictions || []),
        JSON.stringify(options.dataTypes || []),
        options.purpose || this.getDefaultPurpose(consentType),
        options.legalBasis || this.getDefaultLegalBasis(consentType)
      ];

      const result = await query(queryText, values);

      // Log consent creation
      await this.logConsentAction('created', result.rows[0].id, {
        studentId,
        parentId,
        consentType,
        tenantId
      });

      return result.rows[0];

    } catch (error) {
      await this.logError('Create consent error', error, {
        studentId,
        parentId,
        consentType,
        tenantId
      });
      throw new Error(`Consent creation failed: ${error.message}`);
    }
  }

  /**
   * Grant consent
   * @param {string} consentId - Consent ID
   * @param {string} grantedBy - User ID who granted consent
   * @param {Object} options - Grant options
   * @returns {Object} Updated consent record
   */
  async grantConsent(consentId, grantedBy, options = {}) {
    try {
      const queryText = `
        UPDATE ferpa_consents 
        SET status = $1, granted_at = NOW(), granted_by = $2, 
            consent_method = $3, updated_at = NOW()
        WHERE id = $4 AND status = $5
        RETURNING *
      `;

      const values = [
        this.consentStatuses.GRANTED,
        grantedBy,
        options.consentMethod || this.consentMethods.WRITTEN,
        consentId,
        this.consentStatuses.PENDING
      ];

      const result = await query(queryText, values);

      if (result.rows.length === 0) {
        throw new Error('Consent not found or already processed');
      }

      // Log consent grant
      await this.logConsentAction('granted', consentId, {
        grantedBy,
        consentMethod: options.consentMethod
      });

      return result.rows[0];

    } catch (error) {
      await this.logError('Grant consent error', error, {
        consentId,
        grantedBy
      });
      throw new Error(`Consent grant failed: ${error.message}`);
    }
  }

  /**
   * Deny consent
   * @param {string} consentId - Consent ID
   * @param {string} deniedBy - User ID who denied consent
   * @param {string} reason - Reason for denial
   * @returns {Object} Updated consent record
   */
  async denyConsent(consentId, deniedBy, reason) {
    try {
      const queryText = `
        UPDATE ferpa_consents 
        SET status = $1, denied_at = NOW(), denied_by = $2, 
            denial_reason = $3, updated_at = NOW()
        WHERE id = $4 AND status = $5
        RETURNING *
      `;

      const values = [
        this.consentStatuses.DENIED,
        deniedBy,
        reason,
        consentId,
        this.consentStatuses.PENDING
      ];

      const result = await query(queryText, values);

      if (result.rows.length === 0) {
        throw new Error('Consent not found or already processed');
      }

      // Log consent denial
      await this.logConsentAction('denied', consentId, {
        deniedBy,
        reason
      });

      return result.rows[0];

    } catch (error) {
      await this.logError('Deny consent error', error, {
        consentId,
        deniedBy,
        reason
      });
      throw new Error(`Consent denial failed: ${error.message}`);
    }
  }

  /**
   * Revoke consent
   * @param {string} consentId - Consent ID
   * @param {string} revokedBy - User ID who revoked consent
   * @param {string} reason - Reason for revocation
   * @returns {Object} Updated consent record
   */
  async revokeConsent(consentId, revokedBy, reason) {
    try {
      const queryText = `
        UPDATE ferpa_consents 
        SET status = $1, revoked_at = NOW(), revoked_by = $2, 
            revocation_reason = $3, updated_at = NOW()
        WHERE id = $4 AND status = $5
        RETURNING *
      `;

      const values = [
        this.consentStatuses.REVOKED,
        revokedBy,
        reason,
        consentId,
        this.consentStatuses.GRANTED
      ];

      const result = await query(queryText, values);

      if (result.rows.length === 0) {
        throw new Error('Consent not found or not granted');
      }

      // Log consent revocation
      await this.logConsentAction('revoked', consentId, {
        revokedBy,
        reason
      });

      // Handle data deletion if required
      await this.handleConsentRevocation(consentId, result.rows[0]);

      return result.rows[0];

    } catch (error) {
      await this.logError('Revoke consent error', error, {
        consentId,
        revokedBy,
        reason
      });
      throw new Error(`Consent revocation failed: ${error.message}`);
    }
  }

  /**
   * Get active consent for student and type
   * @param {string} studentId - Student ID
   * @param {string} consentType - Consent type
   * @returns {Object|null} Active consent record
   */
  async getActiveConsent(studentId, consentType) {
    try {
      const queryText = `
        SELECT * FROM ferpa_consents
        WHERE student_id = $1 AND consent_type = $2 
        AND status = $3 AND (expires_at IS NULL OR expires_at > NOW())
        ORDER BY created_at DESC
        LIMIT 1
      `;

      const result = await query(queryText, [studentId, consentType, this.consentStatuses.GRANTED]);
      return result.rows[0] || null;

    } catch (error) {
      await this.logError('Get active consent error', error, {
        studentId,
        consentType
      });
      throw new Error(`Failed to get active consent: ${error.message}`);
    }
  }

  /**
   * Get all consents for student
   * @param {string} studentId - Student ID
   * @param {Object} options - Query options
   * @returns {Array} Consent records
   */
  async getStudentConsents(studentId, options = {}) {
    try {
      let queryText = `
        SELECT * FROM ferpa_consents
        WHERE student_id = $1
      `;
      
      const values = [studentId];

      if (options.status) {
        queryText += ` AND status = $${values.length + 1}`;
        values.push(options.status);
      }

      if (options.consentType) {
        queryText += ` AND consent_type = $${values.length + 1}`;
        values.push(options.consentType);
      }

      queryText += ` ORDER BY created_at DESC`;

      if (options.limit) {
        queryText += ` LIMIT $${values.length + 1}`;
        values.push(options.limit);
      }

      const result = await query(queryText, values);
      return result.rows;

    } catch (error) {
      await this.logError('Get student consents error', error, {
        studentId,
        options
      });
      throw new Error(`Failed to get student consents: ${error.message}`);
    }
  }

  /**
   * Check if consent exists and is valid
   * @param {string} studentId - Student ID
   * @param {string} consentType - Consent type
   * @param {Object} context - Additional context
   * @returns {Object} Consent validation result
   */
  async validateConsent(studentId, consentType, context = {}) {
    try {
      const consent = await this.getActiveConsent(studentId, consentType);
      
      if (!consent) {
        return {
          valid: false,
          reason: 'No active consent found',
          consent: null
        };
      }

      // Check if consent has expired
      if (consent.expires_at && new Date(consent.expires_at) < new Date()) {
        // Mark as expired
        await this.expireConsent(consent.id);
        return {
          valid: false,
          reason: 'Consent has expired',
          consent: null
        };
      }

      // Check restrictions
      const restrictions = consent.restrictions || [];
      if (restrictions.length > 0) {
        const restrictionViolations = this.checkRestrictions(restrictions, context);
        if (restrictionViolations.length > 0) {
          return {
            valid: false,
            reason: 'Consent restrictions violated',
            violations: restrictionViolations,
            consent
          };
        }
      }

      return {
        valid: true,
        reason: 'Consent is valid',
        consent
      };

    } catch (error) {
      await this.logError('Validate consent error', error, {
        studentId,
        consentType,
        context
      });
      throw new Error(`Consent validation failed: ${error.message}`);
    }
  }

  /**
   * Create directory information opt-out
   * @param {string} studentId - Student ID
   * @param {string} parentId - Parent ID
   * @param {string} tenantId - Tenant ID
   * @param {Object} options - Opt-out options
   * @returns {Object} Created opt-out record
   */
  async createDirectoryOptOut(studentId, parentId, tenantId, options = {}) {
    try {
      // Check if student is 18+ and can opt out themselves
      const student = await this.getStudentInfo(studentId);
      const canStudentOptOut = this.canStudentProvideConsent(student);

      if (!parentId && !canStudentOptOut) {
        throw new Error('Parental consent required for students under 18');
      }

      // Check for existing opt-out
      const existingOptOut = await this.getDirectoryOptOut(studentId);
      if (existingOptOut) {
        throw new Error('Directory information opt-out already exists');
      }

      const queryText = `
        INSERT INTO directory_information_opt_outs (
          student_id, parent_id, tenant_id, opt_out_items, reason,
          effective_date, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING *
      `;

      const values = [
        studentId,
        parentId,
        JSON.stringify(options.optOutItems || this.directoryInformation),
        options.reason || 'Privacy preference',
        options.effectiveDate || new Date().toISOString()
      ];

      const result = await query(queryText, values);

      // Log opt-out creation
      await this.logConsentAction('directory_opt_out_created', result.rows[0].id, {
        studentId,
        parentId,
        tenantId
      });

      return result.rows[0];

    } catch (error) {
      await this.logError('Create directory opt-out error', error, {
        studentId,
        parentId,
        tenantId
      });
      throw new Error(`Directory opt-out creation failed: ${error.message}`);
    }
  }

  /**
   * Get directory information opt-out
   * @param {string} studentId - Student ID
   * @returns {Object|null} Opt-out record
   */
  async getDirectoryOptOut(studentId) {
    try {
      const queryText = `
        SELECT * FROM directory_information_opt_outs
        WHERE student_id = $1 AND effective_date <= NOW()
        ORDER BY created_at DESC
        LIMIT 1
      `;

      const result = await query(queryText, [studentId]);
      return result.rows[0] || null;

    } catch (error) {
      await this.logError('Get directory opt-out error', error, {
        studentId
      });
      throw new Error(`Failed to get directory opt-out: ${error.message}`);
    }
  }

  /**
   * Check if directory information can be disclosed
   * @param {string} studentId - Student ID
   * @param {string} informationType - Type of directory information
   * @returns {Object} Disclosure check result
   */
  async canDiscloseDirectoryInformation(studentId, informationType) {
    try {
      const optOut = await this.getDirectoryOptOut(studentId);
      
      if (!optOut) {
        return {
          canDisclose: true,
          reason: 'No opt-out on file'
        };
      }

      const optOutItems = optOut.opt_out_items || [];
      
      if (optOutItems.includes(informationType)) {
        return {
          canDisclose: false,
          reason: 'Student has opted out of directory information disclosure',
          optOut
        };
      }

      return {
        canDisclose: true,
        reason: 'Information type not opted out'
      };

    } catch (error) {
      await this.logError('Check directory disclosure error', error, {
        studentId,
        informationType
      });
      throw new Error(`Directory disclosure check failed: ${error.message}`);
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
        SELECT * FROM students WHERE id = $1
      `;

      const result = await query(queryText, [studentId]);
      
      if (result.rows.length === 0) {
        throw new Error('Student not found');
      }

      return result.rows[0];

    } catch (error) {
      await this.logError('Get student info error', error, {
        studentId
      });
      throw new Error(`Failed to get student info: ${error.message}`);
    }
  }

  /**
   * Check if student can provide their own consent
   * @param {Object} student - Student information
   * @returns {boolean} Can student provide consent
   */
  canStudentProvideConsent(student) {
    const age = this.calculateAge(student.date_of_birth);
    return age >= 18 || student.emancipated;
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
   * Calculate expiration date for consent type
   * @param {string} consentType - Consent type
   * @returns {Date} Expiration date
   */
  calculateExpirationDate(consentType) {
    const expirationPeriods = {
      [this.consentTypes.FERPA_EDUCATIONAL_RECORDS]: 365, // 1 year
      [this.consentTypes.DIRECTORY_INFORMATION]: 365, // 1 year
      [this.consentTypes.THIRD_PARTY_SHARING]: 180, // 6 months
      [this.consentTypes.RESEARCH_PARTICIPATION]: 365, // 1 year
      [this.consentTypes.PHOTO_VIDEO_RELEASE]: 365, // 1 year
      [this.consentTypes.TRANSPORTATION]: 365, // 1 year
      [this.consentTypes.MEDICAL_TREATMENT]: 365, // 1 year
      [this.consentTypes.EMERGENCY_CONTACT]: 365, // 1 year
      [this.consentTypes.SPECIAL_EDUCATION]: 365, // 1 year
      [this.consentTypes.DISCIPLINARY_ACTION]: 180 // 6 months
    };

    const days = expirationPeriods[consentType] || 365;
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + days);
    
    return expirationDate;
  }

  /**
   * Get default purpose for consent type
   * @param {string} consentType - Consent type
   * @returns {string} Default purpose
   */
  getDefaultPurpose(consentType) {
    const purposes = {
      [this.consentTypes.FERPA_EDUCATIONAL_RECORDS]: 'Access to educational records',
      [this.consentTypes.DIRECTORY_INFORMATION]: 'Directory information disclosure',
      [this.consentTypes.THIRD_PARTY_SHARING]: 'Sharing with third parties',
      [this.consentTypes.RESEARCH_PARTICIPATION]: 'Research participation',
      [this.consentTypes.PHOTO_VIDEO_RELEASE]: 'Photo and video release',
      [this.consentTypes.TRANSPORTATION]: 'Transportation services',
      [this.consentTypes.MEDICAL_TREATMENT]: 'Medical treatment',
      [this.consentTypes.EMERGENCY_CONTACT]: 'Emergency contact information',
      [this.consentTypes.SPECIAL_EDUCATION]: 'Special education services',
      [this.consentTypes.DISCIPLINARY_ACTION]: 'Disciplinary action records'
    };

    return purposes[consentType] || 'General consent';
  }

  /**
   * Get default legal basis for consent type
   * @param {string} consentType - Consent type
   * @returns {string} Default legal basis
   */
  getDefaultLegalBasis(consentType) {
    const legalBases = {
      [this.consentTypes.FERPA_EDUCATIONAL_RECORDS]: 'FERPA parent consent',
      [this.consentTypes.DIRECTORY_INFORMATION]: 'FERPA directory information',
      [this.consentTypes.THIRD_PARTY_SHARING]: 'FERPA written consent',
      [this.consentTypes.RESEARCH_PARTICIPATION]: 'FERPA research consent',
      [this.consentTypes.PHOTO_VIDEO_RELEASE]: 'FERPA written consent',
      [this.consentTypes.TRANSPORTATION]: 'FERPA written consent',
      [this.consentTypes.MEDICAL_TREATMENT]: 'FERPA written consent',
      [this.consentTypes.EMERGENCY_CONTACT]: 'FERPA written consent',
      [this.consentTypes.SPECIAL_EDUCATION]: 'FERPA written consent',
      [this.consentTypes.DISCIPLINARY_ACTION]: 'FERPA written consent'
    };

    return legalBases[consentType] || 'FERPA written consent';
  }

  /**
   * Check consent restrictions
   * @param {Array} restrictions - Consent restrictions
   * @param {Object} context - Context to check against
   * @returns {Array} Violations found
   */
  checkRestrictions(restrictions, context) {
    const violations = [];

    for (const restriction of restrictions) {
      switch (restriction.type) {
        case 'time_limit':
          if (context.time && new Date(context.time) > new Date(restriction.value)) {
            violations.push('Time limit exceeded');
          }
          break;
        case 'purpose_limit':
          if (context.purpose && !restriction.value.includes(context.purpose)) {
            violations.push('Purpose not authorized');
          }
          break;
        case 'recipient_limit':
          if (context.recipient && !restriction.value.includes(context.recipient)) {
            violations.push('Recipient not authorized');
          }
          break;
        case 'data_type_limit':
          if (context.dataType && !restriction.value.includes(context.dataType)) {
            violations.push('Data type not authorized');
          }
          break;
      }
    }

    return violations;
  }

  /**
   * Handle consent revocation
   * @param {string} consentId - Consent ID
   * @param {Object} consent - Consent record
   * @returns {void}
   */
  async handleConsentRevocation(consentId, consent) {
    try {
      // Log revocation action
      await this.logConsentAction('revocation_handled', consentId, {
        consentType: consent.consent_type,
        studentId: consent.student_id
      });

      // In a real implementation, you would:
      // 1. Delete or anonymize data that was shared based on this consent
      // 2. Notify third parties to stop using the data
      // 3. Update data processing records
      // 4. Send confirmation to parent/student

    } catch (error) {
      await this.logError('Handle consent revocation error', error, {
        consentId,
        consent
      });
    }
  }

  /**
   * Expire consent
   * @param {string} consentId - Consent ID
   * @returns {void}
   */
  async expireConsent(consentId) {
    try {
      const queryText = `
        UPDATE ferpa_consents 
        SET status = $1, expired_at = NOW(), updated_at = NOW()
        WHERE id = $2
      `;

      await query(queryText, [this.consentStatuses.EXPIRED, consentId]);

      // Log expiration
      await this.logConsentAction('expired', consentId, {});

    } catch (error) {
      await this.logError('Expire consent error', error, {
        consentId
      });
    }
  }

  /**
   * Log consent action
   * @param {string} action - Action performed
   * @param {string} consentId - Consent ID
   * @param {Object} context - Additional context
   * @returns {void}
   */
  async logConsentAction(action, consentId, context) {
    try {
      const queryText = `
        INSERT INTO consent_action_logs (
          action, consent_id, context_data, created_at
        ) VALUES ($1, $2, $3, NOW())
      `;

      await query(queryText, [action, consentId, JSON.stringify(context)]);

    } catch (error) {
      // Silently fail to avoid infinite logging loop
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
        INSERT INTO consent_error_logs (
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

  /**
   * Get directory information types
   * @returns {Array} Directory information types
   */
  get directoryInformation() {
    return [
      'student_name',
      'address',
      'telephone_listing',
      'email_address',
      'date_of_birth',
      'place_of_birth',
      'grade_level',
      'enrollment_status',
      'participation_in_activities',
      'dates_of_attendance',
      'degrees_awards',
      'honors_received',
      'most_recent_educational_institution'
    ];
  }
}

module.exports = ConsentManagementService;
