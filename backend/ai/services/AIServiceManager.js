const { v4: uuidv4 } = require('uuid');

class AIServiceManager {
  constructor(db, config = {}) {
    this.db = db;
    this.config = config;
    this.modules = new Map();
    this.tenantConfigs = new Map();
    
    // AI service configurations
    this.aiConfig = {
      openai: {
        apiKey: config.openaiApiKey || process.env.OPENAI_API_KEY,
        model: config.openaiModel || 'gpt-4',
        maxTokens: config.maxTokens || 2000
      },
      azure: {
        endpoint: config.azureEndpoint || process.env.AZURE_AI_ENDPOINT,
        apiKey: config.azureApiKey || process.env.AZURE_AI_API_KEY,
        region: config.azureRegion || process.env.AZURE_AI_REGION
      },
      aws: {
        region: config.awsRegion || process.env.AWS_REGION,
        accessKeyId: config.awsAccessKeyId || process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: config.awsSecretAccessKey || process.env.AWS_SECRET_ACCESS_KEY
      }
    };

    // Compliance and security settings
    this.complianceConfig = {
      dataResidency: config.dataResidency || 'global',
      encryptionEnabled: config.encryptionEnabled !== false,
      auditLogging: config.auditLogging !== false,
      gdprCompliant: config.gdprCompliant !== false,
      ferpaCompliant: config.ferpaCompliant !== false
    };
  }

  async initialize() {
    console.log('Initializing AI Service Manager...');
    
    // Load tenant AI configurations
    await this.loadTenantConfigurations();
    
    // Initialize available AI modules
    await this.initializeModules();
    
    console.log('AI Service Manager initialized successfully.');
  }

  async loadTenantConfigurations() {
    try {
      const query = `
        SELECT 
          id as tenant_id,
          ai_config,
          ai_modules_enabled,
          data_residency_region,
          compliance_settings
        FROM tenants 
        WHERE ai_modules_enabled IS NOT NULL
      `;
      
      const result = await this.db.query(query);
      
      for (const tenant of result.rows) {
        const config = {
          tenantId: tenant.tenant_id,
          aiConfig: tenant.ai_config || {},
          enabledModules: tenant.ai_modules_enabled || [],
          dataResidency: tenant.data_residency_region || 'global',
          complianceSettings: tenant.compliance_settings || {}
        };
        
        this.tenantConfigs.set(tenant.tenant_id, config);
      }
      
      console.log(`Loaded AI configurations for ${result.rows.length} tenants`);
    } catch (error) {
      console.error('Error loading tenant configurations:', error);
    }
  }

  async initializeModules() {
    const moduleClasses = {
      'smart-search': require('../modules/SmartSearchAPI'),
      'automated-tagging': require('../modules/AutomatedTaggingAPI'),
      'learning-insights': require('../modules/LearningInsightsAPI'),
      'translation-accessibility': require('../modules/TranslationAccessibilityAPI'),
      'fraud-detection': require('../modules/FraudDetectionAPI'),
      'generative-summaries': require('../modules/GenerativeSummariesAPI'),
      'recommendations': require('../modules/RecommendationsAPI'),
      'conversational-interface': require('../modules/ConversationalInterfaceAPI')
    };

    for (const [moduleName, ModuleClass] of Object.entries(moduleClasses)) {
      try {
        const moduleInstance = new ModuleClass(this.db, this.aiConfig, this.complianceConfig);
        await moduleInstance.initialize();
        this.modules.set(moduleName, moduleInstance);
        console.log(`AI module '${moduleName}' initialized successfully`);
      } catch (error) {
        console.error(`Failed to initialize AI module '${moduleName}':`, error);
      }
    }
  }

  async getModuleStatus(tenantId) {
    const tenantConfig = this.tenantConfigs.get(tenantId);
    if (!tenantConfig) {
      return {};
    }

    const status = {};
    for (const [moduleName, moduleInstance] of this.modules) {
      const isEnabled = tenantConfig.enabledModules.includes(moduleName);
      const isHealthy = await moduleInstance.isHealthy();
      
      status[moduleName] = {
        enabled: isEnabled,
        healthy: isHealthy,
        lastChecked: new Date().toISOString()
      };
    }

    return status;
  }

  async executeModuleFunction(tenantId, moduleName, functionName, params = {}) {
    // Check if module is enabled for tenant
    const tenantConfig = this.tenantConfigs.get(tenantId);
    if (!tenantConfig) {
      throw new Error('Tenant configuration not found');
    }

    if (!tenantConfig.enabledModules.includes(moduleName)) {
      throw new Error(`AI module '${moduleName}' is not enabled for this tenant`);
    }

    // Get module instance
    const moduleInstance = this.modules.get(moduleName);
    if (!moduleInstance) {
      throw new Error(`AI module '${moduleName}' not found`);
    }

    // Check if function exists
    if (typeof moduleInstance[functionName] !== 'function') {
      throw new Error(`Function '${functionName}' not found in module '${moduleName}'`);
    }

    // Log the AI operation for audit
    await this.logAIOperation(tenantId, moduleName, functionName, params);

    try {
      // Execute the function with tenant context
      const result = await moduleInstance[functionName]({
        ...params,
        tenantId,
        tenantConfig: tenantConfig.aiConfig,
        complianceSettings: tenantConfig.complianceSettings
      });

      // Log successful operation
      await this.logAIOperation(tenantId, moduleName, functionName, params, 'success', result);

      return result;
    } catch (error) {
      // Log failed operation
      await this.logAIOperation(tenantId, moduleName, functionName, params, 'error', null, error.message);
      throw error;
    }
  }

  async logAIOperation(tenantId, moduleName, functionName, params, status = 'started', result = null, error = null) {
    try {
      const query = `
        INSERT INTO ai_operation_logs (
          id, tenant_id, module_name, function_name, 
          parameters, status, result, error_message, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
      `;
      
      await this.db.query(query, [
        uuidv4(),
        tenantId,
        moduleName,
        functionName,
        JSON.stringify(params),
        status,
        result ? JSON.stringify(result) : null,
        error
      ]);
    } catch (logError) {
      console.error('Failed to log AI operation:', logError);
    }
  }

  async updateTenantModuleConfig(tenantId, moduleName, enabled, config = {}) {
    try {
      // Get current tenant config
      let tenantConfig = this.tenantConfigs.get(tenantId);
      if (!tenantConfig) {
        tenantConfig = {
          tenantId,
          aiConfig: {},
          enabledModules: [],
          dataResidency: 'global',
          complianceSettings: {}
        };
      }

      // Update module status
      if (enabled && !tenantConfig.enabledModules.includes(moduleName)) {
        tenantConfig.enabledModules.push(moduleName);
      } else if (!enabled && tenantConfig.enabledModules.includes(moduleName)) {
        tenantConfig.enabledModules = tenantConfig.enabledModules.filter(m => m !== moduleName);
      }

      // Update module-specific config
      if (!tenantConfig.aiConfig[moduleName]) {
        tenantConfig.aiConfig[moduleName] = {};
      }
      Object.assign(tenantConfig.aiConfig[moduleName], config);

      // Save to database
      const query = `
        UPDATE tenants 
        SET 
          ai_config = $1,
          ai_modules_enabled = $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `;
      
      await this.db.query(query, [
        JSON.stringify(tenantConfig.aiConfig),
        tenantConfig.enabledModules,
        tenantId
      ]);

      // Update in-memory config
      this.tenantConfigs.set(tenantId, tenantConfig);

      // Log the configuration change
      await this.logAIOperation(tenantId, 'system', 'updateModuleConfig', {
        moduleName,
        enabled,
        config
      }, 'success');

      return { success: true, message: `Module '${moduleName}' ${enabled ? 'enabled' : 'disabled'} successfully` };
    } catch (error) {
      console.error('Error updating tenant module config:', error);
      throw new Error(`Failed to update module configuration: ${error.message}`);
    }
  }

  async getTenantAIConfig(tenantId) {
    const tenantConfig = this.tenantConfigs.get(tenantId);
    if (!tenantConfig) {
      return {
        enabledModules: [],
        aiConfig: {},
        dataResidency: 'global',
        complianceSettings: {}
      };
    }

    return {
      enabledModules: tenantConfig.enabledModules,
      aiConfig: tenantConfig.aiConfig,
      dataResidency: tenantConfig.dataResidency,
      complianceSettings: tenantConfig.complianceSettings
    };
  }

  async validateCompliance(tenantId, moduleName, operation, data) {
    const tenantConfig = this.tenantConfigs.get(tenantId);
    if (!tenantConfig) {
      return { compliant: false, reason: 'Tenant configuration not found' };
    }

    // Check data residency
    if (tenantConfig.dataResidency !== 'global') {
      // In a real implementation, this would check if the AI service
      // is processing data in the correct region
      console.log(`Checking data residency for ${tenantConfig.dataResidency}`);
    }

    // Check GDPR compliance
    if (tenantConfig.complianceSettings.gdprCompliant) {
      // Ensure no personal data is processed without consent
      if (this.containsPersonalData(data)) {
        return { compliant: false, reason: 'Personal data processing requires explicit consent' };
      }
    }

    // Check FERPA compliance
    if (tenantConfig.complianceSettings.ferpaCompliant) {
      // Ensure educational records are handled appropriately
      if (this.containsEducationalRecords(data)) {
        return { compliant: false, reason: 'Educational records require FERPA compliance measures' };
      }
    }

    return { compliant: true };
  }

  containsPersonalData(data) {
    // Simple check for personal data patterns
    const personalDataPatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
      /\b\d{3}-\d{3}-\d{4}\b/, // Phone
      /\b\d{5}-\d{4}\b/ // ZIP+4
    ];

    const dataString = JSON.stringify(data);
    return personalDataPatterns.some(pattern => pattern.test(dataString));
  }

  containsEducationalRecords(data) {
    // Check for educational record indicators
    const educationalRecordPatterns = [
      /grade|gpa|transcript|enrollment|attendance|discipline/i,
      /student.*id|student.*number/i,
      /parent.*contact|guardian/i
    ];

    const dataString = JSON.stringify(data);
    return educationalRecordPatterns.some(pattern => pattern.test(dataString));
  }
}

module.exports = AIServiceManager;
