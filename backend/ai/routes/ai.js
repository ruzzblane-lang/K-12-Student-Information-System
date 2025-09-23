const express = require('express');
const router = express.Router();

// Initialize controller function
function initializeController(aiServiceManager) {
  return {
    // Smart Search & Discovery
    async searchContent(req, res) {
      try {
        const { query, filters, limit, offset } = req.body;
        const tenantId = req.headers['x-tenant-id'];
        const userId = req.headers['x-user-id'];
        
        const result = await aiServiceManager.executeModuleFunction(
          tenantId,
          'smart-search',
          'search',
          { query, tenantId, filters, limit, offset, context: { userId } }
        );
        
        res.json(result);
      } catch (error) {
        console.error('Error in searchContent:', error);
        res.status(500).json({ error: error.message });
      }
    },

    // Automated Tagging & Metadata
    async processFile(req, res) {
      try {
        const { fileId, filePath, fileName, fileType } = req.body;
        const tenantId = req.headers['x-tenant-id'];
        const userId = req.headers['x-user-id'];
        
        const result = await aiServiceManager.executeModuleFunction(
          tenantId,
          'automated-tagging',
          'processFile',
          { fileId, tenantId, filePath, fileName, fileType, context: { userId } }
        );
        
        res.json(result);
      } catch (error) {
        console.error('Error in processFile:', error);
        res.status(500).json({ error: error.message });
      }
    },

    // Personalized Learning Insights
    async generateLearningInsights(req, res) {
      try {
        const { studentId, timeRange, insightsType } = req.body;
        const tenantId = req.headers['x-tenant-id'];
        const userId = req.headers['x-user-id'];
        
        const result = await aiServiceManager.executeModuleFunction(
          tenantId,
          'learning-insights',
          'generateLearningInsights',
          { studentId, tenantId, timeRange, insightsType, context: { userId } }
        );
        
        res.json(result);
      } catch (error) {
        console.error('Error in generateLearningInsights:', error);
        res.status(500).json({ error: error.message });
      }
    },

    // Translation & Accessibility
    async translateText(req, res) {
      try {
        const { text, sourceLanguage, targetLanguage, options } = req.body;
        const tenantId = req.headers['x-tenant-id'];
        const userId = req.headers['x-user-id'];
        
        const result = await aiServiceManager.executeModuleFunction(
          tenantId,
          'translation-accessibility',
          'translateText',
          { text, sourceLanguage, targetLanguage, context: { userId }, options }
        );
        
        res.json(result);
      } catch (error) {
        console.error('Error in translateText:', error);
        res.status(500).json({ error: error.message });
      }
    },

    async convertTextToSpeech(req, res) {
      try {
        const { text, language, voice, speed, pitch } = req.body;
        const tenantId = req.headers['x-tenant-id'];
        const userId = req.headers['x-user-id'];
        
        const result = await aiServiceManager.executeModuleFunction(
          tenantId,
          'translation-accessibility',
          'convertTextToSpeech',
          { text, language, voice, speed, pitch, context: { userId } }
        );
        
        res.json(result);
      } catch (error) {
        console.error('Error in convertTextToSpeech:', error);
        res.status(500).json({ error: error.message });
      }
    },

    async convertSpeechToText(req, res) {
      try {
        const { audioData, language, options } = req.body;
        const tenantId = req.headers['x-tenant-id'];
        const userId = req.headers['x-user-id'];
        
        const result = await aiServiceManager.executeModuleFunction(
          tenantId,
          'translation-accessibility',
          'convertSpeechToText',
          { audioData, language, context: { userId }, options }
        );
        
        res.json(result);
      } catch (error) {
        console.error('Error in convertSpeechToText:', error);
        res.status(500).json({ error: error.message });
      }
    },

    // Fraud & Anomaly Detection
    async assessPaymentRisk(req, res) {
      try {
        const { paymentData, userContext, transactionHistory } = req.body;
        const tenantId = req.headers['x-tenant-id'];
        const userId = req.headers['x-user-id'];
        
        const result = await aiServiceManager.executeModuleFunction(
          tenantId,
          'fraud-detection',
          'assessPaymentRisk',
          { paymentData, userContext, transactionHistory, context: { userId, tenantId } }
        );
        
        res.json(result);
      } catch (error) {
        console.error('Error in assessPaymentRisk:', error);
        res.status(500).json({ error: error.message });
      }
    },

    async monitorRealTimeActivity(req, res) {
      try {
        const { userId, activityData } = req.body;
        const tenantId = req.headers['x-tenant-id'];
        
        const result = await aiServiceManager.executeModuleFunction(
          tenantId,
          'fraud-detection',
          'monitorRealTimeActivity',
          { userId, tenantId, activityData, context: { tenantId } }
        );
        
        res.json(result);
      } catch (error) {
        console.error('Error in monitorRealTimeActivity:', error);
        res.status(500).json({ error: error.message });
      }
    },

    // Generative Summaries & Reports
    async generateSummary(req, res) {
      try {
        const { content, contentType, summaryType, options } = req.body;
        const tenantId = req.headers['x-tenant-id'];
        const userId = req.headers['x-user-id'];
        
        const result = await aiServiceManager.executeModuleFunction(
          tenantId,
          'generative-summaries',
          'generateSummary',
          { content, contentType, summaryType, context: { userId }, options }
        );
        
        res.json(result);
      } catch (error) {
        console.error('Error in generateSummary:', error);
        res.status(500).json({ error: error.message });
      }
    },

    async generateReport(req, res) {
      try {
        const { reportType, data, options } = req.body;
        const tenantId = req.headers['x-tenant-id'];
        const userId = req.headers['x-user-id'];
        
        const result = await aiServiceManager.executeModuleFunction(
          tenantId,
          'generative-summaries',
          'generateReport',
          { reportType, data, context: { userId }, options }
        );
        
        res.json(result);
      } catch (error) {
        console.error('Error in generateReport:', error);
        res.status(500).json({ error: error.message });
      }
    },

    // Smart Recommendations
    async generateRecommendations(req, res) {
      try {
        const { userId, recommendationType, context, options } = req.body;
        const tenantId = req.headers['x-tenant-id'];
        
        const result = await aiServiceManager.executeModuleFunction(
          tenantId,
          'recommendations',
          'generateRecommendations',
          { userId, tenantId, recommendationType, context, options }
        );
        
        res.json(result);
      } catch (error) {
        console.error('Error in generateRecommendations:', error);
        res.status(500).json({ error: error.message });
      }
    },

    // Conversational Interface
    async processMessage(req, res) {
      try {
        const { message, conversationId, context, options } = req.body;
        const tenantId = req.headers['x-tenant-id'];
        const userId = req.headers['x-user-id'];
        
        const result = await aiServiceManager.executeModuleFunction(
          tenantId,
          'conversational-interface',
          'processMessage',
          { message, userId, tenantId, conversationId, context, options }
        );
        
        res.json(result);
      } catch (error) {
        console.error('Error in processMessage:', error);
        res.status(500).json({ error: error.message });
      }
    },

    async getConversationHistory(req, res) {
      try {
        const { conversationId, limit } = req.query;
        const tenantId = req.headers['x-tenant-id'];
        const userId = req.headers['x-user-id'];
        
        const result = await aiServiceManager.executeModuleFunction(
          tenantId,
          'conversational-interface',
          'getConversationHistory',
          { conversationId, userId, tenantId, limit: parseInt(limit) || 20 }
        );
        
        res.json(result);
      } catch (error) {
        console.error('Error in getConversationHistory:', error);
        res.status(500).json({ error: error.message });
      }
    },

    // Tenant Configuration
    async updateTenantModuleConfig(req, res) {
      try {
        const { moduleName, enabled, config } = req.body;
        const tenantId = req.headers['x-tenant-id'];
        const userId = req.headers['x-user-id'];
        
        const result = await aiServiceManager.updateTenantModuleConfig(
          tenantId,
          moduleName,
          enabled,
          config
        );
        
        res.json(result);
      } catch (error) {
        console.error('Error in updateTenantModuleConfig:', error);
        res.status(500).json({ error: error.message });
      }
    },

    async getTenantAIConfig(req, res) {
      try {
        const tenantId = req.headers['x-tenant-id'];
        
        const result = await aiServiceManager.getTenantAIConfig(tenantId);
        
        res.json(result);
      } catch (error) {
        console.error('Error in getTenantAIConfig:', error);
        res.status(500).json({ error: error.message });
      }
    }
  };
}

// Define routes
router.post('/search', (req, res) => {
  const controller = req.app.get('aiController');
  controller.searchContent(req, res);
});

router.post('/tagging/process', (req, res) => {
  const controller = req.app.get('aiController');
  controller.processFile(req, res);
});

router.post('/insights/generate', (req, res) => {
  const controller = req.app.get('aiController');
  controller.generateLearningInsights(req, res);
});

router.post('/translation/translate', (req, res) => {
  const controller = req.app.get('aiController');
  controller.translateText(req, res);
});

router.post('/translation/text-to-speech', (req, res) => {
  const controller = req.app.get('aiController');
  controller.convertTextToSpeech(req, res);
});

router.post('/translation/speech-to-text', (req, res) => {
  const controller = req.app.get('aiController');
  controller.convertSpeechToText(req, res);
});

router.post('/fraud/assess-risk', (req, res) => {
  const controller = req.app.get('aiController');
  controller.assessPaymentRisk(req, res);
});

router.post('/fraud/monitor-activity', (req, res) => {
  const controller = req.app.get('aiController');
  controller.monitorRealTimeActivity(req, res);
});

router.post('/summaries/generate', (req, res) => {
  const controller = req.app.get('aiController');
  controller.generateSummary(req, res);
});

router.post('/reports/generate', (req, res) => {
  const controller = req.app.get('aiController');
  controller.generateReport(req, res);
});

router.post('/recommendations/generate', (req, res) => {
  const controller = req.app.get('aiController');
  controller.generateRecommendations(req, res);
});

router.post('/conversation/message', (req, res) => {
  const controller = req.app.get('aiController');
  controller.processMessage(req, res);
});

router.get('/conversation/history', (req, res) => {
  const controller = req.app.get('aiController');
  controller.getConversationHistory(req, res);
});

router.put('/tenant/config', (req, res) => {
  const controller = req.app.get('aiController');
  controller.updateTenantModuleConfig(req, res);
});

router.get('/tenant/config', (req, res) => {
  const controller = req.app.get('aiController');
  controller.getTenantAIConfig(req, res);
});

module.exports = { router, initializeController };
