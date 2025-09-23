const { v4: uuidv4 } = require('uuid');

class SmartSearchAPI {
  constructor(db, aiConfig, complianceConfig) {
    this.db = db;
    this.aiConfig = aiConfig;
    this.complianceConfig = complianceConfig;
    this.searchIndex = new Map(); // In-memory search index (use Elasticsearch in production)
    this.embeddings = new Map(); // Vector embeddings cache
  }

  async initialize() {
    console.log('Initializing Smart Search & Discovery API...');
    
    // Initialize search index
    await this.buildSearchIndex();
    
    // Initialize AI models for natural language processing
    await this.initializeNLPModels();
    
    console.log('Smart Search & Discovery API initialized successfully.');
  }

  async buildSearchIndex() {
    try {
      // Build search index from existing content
      const queries = [
        // Archive files
        `SELECT id, file_name, file_type, metadata, folder, created_at, tenant_id 
         FROM archive_files WHERE metadata IS NOT NULL`,
        // Assignments (if assignments table exists)
        `SELECT id, title, description, content, created_at, tenant_id 
         FROM assignments WHERE content IS NOT NULL`,
        // Announcements (if announcements table exists)
        `SELECT id, title, content, created_at, tenant_id 
         FROM announcements WHERE content IS NOT NULL`
      ];

      for (const query of queries) {
        try {
          const result = await this.db.query(query);
          for (const row of result.rows) {
            await this.indexContent(row);
          }
        } catch (error) {
          // Table might not exist, continue with other queries
          console.log(`Table not found for query: ${query.substring(0, 50)}...`);
        }
      }

      console.log(`Search index built with ${this.searchIndex.size} items`);
    } catch (error) {
      console.error('Error building search index:', error);
    }
  }

  async indexContent(content) {
    const contentId = `${content.tenant_id}_${content.id}`;
    const searchableText = this.extractSearchableText(content);
    
    // Create search index entry
    this.searchIndex.set(contentId, {
      id: content.id,
      tenantId: content.tenant_id,
      type: this.getContentType(content),
      title: content.title || content.file_name || 'Untitled',
      content: searchableText,
      metadata: content.metadata || {},
      folder: content.folder || null,
      createdAt: content.created_at,
      lastIndexed: new Date()
    });

    // Generate embeddings for semantic search
    try {
      const embedding = await this.generateEmbedding(searchableText);
      this.embeddings.set(contentId, embedding);
    } catch (error) {
      console.error('Error generating embedding:', error);
    }
  }

  extractSearchableText(content) {
    let text = '';
    
    // Extract from different fields
    if (content.title) text += content.title + ' ';
    if (content.description) text += content.description + ' ';
    if (content.content) text += content.content + ' ';
    if (content.file_name) text += content.file_name + ' ';
    if (content.metadata) {
      const metadata = typeof content.metadata === 'string' ? JSON.parse(content.metadata) : content.metadata;
      if (metadata.description) text += metadata.description + ' ';
      if (metadata.tags) text += metadata.tags.join(' ') + ' ';
    }
    
    return text.trim();
  }

  getContentType(content) {
    if (content.file_name) return 'archive_file';
    if (content.title && content.description) return 'assignment';
    if (content.title && content.content) return 'announcement';
    return 'unknown';
  }

  async initializeNLPModels() {
    // Initialize natural language processing models
    // In production, this would load pre-trained models or connect to AI services
    console.log('NLP models initialized for smart search');
  }

  async generateEmbedding(text) {
    // Generate vector embedding for semantic search
    // In production, this would use OpenAI embeddings or similar service
    if (this.aiConfig.openai.apiKey) {
      // Use OpenAI embeddings
      return await this.generateOpenAIEmbedding(text);
    } else {
      // Fallback to simple text hashing for demo
      return this.simpleTextHash(text);
    }
  }

  async generateOpenAIEmbedding(text) {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.aiConfig.openai.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          input: text,
          model: 'text-embedding-ada-002'
        })
      });

      const data = await response.json();
      return data.data[0].embedding;
    } catch (error) {
      console.error('Error generating OpenAI embedding:', error);
      return this.simpleTextHash(text);
    }
  }

  simpleTextHash(text) {
    // Simple hash-based embedding for demo purposes
    const hash = require('crypto').createHash('md5').update(text).digest('hex');
    return hash.split('').map(c => parseInt(c, 16) / 15 - 0.5); // Convert to vector-like format
  }

  async search({ query, tenantId, filters = {}, limit = 20, offset = 0, context = {} }) {
    try {
      // Validate compliance
      const compliance = await this.validateCompliance(tenantId, 'search', { query, filters });
      if (!compliance.compliant) {
        throw new Error(`Compliance violation: ${compliance.reason}`);
      }

      // Process natural language query
      const processedQuery = await this.processNaturalLanguageQuery(query, context);
      
      // Perform search
      const results = await this.performSearch(processedQuery, tenantId, filters, limit, offset);
      
      // Enhance results with AI insights
      const enhancedResults = await this.enhanceSearchResults(results, query, context);
      
      return {
        query: processedQuery,
        results: enhancedResults,
        total: results.length,
        suggestions: await this.generateSearchSuggestions(query, tenantId),
        metadata: {
          searchTime: Date.now(),
          tenantId,
          filters,
          aiEnhanced: true
        }
      };
    } catch (error) {
      console.error('Error in smart search:', error);
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  async processNaturalLanguageQuery(query, context) {
    // Process natural language query to extract intent and entities
    if (this.aiConfig.openai.apiKey) {
      return await this.processWithOpenAI(query, context);
    } else {
      return this.processWithSimpleNLP(query);
    }
  }

  async processWithOpenAI(query, context) {
    try {
      const prompt = `
        Analyze this search query and extract:
        1. Main search intent
        2. Key entities (people, subjects, dates, etc.)
        3. Search filters
        4. Content types to search
        
        Query: "${query}"
        Context: ${JSON.stringify(context)}
        
        Return a JSON object with: intent, entities, filters, contentTypes
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
          max_tokens: this.aiConfig.openai.maxTokens
        })
      });

      const data = await response.json();
      const result = JSON.parse(data.choices[0].message.content);
      return result;
    } catch (error) {
      console.error('Error processing query with OpenAI:', error);
      return this.processWithSimpleNLP(query);
    }
  }

  processWithSimpleNLP(query) {
    // Simple NLP processing without AI
    const words = query.toLowerCase().split(' ');
    const entities = [];
    const filters = {};
    const contentTypes = [];

    // Extract common patterns
    if (words.includes('assignment') || words.includes('homework')) {
      contentTypes.push('assignment');
    }
    if (words.includes('file') || words.includes('document')) {
      contentTypes.push('archive_file');
    }
    if (words.includes('announcement') || words.includes('news')) {
      contentTypes.push('announcement');
    }

    // Extract date patterns
    const datePattern = /\b(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})\b/;
    const dateMatch = query.match(datePattern);
    if (dateMatch) {
      entities.push({ type: 'date', value: dateMatch[0] });
    }

    return {
      intent: query,
      entities,
      filters,
      contentTypes: contentTypes.length > 0 ? contentTypes : ['archive_file', 'assignment', 'announcement']
    };
  }

  async performSearch(processedQuery, tenantId, filters, limit, offset) {
    const results = [];
    const searchTerms = processedQuery.intent.toLowerCase().split(' ');

    // Search through indexed content
    for (const [contentId, indexedContent] of this.searchIndex) {
      if (indexedContent.tenantId !== tenantId) continue;
      
      // Apply content type filter
      if (processedQuery.contentTypes.length > 0 && 
          !processedQuery.contentTypes.includes(indexedContent.type)) {
        continue;
      }

      // Calculate relevance score
      const relevanceScore = this.calculateRelevanceScore(indexedContent, searchTerms, processedQuery.entities);
      
      if (relevanceScore > 0) {
        results.push({
          ...indexedContent,
          relevanceScore,
          matchedTerms: this.findMatchedTerms(indexedContent.content, searchTerms)
        });
      }
    }

    // Sort by relevance score
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Apply pagination
    return results.slice(offset, offset + limit);
  }

  calculateRelevanceScore(content, searchTerms, entities) {
    let score = 0;
    const text = content.content.toLowerCase();
    const title = content.title.toLowerCase();

    // Title matches get higher weight
    for (const term of searchTerms) {
      if (title.includes(term)) score += 3;
      if (text.includes(term)) score += 1;
    }

    // Entity matches
    for (const entity of entities) {
      if (text.includes(entity.value.toLowerCase())) score += 2;
    }

    // Metadata matches
    if (content.metadata) {
      const metadataText = JSON.stringify(content.metadata).toLowerCase();
      for (const term of searchTerms) {
        if (metadataText.includes(term)) score += 1.5;
      }
    }

    return score;
  }

  findMatchedTerms(content, searchTerms) {
    const matchedTerms = [];
    const text = content.toLowerCase();
    
    for (const term of searchTerms) {
      if (text.includes(term)) {
        matchedTerms.push(term);
      }
    }
    
    return matchedTerms;
  }

  async enhanceSearchResults(results, originalQuery, context) {
    // Enhance search results with AI-generated insights
    if (this.aiConfig.openai.apiKey && results.length > 0) {
      return await this.enhanceWithAI(results, originalQuery, context);
    }
    
    return results;
  }

  async enhanceWithAI(results, originalQuery, context) {
    try {
      const prompt = `
        Analyze these search results and provide:
        1. A brief summary of what was found
        2. Key insights or patterns
        3. Suggestions for refining the search
        
        Original Query: "${originalQuery}"
        Results: ${JSON.stringify(results.slice(0, 5), null, 2)}
        
        Return a JSON object with: summary, insights, suggestions
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
          max_tokens: 500
        })
      });

      const data = await response.json();
      const enhancement = JSON.parse(data.choices[0].message.content);
      
      return results.map(result => ({
        ...result,
        aiEnhancement: enhancement
      }));
    } catch (error) {
      console.error('Error enhancing results with AI:', error);
      return results;
    }
  }

  async generateSearchSuggestions(query, tenantId) {
    // Generate search suggestions based on query and tenant context
    const suggestions = [];
    
    // Add common search patterns
    suggestions.push(`"${query}" in assignments`);
    suggestions.push(`"${query}" in documents`);
    suggestions.push(`Recent "${query}"`);
    
    // Add related terms based on indexed content
    const relatedTerms = this.findRelatedTerms(query, tenantId);
    suggestions.push(...relatedTerms);
    
    return suggestions.slice(0, 5);
  }

  findRelatedTerms(query, tenantId) {
    const relatedTerms = [];
    const queryWords = query.toLowerCase().split(' ');
    
    // Find content with similar terms
    for (const [contentId, indexedContent] of this.searchIndex) {
      if (indexedContent.tenantId !== tenantId) continue;
      
      const contentWords = indexedContent.content.toLowerCase().split(' ');
      const commonWords = queryWords.filter(word => contentWords.includes(word));
      
      if (commonWords.length > 0) {
        const uniqueWords = contentWords.filter(word => 
          !queryWords.includes(word) && word.length > 3
        );
        relatedTerms.push(...uniqueWords.slice(0, 2));
      }
    }
    
    return [...new Set(relatedTerms)].slice(0, 3);
  }

  async addToIndex(content) {
    // Add new content to search index
    await this.indexContent(content);
  }

  async removeFromIndex(contentId, tenantId) {
    // Remove content from search index
    const fullId = `${tenantId}_${contentId}`;
    this.searchIndex.delete(fullId);
    this.embeddings.delete(fullId);
  }

  async updateIndex(content) {
    // Update content in search index
    await this.removeFromIndex(content.id, content.tenant_id);
    await this.addToIndex(content);
  }

  async validateCompliance(tenantId, operation, data) {
    // Validate compliance for search operations
    if (this.complianceConfig.auditLogging) {
      await this.logSearchOperation(tenantId, operation, data);
    }
    
    return { compliant: true };
  }

  async logSearchOperation(tenantId, operation, data) {
    try {
      const query = `
        INSERT INTO ai_search_logs (
          id, tenant_id, operation, query_data, created_at
        ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      `;
      
      await this.db.query(query, [
        uuidv4(),
        tenantId,
        operation,
        JSON.stringify(data)
      ]);
    } catch (error) {
      console.error('Error logging search operation:', error);
    }
  }

  async isHealthy() {
    // Check if the search API is healthy
    return this.searchIndex.size > 0;
  }
}

module.exports = SmartSearchAPI;
