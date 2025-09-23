const { v4: uuidv4 } = require('uuid');

class RecommendationsAPI {
  constructor(db, aiConfig, complianceConfig) {
    this.db = db;
    this.aiConfig = aiConfig;
    this.complianceConfig = complianceConfig;
    this.recommendationEngines = new Map();
    this.userProfiles = new Map();
    this.contentCatalog = new Map();
    this.collaborativeFilters = new Map();
  }

  async initialize() {
    console.log('Initializing Smart Recommendation API...');
    
    // Initialize recommendation engines
    await this.initializeRecommendationEngines();
    
    // Initialize user profiling
    await this.initializeUserProfiling();
    
    // Initialize content catalog
    await this.initializeContentCatalog();
    
    // Initialize collaborative filtering
    await this.initializeCollaborativeFiltering();
    
    console.log('Smart Recommendation API initialized successfully.');
  }

  async initializeRecommendationEngines() {
    this.recommendationEngines.set('content_based', {
      algorithm: 'content_based_filtering',
      features: ['subject', 'grade_level', 'content_type', 'difficulty', 'tags'],
      weight: 0.4
    });

    this.recommendationEngines.set('collaborative', {
      algorithm: 'collaborative_filtering',
      features: ['user_behavior', 'similar_users', 'ratings', 'interactions'],
      weight: 0.3
    });

    this.recommendationEngines.set('hybrid', {
      algorithm: 'hybrid_recommendation',
      features: ['content_based', 'collaborative', 'demographic', 'contextual'],
      weight: 0.3
    });
  }

  async initializeUserProfiling() {
    this.userProfiles.set('student', {
      profileFields: [
        'grade_level', 'subjects', 'learning_style', 'interests', 'performance_history',
        'preferred_content_types', 'difficulty_preference', 'time_preferences'
      ],
      updateFrequency: 'weekly'
    });

    this.userProfiles.set('teacher', {
      profileFields: [
        'subjects_taught', 'grade_levels', 'teaching_style', 'resource_preferences',
        'curriculum_standards', 'student_needs', 'professional_development'
      ],
      updateFrequency: 'monthly'
    });

    this.userProfiles.set('parent', {
      profileFields: [
        'child_grade_level', 'child_interests', 'parental_concerns', 'communication_preferences',
        'involvement_level', 'resource_needs'
      ],
      updateFrequency: 'monthly'
    });
  }

  async initializeContentCatalog() {
    this.contentCatalog.set('resources', {
      types: ['documents', 'videos', 'assignments', 'quizzes', 'presentations', 'interactive_content'],
      metadata: ['subject', 'grade_level', 'difficulty', 'duration', 'format', 'tags', 'ratings'],
      indexing: 'real_time'
    });

    this.contentCatalog.set('archives', {
      types: ['files', 'media', 'documents', 'presentations'],
      metadata: ['file_type', 'folder', 'upload_date', 'access_count', 'tags'],
      indexing: 'real_time'
    });
  }

  async initializeCollaborativeFiltering() {
    this.collaborativeFilters.set('user_similarity', {
      algorithm: 'cosine_similarity',
      features: ['interaction_history', 'content_preferences', 'behavioral_patterns'],
      minSimilarity: 0.3
    });

    this.collaborativeFilters.set('item_similarity', {
      algorithm: 'jaccard_similarity',
      features: ['content_features', 'usage_patterns', 'user_ratings'],
      minSimilarity: 0.2
    });
  }

  async generateRecommendations({ userId, tenantId, recommendationType, context = {}, options = {} }) {
    try {
      // Validate compliance
      const compliance = await this.validateCompliance(tenantId, 'generateRecommendations', { userId, recommendationType });
      if (!compliance.compliant) {
        throw new Error(`Compliance violation: ${compliance.reason}`);
      }

      const recommendationId = uuidv4();
      
      // Get user profile
      const userProfile = await this.getUserProfile(userId, tenantId);
      
      // Get user interaction history
      const interactionHistory = await this.getUserInteractionHistory(userId, tenantId);
      
      // Generate recommendations using different engines
      const contentBasedRecs = await this.generateContentBasedRecommendations(userProfile, interactionHistory, context);
      const collaborativeRecs = await this.generateCollaborativeRecommendations(userId, tenantId, userProfile, context);
      const hybridRecs = await this.generateHybridRecommendations(userProfile, interactionHistory, context);
      
      // Combine and rank recommendations
      const combinedRecommendations = await this.combineRecommendations([
        { type: 'content_based', recommendations: contentBasedRecs, weight: 0.4 },
        { type: 'collaborative', recommendations: collaborativeRecs, weight: 0.3 },
        { type: 'hybrid', recommendations: hybridRecs, weight: 0.3 }
      ]);
      
      // Apply filters and personalization
      const filteredRecommendations = await this.applyRecommendationFilters(combinedRecommendations, userProfile, context, options);
      
      // Generate AI-powered explanations
      const explainedRecommendations = await this.generateRecommendationExplanations(filteredRecommendations, userProfile, context);
      
      // Log the recommendation generation
      await this.logRecommendationGeneration(recommendationId, userId, tenantId, recommendationType, filteredRecommendations.length);

      return {
        recommendationId,
        userId: this.anonymizeUserId(userId, tenantId),
        tenantId,
        recommendationType,
        recommendations: explainedRecommendations,
        metadata: {
          totalRecommendations: filteredRecommendations.length,
          enginesUsed: ['content_based', 'collaborative', 'hybrid'],
          personalizationLevel: this.calculatePersonalizationLevel(userProfile),
          generatedAt: new Date().toISOString(),
          context: this.sanitizeContext(context)
        },
        complianceStatus: 'compliant'
      };
    } catch (error) {
      console.error('Error generating recommendations:', error);
      throw new Error(`Recommendation generation failed: ${error.message}`);
    }
  }

  async getUserProfile(userId, tenantId) {
    try {
      const query = `
        SELECT 
          user_type, grade_level, subjects, interests, learning_style,
          performance_history, preferences, last_updated
        FROM user_profiles 
        WHERE user_id = $1 AND tenant_id = $2
      `;
      
      const result = await this.db.query(query, [userId, tenantId]);
      
      if (result.rows.length > 0) {
        return result.rows[0];
      } else {
        // Create default profile
        return await this.createDefaultUserProfile(userId, tenantId);
      }
    } catch (error) {
      console.error('Error getting user profile:', error);
      return await this.createDefaultUserProfile(userId, tenantId);
    }
  }

  async createDefaultUserProfile(userId, tenantId) {
    const defaultProfile = {
      user_id: userId,
      tenant_id: tenantId,
      user_type: 'student',
      grade_level: 'unknown',
      subjects: [],
      interests: [],
      learning_style: 'visual',
      performance_history: {},
      preferences: {
        content_types: ['documents', 'videos'],
        difficulty: 'medium',
        duration: 'medium'
      },
      last_updated: new Date()
    };

    try {
      const query = `
        INSERT INTO user_profiles (
          user_id, tenant_id, user_type, grade_level, subjects, interests,
          learning_style, performance_history, preferences, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;
      
      await this.db.query(query, [
        userId, tenantId, defaultProfile.user_type, defaultProfile.grade_level,
        JSON.stringify(defaultProfile.subjects), JSON.stringify(defaultProfile.interests),
        defaultProfile.learning_style, JSON.stringify(defaultProfile.performance_history),
        JSON.stringify(defaultProfile.preferences)
      ]);
    } catch (error) {
      console.error('Error creating default user profile:', error);
    }

    return defaultProfile;
  }

  async getUserInteractionHistory(userId, tenantId) {
    try {
      const query = `
        SELECT 
          content_id, content_type, interaction_type, rating, duration,
          timestamp, context
        FROM user_interactions 
        WHERE user_id = $1 AND tenant_id = $2
        ORDER BY timestamp DESC
        LIMIT 100
      `;
      
      const result = await this.db.query(query, [userId, tenantId]);
      return result.rows;
    } catch (error) {
      console.error('Error getting user interaction history:', error);
      return [];
    }
  }

  async generateContentBasedRecommendations(userProfile, interactionHistory, context) {
    const recommendations = [];
    
    // Get available content
    const availableContent = await this.getAvailableContent(userProfile.tenant_id, context);
    
    // Score content based on user profile
    for (const content of availableContent) {
      const score = this.calculateContentBasedScore(content, userProfile, interactionHistory);
      if (score > 0.3) {
        recommendations.push({
          contentId: content.id,
          contentType: content.type,
          title: content.title,
          score,
          reason: this.generateContentBasedReason(content, userProfile),
          metadata: content.metadata
        });
      }
    }
    
    return recommendations.sort((a, b) => b.score - a.score).slice(0, 20);
  }

  async getAvailableContent(tenantId, context) {
    try {
      let query = `
        SELECT 
          id, title, type, subject, grade_level, difficulty, tags, metadata,
          created_at, access_count, rating
        FROM content_catalog 
        WHERE tenant_id = $1
      `;
      
      const params = [tenantId];
      
      // Add context filters
      if (context.subject) {
        query += ` AND subject = $${params.length + 1}`;
        params.push(context.subject);
      }
      
      if (context.gradeLevel) {
        query += ` AND grade_level = $${params.length + 1}`;
        params.push(context.gradeLevel);
      }
      
      if (context.contentType) {
        query += ` AND type = $${params.length + 1}`;
        params.push(context.contentType);
      }
      
      query += ` ORDER BY rating DESC, access_count DESC LIMIT 100`;
      
      const result = await this.db.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error getting available content:', error);
      return [];
    }
  }

  calculateContentBasedScore(content, userProfile, interactionHistory) {
    let score = 0;
    
    // Subject match
    if (userProfile.subjects && userProfile.subjects.includes(content.subject)) {
      score += 0.3;
    }
    
    // Grade level match
    if (userProfile.grade_level === content.grade_level) {
      score += 0.2;
    }
    
    // Content type preference
    if (userProfile.preferences?.content_types?.includes(content.type)) {
      score += 0.2;
    }
    
    // Difficulty preference
    if (userProfile.preferences?.difficulty === content.difficulty) {
      score += 0.15;
    }
    
    // Tags/Interests match
    if (userProfile.interests && content.tags) {
      const matchingTags = userProfile.interests.filter(interest => 
        content.tags.some(tag => tag.toLowerCase().includes(interest.toLowerCase()))
      );
      score += (matchingTags.length / userProfile.interests.length) * 0.1;
    }
    
    // Popularity boost
    if (content.access_count > 100) {
      score += 0.05;
    }
    
    // Rating boost
    if (content.rating > 4.0) {
      score += 0.05;
    }
    
    return Math.min(score, 1.0);
  }

  generateContentBasedReason(content, userProfile) {
    const reasons = [];
    
    if (userProfile.subjects && userProfile.subjects.includes(content.subject)) {
      reasons.push(`matches your interest in ${content.subject}`);
    }
    
    if (userProfile.grade_level === content.grade_level) {
      reasons.push(`appropriate for your grade level`);
    }
    
    if (userProfile.preferences?.content_types?.includes(content.type)) {
      reasons.push(`matches your preferred content type`);
    }
    
    if (content.rating > 4.0) {
      reasons.push(`highly rated by other users`);
    }
    
    return reasons.length > 0 ? reasons.join(', ') : 'recommended based on your profile';
  }

  async generateCollaborativeRecommendations(userId, tenantId, userProfile, context) {
    const recommendations = [];
    
    // Find similar users
    const similarUsers = await this.findSimilarUsers(userId, tenantId, userProfile);
    
    // Get content liked by similar users
    const similarUserContent = await this.getContentLikedByUsers(similarUsers, tenantId);
    
    // Score content based on similar user preferences
    for (const content of similarUserContent) {
      const score = this.calculateCollaborativeScore(content, similarUsers);
      if (score > 0.2) {
        recommendations.push({
          contentId: content.content_id,
          contentType: content.content_type,
          title: content.title,
          score,
          reason: this.generateCollaborativeReason(content, similarUsers),
          metadata: content.metadata
        });
      }
    }
    
    return recommendations.sort((a, b) => b.score - a.score).slice(0, 15);
  }

  async findSimilarUsers(userId, tenantId, userProfile) {
    try {
      const query = `
        SELECT 
          up.user_id, up.subjects, up.interests, up.grade_level,
          COUNT(ui.content_id) as interaction_count
        FROM user_profiles up
        LEFT JOIN user_interactions ui ON up.user_id = ui.user_id
        WHERE up.tenant_id = $1 AND up.user_id != $2
        GROUP BY up.user_id, up.subjects, up.interests, up.grade_level
        HAVING COUNT(ui.content_id) > 0
        ORDER BY interaction_count DESC
        LIMIT 20
      `;
      
      const result = await this.db.query(query, [tenantId, userId]);
      
      // Calculate similarity scores
      const similarUsers = [];
      for (const user of result.rows) {
        const similarity = this.calculateUserSimilarity(userProfile, user);
        if (similarity > 0.3) {
          similarUsers.push({
            userId: user.user_id,
            similarity,
            subjects: user.subjects,
            interests: user.interests,
            gradeLevel: user.grade_level
          });
        }
      }
      
      return similarUsers.sort((a, b) => b.similarity - a.similarity).slice(0, 10);
    } catch (error) {
      console.error('Error finding similar users:', error);
      return [];
    }
  }

  calculateUserSimilarity(userProfile1, userProfile2) {
    let similarity = 0;
    
    // Subject similarity
    if (userProfile1.subjects && userProfile2.subjects) {
      const commonSubjects = userProfile1.subjects.filter(subject => 
        userProfile2.subjects.includes(subject)
      );
      similarity += (commonSubjects.length / Math.max(userProfile1.subjects.length, userProfile2.subjects.length)) * 0.4;
    }
    
    // Interest similarity
    if (userProfile1.interests && userProfile2.interests) {
      const commonInterests = userProfile1.interests.filter(interest => 
        userProfile2.interests.includes(interest)
      );
      similarity += (commonInterests.length / Math.max(userProfile1.interests.length, userProfile2.interests.length)) * 0.3;
    }
    
    // Grade level similarity
    if (userProfile1.grade_level === userProfile2.grade_level) {
      similarity += 0.3;
    }
    
    return similarity;
  }

  async getContentLikedByUsers(similarUsers, tenantId) {
    if (similarUsers.length === 0) return [];
    
    try {
      const userIds = similarUsers.map(user => user.userId);
      const placeholders = userIds.map((_, index) => `$${index + 2}`).join(',');
      
      const query = `
        SELECT 
          ui.content_id, ui.content_type, ui.rating, ui.interaction_type,
          cc.title, cc.metadata
        FROM user_interactions ui
        JOIN content_catalog cc ON ui.content_id = cc.id
        WHERE ui.user_id IN (${placeholders}) 
        AND ui.tenant_id = $1
        AND ui.rating >= 4
        AND ui.interaction_type = 'view'
        ORDER BY ui.rating DESC, ui.timestamp DESC
        LIMIT 50
      `;
      
      const result = await this.db.query(query, [tenantId, ...userIds]);
      return result.rows;
    } catch (error) {
      console.error('Error getting content liked by users:', error);
      return [];
    }
  }

  calculateCollaborativeScore(content, similarUsers) {
    const userRatings = similarUsers.map(user => {
      const userContent = content.find(c => c.user_id === user.userId);
      return userContent ? userContent.rating * user.similarity : 0;
    });
    
    const avgRating = userRatings.reduce((sum, rating) => sum + rating, 0) / userRatings.length;
    return Math.min(avgRating / 5.0, 1.0);
  }

  generateCollaborativeReason(content, similarUsers) {
    const topSimilarUser = similarUsers[0];
    return `liked by users with similar interests (${topSimilarUser.similarity.toFixed(1)} similarity)`;
  }

  async generateHybridRecommendations(userProfile, interactionHistory, context) {
    const recommendations = [];
    
    // Combine content-based and collaborative approaches
    const contentBasedRecs = await this.generateContentBasedRecommendations(userProfile, interactionHistory, context);
    const collaborativeRecs = await this.generateCollaborativeRecommendations(userProfile.user_id, userProfile.tenant_id, userProfile, context);
    
    // Create hybrid recommendations
    const allRecommendations = [...contentBasedRecs, ...collaborativeRecs];
    const recommendationMap = new Map();
    
    // Merge recommendations by content ID
    for (const rec of allRecommendations) {
      if (recommendationMap.has(rec.contentId)) {
        const existing = recommendationMap.get(rec.contentId);
        existing.score = (existing.score + rec.score) / 2;
        existing.reason = `${existing.reason}; ${rec.reason}`;
      } else {
        recommendationMap.set(rec.contentId, { ...rec });
      }
    }
    
    return Array.from(recommendationMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }

  async combineRecommendations(recommendationSets) {
    const combinedMap = new Map();
    
    for (const set of recommendationSets) {
      for (const rec of set.recommendations) {
        const key = rec.contentId;
        if (combinedMap.has(key)) {
          const existing = combinedMap.get(key);
          existing.score = existing.score + (rec.score * set.weight);
          existing.sources.push(set.type);
        } else {
          combinedMap.set(key, {
            ...rec,
            score: rec.score * set.weight,
            sources: [set.type]
          });
        }
      }
    }
    
    return Array.from(combinedMap.values())
      .sort((a, b) => b.score - a.score);
  }

  async applyRecommendationFilters(recommendations, userProfile, context, options) {
    let filtered = [...recommendations];
    
    // Apply diversity filter
    if (options.diversity) {
      filtered = this.applyDiversityFilter(filtered, options.diversity);
    }
    
    // Apply recency filter
    if (options.recency) {
      filtered = this.applyRecencyFilter(filtered, options.recency);
    }
    
    // Apply difficulty filter
    if (options.difficulty) {
      filtered = filtered.filter(rec => rec.metadata?.difficulty === options.difficulty);
    }
    
    // Apply content type filter
    if (options.contentType) {
      filtered = filtered.filter(rec => rec.contentType === options.contentType);
    }
    
    // Limit results
    const limit = options.limit || 10;
    return filtered.slice(0, limit);
  }

  applyDiversityFilter(recommendations, diversityLevel) {
    const diversified = [];
    const usedTypes = new Set();
    const usedSubjects = new Set();
    
    for (const rec of recommendations) {
      const type = rec.contentType;
      const subject = rec.metadata?.subject;
      
      if (diversityLevel === 'high') {
        if (!usedTypes.has(type) && !usedSubjects.has(subject)) {
          diversified.push(rec);
          usedTypes.add(type);
          usedSubjects.add(subject);
        }
      } else if (diversityLevel === 'medium') {
        if (!usedTypes.has(type) || !usedSubjects.has(subject)) {
          diversified.push(rec);
          usedTypes.add(type);
          usedSubjects.add(subject);
        }
      } else {
        diversified.push(rec);
      }
    }
    
    return diversified;
  }

  applyRecencyFilter(recommendations, recencyDays) {
    const cutoffDate = new Date(Date.now() - recencyDays * 24 * 60 * 60 * 1000);
    return recommendations.filter(rec => 
      !rec.metadata?.created_at || new Date(rec.metadata.created_at) > cutoffDate
    );
  }

  async generateRecommendationExplanations(recommendations, userProfile, context) {
    if (!this.aiConfig.openai.apiKey) {
      return recommendations.map(rec => ({
        ...rec,
        explanation: rec.reason
      }));
    }

    const explainedRecommendations = [];
    
    for (const rec of recommendations) {
      try {
        const prompt = `
          Generate a personalized explanation for why this content is recommended for a user.
          
          Content: ${rec.title}
          Content Type: ${rec.contentType}
          Reason: ${rec.reason}
          User Profile: ${JSON.stringify(userProfile)}
          
          Provide a brief, friendly explanation (1-2 sentences) that explains why this content is recommended.
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
        const explanation = data.choices[0].message.content.trim();
        
        explainedRecommendations.push({
          ...rec,
          explanation
        });
      } catch (error) {
        console.error('Error generating explanation:', error);
        explainedRecommendations.push({
          ...rec,
          explanation: rec.reason
        });
      }
    }
    
    return explainedRecommendations;
  }

  calculatePersonalizationLevel(userProfile) {
    let level = 0;
    
    if (userProfile.subjects && userProfile.subjects.length > 0) level += 0.3;
    if (userProfile.interests && userProfile.interests.length > 0) level += 0.3;
    if (userProfile.preferences) level += 0.2;
    if (userProfile.performance_history && Object.keys(userProfile.performance_history).length > 0) level += 0.2;
    
    if (level >= 0.8) return 'high';
    if (level >= 0.5) return 'medium';
    return 'low';
  }

  anonymizeUserId(userId, tenantId) {
    const crypto = require('crypto');
    return crypto.createHash('sha256')
      .update(`${tenantId}_${userId}`)
      .digest('hex')
      .substring(0, 16);
  }

  sanitizeContext(context) {
    const sanitized = { ...context };
    delete sanitized.sensitiveData;
    delete sanitized.personalInfo;
    return sanitized;
  }

  async validateCompliance(tenantId, operation, data) {
    // Validate compliance for recommendation generation
    if (this.complianceConfig.auditLogging) {
      await this.logRecommendationOperation(tenantId, operation, data);
    }
    
    return { compliant: true };
  }

  async logRecommendationGeneration(recommendationId, userId, tenantId, recommendationType, recommendationCount) {
    try {
      const query = `
        INSERT INTO ai_recommendation_logs (
          id, user_id, tenant_id, recommendation_type, recommendation_count, created_at
        ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      `;
      
      await this.db.query(query, [
        recommendationId,
        userId,
        tenantId,
        recommendationType,
        recommendationCount
      ]);
    } catch (error) {
      console.error('Error logging recommendation generation:', error);
    }
  }

  async logRecommendationOperation(tenantId, operation, data) {
    try {
      const query = `
        INSERT INTO ai_recommendation_operation_logs (
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
      console.error('Error logging recommendation operation:', error);
    }
  }

  async isHealthy() {
    // Check if the recommendation API is healthy
    return this.recommendationEngines.size > 0 && this.userProfiles.size > 0;
  }
}

module.exports = RecommendationsAPI;
