const { v4: uuidv4 } = require('uuid');

class ConversationalInterfaceAPI {
  constructor(db, aiConfig, complianceConfig) {
    this.db = db;
    this.aiConfig = aiConfig;
    this.complianceConfig = complianceConfig;
    this.conversationContexts = new Map();
    this.knowledgeBases = new Map();
    this.intentClassifiers = new Map();
    this.responseGenerators = new Map();
  }

  async initialize() {
    console.log('Initializing Conversational Interface API...');
    
    // Initialize conversation contexts
    await this.initializeConversationContexts();
    
    // Initialize knowledge bases
    await this.initializeKnowledgeBases();
    
    // Initialize intent classifiers
    await this.initializeIntentClassifiers();
    
    // Initialize response generators
    await this.initializeResponseGenerators();
    
    console.log('Conversational Interface API initialized successfully.');
  }

  async initializeConversationContexts() {
    this.conversationContexts.set('student_portal', {
      scope: 'academic_support',
      allowedIntents: [
        'academic_help', 'assignment_questions', 'grade_inquiries', 'schedule_questions',
        'resource_requests', 'general_questions'
      ],
      contextRetention: 30 * 60 * 1000, // 30 minutes
      maxContextLength: 10
    });

    this.conversationContexts.set('parent_portal', {
      scope: 'parent_communication',
      allowedIntents: [
        'child_progress', 'attendance_inquiries', 'communication_requests',
        'event_questions', 'policy_questions', 'general_questions'
      ],
      contextRetention: 60 * 60 * 1000, // 1 hour
      maxContextLength: 15
    });

    this.conversationContexts.set('teacher_portal', {
      scope: 'educational_support',
      allowedIntents: [
        'curriculum_help', 'student_support', 'resource_requests', 'policy_questions',
        'technical_support', 'general_questions'
      ],
      contextRetention: 45 * 60 * 1000, // 45 minutes
      maxContextLength: 12
    });

    this.conversationContexts.set('admin_portal', {
      scope: 'administrative_support',
      allowedIntents: [
        'system_questions', 'policy_questions', 'user_management', 'report_requests',
        'technical_support', 'general_questions'
      ],
      contextRetention: 60 * 60 * 1000, // 1 hour
      maxContextLength: 20
    });
  }

  async initializeKnowledgeBases() {
    this.knowledgeBases.set('academic_knowledge', {
      sources: ['curriculum', 'assignments', 'grades', 'schedules'],
      updateFrequency: 'daily',
      searchMethod: 'semantic_search'
    });

    this.knowledgeBases.set('policy_knowledge', {
      sources: ['school_policies', 'procedures', 'handbooks', 'guidelines'],
      updateFrequency: 'weekly',
      searchMethod: 'keyword_search'
    });

    this.knowledgeBases.set('resource_knowledge', {
      sources: ['library', 'archives', 'educational_resources', 'tools'],
      updateFrequency: 'real_time',
      searchMethod: 'hybrid_search'
    });

    this.knowledgeBases.set('general_knowledge', {
      sources: ['faq', 'common_questions', 'troubleshooting', 'general_info'],
      updateFrequency: 'monthly',
      searchMethod: 'keyword_search'
    });
  }

  async initializeIntentClassifiers() {
    this.intentClassifiers.set('academic_help', {
      patterns: [
        'help with', 'how to', 'explain', 'understand', 'confused about',
        'don\'t understand', 'need help', 'stuck on'
      ],
      confidence_threshold: 0.7
    });

    this.intentClassifiers.set('assignment_questions', {
      patterns: [
        'assignment', 'homework', 'due date', 'submission', 'project',
        'essay', 'quiz', 'test', 'exam'
      ],
      confidence_threshold: 0.8
    });

    this.intentClassifiers.set('grade_inquiries', {
      patterns: [
        'grade', 'score', 'mark', 'result', 'performance',
        'how did i do', 'what\'s my grade'
      ],
      confidence_threshold: 0.8
    });

    this.intentClassifiers.set('schedule_questions', {
      patterns: [
        'schedule', 'timetable', 'class time', 'when is', 'what time',
        'next class', 'today\'s classes'
      ],
      confidence_threshold: 0.7
    });

    this.intentClassifiers.set('resource_requests', {
      patterns: [
        'resource', 'material', 'document', 'file', 'book',
        'need access to', 'where can i find'
      ],
      confidence_threshold: 0.6
    });

    this.intentClassifiers.set('general_questions', {
      patterns: [
        'what is', 'how does', 'can you tell me', 'explain',
        'information about', 'tell me about'
      ],
      confidence_threshold: 0.5
    });
  }

  async initializeResponseGenerators() {
    this.responseGenerators.set('informational', {
      style: 'helpful_and_clear',
      maxLength: 500,
      includeExamples: true,
      includeLinks: true
    });

    this.responseGenerators.set('instructional', {
      style: 'step_by_step',
      maxLength: 800,
      includeExamples: true,
      includeWarnings: true
    });

    this.responseGenerators.set('supportive', {
      style: 'encouraging_and_helpful',
      maxLength: 400,
      includeMotivation: true,
      includeNextSteps: true
    });
  }

  async processMessage({ message, userId, tenantId, conversationId, context = {}, options = {} }) {
    try {
      // Validate compliance
      const compliance = await this.validateCompliance(tenantId, 'processMessage', { userId, message });
      if (!compliance.compliant) {
        throw new Error(`Compliance violation: ${compliance.reason}`);
      }

      const messageId = uuidv4();
      
      // Get or create conversation context
      const conversationContext = await this.getConversationContext(conversationId, userId, tenantId, context);
      
      // Classify intent
      const intent = await this.classifyIntent(message, conversationContext);
      
      // Validate intent against conversation scope
      const validatedIntent = await this.validateIntent(intent, conversationContext);
      
      // Search knowledge base
      const knowledgeResults = await this.searchKnowledgeBase(validatedIntent, message, conversationContext);
      
      // Generate response
      const response = await this.generateResponse(message, validatedIntent, knowledgeResults, conversationContext, options);
      
      // Update conversation context
      await this.updateConversationContext(conversationId, message, response, validatedIntent);
      
      // Log the conversation
      await this.logConversation(messageId, conversationId, userId, tenantId, message, response, validatedIntent);

      return {
        messageId,
        conversationId,
        response,
        intent: validatedIntent,
        confidence: validatedIntent.confidence,
        knowledgeSources: knowledgeResults.sources,
        metadata: {
          responseTime: Date.now(),
          contextLength: conversationContext.messages.length,
          generatedAt: new Date().toISOString(),
          aiModel: this.aiConfig.openai.model || 'default'
        },
        complianceStatus: 'compliant'
      };
    } catch (error) {
      console.error('Error processing message:', error);
      throw new Error(`Message processing failed: ${error.message}`);
    }
  }

  async getConversationContext(conversationId, userId, tenantId, context) {
    const contextKey = `${conversationId}_${userId}_${tenantId}`;
    
    if (this.conversationContexts.has(contextKey)) {
      const existingContext = this.conversationContexts.get(contextKey);
      
      // Check if context is still valid
      if (Date.now() - existingContext.lastUpdated < existingContext.retentionTime) {
        return existingContext;
      }
    }
    
    // Create new conversation context
    const newContext = {
      conversationId,
      userId,
      tenantId,
      portalType: context.portalType || 'student_portal',
      messages: [],
      intentHistory: [],
      lastUpdated: Date.now(),
      retentionTime: this.conversationContexts.get(context.portalType || 'student_portal')?.contextRetention || 30 * 60 * 1000
    };
    
    this.conversationContexts.set(contextKey, newContext);
    return newContext;
  }

  async classifyIntent(message, conversationContext) {
    if (!this.aiConfig.openai.apiKey) {
      return this.classifyIntentSimple(message, conversationContext);
    }

    try {
      const prompt = `
        Classify the intent of this message in the context of a ${conversationContext.portalType} conversation.
        
        Message: "${message}"
        Context: ${JSON.stringify(conversationContext.messages.slice(-3))}
        
        Available intents: ${Object.keys(this.intentClassifiers).join(', ')}
        
        Return a JSON object with:
        - intent: the classified intent
        - confidence: confidence score (0-1)
        - entities: any entities mentioned in the message
        - reasoning: brief explanation of the classification
      `;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.aiConfig.openai.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.aiConfig.openai.model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 200
        })
      });

      const data = await response.json();
      return JSON.parse(data.choices[0].message.content);
    } catch (error) {
      console.error('Error classifying intent with AI:', error);
      return this.classifyIntentSimple(message, conversationContext);
    }
  }

  classifyIntentSimple(message, conversationContext) {
    const messageLower = message.toLowerCase();
    const intentScores = {};
    
    // Score each intent based on pattern matching
    for (const [intent, classifier] of this.intentClassifiers) {
      let score = 0;
      for (const pattern of classifier.patterns) {
        if (messageLower.includes(pattern)) {
          score += 1 / classifier.patterns.length;
        }
      }
      intentScores[intent] = score;
    }
    
    // Find the intent with the highest score
    const bestIntent = Object.entries(intentScores).reduce((a, b) => 
      intentScores[a[0]] > intentScores[b[0]] ? a : b
    );
    
    return {
      intent: bestIntent[0],
      confidence: bestIntent[1],
      entities: this.extractEntitiesSimple(message),
      reasoning: `Pattern matching score: ${bestIntent[1].toFixed(2)}`
    };
  }

  extractEntitiesSimple(message) {
    const entities = {
      subjects: [],
      dates: [],
      assignments: [],
      grades: []
    };
    
    // Extract subjects
    const subjects = ['math', 'science', 'english', 'history', 'art', 'music', 'physical education'];
    entities.subjects = subjects.filter(subject => message.toLowerCase().includes(subject));
    
    // Extract dates
    const datePattern = /\b(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})\b/g;
    entities.dates = message.match(datePattern) || [];
    
    // Extract assignment mentions
    const assignmentPattern = /\b(assignment|homework|project|essay|quiz|test|exam)\b/gi;
    entities.assignments = message.match(assignmentPattern) || [];
    
    return entities;
  }

  async validateIntent(intent, conversationContext) {
    const contextConfig = this.conversationContexts.get(conversationContext.portalType);
    
    if (!contextConfig) {
      return {
        ...intent,
        valid: false,
        reason: 'Unknown conversation context'
      };
    }
    
    if (!contextConfig.allowedIntents.includes(intent.intent)) {
      return {
        ...intent,
        intent: 'general_questions',
        valid: true,
        reason: 'Intent not allowed in this context, defaulting to general questions'
      };
    }
    
    const classifier = this.intentClassifiers.get(intent.intent);
    if (classifier && intent.confidence < classifier.confidence_threshold) {
      return {
        ...intent,
        intent: 'general_questions',
        valid: true,
        reason: 'Low confidence, defaulting to general questions'
      };
    }
    
    return {
      ...intent,
      valid: true
    };
  }

  async searchKnowledgeBase(intent, message, conversationContext) {
    const knowledgeResults = {
      sources: [],
      content: [],
      confidence: 0
    };
    
    // Determine which knowledge base to search
    const knowledgeBase = this.selectKnowledgeBase(intent.intent);
    
    // Search the knowledge base
    const searchResults = await this.performKnowledgeSearch(message, knowledgeBase, conversationContext);
    
    knowledgeResults.sources = searchResults.sources;
    knowledgeResults.content = searchResults.content;
    knowledgeResults.confidence = searchResults.confidence;
    
    return knowledgeResults;
  }

  selectKnowledgeBase(intent) {
    const knowledgeBaseMap = {
      'academic_help': 'academic_knowledge',
      'assignment_questions': 'academic_knowledge',
      'grade_inquiries': 'academic_knowledge',
      'schedule_questions': 'academic_knowledge',
      'resource_requests': 'resource_knowledge',
      'general_questions': 'general_knowledge'
    };
    
    return knowledgeBaseMap[intent] || 'general_knowledge';
  }

  async performKnowledgeSearch(query, knowledgeBase, conversationContext) {
    try {
      // Search the knowledge base
      const searchQuery = `
        SELECT 
          id, title, content, source, relevance_score, metadata
        FROM knowledge_base 
        WHERE knowledge_base_type = $1 
        AND tenant_id = $2
        AND (
          title ILIKE $3 OR 
          content ILIKE $3 OR 
          metadata::text ILIKE $3
        )
        ORDER BY relevance_score DESC, created_at DESC
        LIMIT 5
      `;
      
      const searchTerm = `%${query}%`;
      const result = await this.db.query(searchQuery, [
        knowledgeBase,
        conversationContext.tenantId,
        searchTerm
      ]);
      
      return {
        sources: result.rows.map(row => row.source),
        content: result.rows,
        confidence: result.rows.length > 0 ? 0.8 : 0.2
      };
    } catch (error) {
      console.error('Error searching knowledge base:', error);
      return {
        sources: [],
        content: [],
        confidence: 0
      };
    }
  }

  async generateResponse(message, intent, knowledgeResults, conversationContext, options) {
    if (!this.aiConfig.openai.apiKey) {
      return this.generateResponseSimple(message, intent, knowledgeResults, conversationContext);
    }

    try {
      const responseGenerator = this.responseGenerators.get(this.getResponseStyle(intent.intent));
      const contextMessages = conversationContext.messages.slice(-3);
      
      const prompt = `
        You are a helpful AI assistant for a school management system. Respond to the user's message in a ${responseGenerator.style} manner.
        
        User Message: "${message}"
        Intent: ${intent.intent}
        Confidence: ${intent.confidence}
        Context: ${contextMessages.map(m => `${m.role}: ${m.content}`).join('\n')}
        
        Knowledge Base Results:
        ${knowledgeResults.content.map(item => `- ${item.title}: ${item.content.substring(0, 200)}...`).join('\n')}
        
        Guidelines:
        - Be helpful, accurate, and appropriate for a school environment
        - Keep responses under ${responseGenerator.maxLength} characters
        - ${responseGenerator.includeExamples ? 'Include examples when helpful' : ''}
        - ${responseGenerator.includeLinks ? 'Include relevant links or references' : ''}
        - ${responseGenerator.includeWarnings ? 'Include warnings for important information' : ''}
        - ${responseGenerator.includeMotivation ? 'Be encouraging and supportive' : ''}
        - ${responseGenerator.includeNextSteps ? 'Suggest next steps when appropriate' : ''}
        
        Respond naturally and conversationally.
      `;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.aiConfig.openai.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.aiConfig.openai.model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: responseGenerator.maxLength,
          temperature: 0.7
        })
      });

      const data = await response.json();
      return data.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error generating response with AI:', error);
      return this.generateResponseSimple(message, intent, knowledgeResults, conversationContext);
    }
  }

  getResponseStyle(intent) {
    const styleMap = {
      'academic_help': 'instructional',
      'assignment_questions': 'instructional',
      'grade_inquiries': 'informational',
      'schedule_questions': 'informational',
      'resource_requests': 'informational',
      'general_questions': 'supportive'
    };
    
    return styleMap[intent] || 'supportive';
  }

  generateResponseSimple(message, intent, knowledgeResults, conversationContext) {
    const responses = {
      'academic_help': 'I\'d be happy to help you with your academic questions. Could you provide more specific details about what you need help with?',
      'assignment_questions': 'I can help you with assignment-related questions. What specific information do you need about your assignments?',
      'grade_inquiries': 'I can help you understand your grades. Please check your grade portal or contact your teacher for detailed information.',
      'schedule_questions': 'I can help you with schedule-related questions. What specific information do you need about your schedule?',
      'resource_requests': 'I can help you find resources. What type of resource are you looking for?',
      'general_questions': 'I\'m here to help! What would you like to know?'
    };
    
    let response = responses[intent.intent] || responses['general_questions'];
    
    // Add knowledge base information if available
    if (knowledgeResults.content.length > 0) {
      const topResult = knowledgeResults.content[0];
      response += `\n\nBased on our knowledge base: ${topResult.content.substring(0, 200)}...`;
    }
    
    return response;
  }

  async updateConversationContext(conversationId, message, response, intent) {
    const contextKey = `${conversationId}_${message.userId}_${message.tenantId}`;
    
    if (this.conversationContexts.has(contextKey)) {
      const context = this.conversationContexts.get(contextKey);
      
      // Add new messages
      context.messages.push(
        { role: 'user', content: message, timestamp: Date.now() },
        { role: 'assistant', content: response, timestamp: Date.now() }
      );
      
      // Add intent to history
      context.intentHistory.push({
        intent: intent.intent,
        confidence: intent.confidence,
        timestamp: Date.now()
      });
      
      // Limit context length
      const maxLength = this.conversationContexts.get(context.portalType)?.maxContextLength || 10;
      if (context.messages.length > maxLength) {
        context.messages = context.messages.slice(-maxLength);
      }
      
      context.lastUpdated = Date.now();
      this.conversationContexts.set(contextKey, context);
    }
  }

  async getConversationHistory({ conversationId, userId, tenantId, limit = 20 }) {
    try {
      const query = `
        SELECT 
          message_id, role, content, intent, confidence, timestamp
        FROM conversation_logs 
        WHERE conversation_id = $1 AND user_id = $2 AND tenant_id = $3
        ORDER BY timestamp DESC
        LIMIT $4
      `;
      
      const result = await this.db.query(query, [conversationId, userId, tenantId, limit]);
      return result.rows.reverse(); // Return in chronological order
    } catch (error) {
      console.error('Error getting conversation history:', error);
      return [];
    }
  }

  async clearConversationContext({ conversationId, userId, tenantId }) {
    const contextKey = `${conversationId}_${userId}_${tenantId}`;
    this.conversationContexts.delete(contextKey);
    
    return { success: true, message: 'Conversation context cleared' };
  }

  async getConversationAnalytics({ tenantId, timeRange = '7d', userId = null }) {
    try {
      const timeRangeMs = this.parseTimeRange(timeRange);
      const startDate = new Date(Date.now() - timeRangeMs);
      
      let query = `
        SELECT 
          intent, COUNT(*) as count, AVG(confidence) as avg_confidence
        FROM conversation_logs 
        WHERE tenant_id = $1 AND timestamp >= $2
      `;
      
      const params = [tenantId, startDate];
      
      if (userId) {
        query += ` AND user_id = $3`;
        params.push(userId);
      }
      
      query += ` GROUP BY intent ORDER BY count DESC`;
      
      const result = await this.db.query(query, params);
      
      return {
        timeRange,
        totalConversations: result.rows.reduce((sum, row) => sum + parseInt(row.count), 0),
        intentBreakdown: result.rows,
        averageConfidence: result.rows.reduce((sum, row) => sum + parseFloat(row.avg_confidence), 0) / result.rows.length
      };
    } catch (error) {
      console.error('Error getting conversation analytics:', error);
      return {
        timeRange,
        totalConversations: 0,
        intentBreakdown: [],
        averageConfidence: 0
      };
    }
  }

  parseTimeRange(timeRange) {
    const timeRangeMap = {
      '1d': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000
    };
    
    return timeRangeMap[timeRange] || timeRangeMap['7d'];
  }

  async validateCompliance(tenantId, operation, data) {
    // Validate compliance for conversational interface operations
    if (this.complianceConfig.auditLogging) {
      await this.logConversationOperation(tenantId, operation, data);
    }
    
    return { compliant: true };
  }

  async logConversation(messageId, conversationId, userId, tenantId, message, response, intent) {
    try {
      const query = `
        INSERT INTO conversation_logs (
          message_id, conversation_id, user_id, tenant_id, role, content, 
          intent, confidence, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
      `;
      
      // Log user message
      await this.db.query(query, [
        messageId + '_user',
        conversationId,
        userId,
        tenantId,
        'user',
        message,
        intent.intent,
        intent.confidence
      ]);
      
      // Log assistant response
      await this.db.query(query, [
        messageId + '_assistant',
        conversationId,
        userId,
        tenantId,
        'assistant',
        response,
        intent.intent,
        intent.confidence
      ]);
    } catch (error) {
      console.error('Error logging conversation:', error);
    }
  }

  async logConversationOperation(tenantId, operation, data) {
    try {
      const query = `
        INSERT INTO conversation_operation_logs (
          id, tenant_id, operation, operation_data, created_at
        ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      `;
      
      await this.db.query(query, [
        uuidv4(),
        tenantId,
        operation,
        JSON.stringify(data)
      ]);
    } catch (error) {
      console.error('Error logging conversation operation:', error);
    }
  }

  async isHealthy() {
    // Check if the conversational interface API is healthy
    return this.conversationContexts.size >= 0 && this.knowledgeBases.size > 0;
  }
}

module.exports = ConversationalInterfaceAPI;
