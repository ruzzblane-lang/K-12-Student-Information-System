const { v4: uuidv4 } = require('uuid');

class FraudDetectionAPI {
  constructor(db, aiConfig, complianceConfig) {
    this.db = db;
    this.aiConfig = aiConfig;
    this.complianceConfig = complianceConfig;
    this.fraudModels = new Map();
    this.anomalyDetectors = new Map();
    this.riskProfiles = new Map();
    this.patternDatabase = new Map();
  }

  async initialize() {
    console.log('Initializing AI-Enhanced Fraud & Anomaly Detection API...');
    
    // Initialize fraud detection models
    await this.initializeFraudModels();
    
    // Initialize anomaly detection systems
    await this.initializeAnomalyDetectors();
    
    // Initialize risk profiling
    await this.initializeRiskProfiling();
    
    // Initialize pattern recognition
    await this.initializePatternRecognition();
    
    // Initialize real-time monitoring
    await this.initializeRealTimeMonitoring();
    
    console.log('AI-Enhanced Fraud & Anomaly Detection API initialized successfully.');
  }

  async initializeFraudModels() {
    // Initialize machine learning models for fraud detection
    this.fraudModels.set('payment_fraud', {
      model: 'payment_fraud_detector',
      features: [
        'amount', 'frequency', 'time_pattern', 'location', 'device_fingerprint',
        'user_behavior', 'transaction_history', 'velocity', 'merchant_category'
      ],
      thresholds: {
        low: 0.3,
        medium: 0.6,
        high: 0.8
      }
    });

    this.fraudModels.set('account_takeover', {
      model: 'account_takeover_detector',
      features: [
        'login_location', 'device_change', 'password_change', 'email_change',
        'unusual_activity', 'session_pattern', 'ip_reputation'
      ],
      thresholds: {
        low: 0.2,
        medium: 0.5,
        high: 0.7
      }
    });

    this.fraudModels.set('identity_fraud', {
      model: 'identity_fraud_detector',
      features: [
        'document_verification', 'biometric_match', 'identity_consistency',
        'cross_reference', 'synthetic_identity', 'identity_velocity'
      ],
      thresholds: {
        low: 0.4,
        medium: 0.6,
        high: 0.8
      }
    });
  }

  async initializeAnomalyDetectors() {
    // Initialize anomaly detection systems
    this.anomalyDetectors.set('transaction_anomaly', {
      detector: 'isolation_forest',
      features: ['amount', 'frequency', 'time', 'location', 'merchant'],
      sensitivity: 0.1,
      window_size: 1000
    });

    this.anomalyDetectors.set('behavioral_anomaly', {
      detector: 'one_class_svm',
      features: ['login_time', 'session_duration', 'page_views', 'actions'],
      sensitivity: 0.05,
      window_size: 500
    });

    this.anomalyDetectors.set('network_anomaly', {
      detector: 'autoencoder',
      features: ['ip_address', 'user_agent', 'request_pattern', 'response_time'],
      sensitivity: 0.15,
      window_size: 2000
    });
  }

  async initializeRiskProfiling() {
    // Initialize risk profiling systems
    this.riskProfiles.set('user_risk', {
      factors: [
        'account_age', 'verification_status', 'transaction_history',
        'device_reputation', 'location_consistency', 'behavior_pattern'
      ],
      weights: {
        'account_age': 0.15,
        'verification_status': 0.25,
        'transaction_history': 0.20,
        'device_reputation': 0.15,
        'location_consistency': 0.15,
        'behavior_pattern': 0.10
      }
    });

    this.riskProfiles.set('transaction_risk', {
      factors: [
        'amount', 'frequency', 'merchant_risk', 'time_risk',
        'location_risk', 'device_risk', 'velocity_risk'
      ],
      weights: {
        'amount': 0.20,
        'frequency': 0.15,
        'merchant_risk': 0.15,
        'time_risk': 0.10,
        'location_risk': 0.15,
        'device_risk': 0.15,
        'velocity_risk': 0.10
      }
    });
  }

  async initializePatternRecognition() {
    // Initialize pattern recognition for fraud detection
    this.patternDatabase.set('fraud_patterns', [
      {
        id: 'rapid_transactions',
        pattern: 'Multiple transactions in short time period',
        indicators: ['high_frequency', 'small_amounts', 'same_merchant'],
        risk_score: 0.7
      },
      {
        id: 'unusual_location',
        pattern: 'Transaction from unusual geographic location',
        indicators: ['new_country', 'high_distance', 'suspicious_ip'],
        risk_score: 0.6
      },
      {
        id: 'device_fingerprint_mismatch',
        pattern: 'Transaction from unrecognized device',
        indicators: ['new_device', 'different_os', 'different_browser'],
        risk_score: 0.5
      },
      {
        id: 'amount_anomaly',
        pattern: 'Unusually large or small transaction amount',
        indicators: ['high_amount', 'low_amount', 'round_number'],
        risk_score: 0.4
      }
    ]);

    this.patternDatabase.set('behavioral_patterns', [
      {
        id: 'unusual_login_time',
        pattern: 'Login at unusual time of day',
        indicators: ['late_night', 'early_morning', 'weekend'],
        risk_score: 0.3
      },
      {
        id: 'rapid_password_changes',
        pattern: 'Multiple password changes in short period',
        indicators: ['frequent_changes', 'similar_passwords'],
        risk_score: 0.6
      },
      {
        id: 'unusual_navigation',
        pattern: 'Unusual navigation patterns',
        indicators: ['rapid_clicks', 'back_button_abuse', 'direct_urls'],
        risk_score: 0.4
      }
    ]);
  }

  async initializeRealTimeMonitoring() {
    // Initialize real-time monitoring systems
    this.realTimeMonitoring = {
      enabled: true,
      alertThresholds: {
        high_risk: 0.8,
        medium_risk: 0.6,
        low_risk: 0.4
      },
      monitoringWindows: {
        short: 5 * 60 * 1000, // 5 minutes
        medium: 30 * 60 * 1000, // 30 minutes
        long: 24 * 60 * 60 * 1000 // 24 hours
      }
    };
  }

  async assessPaymentRisk({ paymentData, userContext, transactionHistory, context = {} }) {
    try {
      // Validate compliance
      const compliance = await this.validateCompliance(context.tenantId, 'assessPaymentRisk', { paymentData });
      if (!compliance.compliant) {
        throw new Error(`Compliance violation: ${compliance.reason}`);
      }

      const assessmentId = uuidv4();
      
      // Extract features for fraud detection
      const features = await this.extractPaymentFeatures(paymentData, userContext, transactionHistory);
      
      // Run fraud detection models
      const fraudScores = await this.runFraudModels(features, 'payment_fraud');
      
      // Detect anomalies
      const anomalies = await this.detectAnomalies(features, 'transaction_anomaly');
      
      // Calculate risk profile
      const riskProfile = await this.calculateRiskProfile(features, 'transaction_risk');
      
      // Pattern matching
      const patternMatches = await this.matchFraudPatterns(features);
      
      // Generate AI-powered risk assessment
      const aiAssessment = await this.generateAIRiskAssessment(features, fraudScores, anomalies, patternMatches);
      
      // Calculate final risk score
      const finalRiskScore = await this.calculateFinalRiskScore(fraudScores, anomalies, riskProfile, patternMatches, aiAssessment);
      
      // Determine risk level and recommendations
      const riskLevel = this.determineRiskLevel(finalRiskScore);
      const recommendations = await this.generateRiskRecommendations(finalRiskScore, riskLevel, features);
      
      // Log the assessment
      await this.logRiskAssessment(assessmentId, context.tenantId, paymentData, finalRiskScore, riskLevel);

      return {
        assessmentId,
        riskScore: finalRiskScore,
        riskLevel,
        fraudScores,
        anomalies,
        riskProfile,
        patternMatches,
        aiAssessment,
        recommendations,
        features: this.sanitizeFeatures(features),
        assessedAt: new Date().toISOString(),
        complianceStatus: 'compliant'
      };
    } catch (error) {
      console.error('Error assessing payment risk:', error);
      throw new Error(`Payment risk assessment failed: ${error.message}`);
    }
  }

  async extractPaymentFeatures(paymentData, userContext, transactionHistory) {
    const features = {
      // Payment features
      amount: paymentData.amount,
      currency: paymentData.currency,
      paymentMethod: paymentData.paymentMethod,
      merchantCategory: paymentData.merchantCategory || 'unknown',
      
      // User context features
      userId: userContext.userId,
      accountAge: userContext.accountAge || 0,
      verificationStatus: userContext.verificationStatus || 'unverified',
      deviceFingerprint: userContext.deviceFingerprint,
      ipAddress: userContext.ipAddress,
      location: userContext.location,
      
      // Transaction history features
      transactionCount: transactionHistory.length,
      averageAmount: this.calculateAverage(transactionHistory.map(t => t.amount)),
      maxAmount: Math.max(...transactionHistory.map(t => t.amount)),
      frequency: this.calculateFrequency(transactionHistory),
      velocity: this.calculateVelocity(transactionHistory),
      
      // Behavioral features
      timeOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
      sessionDuration: userContext.sessionDuration || 0,
      
      // Risk indicators
      newDevice: userContext.isNewDevice || false,
      newLocation: userContext.isNewLocation || false,
      unusualTime: this.isUnusualTime(new Date()),
      highValue: paymentData.amount > 1000,
      roundAmount: paymentData.amount % 1 === 0
    };

    return features;
  }

  async runFraudModels(features, modelType) {
    const model = this.fraudModels.get(modelType);
    if (!model) {
      throw new Error(`Fraud model not found: ${modelType}`);
    }

    const scores = {};
    
    // Simulate ML model predictions
    for (const feature of model.features) {
      if (features[feature] !== undefined) {
        // In production, this would use actual ML models
        scores[feature] = this.simulateMLPrediction(features[feature], feature);
      }
    }

    // Calculate overall model score
    const overallScore = Object.values(scores).reduce((sum, score) => sum + score, 0) / Object.keys(scores).length;
    
    return {
      model: modelType,
      overallScore,
      featureScores: scores,
      thresholds: model.thresholds
    };
  }

  simulateMLPrediction(value, feature) {
    // Simulate ML model prediction based on feature type and value
    const featureWeights = {
      'amount': (value) => Math.min(value / 10000, 1), // Higher amounts = higher risk
      'frequency': (value) => Math.min(value / 100, 1), // Higher frequency = higher risk
      'newDevice': (value) => value ? 0.8 : 0.1,
      'newLocation': (value) => value ? 0.7 : 0.1,
      'unusualTime': (value) => value ? 0.6 : 0.1,
      'highValue': (value) => value ? 0.9 : 0.1,
      'roundAmount': (value) => value ? 0.4 : 0.1
    };

    const weightFunction = featureWeights[feature] || (() => 0.5);
    return Math.min(Math.max(weightFunction(value) + (Math.random() - 0.5) * 0.2, 0), 1);
  }

  async detectAnomalies(features, detectorType) {
    const detector = this.anomalyDetectors.get(detectorType);
    if (!detector) {
      throw new Error(`Anomaly detector not found: ${detectorType}`);
    }

    // Simulate anomaly detection
    const anomalies = [];
    
    for (const feature of detector.features) {
      if (features[feature] !== undefined) {
        const anomalyScore = this.simulateAnomalyDetection(features[feature], feature);
        if (anomalyScore > detector.sensitivity) {
          anomalies.push({
            feature,
            value: features[feature],
            anomalyScore,
            severity: anomalyScore > 0.8 ? 'high' : anomalyScore > 0.5 ? 'medium' : 'low'
          });
        }
      }
    }

    return {
      detector: detectorType,
      anomalies,
      overallAnomalyScore: anomalies.length > 0 ? 
        anomalies.reduce((sum, a) => sum + a.anomalyScore, 0) / anomalies.length : 0
    };
  }

  simulateAnomalyDetection(value, feature) {
    // Simulate anomaly detection based on feature type
    const anomalyThresholds = {
      'amount': (value) => value > 5000 ? 0.8 : value > 1000 ? 0.5 : 0.1,
      'frequency': (value) => value > 50 ? 0.9 : value > 20 ? 0.6 : 0.2,
      'time': (value) => (value < 6 || value > 22) ? 0.7 : 0.1,
      'location': (value) => value ? 0.6 : 0.1
    };

    const thresholdFunction = anomalyThresholds[feature] || (() => 0.3);
    return thresholdFunction(value) + (Math.random() - 0.5) * 0.1;
  }

  async calculateRiskProfile(features, profileType) {
    const profile = this.riskProfiles.get(profileType);
    if (!profile) {
      throw new Error(`Risk profile not found: ${profileType}`);
    }

    let totalScore = 0;
    let totalWeight = 0;
    const factorScores = {};

    for (const factor of profile.factors) {
      if (features[factor] !== undefined) {
        const score = this.calculateFactorScore(features[factor], factor);
        const weight = profile.weights[factor] || 0.1;
        
        factorScores[factor] = score;
        totalScore += score * weight;
        totalWeight += weight;
      }
    }

    return {
      profile: profileType,
      overallScore: totalWeight > 0 ? totalScore / totalWeight : 0,
      factorScores,
      weights: profile.weights
    };
  }

  calculateFactorScore(value, factor) {
    // Calculate risk score for individual factors
    const factorCalculators = {
      'account_age': (age) => Math.max(0, 1 - age / 365), // Older accounts = lower risk
      'verification_status': (status) => status === 'verified' ? 0.1 : 0.8,
      'transaction_history': (history) => history > 10 ? 0.2 : 0.7,
      'device_reputation': (reputation) => reputation === 'trusted' ? 0.1 : 0.6,
      'location_consistency': (consistent) => consistent ? 0.1 : 0.7,
      'behavior_pattern': (pattern) => pattern === 'normal' ? 0.1 : 0.6
    };

    const calculator = factorCalculators[factor] || (() => 0.5);
    return calculator(value);
  }

  async matchFraudPatterns(features) {
    const patterns = this.patternDatabase.get('fraud_patterns');
    const matches = [];

    for (const pattern of patterns) {
      let matchScore = 0;
      const matchedIndicators = [];

      for (const indicator of pattern.indicators) {
        if (this.checkIndicator(features, indicator)) {
          matchScore += 1 / pattern.indicators.length;
          matchedIndicators.push(indicator);
        }
      }

      if (matchScore > 0.5) {
        matches.push({
          patternId: pattern.id,
          pattern: pattern.pattern,
          matchScore,
          matchedIndicators,
          riskScore: pattern.risk_score
        });
      }
    }

    return matches;
  }

  checkIndicator(features, indicator) {
    // Check if specific fraud indicators are present
    const indicatorChecks = {
      'high_frequency': () => features.frequency > 20,
      'small_amounts': () => features.amount < 100,
      'same_merchant': () => features.merchantCategory === 'repeated',
      'new_country': () => features.newLocation,
      'high_distance': () => features.location?.distance > 1000,
      'suspicious_ip': () => features.ipAddress?.reputation === 'suspicious',
      'new_device': () => features.newDevice,
      'different_os': () => features.deviceFingerprint?.osChanged,
      'different_browser': () => features.deviceFingerprint?.browserChanged,
      'high_amount': () => features.amount > 5000,
      'low_amount': () => features.amount < 10,
      'round_number': () => features.roundAmount
    };

    const check = indicatorChecks[indicator];
    return check ? check() : false;
  }

  async generateAIRiskAssessment(features, fraudScores, anomalies, patternMatches) {
    if (!this.aiConfig.openai.apiKey) {
      return this.generateSimpleRiskAssessment(features, fraudScores, anomalies, patternMatches);
    }

    try {
      const prompt = `
        Analyze this payment risk assessment and provide insights:
        
        Payment Amount: $${features.amount}
        Payment Method: ${features.paymentMethod}
        User Account Age: ${features.accountAge} days
        Transaction Frequency: ${features.frequency} per day
        New Device: ${features.newDevice}
        New Location: ${features.newLocation}
        Unusual Time: ${features.unusualTime}
        
        Fraud Scores: ${JSON.stringify(fraudScores)}
        Anomalies: ${anomalies.anomalies.length} detected
        Pattern Matches: ${patternMatches.length} patterns matched
        
        Provide a risk assessment in JSON format with:
        - overallRisk: "low", "medium", or "high"
        - keyRiskFactors: array of main risk factors
        - riskExplanation: brief explanation of the risk
        - recommendations: array of specific recommendations
        - confidence: confidence level (0-1)
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
      console.error('Error generating AI risk assessment:', error);
      return this.generateSimpleRiskAssessment(features, fraudScores, anomalies, patternMatches);
    }
  }

  generateSimpleRiskAssessment(features, fraudScores, anomalies, patternMatches) {
    const riskFactors = [];
    
    if (features.newDevice) riskFactors.push('New device detected');
    if (features.newLocation) riskFactors.push('New location detected');
    if (features.unusualTime) riskFactors.push('Unusual transaction time');
    if (features.highValue) riskFactors.push('High value transaction');
    if (anomalies.anomalies.length > 0) riskFactors.push('Anomalous behavior detected');
    if (patternMatches.length > 0) riskFactors.push('Fraud patterns detected');

    return {
      overallRisk: riskFactors.length > 3 ? 'high' : riskFactors.length > 1 ? 'medium' : 'low',
      keyRiskFactors: riskFactors,
      riskExplanation: `Transaction shows ${riskFactors.length} risk indicators`,
      recommendations: [
        'Verify user identity',
        'Request additional authentication',
        'Monitor for additional suspicious activity'
      ],
      confidence: 0.7
    };
  }

  async calculateFinalRiskScore(fraudScores, anomalies, riskProfile, patternMatches, aiAssessment) {
    // Weighted combination of all risk factors
    const weights = {
      fraudScore: 0.3,
      anomalyScore: 0.25,
      riskProfile: 0.2,
      patternMatches: 0.15,
      aiAssessment: 0.1
    };

    let finalScore = 0;
    
    // Fraud model score
    finalScore += fraudScores.overallScore * weights.fraudScore;
    
    // Anomaly score
    finalScore += anomalies.overallAnomalyScore * weights.anomalyScore;
    
    // Risk profile score
    finalScore += riskProfile.overallScore * weights.riskProfile;
    
    // Pattern match score
    const patternScore = patternMatches.length > 0 ? 
      patternMatches.reduce((sum, match) => sum + match.riskScore, 0) / patternMatches.length : 0;
    finalScore += patternScore * weights.patternMatches;
    
    // AI assessment score
    const aiScore = aiAssessment.overallRisk === 'high' ? 0.9 : 
                   aiAssessment.overallRisk === 'medium' ? 0.6 : 0.3;
    finalScore += aiScore * weights.aiAssessment;

    return Math.min(Math.max(finalScore, 0), 1);
  }

  determineRiskLevel(riskScore) {
    if (riskScore >= 0.8) return 'high';
    if (riskScore >= 0.6) return 'medium';
    if (riskScore >= 0.4) return 'low';
    return 'minimal';
  }

  async generateRiskRecommendations(riskScore, riskLevel, features) {
    const recommendations = [];

    if (riskLevel === 'high') {
      recommendations.push({
        action: 'block_transaction',
        priority: 'critical',
        reason: 'High risk transaction detected',
        details: 'Transaction should be blocked and user contacted'
      });
    } else if (riskLevel === 'medium') {
      recommendations.push({
        action: 'require_verification',
        priority: 'high',
        reason: 'Medium risk transaction detected',
        details: 'Additional verification required before processing'
      });
    } else if (riskLevel === 'low') {
      recommendations.push({
        action: 'monitor_closely',
        priority: 'medium',
        reason: 'Low risk transaction detected',
        details: 'Monitor for additional suspicious activity'
      });
    }

    // Specific recommendations based on features
    if (features.newDevice) {
      recommendations.push({
        action: 'verify_device',
        priority: 'high',
        reason: 'New device detected',
        details: 'Send device verification email or SMS'
      });
    }

    if (features.newLocation) {
      recommendations.push({
        action: 'verify_location',
        priority: 'medium',
        reason: 'New location detected',
        details: 'Request location confirmation'
      });
    }

    if (features.highValue) {
      recommendations.push({
        action: 'manual_review',
        priority: 'high',
        reason: 'High value transaction',
        details: 'Flag for manual review by fraud team'
      });
    }

    return recommendations;
  }

  async monitorRealTimeActivity({ userId, tenantId, activityData, context = {} }) {
    try {
      // Real-time monitoring for suspicious activity
      const monitoringId = uuidv4();
      
      // Check for rapid activity patterns
      const rapidActivity = await this.detectRapidActivity(userId, tenantId, activityData);
      
      // Check for behavioral anomalies
      const behavioralAnomalies = await this.detectBehavioralAnomalies(userId, tenantId, activityData);
      
      // Check for network anomalies
      const networkAnomalies = await this.detectNetworkAnomalies(userId, tenantId, activityData);
      
      // Generate alerts if needed
      const alerts = await this.generateRealTimeAlerts(rapidActivity, behavioralAnomalies, networkAnomalies);
      
      // Log monitoring results
      await this.logRealTimeMonitoring(monitoringId, userId, tenantId, activityData, alerts);

      return {
        monitoringId,
        rapidActivity,
        behavioralAnomalies,
        networkAnomalies,
        alerts,
        monitoredAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error in real-time monitoring:', error);
      throw new Error(`Real-time monitoring failed: ${error.message}`);
    }
  }

  async detectRapidActivity(userId, tenantId, activityData) {
    // Detect rapid or suspicious activity patterns
    const timeWindow = 5 * 60 * 1000; // 5 minutes
    const currentTime = Date.now();
    
    // Get recent activities
    const recentActivities = await this.getRecentActivities(userId, tenantId, timeWindow);
    
    const rapidActivity = {
      detected: false,
      activityCount: recentActivities.length,
      timeWindow: timeWindow,
      suspiciousPatterns: []
    };

    if (recentActivities.length > 10) {
      rapidActivity.detected = true;
      rapidActivity.suspiciousPatterns.push('High activity frequency');
    }

    if (recentActivities.length > 5 && activityData.type === 'payment') {
      rapidActivity.detected = true;
      rapidActivity.suspiciousPatterns.push('Rapid payment attempts');
    }

    return rapidActivity;
  }

  async detectBehavioralAnomalies(userId, tenantId, activityData) {
    // Detect behavioral anomalies
    const userProfile = await this.getUserBehaviorProfile(userId, tenantId);
    
    const anomalies = {
      detected: false,
      anomalyTypes: [],
      severity: 'low'
    };

    // Check for unusual login times
    if (this.isUnusualLoginTime(activityData.timestamp, userProfile.typicalLoginTimes)) {
      anomalies.detected = true;
      anomalies.anomalyTypes.push('unusual_login_time');
    }

    // Check for unusual session duration
    if (this.isUnusualSessionDuration(activityData.sessionDuration, userProfile.typicalSessionDuration)) {
      anomalies.detected = true;
      anomalies.anomalyTypes.push('unusual_session_duration');
    }

    // Check for unusual navigation patterns
    if (this.isUnusualNavigation(activityData.navigationPattern, userProfile.typicalNavigation)) {
      anomalies.detected = true;
      anomalies.anomalyTypes.push('unusual_navigation');
    }

    if (anomalies.anomalyTypes.length > 2) {
      anomalies.severity = 'high';
    } else if (anomalies.anomalyTypes.length > 0) {
      anomalies.severity = 'medium';
    }

    return anomalies;
  }

  async detectNetworkAnomalies(userId, tenantId, activityData) {
    // Detect network-related anomalies
    const networkProfile = await this.getUserNetworkProfile(userId, tenantId);
    
    const anomalies = {
      detected: false,
      anomalyTypes: [],
      severity: 'low'
    };

    // Check for IP reputation
    if (activityData.ipAddress && this.isSuspiciousIP(activityData.ipAddress)) {
      anomalies.detected = true;
      anomalies.anomalyTypes.push('suspicious_ip');
    }

    // Check for unusual location
    if (activityData.location && this.isUnusualLocation(activityData.location, networkProfile.typicalLocations)) {
      anomalies.detected = true;
      anomalies.anomalyTypes.push('unusual_location');
    }

    // Check for VPN/Proxy usage
    if (activityData.isVPN || activityData.isProxy) {
      anomalies.detected = true;
      anomalies.anomalyTypes.push('vpn_proxy_usage');
    }

    if (anomalies.anomalyTypes.length > 1) {
      anomalies.severity = 'high';
    } else if (anomalies.anomalyTypes.length > 0) {
      anomalies.severity = 'medium';
    }

    return anomalies;
  }

  async generateRealTimeAlerts(rapidActivity, behavioralAnomalies, networkAnomalies) {
    const alerts = [];

    if (rapidActivity.detected) {
      alerts.push({
        type: 'rapid_activity',
        severity: 'high',
        message: `Rapid activity detected: ${rapidActivity.activityCount} activities in ${rapidActivity.timeWindow / 1000} seconds`,
        patterns: rapidActivity.suspiciousPatterns,
        action: 'immediate_review'
      });
    }

    if (behavioralAnomalies.detected && behavioralAnomalies.severity === 'high') {
      alerts.push({
        type: 'behavioral_anomaly',
        severity: 'high',
        message: `High severity behavioral anomalies detected: ${behavioralAnomalies.anomalyTypes.join(', ')}`,
        anomalyTypes: behavioralAnomalies.anomalyTypes,
        action: 'user_verification'
      });
    }

    if (networkAnomalies.detected && networkAnomalies.severity === 'high') {
      alerts.push({
        type: 'network_anomaly',
        severity: 'high',
        message: `High severity network anomalies detected: ${networkAnomalies.anomalyTypes.join(', ')}`,
        anomalyTypes: networkAnomalies.anomalyTypes,
        action: 'security_review'
      });
    }

    return alerts;
  }

  // Helper methods
  calculateAverage(numbers) {
    return numbers.length > 0 ? numbers.reduce((sum, num) => sum + num, 0) / numbers.length : 0;
  }

  calculateFrequency(transactions) {
    if (transactions.length === 0) return 0;
    const timeSpan = Date.now() - new Date(transactions[0].timestamp).getTime();
    return transactions.length / (timeSpan / (24 * 60 * 60 * 1000)); // transactions per day
  }

  calculateVelocity(transactions) {
    if (transactions.length < 2) return 0;
    const recent = transactions.slice(0, 5);
    const amounts = recent.map(t => t.amount);
    return Math.max(...amounts) - Math.min(...amounts);
  }

  isUnusualTime(timestamp) {
    const hour = new Date(timestamp).getHours();
    return hour < 6 || hour > 22;
  }

  isUnusualLoginTime(timestamp, typicalTimes) {
    const hour = new Date(timestamp).getHours();
    return !typicalTimes.includes(hour);
  }

  isUnusualSessionDuration(duration, typicalDuration) {
    return Math.abs(duration - typicalDuration) > typicalDuration * 0.5;
  }

  isUnusualNavigation(pattern, typicalPattern) {
    // Simple pattern comparison
    return pattern.length > typicalPattern.length * 2;
  }

  isSuspiciousIP(ipAddress) {
    // Simple IP reputation check
    const suspiciousIPs = ['192.168.1.1', '10.0.0.1']; // Example
    return suspiciousIPs.includes(ipAddress);
  }

  isUnusualLocation(location, typicalLocations) {
    // Simple location comparison
    return !typicalLocations.some(tl => 
      Math.abs(tl.lat - location.lat) < 0.1 && Math.abs(tl.lng - location.lng) < 0.1
    );
  }

  sanitizeFeatures(features) {
    // Remove sensitive information from features
    const sanitized = { ...features };
    delete sanitized.userId;
    delete sanitized.ipAddress;
    delete sanitized.deviceFingerprint;
    return sanitized;
  }

  async getRecentActivities(userId, tenantId, timeWindow) {
    // Get recent activities from database
    try {
      const query = `
        SELECT * FROM user_activities 
        WHERE user_id = $1 AND tenant_id = $2 AND created_at > $3
        ORDER BY created_at DESC
      `;
      const result = await this.db.query(query, [userId, tenantId, new Date(Date.now() - timeWindow)]);
      return result.rows;
    } catch (error) {
      console.error('Error getting recent activities:', error);
      return [];
    }
  }

  async getUserBehaviorProfile(userId, tenantId) {
    // Get user behavior profile from database
    try {
      const query = `
        SELECT * FROM user_behavior_profiles 
        WHERE user_id = $1 AND tenant_id = $2
      `;
      const result = await this.db.query(query, [userId, tenantId]);
      return result.rows[0] || {
        typicalLoginTimes: [9, 10, 11, 14, 15, 16],
        typicalSessionDuration: 1800000, // 30 minutes
        typicalNavigation: ['home', 'dashboard', 'profile']
      };
    } catch (error) {
      console.error('Error getting user behavior profile:', error);
      return {
        typicalLoginTimes: [9, 10, 11, 14, 15, 16],
        typicalSessionDuration: 1800000,
        typicalNavigation: ['home', 'dashboard', 'profile']
      };
    }
  }

  async getUserNetworkProfile(userId, tenantId) {
    // Get user network profile from database
    try {
      const query = `
        SELECT * FROM user_network_profiles 
        WHERE user_id = $1 AND tenant_id = $2
      `;
      const result = await this.db.query(query, [userId, tenantId]);
      return result.rows[0] || {
        typicalLocations: [{ lat: 40.7128, lng: -74.0060 }] // Default to NYC
      };
    } catch (error) {
      console.error('Error getting user network profile:', error);
      return {
        typicalLocations: [{ lat: 40.7128, lng: -74.0060 }]
      };
    }
  }

  async validateCompliance(tenantId, operation, data) {
    // Validate compliance for fraud detection operations
    if (this.complianceConfig.auditLogging) {
      await this.logFraudDetectionOperation(tenantId, operation, data);
    }
    
    return { compliant: true };
  }

  async logRiskAssessment(assessmentId, tenantId, paymentData, riskScore, riskLevel) {
    try {
      const query = `
        INSERT INTO fraud_risk_assessments (
          id, tenant_id, payment_data, risk_score, risk_level, created_at
        ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      `;
      
      await this.db.query(query, [
        assessmentId,
        tenantId,
        JSON.stringify(paymentData),
        riskScore,
        riskLevel
      ]);
    } catch (error) {
      console.error('Error logging risk assessment:', error);
    }
  }

  async logRealTimeMonitoring(monitoringId, userId, tenantId, activityData, alerts) {
    try {
      const query = `
        INSERT INTO real_time_monitoring_logs (
          id, user_id, tenant_id, activity_data, alerts, created_at
        ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      `;
      
      await this.db.query(query, [
        monitoringId,
        userId,
        tenantId,
        JSON.stringify(activityData),
        JSON.stringify(alerts)
      ]);
    } catch (error) {
      console.error('Error logging real-time monitoring:', error);
    }
  }

  async logFraudDetectionOperation(tenantId, operation, data) {
    try {
      const query = `
        INSERT INTO fraud_detection_logs (
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
      console.error('Error logging fraud detection operation:', error);
    }
  }

  async isHealthy() {
    // Check if the fraud detection API is healthy
    return this.fraudModels.size > 0 && this.anomalyDetectors.size > 0;
  }
}

module.exports = FraudDetectionAPI;
