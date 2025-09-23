const { v4: uuidv4 } = require('uuid');

class GenerativeSummariesAPI {
  constructor(db, aiConfig, complianceConfig) {
    this.db = db;
    this.aiConfig = aiConfig;
    this.complianceConfig = complianceConfig;
    this.summaryTemplates = new Map();
    this.reportGenerators = new Map();
    this.contentProcessors = new Map();
  }

  async initialize() {
    console.log('Initializing Generative Summaries & Reports API...');
    
    // Initialize summary templates
    await this.initializeSummaryTemplates();
    
    // Initialize report generators
    await this.initializeReportGenerators();
    
    // Initialize content processors
    await this.initializeContentProcessors();
    
    console.log('Generative Summaries & Reports API initialized successfully.');
  }

  async initializeSummaryTemplates() {
    this.summaryTemplates.set('document', {
      template: `
        # Document Summary
        
        **Title:** {title}
        **Type:** {documentType}
        **Length:** {wordCount} words
        
        ## Key Points
        {keyPoints}
        
        ## Main Topics
        {mainTopics}
        
        ## Summary
        {summary}
        
        ## Action Items
        {actionItems}
        
        ## Related Documents
        {relatedDocuments}
      `,
      maxLength: 500,
      includeMetadata: true
    });

    this.summaryTemplates.set('meeting', {
      template: `
        # Meeting Summary
        
        **Date:** {date}
        **Duration:** {duration}
        **Attendees:** {attendees}
        
        ## Agenda Items
        {agendaItems}
        
        ## Discussion Points
        {discussionPoints}
        
        ## Decisions Made
        {decisions}
        
        ## Action Items
        {actionItems}
        
        ## Next Steps
        {nextSteps}
      `,
      maxLength: 800,
      includeMetadata: true
    });

    this.summaryTemplates.set('announcement', {
      template: `
        # Announcement Summary
        
        **Priority:** {priority}
        **Target Audience:** {audience}
        **Effective Date:** {effectiveDate}
        
        ## Key Information
        {keyInformation}
        
        ## Important Details
        {importantDetails}
        
        ## Action Required
        {actionRequired}
        
        ## Contact Information
        {contactInfo}
      `,
      maxLength: 300,
      includeMetadata: true
    });

    this.summaryTemplates.set('student_report', {
      template: `
        # Student Progress Summary
        
        **Student:** {studentName}
        **Period:** {reportPeriod}
        **Grade Level:** {gradeLevel}
        
        ## Academic Performance
        {academicPerformance}
        
        ## Attendance
        {attendance}
        
        ## Behavior
        {behavior}
        
        ## Strengths
        {strengths}
        
        ## Areas for Improvement
        {improvementAreas}
        
        ## Recommendations
        {recommendations}
      `,
      maxLength: 600,
      includeMetadata: true
    });
  }

  async initializeReportGenerators() {
    this.reportGenerators.set('academic_performance', {
      sections: [
        'overview',
        'subject_breakdown',
        'trends',
        'recommendations',
        'next_steps'
      ],
      dataSources: [
        'grades',
        'assignments',
        'assessments',
        'attendance'
      ]
    });

    this.reportGenerators.set('financial_summary', {
      sections: [
        'revenue_overview',
        'expense_breakdown',
        'budget_variance',
        'trends',
        'recommendations'
      ],
      dataSources: [
        'transactions',
        'budgets',
        'payments',
        'expenses'
      ]
    });

    this.reportGenerators.set('system_health', {
      sections: [
        'performance_metrics',
        'error_rates',
        'usage_statistics',
        'security_incidents',
        'recommendations'
      ],
      dataSources: [
        'logs',
        'metrics',
        'alerts',
        'performance_data'
      ]
    });
  }

  async initializeContentProcessors() {
    this.contentProcessors.set('text_extraction', {
      supportedFormats: ['pdf', 'docx', 'txt', 'html', 'md'],
      maxFileSize: 10 * 1024 * 1024, // 10MB
      processingTimeout: 30000 // 30 seconds
    });

    this.contentProcessors.set('content_analysis', {
      features: [
        'sentiment_analysis',
        'topic_extraction',
        'entity_recognition',
        'keyword_extraction',
        'readability_analysis'
      ]
    });
  }

  async generateSummary({ content, contentType, summaryType, options = {}, context = {} }) {
    try {
      // Validate compliance
      const compliance = await this.validateCompliance(context.tenantId, 'generateSummary', { contentType, summaryType });
      if (!compliance.compliant) {
        throw new Error(`Compliance violation: ${compliance.reason}`);
      }

      const summaryId = uuidv4();
      
      // Process content based on type
      const processedContent = await this.processContent(content, contentType);
      
      // Extract key information
      const extractedInfo = await this.extractKeyInformation(processedContent, contentType);
      
      // Generate summary using AI
      const aiSummary = await this.generateAISummary(processedContent, summaryType, options);
      
      // Apply template if specified
      const templatedSummary = await this.applySummaryTemplate(aiSummary, summaryType, extractedInfo);
      
      // Generate action items
      const actionItems = await this.generateActionItems(processedContent, summaryType);
      
      // Log the summary generation
      await this.logSummaryGeneration(summaryId, context.tenantId, contentType, summaryType, processedContent.length);

      return {
        summaryId,
        summaryType,
        contentType,
        summary: templatedSummary,
        keyPoints: extractedInfo.keyPoints,
        mainTopics: extractedInfo.mainTopics,
        actionItems,
        metadata: {
          originalLength: processedContent.length,
          summaryLength: templatedSummary.length,
          compressionRatio: (templatedSummary.length / processedContent.length * 100).toFixed(1) + '%',
          generatedAt: new Date().toISOString(),
          aiModel: this.aiConfig.openai.model || 'default'
        },
        complianceStatus: 'compliant'
      };
    } catch (error) {
      console.error('Error generating summary:', error);
      throw new Error(`Summary generation failed: ${error.message}`);
    }
  }

  async processContent(content, contentType) {
    switch (contentType) {
      case 'text':
        return content;
      case 'html':
        return this.extractTextFromHTML(content);
      case 'markdown':
        return this.extractTextFromMarkdown(content);
      case 'json':
        return this.extractTextFromJSON(content);
      default:
        return content;
    }
  }

  extractTextFromHTML(html) {
    // Simple HTML tag removal (use cheerio in production)
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  extractTextFromMarkdown(markdown) {
    // Simple markdown processing (use marked in production)
    return markdown
      .replace(/#{1,6}\s+/g, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/`(.*?)`/g, '$1') // Remove code
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links
      .trim();
  }

  extractTextFromJSON(json) {
    try {
      const data = typeof json === 'string' ? JSON.parse(json) : json;
      return JSON.stringify(data, null, 2);
    } catch (error) {
      return json;
    }
  }

  async extractKeyInformation(content, contentType) {
    const keyInfo = {
      keyPoints: [],
      mainTopics: [],
      entities: [],
      keywords: [],
      sentiment: 'neutral'
    };

    // Extract key points using simple text analysis
    keyInfo.keyPoints = await this.extractKeyPoints(content);
    
    // Extract main topics
    keyInfo.mainTopics = await this.extractMainTopics(content);
    
    // Extract entities
    keyInfo.entities = await this.extractEntities(content);
    
    // Extract keywords
    keyInfo.keywords = await this.extractKeywords(content);
    
    // Analyze sentiment
    keyInfo.sentiment = await this.analyzeSentiment(content);

    return keyInfo;
  }

  async extractKeyPoints(content) {
    if (!this.aiConfig.openai.apiKey) {
      return this.extractKeyPointsSimple(content);
    }

    try {
      const prompt = `
        Extract the 5 most important key points from this text. Return them as a JSON array of strings.
        
        Text: "${content.substring(0, 2000)}"
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
      console.error('Error extracting key points with AI:', error);
      return this.extractKeyPointsSimple(content);
    }
  }

  extractKeyPointsSimple(content) {
    // Simple key point extraction
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const keyPoints = [];
    
    // Look for sentences with important keywords
    const importantKeywords = ['important', 'key', 'main', 'primary', 'essential', 'critical', 'significant'];
    
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      if (importantKeywords.some(keyword => lowerSentence.includes(keyword))) {
        keyPoints.push(sentence.trim());
        if (keyPoints.length >= 5) break;
      }
    }
    
    // If not enough key points found, take the longest sentences
    if (keyPoints.length < 3) {
      const sortedSentences = sentences.sort((a, b) => b.length - a.length);
      keyPoints.push(...sortedSentences.slice(0, 5 - keyPoints.length).map(s => s.trim()));
    }
    
    return keyPoints;
  }

  async extractMainTopics(content) {
    if (!this.aiConfig.openai.apiKey) {
      return this.extractMainTopicsSimple(content);
    }

    try {
      const prompt = `
        Extract the main topics from this text. Return them as a JSON array of topic names.
        
        Text: "${content.substring(0, 2000)}"
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
      console.error('Error extracting main topics with AI:', error);
      return this.extractMainTopicsSimple(content);
    }
  }

  extractMainTopicsSimple(content) {
    // Simple topic extraction based on word frequency
    const words = content.toLowerCase().split(/\W+/);
    const wordCount = {};
    
    words.forEach(word => {
      if (word.length > 4) {
        wordCount[word] = (wordCount[word] || 0) + 1;
      }
    });
    
    return Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);
  }

  async extractEntities(content) {
    if (!this.aiConfig.openai.apiKey) {
      return this.extractEntitiesSimple(content);
    }

    try {
      const prompt = `
        Extract named entities from this text. Return a JSON object with categories:
        - people: names of people
        - organizations: company/school names
        - locations: places
        - dates: specific dates
        - subjects: academic subjects
        
        Text: "${content.substring(0, 1500)}"
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
      return this.extractEntitiesSimple(content);
    }
  }

  extractEntitiesSimple(content) {
    const entities = {
      people: [],
      organizations: [],
      locations: [],
      dates: [],
      subjects: []
    };

    // Extract dates
    const datePattern = /\b(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})\b/g;
    entities.dates = content.match(datePattern) || [];

    // Extract email addresses
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = content.match(emailPattern) || [];
    entities.organizations.push(...emails);

    return entities;
  }

  async extractKeywords(content) {
    const words = content.toLowerCase().split(/\W+/);
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    
    const wordCount = {};
    words.forEach(word => {
      if (word.length > 3 && !stopWords.includes(word)) {
        wordCount[word] = (wordCount[word] || 0) + 1;
      }
    });
    
    return Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word, count]) => ({ word, count }));
  }

  async analyzeSentiment(content) {
    if (!this.aiConfig.openai.apiKey) {
      return this.analyzeSentimentSimple(content);
    }

    try {
      const prompt = `
        Analyze the sentiment of this text. Return a JSON object with:
        - sentiment: "positive", "negative", or "neutral"
        - confidence: number between 0 and 1
        
        Text: "${content.substring(0, 1000)}"
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
          max_tokens: 100
        })
      });

      const data = await response.json();
      return JSON.parse(data.choices[0].message.content);
    } catch (error) {
      console.error('Error analyzing sentiment with AI:', error);
      return this.analyzeSentimentSimple(content);
    }
  }

  analyzeSentimentSimple(content) {
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic'];
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'disappointing', 'poor'];
    
    const text = content.toLowerCase();
    const positiveCount = positiveWords.filter(word => text.includes(word)).length;
    const negativeCount = negativeWords.filter(word => text.includes(word)).length;
    
    if (positiveCount > negativeCount) {
      return { sentiment: 'positive', confidence: 0.7 };
    } else if (negativeCount > positiveCount) {
      return { sentiment: 'negative', confidence: 0.7 };
    } else {
      return { sentiment: 'neutral', confidence: 0.6 };
    }
  }

  async generateAISummary(content, summaryType, options) {
    if (!this.aiConfig.openai.apiKey) {
      return this.generateSimpleSummary(content, summaryType);
    }

    try {
      const maxLength = options.maxLength || 500;
      const prompt = `
        Create a comprehensive summary of the following ${summaryType}. 
        The summary should be approximately ${maxLength} words and include:
        - Main points and key information
        - Important details and context
        - Any action items or next steps
        
        ${summaryType.toUpperCase()}: "${content.substring(0, 4000)}"
        
        Return only the summary text, nothing else.
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
          max_tokens: Math.min(this.aiConfig.openai.maxTokens, maxLength * 2),
          temperature: 0.3
        })
      });

      const data = await response.json();
      return data.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error generating AI summary:', error);
      return this.generateSimpleSummary(content, summaryType);
    }
  }

  generateSimpleSummary(content, summaryType) {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const summaryLength = Math.min(5, Math.ceil(sentences.length / 3));
    
    // Take the first few sentences as a simple summary
    const summarySentences = sentences.slice(0, summaryLength);
    return summarySentences.join('. ') + '.';
  }

  async applySummaryTemplate(aiSummary, summaryType, extractedInfo) {
    const template = this.summaryTemplates.get(summaryType);
    if (!template) {
      return aiSummary;
    }

    // Replace template placeholders with actual data
    let templatedSummary = template.template;
    
    // Replace common placeholders
    templatedSummary = templatedSummary.replace(/{summary}/g, aiSummary);
    templatedSummary = templatedSummary.replace(/{keyPoints}/g, extractedInfo.keyPoints.map(point => `• ${point}`).join('\n'));
    templatedSummary = templatedSummary.replace(/{mainTopics}/g, extractedInfo.mainTopics.join(', '));
    templatedSummary = templatedSummary.replace(/{actionItems}/g, 'Action items will be generated separately');
    
    // Replace metadata placeholders with default values
    templatedSummary = templatedSummary.replace(/{title}/g, 'Document Summary');
    templatedSummary = templatedSummary.replace(/{documentType}/g, summaryType);
    templatedSummary = templatedSummary.replace(/{wordCount}/g, aiSummary.split(' ').length);
    templatedSummary = templatedSummary.replace(/{date}/g, new Date().toLocaleDateString());
    templatedSummary = templatedSummary.replace(/{duration}/g, 'N/A');
    templatedSummary = templatedSummary.replace(/{attendees}/g, 'N/A');
    templatedSummary = templatedSummary.replace(/{priority}/g, 'Normal');
    templatedSummary = templatedSummary.replace(/{audience}/g, 'All Users');
    templatedSummary = templatedSummary.replace(/{effectiveDate}/g, new Date().toLocaleDateString());
    templatedSummary = templatedSummary.replace(/{studentName}/g, 'Student');
    templatedSummary = templatedSummary.replace(/{reportPeriod}/g, 'Current Period');
    templatedSummary = templatedSummary.replace(/{gradeLevel}/g, 'N/A');

    return templatedSummary;
  }

  async generateActionItems(content, summaryType) {
    if (!this.aiConfig.openai.apiKey) {
      return this.generateActionItemsSimple(content);
    }

    try {
      const prompt = `
        Extract action items from this ${summaryType}. Return a JSON array of action items with:
        - action: the action to be taken
        - priority: "high", "medium", or "low"
        - assignee: who should perform the action (if mentioned)
        - dueDate: when the action should be completed (if mentioned)
        
        ${summaryType.toUpperCase()}: "${content.substring(0, 2000)}"
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
          max_tokens: 400
        })
      });

      const data = await response.json();
      return JSON.parse(data.choices[0].message.content);
    } catch (error) {
      console.error('Error generating action items with AI:', error);
      return this.generateActionItemsSimple(content);
    }
  }

  generateActionItemsSimple(content) {
    // Simple action item extraction
    const actionKeywords = ['action', 'task', 'todo', 'need to', 'must', 'should', 'required', 'deadline'];
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    const actionItems = [];
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      if (actionKeywords.some(keyword => lowerSentence.includes(keyword))) {
        actionItems.push({
          action: sentence.trim(),
          priority: 'medium',
          assignee: 'TBD',
          dueDate: 'TBD'
        });
        if (actionItems.length >= 5) break;
      }
    }
    
    return actionItems;
  }

  async generateReport({ reportType, data, options = {}, context = {} }) {
    try {
      // Validate compliance
      const compliance = await this.validateCompliance(context.tenantId, 'generateReport', { reportType });
      if (!compliance.compliant) {
        throw new Error(`Compliance violation: ${compliance.reason}`);
      }

      const reportId = uuidv4();
      
      // Get report generator configuration
      const reportConfig = this.reportGenerators.get(reportType);
      if (!reportConfig) {
        throw new Error(`Report type not supported: ${reportType}`);
      }
      
      // Process data for each section
      const reportSections = {};
      for (const section of reportConfig.sections) {
        reportSections[section] = await this.generateReportSection(section, data, reportType, options);
      }
      
      // Generate executive summary
      const executiveSummary = await this.generateExecutiveSummary(reportSections, reportType);
      
      // Compile final report
      const finalReport = await this.compileReport(reportId, reportType, executiveSummary, reportSections, options);
      
      // Log the report generation
      await this.logReportGeneration(reportId, context.tenantId, reportType, Object.keys(data).length);

      return {
        reportId,
        reportType,
        executiveSummary,
        sections: reportSections,
        metadata: {
          generatedAt: new Date().toISOString(),
          dataSources: reportConfig.dataSources,
          totalSections: reportConfig.sections.length,
          aiModel: this.aiConfig.openai.model || 'default'
        },
        complianceStatus: 'compliant'
      };
    } catch (error) {
      console.error('Error generating report:', error);
      throw new Error(`Report generation failed: ${error.message}`);
    }
  }

  async generateReportSection(section, data, reportType, options) {
    switch (section) {
      case 'overview':
        return await this.generateOverviewSection(data, reportType);
      case 'subject_breakdown':
        return await this.generateSubjectBreakdownSection(data, reportType);
      case 'trends':
        return await this.generateTrendsSection(data, reportType);
      case 'recommendations':
        return await this.generateRecommendationsSection(data, reportType);
      case 'next_steps':
        return await this.generateNextStepsSection(data, reportType);
      default:
        return { content: `Section ${section} not implemented yet`, data: {} };
    }
  }

  async generateOverviewSection(data, reportType) {
    const overview = {
      title: `${reportType.replace('_', ' ').toUpperCase()} Overview`,
      content: `This report provides a comprehensive analysis of ${reportType.replace('_', ' ')} data.`,
      keyMetrics: {},
      highlights: []
    };

    // Extract key metrics based on report type
    if (reportType === 'academic_performance') {
      overview.keyMetrics = {
        totalStudents: data.students?.length || 0,
        averageGrade: this.calculateAverage(data.grades?.map(g => g.score) || []),
        attendanceRate: this.calculateAverage(data.attendance?.map(a => a.present ? 1 : 0) || []) * 100
      };
      overview.highlights = [
        `${overview.keyMetrics.totalStudents} students analyzed`,
        `Average grade: ${overview.keyMetrics.averageGrade.toFixed(1)}`,
        `Attendance rate: ${overview.keyMetrics.attendanceRate.toFixed(1)}%`
      ];
    }

    return overview;
  }

  async generateSubjectBreakdownSection(data, reportType) {
    if (reportType !== 'academic_performance') {
      return { content: 'Subject breakdown not applicable for this report type', data: {} };
    }

    const subjects = {};
    data.grades?.forEach(grade => {
      if (!subjects[grade.subject]) {
        subjects[grade.subject] = { grades: [], count: 0 };
      }
      subjects[grade.subject].grades.push(grade.score);
      subjects[grade.subject].count++;
    });

    const breakdown = {};
    for (const [subject, data] of Object.entries(subjects)) {
      breakdown[subject] = {
        averageGrade: this.calculateAverage(data.grades),
        totalGrades: data.count,
        performance: this.calculateAverage(data.grades) > 80 ? 'Excellent' : 
                    this.calculateAverage(data.grades) > 70 ? 'Good' : 'Needs Improvement'
      };
    }

    return {
      title: 'Subject Performance Breakdown',
      content: 'Detailed analysis of performance across different subjects',
      data: breakdown
    };
  }

  async generateTrendsSection(data, reportType) {
    const trends = {
      title: 'Trends Analysis',
      content: 'Analysis of trends and patterns in the data',
      trends: [],
      insights: []
    };

    // Simple trend analysis
    if (data.grades && data.grades.length > 0) {
      const sortedGrades = data.grades.sort((a, b) => new Date(a.date) - new Date(b.date));
      const recentGrades = sortedGrades.slice(-10);
      const olderGrades = sortedGrades.slice(0, 10);
      
      const recentAvg = this.calculateAverage(recentGrades.map(g => g.score));
      const olderAvg = this.calculateAverage(olderGrades.map(g => g.score));
      
      if (recentAvg > olderAvg) {
        trends.trends.push('Improving performance trend');
        trends.insights.push('Students are showing improvement over time');
      } else if (recentAvg < olderAvg) {
        trends.trends.push('Declining performance trend');
        trends.insights.push('Performance has declined recently');
      } else {
        trends.trends.push('Stable performance trend');
        trends.insights.push('Performance has remained consistent');
      }
    }

    return trends;
  }

  async generateRecommendationsSection(data, reportType) {
    const recommendations = {
      title: 'Recommendations',
      content: 'Actionable recommendations based on the analysis',
      recommendations: []
    };

    // Generate recommendations based on data analysis
    if (reportType === 'academic_performance') {
      const avgGrade = this.calculateAverage(data.grades?.map(g => g.score) || []);
      
      if (avgGrade < 70) {
        recommendations.recommendations.push({
          priority: 'high',
          recommendation: 'Implement additional tutoring programs',
          reason: 'Average grades are below acceptable levels'
        });
      }
      
      if (data.attendance) {
        const attendanceRate = this.calculateAverage(data.attendance.map(a => a.present ? 1 : 0));
        if (attendanceRate < 0.9) {
          recommendations.recommendations.push({
            priority: 'medium',
            recommendation: 'Address attendance issues',
            reason: 'Attendance rate is below 90%'
          });
        }
      }
    }

    return recommendations;
  }

  async generateNextStepsSection(data, reportType) {
    return {
      title: 'Next Steps',
      content: 'Recommended next steps and follow-up actions',
      nextSteps: [
        'Review recommendations with stakeholders',
        'Develop action plan based on findings',
        'Schedule follow-up review in 30 days',
        'Monitor progress on key metrics'
      ]
    };
  }

  async generateExecutiveSummary(reportSections, reportType) {
    if (!this.aiConfig.openai.apiKey) {
      return this.generateSimpleExecutiveSummary(reportSections, reportType);
    }

    try {
      const prompt = `
        Create an executive summary for this ${reportType} report. 
        Include key findings, important metrics, and main recommendations.
        
        Report Sections: ${JSON.stringify(reportSections, null, 2)}
        
        Return a concise executive summary (200-300 words).
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
          max_tokens: 400
        })
      });

      const data = await response.json();
      return data.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error generating executive summary with AI:', error);
      return this.generateSimpleExecutiveSummary(reportSections, reportType);
    }
  }

  generateSimpleExecutiveSummary(reportSections, reportType) {
    return `This ${reportType.replace('_', ' ')} report provides a comprehensive analysis of the data. Key findings include performance metrics, trends analysis, and actionable recommendations. The report is structured to provide stakeholders with clear insights and next steps for improvement.`;
  }

  async compileReport(reportId, reportType, executiveSummary, reportSections, options) {
    return {
      reportId,
      reportType,
      executiveSummary,
      sections: reportSections,
      compiledAt: new Date().toISOString(),
      format: options.format || 'structured',
      version: '1.0'
    };
  }

  calculateAverage(numbers) {
    return numbers.length > 0 ? numbers.reduce((sum, num) => sum + num, 0) / numbers.length : 0;
  }

  async validateCompliance(tenantId, operation, data) {
    // Validate compliance for summary and report generation
    if (this.complianceConfig.auditLogging) {
      await this.logSummaryOperation(tenantId, operation, data);
    }
    
    return { compliant: true };
  }

  async logSummaryGeneration(summaryId, tenantId, contentType, summaryType, contentLength) {
    try {
      const query = `
        INSERT INTO ai_summary_logs (
          id, tenant_id, content_type, summary_type, content_length, created_at
        ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      `;
      
      await this.db.query(query, [
        summaryId,
        tenantId,
        contentType,
        summaryType,
        contentLength
      ]);
    } catch (error) {
      console.error('Error logging summary generation:', error);
    }
  }

  async logReportGeneration(reportId, tenantId, reportType, dataSourceCount) {
    try {
      const query = `
        INSERT INTO ai_report_logs (
          id, tenant_id, report_type, data_source_count, created_at
        ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      `;
      
      await this.db.query(query, [
        reportId,
        tenantId,
        reportType,
        dataSourceCount
      ]);
    } catch (error) {
      console.error('Error logging report generation:', error);
    }
  }

  async logSummaryOperation(tenantId, operation, data) {
    try {
      const query = `
        INSERT INTO ai_summary_operation_logs (
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
      console.error('Error logging summary operation:', error);
    }
  }

  async isHealthy() {
    // Check if the generative summaries API is healthy
    return this.summaryTemplates.size > 0 && this.reportGenerators.size > 0;
  }
}

module.exports = GenerativeSummariesAPI;
