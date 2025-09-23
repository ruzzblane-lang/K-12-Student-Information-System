/**
 * Data Residency Service
 * Implements data residency controls for regional compliance
 * Ensures data stays within specified geographic boundaries
 */

const { query } = require('../../config/database');

class DataResidencyService {
  constructor() {
    this.residencyRules = {
      // EU data must stay in EU
      EU: {
        allowedRegions: ['EU', 'EEA'],
        restrictions: ['US', 'APAC', 'OTHER'],
        description: 'EU data residency - GDPR compliance'
      },
      // US data can stay in US or EU (with consent)
      US: {
        allowedRegions: ['US', 'EU'],
        restrictions: ['APAC', 'OTHER'],
        description: 'US data residency - FERPA compliance'
      },
      // Canada data must stay in Canada or US
      CA: {
        allowedRegions: ['CA', 'US'],
        restrictions: ['EU', 'APAC', 'OTHER'],
        description: 'Canada data residency - PIPEDA compliance'
      },
      // Australia data must stay in Australia or approved regions
      AU: {
        allowedRegions: ['AU', 'NZ', 'US'],
        restrictions: ['EU', 'OTHER'],
        description: 'Australia data residency - Privacy Act compliance'
      },
      // Brazil data must stay in Brazil or approved regions
      BR: {
        allowedRegions: ['BR', 'US'],
        restrictions: ['EU', 'APAC', 'OTHER'],
        description: 'Brazil data residency - LGPD compliance'
      },
      // Global - no restrictions
      GLOBAL: {
        allowedRegions: ['US', 'EU', 'CA', 'AU', 'BR', 'APAC', 'OTHER'],
        restrictions: [],
        description: 'Global data residency - no restrictions'
      }
    };

    this.regionMapping = {
      'us-east-1': 'US',
      'us-west-2': 'US',
      'eu-west-1': 'EU',
      'eu-central-1': 'EU',
      'ca-central-1': 'CA',
      'ap-southeast-2': 'AU',
      'sa-east-1': 'BR',
      'ap-southeast-1': 'APAC',
      'ap-northeast-1': 'APAC'
    };
  }

  /**
   * Determine data residency requirements for a tenant
   * @param {string} tenantId - Tenant ID
   * @param {Object} tenantData - Tenant data
   * @returns {Object} Residency requirements
   */
  async determineResidencyRequirements(tenantId, tenantData) {
    try {
      // Get tenant's primary region
      const primaryRegion = await this.getTenantPrimaryRegion(tenantId);
      
      // Get tenant's compliance requirements
      const complianceRequirements = await this.getTenantComplianceRequirements(tenantId);
      
      // Determine residency rules based on tenant location and compliance needs
      const residencyRules = this.calculateResidencyRules(primaryRegion, complianceRequirements);
      
      // Store residency requirements
      await this.storeResidencyRequirements(tenantId, residencyRules);
      
      return {
        tenantId,
        primaryRegion,
        complianceRequirements,
        residencyRules,
        determinedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Determine residency requirements error:', error);
      throw new Error(`Failed to determine residency requirements: ${error.message}`);
    }
  }

  /**
   * Validate data residency for a data operation
   * @param {string} tenantId - Tenant ID
   * @param {string} dataType - Type of data
   * @param {string} targetRegion - Target region for data processing
   * @param {Object} operationContext - Operation context
   * @returns {Object} Validation result
   */
  async validateDataResidency(tenantId, dataType, targetRegion, operationContext = {}) {
    try {
      // Get tenant's residency requirements
      const residencyRequirements = await this.getResidencyRequirements(tenantId);
      
      if (!residencyRequirements) {
        throw new Error('No residency requirements found for tenant');
      }

      // Check if target region is allowed
      const isAllowed = this.isRegionAllowed(residencyRequirements, targetRegion);
      
      // Get data classification
      const dataClassification = this.classifyData(dataType);
      
      // Apply additional restrictions based on data sensitivity
      const additionalRestrictions = this.getAdditionalRestrictions(dataClassification, residencyRequirements);
      
      // Final validation
      const isValid = isAllowed && !additionalRestrictions.includes(targetRegion);
      
      // Log residency check
      await this.logResidencyCheck(tenantId, dataType, targetRegion, isValid, operationContext);
      
      return {
        valid: isValid,
        tenantId,
        dataType,
        targetRegion,
        residencyRequirements,
        dataClassification,
        additionalRestrictions,
        checkedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Validate data residency error:', error);
      throw new Error(`Failed to validate data residency: ${error.message}`);
    }
  }

  /**
   * Get allowed regions for a tenant
   * @param {string} tenantId - Tenant ID
   * @param {string} dataType - Type of data (optional)
   * @returns {Array} Allowed regions
   */
  async getAllowedRegions(tenantId, dataType = null) {
    try {
      const residencyRequirements = await this.getResidencyRequirements(tenantId);
      
      if (!residencyRequirements) {
        return ['GLOBAL']; // Default to global if no requirements set
      }

      let allowedRegions = residencyRequirements.allowedRegions;
      
      // Apply data-specific restrictions
      if (dataType) {
        const dataClassification = this.classifyData(dataType);
        const additionalRestrictions = this.getAdditionalRestrictions(dataClassification, residencyRequirements);
        allowedRegions = allowedRegions.filter(region => !additionalRestrictions.includes(region));
      }
      
      return allowedRegions;
      
    } catch (error) {
      console.error('Get allowed regions error:', error);
      throw new Error(`Failed to get allowed regions: ${error.message}`);
    }
  }

  /**
   * Route data processing to appropriate region
   * @param {string} tenantId - Tenant ID
   * @param {string} dataType - Type of data
   * @param {Object} processingRequest - Processing request
   * @returns {Object} Routing result
   */
  async routeDataProcessing(tenantId, dataType, processingRequest) {
    try {
      // Get allowed regions
      const allowedRegions = await this.getAllowedRegions(tenantId, dataType);
      
      // Get optimal region based on performance and compliance
      const optimalRegion = await this.getOptimalRegion(allowedRegions, processingRequest);
      
      // Validate routing decision
      const validation = await this.validateDataResidency(tenantId, dataType, optimalRegion, {
        operation: 'data_processing',
        request: processingRequest
      });
      
      if (!validation.valid) {
        throw new Error(`Data residency validation failed for region: ${optimalRegion}`);
      }
      
      // Log routing decision
      await this.logRoutingDecision(tenantId, dataType, optimalRegion, processingRequest);
      
      return {
        tenantId,
        dataType,
        targetRegion: optimalRegion,
        allowedRegions,
        routingDecision: {
          region: optimalRegion,
          reason: 'compliance_and_performance_optimized',
          validated: true
        },
        routedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Route data processing error:', error);
      throw new Error(`Failed to route data processing: ${error.message}`);
    }
  }

  /**
   * Get tenant's primary region
   * @param {string} tenantId - Tenant ID
   * @returns {string} Primary region
   */
  async getTenantPrimaryRegion(tenantId) {
    const queryText = `
      SELECT 
        t.primary_region,
        t.country,
        t.state_province,
        t.city
      FROM tenants t
      WHERE t.id = $1
    `;
    
    const result = await query(queryText, [tenantId]);
    
    if (result.rows.length === 0) {
      throw new Error('Tenant not found');
    }
    
    const tenant = result.rows[0];
    
    // Use primary_region if set, otherwise infer from country
    if (tenant.primary_region) {
      return tenant.primary_region;
    }
    
    return this.inferRegionFromCountry(tenant.country);
  }

  /**
   * Get tenant's compliance requirements
   * @param {string} tenantId - Tenant ID
   * @returns {Array} Compliance requirements
   */
  async getTenantComplianceRequirements(tenantId) {
    const queryText = `
      SELECT 
        compliance_requirements,
        data_protection_laws,
        industry_regulations
      FROM tenant_compliance_settings
      WHERE tenant_id = $1
    `;
    
    const result = await query(queryText, [tenantId]);
    
    if (result.rows.length === 0) {
      // Return default compliance requirements
      return ['FERPA', 'COPPA'];
    }
    
    const settings = result.rows[0];
    return [
      ...(settings.compliance_requirements || []),
      ...(settings.data_protection_laws || []),
      ...(settings.industry_regulations || [])
    ];
  }

  /**
   * Calculate residency rules based on region and compliance requirements
   * @param {string} primaryRegion - Primary region
   * @param {Array} complianceRequirements - Compliance requirements
   * @returns {Object} Residency rules
   */
  calculateResidencyRules(primaryRegion, complianceRequirements) {
    // Start with base rules for the primary region
    let rules = { ...this.residencyRules[primaryRegion] };
    
    // Apply additional restrictions based on compliance requirements
    if (complianceRequirements.includes('GDPR')) {
      // GDPR requires EU data to stay in EU
      if (primaryRegion === 'EU') {
        rules.allowedRegions = ['EU', 'EEA'];
        rules.restrictions = ['US', 'APAC', 'OTHER'];
      }
    }
    
    if (complianceRequirements.includes('FERPA')) {
      // FERPA allows US data to be processed in US or EU (with consent)
      if (primaryRegion === 'US') {
        rules.allowedRegions = ['US', 'EU'];
        rules.restrictions = ['APAC', 'OTHER'];
      }
    }
    
    if (complianceRequirements.includes('PIPEDA')) {
      // PIPEDA requires Canadian data to stay in Canada or US
      if (primaryRegion === 'CA') {
        rules.allowedRegions = ['CA', 'US'];
        rules.restrictions = ['EU', 'APAC', 'OTHER'];
      }
    }
    
    if (complianceRequirements.includes('LGPD')) {
      // LGPD requires Brazilian data to stay in Brazil or approved regions
      if (primaryRegion === 'BR') {
        rules.allowedRegions = ['BR', 'US'];
        rules.restrictions = ['EU', 'APAC', 'OTHER'];
      }
    }
    
    return rules;
  }

  /**
   * Store residency requirements for a tenant
   * @param {string} tenantId - Tenant ID
   * @param {Object} residencyRules - Residency rules
   */
  async storeResidencyRequirements(tenantId, residencyRules) {
    const queryText = `
      INSERT INTO data_residency_requirements (
        tenant_id,
        primary_region,
        allowed_regions,
        restricted_regions,
        rules_description,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      ON CONFLICT (tenant_id) DO UPDATE SET
        allowed_regions = EXCLUDED.allowed_regions,
        restricted_regions = EXCLUDED.restricted_regions,
        rules_description = EXCLUDED.rules_description,
        updated_at = NOW()
    `;
    
    await query(queryText, [
      tenantId,
      residencyRules.primaryRegion || 'GLOBAL',
      JSON.stringify(residencyRules.allowedRegions),
      JSON.stringify(residencyRules.restrictions),
      residencyRules.description
    ]);
  }

  /**
   * Get residency requirements for a tenant
   * @param {string} tenantId - Tenant ID
   * @returns {Object} Residency requirements
   */
  async getResidencyRequirements(tenantId) {
    const queryText = `
      SELECT 
        primary_region,
        allowed_regions,
        restricted_regions,
        rules_description,
        created_at,
        updated_at
      FROM data_residency_requirements
      WHERE tenant_id = $1
    `;
    
    const result = await query(queryText, [tenantId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      primaryRegion: row.primary_region,
      allowedRegions: JSON.parse(row.allowed_regions),
      restrictions: JSON.parse(row.restricted_regions),
      description: row.rules_description,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Check if a region is allowed for a tenant
   * @param {Object} residencyRequirements - Residency requirements
   * @param {string} targetRegion - Target region
   * @returns {boolean} Whether region is allowed
   */
  isRegionAllowed(residencyRequirements, targetRegion) {
    return residencyRequirements.allowedRegions.includes(targetRegion);
  }

  /**
   * Classify data based on sensitivity
   * @param {string} dataType - Type of data
   * @returns {string} Data classification
   */
  classifyData(dataType) {
    const sensitiveDataTypes = [
      'ssn', 'ein', 'bank_account', 'routing_number',
      'card_number', 'card_cvv', 'medical_info',
      'financial_info', 'parent_ssn'
    ];
    
    const personalDataTypes = [
      'email', 'phone', 'address', 'date_of_birth',
      'student_id', 'parent_info'
    ];
    
    if (sensitiveDataTypes.includes(dataType)) {
      return 'HIGHLY_SENSITIVE';
    } else if (personalDataTypes.includes(dataType)) {
      return 'PERSONAL';
    } else {
      return 'PUBLIC';
    }
  }

  /**
   * Get additional restrictions based on data classification
   * @param {string} dataClassification - Data classification
   * @param {Object} residencyRequirements - Residency requirements
   * @returns {Array} Additional restrictions
   */
  getAdditionalRestrictions(dataClassification, residencyRequirements) {
    const restrictions = [...residencyRequirements.restrictions];
    
    // Apply stricter restrictions for highly sensitive data
    if (dataClassification === 'HIGHLY_SENSITIVE') {
      // For highly sensitive data, only allow primary region
      return ['US', 'EU', 'CA', 'AU', 'BR', 'APAC', 'OTHER'].filter(
        region => region !== residencyRequirements.primaryRegion
      );
    }
    
    return restrictions;
  }

  /**
   * Get optimal region for data processing
   * @param {Array} allowedRegions - Allowed regions
   * @param {Object} processingRequest - Processing request
   * @returns {string} Optimal region
   */
  async getOptimalRegion(allowedRegions, processingRequest) {
    // For now, return the first allowed region
    // In a real implementation, this would consider:
    // - Performance metrics
    // - Cost optimization
    // - Load balancing
    // - Latency requirements
    
    return allowedRegions[0] || 'US';
  }

  /**
   * Infer region from country code
   * @param {string} country - Country code
   * @returns {string} Inferred region
   */
  inferRegionFromCountry(country) {
    const countryRegionMap = {
      'US': 'US',
      'CA': 'CA',
      'GB': 'EU',
      'DE': 'EU',
      'FR': 'EU',
      'IT': 'EU',
      'ES': 'EU',
      'NL': 'EU',
      'AU': 'AU',
      'NZ': 'AU',
      'BR': 'BR',
      'JP': 'APAC',
      'CN': 'APAC',
      'IN': 'APAC',
      'SG': 'APAC'
    };
    
    return countryRegionMap[country] || 'GLOBAL';
  }

  /**
   * Log residency check for audit trail
   * @param {string} tenantId - Tenant ID
   * @param {string} dataType - Data type
   * @param {string} targetRegion - Target region
   * @param {boolean} isValid - Whether validation passed
   * @param {Object} operationContext - Operation context
   */
  async logResidencyCheck(tenantId, dataType, targetRegion, isValid, operationContext) {
    const queryText = `
      INSERT INTO data_residency_logs (
        tenant_id,
        data_type,
        target_region,
        validation_result,
        operation_context,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
    `;
    
    await query(queryText, [
      tenantId,
      dataType,
      targetRegion,
      isValid,
      JSON.stringify(operationContext)
    ]);
  }

  /**
   * Log routing decision for audit trail
   * @param {string} tenantId - Tenant ID
   * @param {string} dataType - Data type
   * @param {string} targetRegion - Target region
   * @param {Object} processingRequest - Processing request
   */
  async logRoutingDecision(tenantId, dataType, targetRegion, processingRequest) {
    const queryText = `
      INSERT INTO data_routing_logs (
        tenant_id,
        data_type,
        target_region,
        processing_request,
        created_at
      ) VALUES ($1, $2, $3, $4, NOW())
    `;
    
    await query(queryText, [
      tenantId,
      dataType,
      targetRegion,
      JSON.stringify(processingRequest)
    ]);
  }

  /**
   * Get data residency statistics for a tenant
   * @param {string} tenantId - Tenant ID
   * @returns {Object} Residency statistics
   */
  async getResidencyStats(tenantId) {
    const queryText = `
      SELECT 
        target_region,
        COUNT(*) as request_count,
        COUNT(CASE WHEN validation_result = true THEN 1 END) as successful_requests,
        COUNT(CASE WHEN validation_result = false THEN 1 END) as failed_requests
      FROM data_residency_logs
      WHERE tenant_id = $1
      AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY target_region
      ORDER BY request_count DESC
    `;
    
    const result = await query(queryText, [tenantId]);
    
    return {
      tenantId,
      period: '30_days',
      regionStats: result.rows.map(row => ({
        region: row.target_region,
        totalRequests: parseInt(row.request_count),
        successfulRequests: parseInt(row.successful_requests),
        failedRequests: parseInt(row.failed_requests)
      }))
    };
  }
}

module.exports = DataResidencyService;
