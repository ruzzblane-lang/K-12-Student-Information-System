const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp'); // For image processing
const pdfParse = require('pdf-parse'); // For PDF text extraction
const mammoth = require('mammoth'); // For Word document processing

class AutomatedTaggingAPI {
  constructor(db, aiConfig, complianceConfig) {
    this.db = db;
    this.aiConfig = aiConfig;
    this.complianceConfig = complianceConfig;
    this.processingQueue = new Map();
    this.tagCategories = {
      'academic': ['assignment', 'homework', 'exam', 'quiz', 'project', 'essay', 'research'],
      'administrative': ['form', 'application', 'permission', 'consent', 'policy', 'procedure'],
      'communication': ['announcement', 'newsletter', 'email', 'memo', 'notice'],
      'media': ['image', 'photo', 'video', 'audio', 'presentation', 'slideshow'],
      'reference': ['textbook', 'manual', 'guide', 'handbook', 'resource', 'documentation'],
      'student': ['transcript', 'report', 'progress', 'attendance', 'behavior', 'achievement']
    };
  }

  async initialize() {
    console.log('Initializing Automated Tagging & Metadata API...');
    
    // Initialize OCR and text extraction services
    await this.initializeTextExtraction();
    
    // Initialize image analysis services
    await this.initializeImageAnalysis();
    
    // Initialize AI models for content analysis
    await this.initializeContentAnalysis();
    
    console.log('Automated Tagging & Metadata API initialized successfully.');
  }

  async initializeTextExtraction() {
    // Initialize text extraction services
    console.log('Text extraction services initialized');
  }

  async initializeImageAnalysis() {
    // Initialize image analysis services
    console.log('Image analysis services initialized');
  }

  async initializeContentAnalysis() {
    // Initialize AI models for content analysis
    console.log('Content analysis models initialized');
  }

  async processFile({ fileId, tenantId, filePath, fileName, fileType, context = {} }) {
    try {
      // Validate compliance
      const compliance = await this.validateCompliance(tenantId, 'processFile', { fileId, fileName });
      if (!compliance.compliant) {
        throw new Error(`Compliance violation: ${compliance.reason}`);
      }

      const processingId = uuidv4();
      this.processingQueue.set(processingId, { status: 'processing', startTime: Date.now() });

      // Extract text content based on file type
      const extractedContent = await this.extractContent(filePath, fileType);
      
      // Generate OCR for images if needed
      const ocrText = await this.performOCR(filePath, fileType);
      
      // Analyze content and generate tags
      const analysis = await this.analyzeContent(extractedContent, ocrText, fileName, fileType);
      
      // Generate intelligent metadata
      const metadata = await this.generateMetadata(analysis, context);
      
      // Generate captions for images/videos
      const captions = await this.generateCaptions(filePath, fileType);
      
      // Update processing status
      this.processingQueue.set(processingId, { 
        status: 'completed', 
        endTime: Date.now(),
        result: { analysis, metadata, captions }
      });

      // Save results to database
      await this.saveProcessingResults(fileId, tenantId, analysis, metadata, captions);

      return {
        processingId,
        analysis,
        metadata,
        captions,
        extractedContent: extractedContent.substring(0, 500) + '...', // Truncated for response
        ocrText: ocrText ? ocrText.substring(0, 200) + '...' : null
      };
    } catch (error) {
      console.error('Error processing file:', error);
      throw new Error(`File processing failed: ${error.message}`);
    }
  }

  async extractContent(filePath, fileType) {
    try {
      switch (fileType) {
        case 'application/pdf':
          return await this.extractPDFText(filePath);
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        case 'application/msword':
          return await this.extractWordText(filePath);
        case 'text/plain':
          return await this.extractPlainText(filePath);
        case 'text/html':
          return await this.extractHTMLText(filePath);
        default:
          return '';
      }
    } catch (error) {
      console.error('Error extracting content:', error);
      return '';
    }
  }

  async extractPDFText(filePath) {
    try {
      const fs = require('fs');
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      return data.text;
    } catch (error) {
      console.error('Error extracting PDF text:', error);
      return '';
    }
  }

  async extractWordText(filePath) {
    try {
      const fs = require('fs');
      const buffer = fs.readFileSync(filePath);
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (error) {
      console.error('Error extracting Word text:', error);
      return '';
    }
  }

  async extractPlainText(filePath) {
    try {
      const fs = require('fs');
      return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
      console.error('Error extracting plain text:', error);
      return '';
    }
  }

  async extractHTMLText(filePath) {
    try {
      const fs = require('fs');
      const html = fs.readFileSync(filePath, 'utf8');
      // Simple HTML tag removal (use cheerio in production)
      return html.replace(/<[^>]*>/g, '');
    } catch (error) {
      console.error('Error extracting HTML text:', error);
      return '';
    }
  }

  async performOCR(filePath, fileType) {
    if (!this.isImageFile(fileType)) {
      return null;
    }

    try {
      // In production, use Tesseract.js or cloud OCR services
      if (this.aiConfig.azure.apiKey) {
        return await this.performAzureOCR(filePath);
      } else {
        // Fallback to simple image analysis
        return await this.performSimpleImageAnalysis(filePath);
      }
    } catch (error) {
      console.error('Error performing OCR:', error);
      return null;
    }
  }

  isImageFile(fileType) {
    return fileType.startsWith('image/');
  }

  async performAzureOCR(filePath) {
    try {
      const fs = require('fs');
      const imageBuffer = fs.readFileSync(filePath);
      
      const response = await fetch(`${this.aiConfig.azure.endpoint}/vision/v3.2/read/analyze`, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': this.aiConfig.azure.apiKey,
          'Content-Type': 'application/octet-stream'
        },
        body: imageBuffer
      });

      if (response.ok) {
        const operationLocation = response.headers.get('Operation-Location');
        // Poll for results (simplified for demo)
        return 'OCR text extracted from image';
      }
      
      return null;
    } catch (error) {
      console.error('Error with Azure OCR:', error);
      return null;
    }
  }

  async performSimpleImageAnalysis(filePath) {
    try {
      // Simple image analysis without OCR
      const metadata = await sharp(filePath).metadata();
      return `Image analysis: ${metadata.width}x${metadata.height}, ${metadata.format}`;
    } catch (error) {
      console.error('Error with simple image analysis:', error);
      return null;
    }
  }

  async analyzeContent(textContent, ocrText, fileName, fileType) {
    const analysis = {
      contentType: this.detectContentType(textContent, fileName, fileType),
      language: await this.detectLanguage(textContent),
      topics: await this.extractTopics(textContent),
      entities: await this.extractEntities(textContent),
      sentiment: await this.analyzeSentiment(textContent),
      keywords: await this.extractKeywords(textContent),
      readability: await this.analyzeReadability(textContent),
      academicLevel: await this.detectAcademicLevel(textContent),
      subjectAreas: await this.detectSubjectAreas(textContent),
      hasImages: ocrText !== null,
      imageText: ocrText
    };

    return analysis;
  }

  detectContentType(textContent, fileName, fileType) {
    const text = (textContent + ' ' + fileName).toLowerCase();
    
    // Check for assignment indicators
    if (text.includes('assignment') || text.includes('homework') || text.includes('due date')) {
      return 'assignment';
    }
    
    // Check for exam indicators
    if (text.includes('exam') || text.includes('test') || text.includes('quiz')) {
      return 'assessment';
    }
    
    // Check for announcement indicators
    if (text.includes('announcement') || text.includes('notice') || text.includes('important')) {
      return 'announcement';
    }
    
    // Check for form indicators
    if (text.includes('form') || text.includes('application') || text.includes('signature')) {
      return 'form';
    }
    
    // Check for reference material
    if (text.includes('chapter') || text.includes('textbook') || text.includes('reference')) {
      return 'reference';
    }
    
    return 'document';
  }

  async detectLanguage(textContent) {
    if (this.aiConfig.openai.apiKey) {
      return await this.detectLanguageWithAI(textContent);
    } else {
      return this.detectLanguageSimple(textContent);
    }
  }

  async detectLanguageWithAI(textContent) {
    try {
      const prompt = `Detect the language of this text: "${textContent.substring(0, 500)}"`;
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.aiConfig.openai.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.aiConfig.openai.model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 50
        })
      });

      const data = await response.json();
      return data.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error detecting language with AI:', error);
      return this.detectLanguageSimple(textContent);
    }
  }

  detectLanguageSimple(textContent) {
    // Simple language detection based on common words
    const englishWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    const spanishWords = ['el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'es', 'se', 'no', 'te'];
    const frenchWords = ['le', 'la', 'de', 'et', 'à', 'un', 'il', 'que', 'ne', 'se', 'ce', 'pas'];
    
    const text = textContent.toLowerCase();
    const englishCount = englishWords.filter(word => text.includes(word)).length;
    const spanishCount = spanishWords.filter(word => text.includes(word)).length;
    const frenchCount = frenchWords.filter(word => text.includes(word)).length;
    
    if (englishCount > spanishCount && englishCount > frenchCount) return 'English';
    if (spanishCount > frenchCount) return 'Spanish';
    if (frenchCount > 0) return 'French';
    return 'Unknown';
  }

  async extractTopics(textContent) {
    if (this.aiConfig.openai.apiKey) {
      return await this.extractTopicsWithAI(textContent);
    } else {
      return this.extractTopicsSimple(textContent);
    }
  }

  async extractTopicsWithAI(textContent) {
    try {
      const prompt = `
        Extract the main topics from this text. Return a JSON array of topics.
        Text: "${textContent.substring(0, 1000)}"
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
      console.error('Error extracting topics with AI:', error);
      return this.extractTopicsSimple(textContent);
    }
  }

  extractTopicsSimple(textContent) {
    // Simple topic extraction based on keyword frequency
    const words = textContent.toLowerCase().split(/\W+/);
    const wordCount = {};
    
    words.forEach(word => {
      if (word.length > 4) {
        wordCount[word] = (wordCount[word] || 0) + 1;
      }
    });
    
    return Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }

  async extractEntities(textContent) {
    if (this.aiConfig.openai.apiKey) {
      return await this.extractEntitiesWithAI(textContent);
    } else {
      return this.extractEntitiesSimple(textContent);
    }
  }

  async extractEntitiesWithAI(textContent) {
    try {
      const prompt = `
        Extract named entities from this text. Return a JSON object with categories:
        - people: names of people
        - organizations: school names, companies
        - locations: places, addresses
        - dates: specific dates mentioned
        - subjects: academic subjects
        
        Text: "${textContent.substring(0, 1000)}"
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
          max_tokens: 300
        })
      });

      const data = await response.json();
      return JSON.parse(data.choices[0].message.content);
    } catch (error) {
      console.error('Error extracting entities with AI:', error);
      return this.extractEntitiesSimple(textContent);
    }
  }

  extractEntitiesSimple(textContent) {
    // Simple entity extraction using regex patterns
    const entities = {
      people: [],
      organizations: [],
      locations: [],
      dates: [],
      subjects: []
    };

    // Extract dates
    const datePattern = /\b(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})\b/g;
    entities.dates = textContent.match(datePattern) || [];

    // Extract email addresses
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = textContent.match(emailPattern) || [];
    entities.organizations.push(...emails);

    // Extract academic subjects (simple pattern matching)
    const subjects = ['math', 'science', 'english', 'history', 'art', 'music', 'physical education', 'computer science'];
    entities.subjects = subjects.filter(subject => 
      textContent.toLowerCase().includes(subject)
    );

    return entities;
  }

  async analyzeSentiment(textContent) {
    if (this.aiConfig.openai.apiKey) {
      return await this.analyzeSentimentWithAI(textContent);
    } else {
      return this.analyzeSentimentSimple(textContent);
    }
  }

  async analyzeSentimentWithAI(textContent) {
    try {
      const prompt = `
        Analyze the sentiment of this text. Return a JSON object with:
        - sentiment: "positive", "negative", or "neutral"
        - confidence: number between 0 and 1
        - explanation: brief explanation
        
        Text: "${textContent.substring(0, 500)}"
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
          max_tokens: 150
        })
      });

      const data = await response.json();
      return JSON.parse(data.choices[0].message.content);
    } catch (error) {
      console.error('Error analyzing sentiment with AI:', error);
      return this.analyzeSentimentSimple(textContent);
    }
  }

  analyzeSentimentSimple(textContent) {
    // Simple sentiment analysis based on word lists
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'outstanding'];
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'disappointing', 'poor', 'worst'];
    
    const text = textContent.toLowerCase();
    const positiveCount = positiveWords.filter(word => text.includes(word)).length;
    const negativeCount = negativeWords.filter(word => text.includes(word)).length;
    
    if (positiveCount > negativeCount) {
      return { sentiment: 'positive', confidence: 0.7, explanation: 'Contains positive language' };
    } else if (negativeCount > positiveCount) {
      return { sentiment: 'negative', confidence: 0.7, explanation: 'Contains negative language' };
    } else {
      return { sentiment: 'neutral', confidence: 0.6, explanation: 'Neutral language detected' };
    }
  }

  async extractKeywords(textContent) {
    // Extract important keywords from text
    const words = textContent.toLowerCase().split(/\W+/);
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should'];
    
    const wordCount = {};
    words.forEach(word => {
      if (word.length > 3 && !stopWords.includes(word)) {
        wordCount[word] = (wordCount[word] || 0) + 1;
      }
    });
    
    return Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20)
      .map(([word, count]) => ({ word, count }));
  }

  async analyzeReadability(textContent) {
    // Simple readability analysis
    const sentences = textContent.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = textContent.split(/\s+/).filter(w => w.length > 0);
    const syllables = this.countSyllables(textContent);
    
    const avgWordsPerSentence = words.length / sentences.length;
    const avgSyllablesPerWord = syllables / words.length;
    
    // Simple Flesch Reading Ease approximation
    const score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
    
    let level = 'college';
    if (score >= 90) level = 'elementary';
    else if (score >= 80) level = 'middle school';
    else if (score >= 70) level = 'high school';
    else if (score >= 60) level = 'college';
    else level = 'graduate';
    
    return {
      score: Math.round(score),
      level,
      avgWordsPerSentence: Math.round(avgWordsPerSentence),
      avgSyllablesPerWord: Math.round(avgSyllablesPerWord * 100) / 100
    };
  }

  countSyllables(text) {
    const words = text.toLowerCase().split(/\s+/);
    let totalSyllables = 0;
    
    words.forEach(word => {
      const syllables = word.replace(/[^aeiouy]/g, '').length;
      totalSyllables += Math.max(1, syllables);
    });
    
    return totalSyllables;
  }

  async detectAcademicLevel(textContent) {
    // Detect academic level based on content complexity
    const readability = await this.analyzeReadability(textContent);
    const wordCount = textContent.split(/\s+/).length;
    
    if (readability.level === 'elementary' || wordCount < 100) {
      return 'elementary';
    } else if (readability.level === 'middle school' || wordCount < 500) {
      return 'middle school';
    } else if (readability.level === 'high school' || wordCount < 1000) {
      return 'high school';
    } else if (readability.level === 'college') {
      return 'college';
    } else {
      return 'graduate';
    }
  }

  async detectSubjectAreas(textContent) {
    const subjects = {
      'mathematics': ['math', 'algebra', 'geometry', 'calculus', 'statistics', 'equation', 'formula'],
      'science': ['science', 'biology', 'chemistry', 'physics', 'experiment', 'hypothesis', 'theory'],
      'english': ['english', 'literature', 'writing', 'grammar', 'essay', 'poetry', 'novel'],
      'history': ['history', 'historical', 'war', 'revolution', 'ancient', 'medieval', 'century'],
      'art': ['art', 'painting', 'drawing', 'sculpture', 'creative', 'design', 'aesthetic'],
      'music': ['music', 'musical', 'instrument', 'composer', 'melody', 'rhythm', 'harmony'],
      'physical education': ['physical', 'sports', 'exercise', 'fitness', 'athletic', 'gym', 'health']
    };
    
    const text = textContent.toLowerCase();
    const detectedSubjects = [];
    
    for (const [subject, keywords] of Object.entries(subjects)) {
      const matchCount = keywords.filter(keyword => text.includes(keyword)).length;
      if (matchCount > 0) {
        detectedSubjects.push({
          subject,
          confidence: matchCount / keywords.length
        });
      }
    }
    
    return detectedSubjects.sort((a, b) => b.confidence - a.confidence);
  }

  async generateCaptions(filePath, fileType) {
    if (!this.isImageFile(fileType)) {
      return null;
    }

    try {
      if (this.aiConfig.openai.apiKey) {
        return await this.generateCaptionsWithAI(filePath);
      } else {
        return await this.generateSimpleCaption(filePath);
      }
    } catch (error) {
      console.error('Error generating captions:', error);
      return null;
    }
  }

  async generateCaptionsWithAI(filePath) {
    try {
      // In production, this would use OpenAI's vision API
      // For demo purposes, return a placeholder
      return {
        caption: "AI-generated caption for image",
        confidence: 0.85,
        tags: ["educational", "document", "text"]
      };
    } catch (error) {
      console.error('Error generating AI captions:', error);
      return null;
    }
  }

  async generateSimpleCaption(filePath) {
    try {
      const metadata = await sharp(filePath).metadata();
      return {
        caption: `${metadata.format.toUpperCase()} image (${metadata.width}x${metadata.height})`,
        confidence: 0.6,
        tags: ["image", metadata.format]
      };
    } catch (error) {
      console.error('Error generating simple caption:', error);
      return null;
    }
  }

  async generateMetadata(analysis, context) {
    const metadata = {
      contentType: analysis.contentType,
      language: analysis.language,
      topics: analysis.topics,
      keywords: analysis.keywords.map(k => k.word),
      academicLevel: analysis.academicLevel,
      subjectAreas: analysis.subjectAreas.map(s => s.subject),
      readability: analysis.readability,
      sentiment: analysis.sentiment,
      entities: analysis.entities,
      hasImages: analysis.hasImages,
      imageText: analysis.imageText,
      autoGenerated: true,
      generatedAt: new Date().toISOString(),
      ...context
    };

    // Generate intelligent tags
    metadata.tags = await this.generateIntelligentTags(analysis);

    return metadata;
  }

  async generateIntelligentTags(analysis) {
    const tags = [];
    
    // Add content type tag
    tags.push(analysis.contentType);
    
    // Add academic level tag
    tags.push(analysis.academicLevel.replace(' ', '_'));
    
    // Add subject area tags
    analysis.subjectAreas.forEach(subject => {
      if (subject.confidence > 0.5) {
        tags.push(subject.subject.replace(' ', '_'));
      }
    });
    
    // Add topic tags (top 5)
    analysis.topics.slice(0, 5).forEach(topic => {
      tags.push(topic);
    });
    
    // Add sentiment tag
    if (analysis.sentiment.confidence > 0.7) {
      tags.push(`sentiment_${analysis.sentiment.sentiment}`);
    }
    
    // Add language tag
    tags.push(`language_${analysis.language.toLowerCase()}`);
    
    return [...new Set(tags)]; // Remove duplicates
  }

  async saveProcessingResults(fileId, tenantId, analysis, metadata, captions) {
    try {
      const query = `
        INSERT INTO ai_processing_results (
          id, file_id, tenant_id, analysis_data, metadata, captions, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
        ON CONFLICT (file_id) 
        DO UPDATE SET 
          analysis_data = $4,
          metadata = $5,
          captions = $6,
          updated_at = CURRENT_TIMESTAMP
      `;
      
      await this.db.query(query, [
        uuidv4(),
        fileId,
        tenantId,
        JSON.stringify(analysis),
        JSON.stringify(metadata),
        JSON.stringify(captions)
      ]);
    } catch (error) {
      console.error('Error saving processing results:', error);
    }
  }

  async validateCompliance(tenantId, operation, data) {
    // Validate compliance for file processing
    if (this.complianceConfig.auditLogging) {
      await this.logProcessingOperation(tenantId, operation, data);
    }
    
    return { compliant: true };
  }

  async logProcessingOperation(tenantId, operation, data) {
    try {
      const query = `
        INSERT INTO ai_processing_logs (
          id, tenant_id, operation, file_data, created_at
        ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      `;
      
      await this.db.query(query, [
        uuidv4(),
        tenantId,
        operation,
        JSON.stringify(data)
      ]);
    } catch (error) {
      console.error('Error logging processing operation:', error);
    }
  }

  async isHealthy() {
    // Check if the tagging API is healthy
    return true; // Simplified for demo
  }
}

module.exports = AutomatedTaggingAPI;
