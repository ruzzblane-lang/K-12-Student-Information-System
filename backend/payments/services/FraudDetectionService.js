/**
 * Fraud Detection Service
 * 
 * Advanced fraud detection and risk assessment service that uses
 * machine learning, velocity checks, and behavioral analysis to
 * identify potentially fraudulent transactions.
 */

const { v4: uuidv4 } = require('uuid');

class FraudDetectionService {
  constructor(db) {
    if (!db || typeof db.query !== 'function') {
      throw new Error('Invalid database connection: must have a query method');
    }
    this.db = db;
    
    // Fraud detection rules and thresholds
    this.rules = {
      velocity: {
        maxTransactionsPerHour: 10,
        maxAmountPerHour: 5000,
        maxTransactionsPerDay: 50,
        maxAmountPerDay: 25000
      },
      amount: {
        suspiciousThreshold: 10000,
        highRiskThreshold: 50000
      },
      time: {
        suspiciousHours: [0, 1, 2, 3, 4, 5], // Late night/early morning
        weekendMultiplier: 1.5
      },
      location: {
        maxDistanceKm: 1000, // Max distance from usual location
        newCountryMultiplier: 2.0
      },
      device: {
        newDeviceMultiplier: 1.5,
        suspiciousUserAgentMultiplier: 2.0
      }
    };

    // Risk scoring weights
    this.riskWeights = {
      velocity: 0.25,
      amount: 0.20,
      time: 0.15,
      location: 0.15,
      device: 0.10,
      behavioral: 0.10,
      blacklist: 0.05
    };
  }

  /**
   * Assess payment for fraud risk
   * @param {Object} paymentData - Payment data
   * @returns {Object} Fraud assessment
   */
  async assessPayment(paymentData) {
    // Input validation
    if (!paymentData || typeof paymentData !== 'object') {
      throw new Error('Invalid payment data: must be an object');
    }

    if (!paymentData.tenantId || !paymentData.userId) {
      throw new Error('Missing required fields: tenantId and userId are required');
    }

    if (typeof paymentData.amount !== 'number' || paymentData.amount <= 0) {
      throw new Error('Invalid amount: must be a positive number');
    }

    const assessmentId = uuidv4();
    const startTime = Date.now();

    try {
      // Get user/tenant context
      const context = await this.getPaymentContext(paymentData);

      // Run fraud detection checks
      const checks = await Promise.all([
        this.checkVelocityRules(paymentData, context),
        this.checkAmountRules(paymentData),
        this.checkTimeRules(paymentData),
        this.checkLocationRules(paymentData, context),
        this.checkDeviceRules(paymentData, context),
        this.checkBehavioralPatterns(paymentData, context),
        this.checkBlacklists(paymentData, context)
      ]);

      // Calculate overall risk score
      const riskScore = this.calculateRiskScore(checks);
      const riskLevel = this.determineRiskLevel(riskScore);

      // Generate risk factors
      const riskFactors = this.generateRiskFactors(checks);

      // Create assessment record
      const assessment = {
        id: assessmentId,
        tenantId: paymentData.tenantId,
        transactionId: paymentData.transactionId || 'pending',
        riskScore,
        riskLevel,
        riskFactors,
        checks,
        processingTime: Date.now() - startTime,
        timestamp: new Date()
      };

      // Store assessment
      await this.storeAssessment(assessment);

      // Log high-risk transactions
      if (riskLevel === 'high' || riskLevel === 'critical') {
        await this.logHighRiskTransaction(assessment);
      }

      return assessment;

    } catch (error) {
      // Log error for debugging (in production, use proper logging service)
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Fraud detection error:', error);
      }
      
      // Return safe default on error
      return {
        id: assessmentId,
        tenantId: paymentData.tenantId,
        riskScore: 50, // Medium risk as default
        riskLevel: 'medium',
        riskFactors: ['fraud_detection_error'],
        checks: [],
        processingTime: Date.now() - startTime,
        timestamp: new Date(),
        error: error.message
      };
    }
  }

  /**
   * Check velocity rules (frequency and amount limits)
   * @param {Object} paymentData - Payment data
   * @param {Object} context - Payment context
   * @returns {Object} Velocity check result
   */
  async checkVelocityRules(paymentData, context) {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Get recent transactions
      const recentTransactions = await this.getRecentTransactions(
        paymentData.tenantId,
        context.userId,
        oneHourAgo
      );

      const dailyTransactions = await this.getRecentTransactions(
        paymentData.tenantId,
        context.userId,
        oneDayAgo
      );

      // Calculate metrics
      const hourlyCount = recentTransactions.length;
      const hourlyAmount = recentTransactions.reduce((sum, tx) => sum + tx.amount, 0);
      const dailyCount = dailyTransactions.length;
      const dailyAmount = dailyTransactions.reduce((sum, tx) => sum + tx.amount, 0);

      // Check against thresholds
      const violations = [];
      let riskScore = 0;

      if (hourlyCount > this.rules.velocity.maxTransactionsPerHour) {
        violations.push('high_hourly_frequency');
        riskScore += 30;
      }

      if (hourlyAmount > this.rules.velocity.maxAmountPerHour) {
        violations.push('high_hourly_amount');
        riskScore += 25;
      }

      if (dailyCount > this.rules.velocity.maxTransactionsPerDay) {
        violations.push('high_daily_frequency');
        riskScore += 20;
      }

      if (dailyAmount > this.rules.velocity.maxAmountPerDay) {
        violations.push('high_daily_amount');
        riskScore += 15;
      }

      return {
        type: 'velocity',
        riskScore: Math.min(riskScore, 100),
        violations,
        metrics: {
          hourlyCount,
          hourlyAmount,
          dailyCount,
          dailyAmount
        }
      };

    } catch (error) {
      return {
        type: 'velocity',
        riskScore: 0,
        violations: [],
        error: error.message
      };
    }
  }

  /**
   * Check amount rules
   * @param {Object} paymentData - Payment data
   * @returns {Object} Amount check result
   */
  async checkAmountRules(paymentData) {
    const amount = paymentData.amount;
    const violations = [];
    let riskScore = 0;

    // Check against thresholds
    if (amount >= this.rules.amount.highRiskThreshold) {
      violations.push('very_high_amount');
      riskScore = 80;
    } else if (amount >= this.rules.amount.suspiciousThreshold) {
      violations.push('high_amount');
      riskScore = 40;
    }

    // Check for round numbers (potential test transactions)
    if (amount % 100 === 0 && amount >= 1000) {
      violations.push('round_number');
      riskScore += 10;
    }

    // Check for unusual decimal places
    const decimalPlaces = (amount.toString().split('.')[1] || '').length;
    if (decimalPlaces > 2) {
      violations.push('unusual_decimal_places');
      riskScore += 5;
    }

    return {
      type: 'amount',
      riskScore: Math.min(riskScore, 100),
      violations,
      metrics: {
        amount,
        decimalPlaces
      }
    };
  }

  /**
   * Check time-based rules
   * @param {Object} paymentData - Payment data
   * @returns {Object} Time check result
   */
  async checkTimeRules(paymentData) {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
    const violations = [];
    let riskScore = 0;

    // Check for suspicious hours
    if (this.rules.time.suspiciousHours.includes(hour)) {
      violations.push('suspicious_time');
      riskScore += 20;
    }

    // Check for weekend transactions
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      violations.push('weekend_transaction');
      riskScore += 10;
    }

    // Check for first transaction of the day
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayTransactions = await this.getRecentTransactions(
      paymentData.tenantId,
      paymentData.userId,
      todayStart
    );

    if (todayTransactions.length === 0) {
      violations.push('first_transaction_today');
      riskScore += 5;
    }

    return {
      type: 'time',
      riskScore: Math.min(riskScore, 100),
      violations,
      metrics: {
        hour,
        dayOfWeek,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        firstTransactionToday: todayTransactions.length === 0
      }
    };
  }

  /**
   * Check location-based rules
   * @param {Object} paymentData - Payment data
   * @param {Object} context - Payment context
   * @returns {Object} Location check result
   */
  async checkLocationRules(paymentData, context) {
    const violations = [];
    let riskScore = 0;

    // Check if location data is available
    if (!paymentData.location) {
      return {
        type: 'location',
        riskScore: 0,
        violations: [],
        metrics: { locationAvailable: false }
      };
    }

    try {
      // Get user's usual locations
      const usualLocations = await this.getUsualLocations(paymentData.tenantId, context.userId);

      if (usualLocations.length > 0) {
        // Calculate distance from usual locations
        const distances = usualLocations.map(loc => 
          this.calculateDistance(paymentData.location, loc)
        );

        const minDistance = Math.min(...distances);

        if (minDistance > this.rules.location.maxDistanceKm) {
          violations.push('unusual_location');
          riskScore += 30;
        }

        // Check for new country
        const currentCountry = paymentData.location.country;
        const usualCountries = [...new Set(usualLocations.map(loc => loc.country))];

        if (!usualCountries.includes(currentCountry)) {
          violations.push('new_country');
          riskScore += 25;
        }
      } else {
        // First transaction from this user
        violations.push('first_location');
        riskScore += 10;
      }

      return {
        type: 'location',
        riskScore: Math.min(riskScore, 100),
        violations,
        metrics: {
          locationAvailable: true,
          minDistanceFromUsual: usualLocations.length > 0
            ? Math.min(...usualLocations.map(loc => this.calculateDistance(paymentData.location, loc)))
            : null,
          isNewCountry: usualLocations.length > 0
            ? ![...new Set(usualLocations.map(loc => loc.country))].includes(paymentData.location.country)
            : false
        }
      };
    } catch (error) {
      return {
        type: 'location',
        riskScore: 0,
        violations: [],
        metrics: { locationAvailable: false },
        error: error.message
      };
    }
  }

  /**
   * Check device-based rules
   * @param {Object} paymentData - Payment data
   * @param {Object} context - Payment context
   * @returns {Object} Device check result
   */
  async checkDeviceRules(paymentData, context) {
    const violations = [];
    let riskScore = 0;

    if (!paymentData.device) {
      return {
        type: 'device',
        riskScore: 0,
        violations: [],
        metrics: { deviceAvailable: false }
      };
    }

    try {
      // Check for new device
      const deviceHistory = await this.getDeviceHistory(paymentData.tenantId, context.userId);
      const isNewDevice = !deviceHistory.some(device => 
        device.fingerprint === paymentData.device.fingerprint
      );

      if (isNewDevice) {
        violations.push('new_device');
        riskScore += 20;
      }

      // Check for suspicious user agent
      const userAgent = paymentData.device.userAgent || '';
      const suspiciousPatterns = [
        'bot', 'crawler', 'spider', 'scraper',
        'headless', 'phantom', 'selenium'
      ];

      const isSuspiciousUA = suspiciousPatterns.some(pattern =>
        userAgent.toLowerCase().includes(pattern)
      );

      if (isSuspiciousUA) {
        violations.push('suspicious_user_agent');
        riskScore += 40;
      }

      // Check for VPN/Proxy indicators
      if (paymentData.device.isVPN || paymentData.device.isProxy) {
        violations.push('vpn_proxy_detected');
        riskScore += 30;
      }

      return {
        type: 'device',
        riskScore: Math.min(riskScore, 100),
        violations,
        metrics: {
          deviceAvailable: true,
          isNewDevice,
          isSuspiciousUserAgent: isSuspiciousUA,
          isVPN: paymentData.device.isVPN,
          isProxy: paymentData.device.isProxy
        }
      };

    } catch (error) {
      return {
        type: 'device',
        riskScore: 0,
        violations: [],
        error: error.message
      };
    }
  }

  /**
   * Check behavioral patterns.
   * Analyzes user's recent payment history for anomalies such as unusual amounts,
   * rapid successive payments, and new payment methods.
   *
   * @param {Object} paymentData Payment data for the current transaction.
   * @param {Object} context Payment context, including userId and other metadata.
   * @returns {Object} Behavioral check result, including risk score, violations, and metrics.
   */
  async checkBehavioralPatterns(paymentData, context) {
    const violations = [];
    let riskScore = 0;

    try {
      // Get user's payment history
      const paymentHistory = await this.getPaymentHistory(paymentData.tenantId, context.userId, 30); // Last 30 days

      let avgAmount = 0;
      let amountDeviation = 0;
      let recentPayments = [];

      if (paymentHistory.length > 0) {
        // Check for unusual payment patterns
        avgAmount = paymentHistory.reduce((sum, tx) => sum + tx.amount, 0) / paymentHistory.length;
        amountDeviation = Math.abs(paymentData.amount - avgAmount) / avgAmount;

        if (amountDeviation > 2.0) { // 200% deviation
          violations.push('unusual_amount');
          riskScore += 25;
        }

        // Check for rapid successive payments
        recentPayments = paymentHistory.filter(tx => 
          new Date(tx.created_at) > new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
        );

        if (recentPayments.length > 3) {
          violations.push('rapid_successive_payments');
          riskScore += 35;
        }

        // Check for unusual payment methods
        const usualMethods = [...new Set(paymentHistory.map(tx => tx.payment_method))];
        if (!usualMethods.includes(paymentData.paymentMethod)) {
          violations.push('unusual_payment_method');
          riskScore += 15;
        }
      }

      return {
        type: 'behavioral',
        riskScore: Math.min(riskScore, 100),
        violations,
        metrics: {
          paymentHistoryLength: paymentHistory.length,
          avgAmount: paymentHistory.length > 0 ? avgAmount : null,
          amountDeviation: paymentHistory.length > 0 ? amountDeviation : null,
          recentPaymentsCount: recentPayments.length
        }
      };

    } catch (error) {
      return {
        type: 'behavioral',
        riskScore: 0,
        violations: [],
        error: error.message
      };
    }
  }

  /**
   * Check blacklists
   * @param {Object} paymentData - Payment data
   * @param {Object} context - Payment context
   * @returns {Object} Blacklist check result
   */
  async checkBlacklists(paymentData, context) {
    const violations = [];
    let riskScore = 0;

    try {
      // Check email blacklist
      if (context.email) {
        const isEmailBlacklisted = await this.isEmailBlacklisted(context.email);
        if (isEmailBlacklisted) {
          violations.push('blacklisted_email');
          riskScore = 100; // Automatic high risk
        }
      }

      // Check IP blacklist
      if (paymentData.ipAddress) {
        const isIPBlacklisted = await this.isIPBlacklisted(paymentData.ipAddress);
        if (isIPBlacklisted) {
          violations.push('blacklisted_ip');
          riskScore = 100; // Automatic high risk
        }
      }

      // Check card blacklist
      if (paymentData.paymentMethodId) {
        const isCardBlacklisted = await this.isCardBlacklisted(paymentData.paymentMethodId);
        if (isCardBlacklisted) {
          violations.push('blacklisted_card');
          riskScore = 100; // Automatic high risk
        }
      }

      return {
        type: 'blacklist',
        riskScore: Math.min(riskScore, 100),
        violations,
        metrics: {
          emailChecked: !!context.email,
          ipChecked: !!paymentData.ipAddress,
          cardChecked: !!paymentData.paymentMethodId
        }
      };

    } catch (error) {
      return {
        type: 'blacklist',
        riskScore: 0,
        violations: [],
        error: error.message
      };
    }
  }

  /**
   * Calculate overall risk score
   * @param {Array} checks - Individual check results
   * @returns {number} Risk score (0-100)
   */
  calculateRiskScore(checks) {
    let totalScore = 0;
    let totalWeight = 0;

    for (const check of checks) {
      if (check.riskScore > 0) {
        const weight = this.riskWeights[check.type] || 0;
        totalScore += check.riskScore * weight;
        totalWeight += weight;
      }
    }

    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  }

  /**
   * Determine risk level based on score
   * @param {number} riskScore - Risk score
   * @returns {string} Risk level
   */
  determineRiskLevel(riskScore) {
    if (riskScore >= 80) return 'critical';
    if (riskScore >= 60) return 'high';
    if (riskScore >= 30) return 'medium';
    return 'low';
  }

  /**
   * Generate risk factors from checks
   * @param {Array} checks - Individual check results
   * @returns {Array} Risk factors
   */
  generateRiskFactors(checks) {
    const factors = [];
    
    for (const check of checks) {
      factors.push(...check.violations);
    }

    return [...new Set(factors)]; // Remove duplicates
  }

  /**
   * Get payment context
   * @param {Object} paymentData - Payment data
   * @returns {Object} Payment context
   */
  async getPaymentContext(paymentData) {
    try {
      // Get user information
      const userQuery = `
        SELECT u.id, u.email, u.first_name, u.last_name, u.role
        FROM users u
        WHERE u.tenant_id = $1 AND u.id = $2
      `;

      const userResult = await this.db.query(userQuery, [paymentData.tenantId, paymentData.userId]);
      const user = userResult.rows[0];

      return {
        userId: paymentData.userId,
        email: user?.email,
        name: user ? `${user.first_name} ${user.last_name}` : null,
        role: user?.role
      };

    } catch (error) {
      return {
        userId: paymentData.userId,
        email: null,
        name: null,
        role: null
      };
    }
  }

  /**
   * Get recent transactions
   * @param {string} tenantId - Tenant ID
   * @param {string} userId - User ID
   * @param {Date} since - Since date
   * @returns {Array} Recent transactions
   */
  async getRecentTransactions(tenantId, userId, since) {
    if (!tenantId || !userId || !since) {
      throw new Error('Missing required parameters for getRecentTransactions');
    }

    const query = `
      SELECT amount, created_at, payment_method
      FROM payment_transactions
      WHERE tenant_id = $1 AND user_id = $2 AND created_at >= $3
      ORDER BY created_at DESC
      LIMIT 100
    `;

    try {
      const result = await this.db.query(query, [tenantId, userId, since]);
      return result.rows || [];
    } catch (error) {
      // Log error for debugging (in production, use proper logging service)
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Error fetching recent transactions:', error);
      }
      return [];
    }
  }

  /**
   * Get usual locations
   * @param {string} tenantId - Tenant ID
   * @param {string} userId - User ID
   * @returns {Array} Usual locations
   */
  async getUsualLocations(tenantId, userId) {
    if (!tenantId || !userId) {
      return [];
    }

    const query = `
      SELECT country, city, latitude, longitude, COUNT(*) as frequency
      FROM payment_locations
      WHERE tenant_id = $1 AND user_id = $2
        AND latitude IS NOT NULL 
        AND longitude IS NOT NULL
      GROUP BY country, city, latitude, longitude
      HAVING COUNT(*) >= 2
      ORDER BY frequency DESC
      LIMIT 10
    `;

    try {
      const result = await this.db.query(query, [tenantId, userId]);
      return result.rows || [];
    } catch (error) {
      // Log error for debugging (in production, use proper logging service)
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Error fetching usual locations:', error);
      }
      return [];
    }
  }

  /**
   * Get device history
   * @param {string} tenantId - Tenant ID
   * @param {string} userId - User ID
   * @returns {Array} Device history
   */
  async getDeviceHistory(tenantId, userId) {
    if (!tenantId || !userId) {
      return [];
    }

    const query = `
      SELECT fingerprint, user_agent, created_at, is_trusted
      FROM payment_devices
      WHERE tenant_id = $1 AND user_id = $2
        AND fingerprint IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 20
    `;

    try {
      const result = await this.db.query(query, [tenantId, userId]);
      return result.rows || [];
    } catch (error) {
      // Log error for debugging (in production, use proper logging service)
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Error fetching device history:', error);
      }
      return [];
    }
  }

  /**
   * Get payment history
   * @param {string} tenantId - Tenant ID
   * @param {string} userId - User ID
   * @param {number} days - Number of days
   * @returns {Array} Payment history
   */
  async getPaymentHistory(tenantId, userId, days) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return await this.getRecentTransactions(tenantId, userId, since);
  }

  /**
   * Check if email is blacklisted
   * @param {string} email - Email address
   * @returns {boolean} Is blacklisted
   */
  async isEmailBlacklisted(email) {
    if (!email || typeof email !== 'string') {
      return false;
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (!normalizedEmail.includes('@')) {
      return false;
    }

    const query = `
      SELECT 1 FROM fraud_blacklists 
      WHERE type = 'email' AND value = $1 AND active = true
      LIMIT 1
    `;

    try {
      const result = await this.db.query(query, [normalizedEmail]);
      return result.rows.length > 0;
    } catch (error) {
      // Log error for debugging (in production, use proper logging service)
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Error checking email blacklist:', error);
      }
      return false;
    }
  }

  /**
   * Check if IP is blacklisted
   * @param {string} ipAddress - IP address
   * @returns {boolean} Is blacklisted
   */
  async isIPBlacklisted(ipAddress) {
    if (!ipAddress || typeof ipAddress !== 'string') {
      return false;
    }

    // Basic IP validation
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipRegex.test(ipAddress.trim())) {
      return false;
    }

    const query = `
      SELECT 1 FROM fraud_blacklists 
      WHERE type = 'ip' AND value = $1 AND active = true
      LIMIT 1
    `;

    try {
      const result = await this.db.query(query, [ipAddress.trim()]);
      return result.rows.length > 0;
    } catch (error) {
      // Log error for debugging (in production, use proper logging service)
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Error checking IP blacklist:', error);
      }
      return false;
    }
  }

  /**
   * Check if card is blacklisted
   * @param {string} cardId - Card ID
   * @returns {boolean} Is blacklisted
   */
  async isCardBlacklisted(cardId) {
    if (!cardId || typeof cardId !== 'string') {
      return false;
    }

    const query = `
      SELECT 1 FROM fraud_blacklists 
      WHERE type = 'card' AND value = $1 AND active = true
      LIMIT 1
    `;

    try {
      const result = await this.db.query(query, [cardId.trim()]);
      return result.rows.length > 0;
    } catch (error) {
      // Log error for debugging (in production, use proper logging service)
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Error checking card blacklist:', error);
      }
      return false;
    }
  }

  /**
   * Calculate distance between two coordinates
   * @param {Object} coord1 - First coordinate
   * @param {Object} coord2 - Second coordinate
   * @returns {number} Distance in kilometers
   */
  calculateDistance(coord1, coord2) {
    // Input validation
    if (!coord1 || !coord2 || 
        typeof coord1.latitude !== 'number' || typeof coord1.longitude !== 'number' ||
        typeof coord2.latitude !== 'number' || typeof coord2.longitude !== 'number') {
      throw new Error('Invalid coordinates provided to calculateDistance');
    }

    // Validate coordinate ranges
    if (coord1.latitude < -90 || coord1.latitude > 90 ||
        coord1.longitude < -180 || coord1.longitude > 180 ||
        coord2.latitude < -90 || coord2.latitude > 90 ||
        coord2.longitude < -180 || coord2.longitude > 180) {
      throw new Error('Coordinates out of valid range');
    }

    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(coord2.latitude - coord1.latitude);
    const dLon = this.toRadians(coord2.longitude - coord1.longitude);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(coord1.latitude)) * Math.cos(this.toRadians(coord2.latitude)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   * @param {number} degrees - Degrees
   * @returns {number} Radians
   */
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Store fraud assessment
   * @param {Object} assessment - Assessment data
   */
  async storeAssessment(assessment) {
    if (!assessment || !assessment.id || !assessment.tenantId) {
      throw new Error('Invalid assessment data for storage');
    }

    const query = `
      INSERT INTO fraud_assessments (
        id, tenant_id, transaction_id, risk_score, risk_level,
        risk_factors, checks_data, processing_time_ms, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO UPDATE SET
        risk_score = EXCLUDED.risk_score,
        risk_level = EXCLUDED.risk_level,
        risk_factors = EXCLUDED.risk_factors,
        checks_data = EXCLUDED.checks_data,
        processing_time_ms = EXCLUDED.processing_time_ms,
        updated_at = CURRENT_TIMESTAMP
    `;

    try {
      await this.db.query(query, [
        assessment.id,
        assessment.tenantId,
        assessment.transactionId || null,
        assessment.riskScore,
        assessment.riskLevel,
        JSON.stringify(assessment.riskFactors || []),
        JSON.stringify(assessment.checks || []),
        assessment.processingTime
      ]);
    } catch (error) {
      // Log error for debugging (in production, use proper logging service)
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Error storing fraud assessment:', error);
      }
      throw new Error('Failed to store fraud assessment');
    }
  }

  /**
   * Log high-risk transaction
   * @param {Object} assessment - Assessment data
   */
  async logHighRiskTransaction(assessment) {
    if (!assessment || !assessment.id || !assessment.tenantId) {
      // Log error for debugging (in production, use proper logging service)
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Invalid assessment data for high-risk logging');
      }
      return;
    }

    const query = `
      INSERT INTO fraud_alerts (
        id, tenant_id, transaction_id, risk_score, risk_level,
        risk_factors, assessment_id, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
    `;

    try {
      await this.db.query(query, [
        uuidv4(),
        assessment.tenantId,
        assessment.transactionId || null,
        assessment.riskScore,
        assessment.riskLevel,
        JSON.stringify(assessment.riskFactors || []),
        assessment.id
      ]);
    } catch (error) {
      // Log error for debugging (in production, use proper logging service)
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Error logging high-risk transaction:', error);
      }
      // Don't throw here as this is a logging operation
    }
  }

  /**
   * Get fraud assessment history for a user
   * @param {string} tenantId - Tenant ID
   * @param {string} userId - User ID
   * @param {number} limit - Number of records to return
   * @returns {Array} Assessment history
   */
  async getAssessmentHistory(tenantId, userId, limit = 50) {
    if (!tenantId || !userId) {
      return [];
    }

    const query = `
      SELECT fa.id, fa.transaction_id, fa.risk_score, fa.risk_level,
             fa.risk_factors, fa.processing_time_ms, fa.created_at
      FROM fraud_assessments fa
      JOIN payment_transactions pt ON fa.transaction_id = pt.id
      WHERE fa.tenant_id = $1 AND pt.user_id = $2
      ORDER BY fa.created_at DESC
      LIMIT $3
    `;

    try {
      const result = await this.db.query(query, [tenantId, userId, limit]);
      return result.rows || [];
    } catch (error) {
      // Log error for debugging (in production, use proper logging service)
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Error fetching assessment history:', error);
      }
      return [];
    }
  }

  /**
   * Get fraud statistics for a tenant
   * @param {string} tenantId - Tenant ID
   * @param {number} days - Number of days to analyze
   * @returns {Object} Fraud statistics
   */
  async getFraudStatistics(tenantId, days = 30) {
    if (!tenantId) {
      return null;
    }

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const query = `
      SELECT 
        COUNT(*) as total_assessments,
        COUNT(CASE WHEN risk_level = 'critical' THEN 1 END) as critical_count,
        COUNT(CASE WHEN risk_level = 'high' THEN 1 END) as high_count,
        COUNT(CASE WHEN risk_level = 'medium' THEN 1 END) as medium_count,
        COUNT(CASE WHEN risk_level = 'low' THEN 1 END) as low_count,
        AVG(risk_score) as avg_risk_score,
        AVG(processing_time_ms) as avg_processing_time
      FROM fraud_assessments
      WHERE tenant_id = $1 AND created_at >= $2
    `;

    try {
      const result = await this.db.query(query, [tenantId, since]);
      return result.rows[0] || null;
    } catch (error) {
      // Log error for debugging (in production, use proper logging service)
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Error fetching fraud statistics:', error);
      }
      return null;
    }
  }

  /**
   * Update fraud detection rules
   * @param {Object} newRules - New rules configuration
   */
  updateRules(newRules) {
    if (!newRules || typeof newRules !== 'object') {
      throw new Error('Invalid rules configuration');
    }

    // Validate and merge rules
    if (newRules.velocity) {
      this.rules.velocity = { ...this.rules.velocity, ...newRules.velocity };
    }
    if (newRules.amount) {
      this.rules.amount = { ...this.rules.amount, ...newRules.amount };
    }
    if (newRules.time) {
      this.rules.time = { ...this.rules.time, ...newRules.time };
    }
    if (newRules.location) {
      this.rules.location = { ...this.rules.location, ...newRules.location };
    }
    if (newRules.device) {
      this.rules.device = { ...this.rules.device, ...newRules.device };
    }

    // Validate risk weights
    if (newRules.riskWeights) {
      const totalWeight = Object.values(newRules.riskWeights).reduce((sum, weight) => sum + weight, 0);
      if (Math.abs(totalWeight - 1.0) > 0.01) {
        throw new Error('Risk weights must sum to 1.0');
      }
      this.riskWeights = { ...this.riskWeights, ...newRules.riskWeights };
    }
  }

  /**
   * Get current fraud detection rules
   * @returns {Object} Current rules configuration
   */
  getRules() {
    return {
      rules: { ...this.rules },
      riskWeights: { ...this.riskWeights }
    };
  }
}

module.exports = FraudDetectionService;
