/**
 * Photo Consent Management Service
 * Implements comprehensive photo consent management for FERPA compliance
 * Handles opt-in/opt-out for student photos with detailed tracking
 */

const { query } = require('../../config/database');
const crypto = require('crypto');

class PhotoConsentService {
  constructor() {
    this.photoTypes = {
      YEARBOOK: 'yearbook',
      SCHOOL_WEBSITE: 'school_website',
      SOCIAL_MEDIA: 'social_media',
      NEWS_MEDIA: 'news_media',
      MARKETING: 'marketing',
      EDUCATIONAL: 'educational',
      SPORTS: 'sports',
      EVENTS: 'events',
      CLASSROOM: 'classroom',
      CAMPUS: 'campus'
    };

    this.consentStatuses = {
      OPTED_IN: 'opted_in',
      OPTED_OUT: 'opted_out',
      PENDING: 'pending',
      EXPIRED: 'expired',
      REVOKED: 'revoked'
    };

    this.photoUsageTypes = {
      DISPLAY: 'display',
      PUBLICATION: 'publication',
      DISTRIBUTION: 'distribution',
      COMMERCIAL: 'commercial',
      EDUCATIONAL: 'educational'
    };
  }

  /**
   * Create photo consent record
   * @param {string} studentId - Student ID
   * @param {string} parentId - Parent ID
   * @param {string} tenantId - Tenant ID
   * @param {Object} options - Consent options
   * @returns {Object} Created consent record
   */
  async createPhotoConsent(studentId, parentId, tenantId, options = {}) {
    try {
      // Check if student is 18+ and can provide their own consent
      const student = await this.getStudentInfo(studentId);
      const canStudentConsent = this.canStudentProvideConsent(student);

      if (!parentId && !canStudentConsent) {
        throw new Error('Parental consent required for students under 18');
      }

      // Check for existing photo consent
      const existingConsent = await this.getActivePhotoConsent(studentId);
      if (existingConsent) {
        throw new Error('Active photo consent already exists');
      }

      const queryText = `
        INSERT INTO photo_consents (
          student_id, parent_id, tenant_id, consent_status, photo_types,
          usage_types, restrictions, expires_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING *
      `;

      const values = [
        studentId,
        parentId,
        tenantId,
        this.consentStatuses.PENDING,
        JSON.stringify(options.photoTypes || Object.values(this.photoTypes)),
        JSON.stringify(options.usageTypes || Object.values(this.photoUsageTypes)),
        JSON.stringify(options.restrictions || []),
        options.expiresAt || this.calculateExpirationDate()
      ];

      const result = await query(queryText, values);

      // Log consent creation
      await this.logPhotoConsentAction('created', result.rows[0].id, {
        studentId,
        parentId,
        tenantId,
        photoTypes: options.photoTypes,
        usageTypes: options.usageTypes
      });

      return result.rows[0];

    } catch (error) {
      await this.logError('Create photo consent error', error, {
        studentId,
        parentId,
        tenantId,
        options
      });
      throw new Error(`Photo consent creation failed: ${error.message}`);
    }
  }

  /**
   * Grant photo consent
   * @param {string} consentId - Consent ID
   * @param {string} grantedBy - User ID who granted consent
   * @param {Object} options - Grant options
   * @returns {Object} Updated consent record
   */
  async grantPhotoConsent(consentId, grantedBy, options = {}) {
    try {
      const queryText = `
        UPDATE photo_consents 
        SET consent_status = $1, granted_at = NOW(), granted_by = $2, 
            photo_types = $3, usage_types = $4, restrictions = $5, updated_at = NOW()
        WHERE id = $6 AND consent_status = $7
        RETURNING *
      `;

      const values = [
        this.consentStatuses.OPTED_IN,
        grantedBy,
        JSON.stringify(options.photoTypes || Object.values(this.photoTypes)),
        JSON.stringify(options.usageTypes || Object.values(this.photoUsageTypes)),
        JSON.stringify(options.restrictions || []),
        consentId,
        this.consentStatuses.PENDING
      ];

      const result = await query(queryText, values);

      if (result.rows.length === 0) {
        throw new Error('Photo consent not found or already processed');
      }

      // Log consent grant
      await this.logPhotoConsentAction('granted', consentId, {
        grantedBy,
        photoTypes: options.photoTypes,
        usageTypes: options.usageTypes
      });

      return result.rows[0];

    } catch (error) {
      await this.logError('Grant photo consent error', error, {
        consentId,
        grantedBy,
        options
      });
      throw new Error(`Photo consent grant failed: ${error.message}`);
    }
  }

  /**
   * Revoke photo consent
   * @param {string} consentId - Consent ID
   * @param {string} revokedBy - User ID who revoked consent
   * @param {string} reason - Reason for revocation
   * @returns {Object} Updated consent record
   */
  async revokePhotoConsent(consentId, revokedBy, reason) {
    try {
      const queryText = `
        UPDATE photo_consents 
        SET consent_status = $1, revoked_at = NOW(), revoked_by = $2, 
            revocation_reason = $3, updated_at = NOW()
        WHERE id = $4 AND consent_status = $5
        RETURNING *
      `;

      const values = [
        this.consentStatuses.REVOKED,
        revokedBy,
        reason,
        consentId,
        this.consentStatuses.OPTED_IN
      ];

      const result = await query(queryText, values);

      if (result.rows.length === 0) {
        throw new Error('Photo consent not found or not granted');
      }

      // Log consent revocation
      await this.logPhotoConsentAction('revoked', consentId, {
        revokedBy,
        reason
      });

      // Handle photo removal if required
      await this.handlePhotoConsentRevocation(consentId, result.rows[0]);

      return result.rows[0];

    } catch (error) {
      await this.logError('Revoke photo consent error', error, {
        consentId,
        revokedBy,
        reason
      });
      throw new Error(`Photo consent revocation failed: ${error.message}`);
    }
  }

  /**
   * Get active photo consent for student
   * @param {string} studentId - Student ID
   * @returns {Object|null} Active photo consent record
   */
  async getActivePhotoConsent(studentId) {
    try {
      const queryText = `
        SELECT * FROM photo_consents
        WHERE student_id = $1 AND consent_status = $2 
        AND (expires_at IS NULL OR expires_at > NOW())
        ORDER BY created_at DESC
        LIMIT 1
      `;

      const result = await query(queryText, [studentId, this.consentStatuses.OPTED_IN]);
      return result.rows[0] || null;

    } catch (error) {
      await this.logError('Get active photo consent error', error, {
        studentId
      });
      throw new Error(`Failed to get active photo consent: ${error.message}`);
    }
  }

  /**
   * Check if photo can be used
   * @param {string} studentId - Student ID
   * @param {string} photoType - Type of photo
   * @param {string} usageType - How photo will be used
   * @param {Object} context - Additional context
   * @returns {Object} Photo usage check result
   */
  async canUsePhoto(studentId, photoType, usageType, context = {}) {
    try {
      const consent = await this.getActivePhotoConsent(studentId);
      
      if (!consent) {
        return {
          allowed: false,
          reason: 'No active photo consent found',
          consent: null
        };
      }

      // Check if photo type is allowed
      const allowedPhotoTypes = consent.photo_types || [];
      if (!allowedPhotoTypes.includes(photoType)) {
        return {
          allowed: false,
          reason: `Photo type '${photoType}' not included in consent`,
          consent
        };
      }

      // Check if usage type is allowed
      const allowedUsageTypes = consent.usage_types || [];
      if (!allowedUsageTypes.includes(usageType)) {
        return {
          allowed: false,
          reason: `Usage type '${usageType}' not included in consent`,
          consent
        };
      }

      // Check restrictions
      const restrictions = consent.restrictions || [];
      const restrictionViolations = this.checkPhotoRestrictions(restrictions, context);
      if (restrictionViolations.length > 0) {
        return {
          allowed: false,
          reason: 'Photo consent restrictions violated',
          violations: restrictionViolations,
          consent
        };
      }

      // Log photo usage
      await this.logPhotoUsage(studentId, photoType, usageType, context);

      return {
        allowed: true,
        reason: 'Photo usage authorized by consent',
        consent
      };

    } catch (error) {
      await this.logError('Check photo usage error', error, {
        studentId,
        photoType,
        usageType,
        context
      });
      throw new Error(`Photo usage check failed: ${error.message}`);
    }
  }

  /**
   * Create photo record with metadata
   * @param {string} studentId - Student ID
   * @param {string} photoPath - Path to photo file
   * @param {Object} metadata - Photo metadata
   * @param {string} tenantId - Tenant ID
   * @returns {Object} Created photo record
   */
  async createPhotoRecord(studentId, photoPath, metadata, tenantId) {
    try {
      // Generate unique photo ID
      const photoId = crypto.randomUUID();
      
      // Calculate file hash for integrity
      const fileHash = await this.calculateFileHash(photoPath);
      
      // Check if photo usage is allowed
      const usageCheck = await this.canUsePhoto(
        studentId,
        metadata.photoType,
        metadata.usageType,
        { tenantId, photoPath }
      );

      if (!usageCheck.allowed) {
        throw new Error(`Photo usage not allowed: ${usageCheck.reason}`);
      }

      const queryText = `
        INSERT INTO student_photos (
          id, student_id, tenant_id, photo_path, file_hash, photo_type,
          usage_type, metadata, consent_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING *
      `;

      const values = [
        photoId,
        studentId,
        tenantId,
        photoPath,
        fileHash,
        metadata.photoType,
        metadata.usageType,
        JSON.stringify(metadata),
        usageCheck.consent.id
      ];

      const result = await query(queryText, values);

      // Log photo creation
      await this.logPhotoConsentAction('photo_created', result.rows[0].id, {
        studentId,
        photoId,
        photoType: metadata.photoType,
        usageType: metadata.usageType
      });

      return result.rows[0];

    } catch (error) {
      await this.logError('Create photo record error', error, {
        studentId,
        photoPath,
        metadata,
        tenantId
      });
      throw new Error(`Photo record creation failed: ${error.message}`);
    }
  }

  /**
   * Get student photos with consent validation
   * @param {string} studentId - Student ID
   * @param {Object} options - Query options
   * @returns {Array} Photo records
   */
  async getStudentPhotos(studentId, options = {}) {
    try {
      let queryText = `
        SELECT sp.*, pc.consent_status, pc.photo_types, pc.usage_types
        FROM student_photos sp
        LEFT JOIN photo_consents pc ON sp.consent_id = pc.id
        WHERE sp.student_id = $1
      `;
      
      const values = [studentId];

      if (options.photoType) {
        queryText += ` AND sp.photo_type = $${values.length + 1}`;
        values.push(options.photoType);
      }

      if (options.usageType) {
        queryText += ` AND sp.usage_type = $${values.length + 1}`;
        values.push(options.usageType);
      }

      queryText += ` ORDER BY sp.created_at DESC`;

      if (options.limit) {
        queryText += ` LIMIT $${values.length + 1}`;
        values.push(options.limit);
      }

      const result = await query(queryText, values);
      return result.rows;

    } catch (error) {
      await this.logError('Get student photos error', error, {
        studentId,
        options
      });
      throw new Error(`Failed to get student photos: ${error.message}`);
    }
  }

  /**
   * Check photo restrictions
   * @param {Array} restrictions - Consent restrictions
   * @param {Object} context - Context to check against
   * @returns {Array} Violations found
   */
  checkPhotoRestrictions(restrictions, context) {
    const violations = [];

    for (const restriction of restrictions) {
      switch (restriction.type) {
        case 'time_limit':
          if (context.time && new Date(context.time) > new Date(restriction.value)) {
            violations.push('Time limit exceeded');
          }
          break;
        case 'location_limit':
          if (context.location && !restriction.value.includes(context.location)) {
            violations.push('Location not authorized');
          }
          break;
        case 'purpose_limit':
          if (context.purpose && !restriction.value.includes(context.purpose)) {
            violations.push('Purpose not authorized');
          }
          break;
        case 'audience_limit':
          if (context.audience && !restriction.value.includes(context.audience)) {
            violations.push('Audience not authorized');
          }
          break;
      }
    }

    return violations;
  }

  /**
   * Handle photo consent revocation
   * @param {string} consentId - Consent ID
   * @param {Object} consent - Consent record
   * @returns {void}
   */
  async handlePhotoConsentRevocation(consentId, consent) {
    try {
      // Mark all photos as revoked
      await query(
        'UPDATE student_photos SET status = $1, revoked_at = NOW() WHERE consent_id = $2',
        ['revoked', consentId]
      );

      // Log revocation action
      await this.logPhotoConsentAction('revocation_handled', consentId, {
        studentId: consent.student_id,
        photoCount: await this.getPhotoCount(consentId)
      });

      // In a real implementation, you would:
      // 1. Remove photos from public displays
      // 2. Notify third parties to stop using photos
      // 3. Update photo processing records
      // 4. Send confirmation to parent/student

    } catch (error) {
      await this.logError('Handle photo consent revocation error', error, {
        consentId,
        consent
      });
    }
  }

  /**
   * Get photo count for consent
   * @param {string} consentId - Consent ID
   * @returns {number} Photo count
   */
  async getPhotoCount(consentId) {
    try {
      const result = await query(
        'SELECT COUNT(*) as count FROM student_photos WHERE consent_id = $1',
        [consentId]
      );
      return parseInt(result.rows[0].count);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Calculate file hash
   * @param {string} filePath - Path to file
   * @returns {string} File hash
   */
  async calculateFileHash(filePath) {
    try {
      const fs = require('fs');
      const fileBuffer = fs.readFileSync(filePath);
      return crypto.createHash('sha256').update(fileBuffer).digest('hex');
    } catch (error) {
      return null;
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
   * Calculate expiration date for consent
   * @returns {Date} Expiration date
   */
  calculateExpirationDate() {
    const expirationDate = new Date();
    expirationDate.setFullYear(expirationDate.getFullYear() + 1); // 1 year default
    return expirationDate;
  }

  /**
   * Log photo consent action
   * @param {string} action - Action performed
   * @param {string} consentId - Consent ID
   * @param {Object} context - Additional context
   * @returns {void}
   */
  async logPhotoConsentAction(action, consentId, context) {
    try {
      const queryText = `
        INSERT INTO photo_consent_action_logs (
          action, consent_id, context_data, created_at
        ) VALUES ($1, $2, $3, NOW())
      `;

      await query(queryText, [action, consentId, JSON.stringify(context)]);

    } catch (error) {
      // Silently fail to avoid infinite logging loop
    }
  }

  /**
   * Log photo usage
   * @param {string} studentId - Student ID
   * @param {string} photoType - Photo type
   * @param {string} usageType - Usage type
   * @param {Object} context - Context
   * @returns {void}
   */
  async logPhotoUsage(studentId, photoType, usageType, context) {
    try {
      const queryText = `
        INSERT INTO photo_usage_logs (
          student_id, photo_type, usage_type, context_data, created_at
        ) VALUES ($1, $2, $3, $4, NOW())
      `;

      await query(queryText, [
        studentId,
        photoType,
        usageType,
        JSON.stringify(context)
      ]);

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
        INSERT INTO photo_consent_error_logs (
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

module.exports = PhotoConsentService;
