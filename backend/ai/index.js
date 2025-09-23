const express = require('express');
const AIServiceManager = require('./services/AIServiceManager');
const { router: aiRoutes, initializeController: initializeAIController } = require('./routes/ai');

class AIIntegrationHub {
  constructor(db, config = {}) {
    this.db = db;
    this.config = config;
    this.router = express.Router();
    
    // Initialize AI service manager
    this.aiServiceManager = new AIServiceManager(db, config);
    this.aiController = null;
    
    // AI module registry
    this.availableModules = {
      'smart-search': require('./modules/SmartSearchAPI'),
      'automated-tagging': require('./modules/AutomatedTaggingAPI'),
      'learning-insights': require('./modules/LearningInsightsAPI'),
      'translation-accessibility': require('./modules/TranslationAccessibilityAPI'),
      'fraud-detection': require('./modules/FraudDetectionAPI'),
      'generative-summaries': require('./modules/GenerativeSummariesAPI'),
      'recommendations': require('./modules/RecommendationsAPI'),
      'conversational-interface': require('./modules/ConversationalInterfaceAPI')
    };
    
    this.initialize();
  }

  async initialize() {
    console.log('Initializing AI Integration Hub...');
    try {
      await this.aiServiceManager.initialize();
      this.initializeControllers();
      this.setupRoutes();
      console.log('AI Integration Hub initialized successfully.');
    } catch (error) {
      console.error('Failed to initialize AI Integration Hub:', error);
      throw error;
    }
  }

  initializeControllers() {
    this.aiController = initializeAIController(this.aiServiceManager);
  }

  setupRoutes() {
    this.router.use('/ai', aiRoutes);

    // Health check endpoint
    this.router.get('/ai/health', (req, res) => {
      res.status(200).json({
        success: true,
        message: 'AI Integration Hub is healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        availableModules: Object.keys(this.availableModules),
        features: [
          'smart_search_discovery',
          'automated_tagging_metadata',
          'personalized_learning_insights',
          'translation_accessibility',
          'fraud_anomaly_detection',
          'generative_summaries_reports',
          'smart_recommendations',
          'conversational_interface',
          'tenant_level_controls',
          'compliance_framework'
        ]
      });
    });

    // Module status endpoint
    this.router.get('/ai/modules/status', async (req, res) => {
      try {
        const tenantId = req.headers['x-tenant-id'];
        if (!tenantId) {
          return res.status(400).json({ error: 'Tenant ID required' });
        }

        const moduleStatus = await this.aiServiceManager.getModuleStatus(tenantId);
        res.json({
          success: true,
          tenantId,
          modules: moduleStatus
        });
      } catch (error) {
        console.error('Error getting module status:', error);
        res.status(500).json({ error: 'Failed to get module status' });
      }
    });
  }

  getRouter() {
    return this.router;
  }

  getAIServiceManager() {
    return this.aiServiceManager;
  }

  getAvailableModules() {
    return this.availableModules;
  }
}

module.exports = AIIntegrationHub;
