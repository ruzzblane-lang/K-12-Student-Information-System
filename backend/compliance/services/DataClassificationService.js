/**
 * Data Classification Service
 * Implements comprehensive data classification for FERPA compliance
 * Ensures proper handling of educational records and directory information
 */

const { query } = require('../../config/database');

class DataClassificationService {
  constructor() {
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
      ],
      personal: [
        'ssn', 'date_of_birth', 'address', 'phone_number', 'email',
        'family_information', 'emergency_contacts', 'financial_information'
      ]
    };

    // Directory Information - Can be disclosed without consent unless opted out
    this.directoryInformation = [
      'student_name', 'address', 'telephone_listing', 'email_address',
      'date_of_birth', 'place_of_birth', 'grade_level', 'enrollment_status',
      'participation_in_activities', 'dates_of_attendance', 'degrees_awards',
      'honors_received', 'most_recent_educational_institution'
    ];

    // Sensitive Personal Information - Requires explicit consent
    this.sensitivePersonalInfo = [
      'ssn', 'race', 'ethnicity', 'religion', 'political_affiliation',
      'sexual_orientation', 'gender_identity', 'disability_status',
      'financial_information', 'criminal_records', 'mental_health'
    ];

    // Data sensitivity levels
    this.sensitivityLevels = {
      PUBLIC: 1,           // Directory information (with opt-out)
      INTERNAL: 2,         // Educational records (FERPA protected)
      CONFIDENTIAL: 3,     // Sensitive personal information
      RESTRICTED: 4        // Highly sensitive (SSN, health, etc.)
    };
  }

  /**
   * Classify data based on FERPA requirements
   * @param {Object} data - Data to classify
   * @param {string} context - Context of data usage
   * @returns {Object} Classification result
   */
  async classifyData(data, context = {}) {
    try {
      const classification = {
        dataType: 'unknown',
        sensitivityLevel: this.sensitivityLevels.PUBLIC,
        ferpaStatus: 'not_applicable',
        requiresConsent: false,
        canDisclose: false,
        restrictions: [],
        fields: {}
      };

      // Analyze each field in the data
      for (const [fieldName, fieldValue] of Object.entries(data)) {
        const fieldClassification = await this.classifyField(fieldName, fieldValue, context);
        classification.fields[fieldName] = fieldClassification;
        
        // Update overall classification based on most sensitive field
        if (fieldClassification.sensitivityLevel > classification.sensitivityLevel) {
          classification.sensitivityLevel = fieldClassification.sensitivityLevel;
          classification.dataType = fieldClassification.dataType;
          classification.ferpaStatus = fieldClassification.ferpaStatus;
        }

        // Collect restrictions
        if (fieldClassification.restrictions.length > 0) {
          classification.restrictions.push(...fieldClassification.restrictions);
        }
      }

      // Determine overall consent and disclosure requirements
      classification.requiresConsent = this.requiresConsent(classification);
      classification.canDisclose = this.canDisclose(classification, context);

      return classification;

    } catch (error) {
      console.error('Data classification error:', error);
      throw new Error(`Data classification failed: ${error.message}`);
    }
  }

  /**
   * Classify individual field
   * @param {string} fieldName - Field name
   * @param {any} fieldValue - Field value
   * @param {Object} context - Context
   * @returns {Object} Field classification
   */
  async classifyField(fieldName, fieldValue, context) {
    const classification = {
      fieldName,
      dataType: 'unknown',
      sensitivityLevel: this.sensitivityLevels.PUBLIC,
      ferpaStatus: 'not_applicable',
      requiresConsent: false,
      canDisclose: false,
      restrictions: [],
      isDirectoryInfo: false,
      isEducationalRecord: false,
      isSensitivePersonalInfo: false
    };

    // Check if it's directory information
    if (this.isDirectoryInformation(fieldName)) {
      classification.dataType = 'directory_information';
      classification.sensitivityLevel = this.sensitivityLevels.PUBLIC;
      classification.ferpaStatus = 'directory_information';
      classification.isDirectoryInfo = true;
      classification.canDisclose = true; // Can disclose unless opted out
      classification.restrictions.push('Requires opt-out check before disclosure');
    }

    // Check if it's educational record
    if (this.isEducationalRecord(fieldName)) {
      classification.dataType = 'educational_record';
      classification.sensitivityLevel = this.sensitivityLevels.INTERNAL;
      classification.ferpaStatus = 'protected_educational_record';
      classification.isEducationalRecord = true;
      classification.requiresConsent = true;
      classification.canDisclose = false; // Requires consent
      classification.restrictions.push('FERPA protected - requires consent');
    }

    // Check if it's sensitive personal information
    if (this.isSensitivePersonalInfo(fieldName)) {
      classification.dataType = 'sensitive_personal_info';
      classification.sensitivityLevel = this.sensitivityLevels.RESTRICTED;
      classification.ferpaStatus = 'highly_sensitive';
      classification.isSensitivePersonalInfo = true;
      classification.requiresConsent = true;
      classification.canDisclose = false; // Requires explicit consent
      classification.restrictions.push('Highly sensitive - explicit consent required');
    }

    // Special handling for SSN
    if (this.isSSN(fieldName, fieldValue)) {
      classification.dataType = 'ssn';
      classification.sensitivityLevel = this.sensitivityLevels.RESTRICTED;
      classification.ferpaStatus = 'highly_sensitive';
      classification.requiresConsent = true;
      classification.canDisclose = false;
      classification.restrictions.push('SSN - highest protection required');
    }

    // Special handling for health information
    if (this.isHealthInformation(fieldName)) {
      classification.dataType = 'health_information';
      classification.sensitivityLevel = this.sensitivityLevels.CONFIDENTIAL;
      classification.ferpaStatus = 'health_record';
      classification.requiresConsent = true;
      classification.canDisclose = false;
      classification.restrictions.push('Health information - special protections');
    }

    return classification;
  }

  /**
   * Check if field is directory information
   * @param {string} fieldName - Field name
   * @returns {boolean} Is directory information
   */
  isDirectoryInformation(fieldName) {
    const normalizedField = fieldName.toLowerCase().replace(/[_-]/g, '');
    return this.directoryInformation.some(dirInfo => 
      normalizedField.includes(dirInfo.toLowerCase().replace(/[_-]/g, ''))
    );
  }

  /**
   * Check if field is educational record
   * @param {string} fieldName - Field name
   * @returns {boolean} Is educational record
   */
  isEducationalRecord(fieldName) {
    const normalizedField = fieldName.toLowerCase().replace(/[_-]/g, '');
    
    return Object.values(this.educationalRecords).some(category => 
      category.some(record => 
        normalizedField.includes(record.toLowerCase().replace(/[_-]/g, ''))
      )
    );
  }

  /**
   * Check if field is sensitive personal information
   * @param {string} fieldName - Field name
   * @returns {boolean} Is sensitive personal information
   */
  isSensitivePersonalInfo(fieldName) {
    const normalizedField = fieldName.toLowerCase().replace(/[_-]/g, '');
    return this.sensitivePersonalInfo.some(sensitive => 
      normalizedField.includes(sensitive.toLowerCase().replace(/[_-]/g, ''))
    );
  }

  /**
   * Check if field contains SSN
   * @param {string} fieldName - Field name
   * @param {any} fieldValue - Field value
   * @returns {boolean} Contains SSN
   */
  isSSN(fieldName, fieldValue) {
    const ssnFields = ['ssn', 'social_security', 'social_security_number'];
    const normalizedField = fieldName.toLowerCase().replace(/[_-]/g, '');
    
    if (ssnFields.some(ssn => normalizedField.includes(ssn))) {
      return true;
    }

    // Check if value looks like SSN
    if (typeof fieldValue === 'string') {
      const ssnPattern = /^\d{3}-?\d{2}-?\d{4}$/;
      return ssnPattern.test(fieldValue);
    }

    return false;
  }

  /**
   * Check if field is health information
   * @param {string} fieldName - Field name
   * @returns {boolean} Is health information
   */
  isHealthInformation(fieldName) {
    const healthFields = [
      'medical', 'health', 'allergy', 'medication', 'immunization',
      'disability', 'mental_health', 'counseling', 'therapy'
    ];
    
    const normalizedField = fieldName.toLowerCase().replace(/[_-]/g, '');
    return healthFields.some(health => normalizedField.includes(health));
  }

  /**
   * Determine if data requires consent
   * @param {Object} classification - Data classification
   * @returns {boolean} Requires consent
   */
  requiresConsent(classification) {
    return classification.sensitivityLevel >= this.sensitivityLevels.INTERNAL;
  }

  /**
   * Determine if data can be disclosed
   * @param {Object} classification - Data classification
   * @param {Object} context - Context
   * @returns {boolean} Can disclose
   */
  canDisclose(classification, context) {
    // Directory information can be disclosed unless opted out
    if (classification.dataType === 'directory_information') {
      return !context.optedOut;
    }

    // Educational records require consent
    if (classification.dataType === 'educational_record') {
      return context.hasConsent;
    }

    // Sensitive personal information requires explicit consent
    if (classification.dataType === 'sensitive_personal_info') {
      return context.hasExplicitConsent;
    }

    return false;
  }

  /**
   * Get data classification policy for tenant
   * @param {string} tenantId - Tenant ID
   * @returns {Object} Classification policy
   */
  async getClassificationPolicy(tenantId) {
    try {
      const queryText = `
        SELECT * FROM tenant_data_classification_policy
        WHERE tenant_id = $1
      `;
      
      const result = await query(queryText, [tenantId]);
      
      if (result.rows.length === 0) {
        // Return default policy
        return this.getDefaultClassificationPolicy();
      }

      return result.rows[0];

    } catch (error) {
      console.error('Get classification policy error:', error);
      return this.getDefaultClassificationPolicy();
    }
  }

  /**
   * Get default classification policy
   * @returns {Object} Default policy
   */
  getDefaultClassificationPolicy() {
    return {
      directoryInformationOptOut: false,
      requireExplicitConsent: true,
      dataRetentionDays: 2555, // 7 years
      allowThirdPartySharing: false,
      requireParentalConsent: true,
      auditAllAccess: true,
      encryptSensitiveData: true,
      anonymizeForResearch: true
    };
  }

  /**
   * Create data classification policy for tenant
   * @param {string} tenantId - Tenant ID
   * @param {Object} policy - Policy configuration
   * @returns {Object} Created policy
   */
  async createClassificationPolicy(tenantId, policy) {
    try {
      const queryText = `
        INSERT INTO tenant_data_classification_policy (
          tenant_id, directory_information_opt_out, require_explicit_consent,
          data_retention_days, allow_third_party_sharing, require_parental_consent,
          audit_all_access, encrypt_sensitive_data, anonymize_for_research,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING *
      `;
      
      const values = [
        tenantId,
        policy.directoryInformationOptOut || false,
        policy.requireExplicitConsent || true,
        policy.dataRetentionDays || 2555,
        policy.allowThirdPartySharing || false,
        policy.requireParentalConsent || true,
        policy.auditAllAccess || true,
        policy.encryptSensitiveData || true,
        policy.anonymizeForResearch || true
      ];

      const result = await query(queryText, values);
      return result.rows[0];

    } catch (error) {
      console.error('Create classification policy error:', error);
      throw new Error(`Failed to create classification policy: ${error.message}`);
    }
  }

  /**
   * Log data classification decision
   * @param {string} tenantId - Tenant ID
   * @param {string} userId - User ID
   * @param {Object} classification - Classification result
   * @param {Object} context - Context
   * @returns {void}
   */
  async logClassificationDecision(tenantId, userId, classification, context) {
    try {
      const queryText = `
        INSERT INTO data_classification_logs (
          tenant_id, user_id, data_type, sensitivity_level, ferpa_status,
          requires_consent, can_disclose, restrictions, context, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      `;
      
      const values = [
        tenantId,
        userId,
        classification.dataType,
        classification.sensitivityLevel,
        classification.ferpaStatus,
        classification.requiresConsent,
        classification.canDisclose,
        JSON.stringify(classification.restrictions),
        JSON.stringify(context)
      ];

      await query(queryText, values);

    } catch (error) {
      console.error('Log classification decision error:', error);
      // Don't throw - logging failure shouldn't break the flow
    }
  }
}

module.exports = DataClassificationService;
