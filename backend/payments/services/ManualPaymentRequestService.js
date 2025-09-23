/**
 * Manual Payment Request Service
 * 
 * Handles business logic for manual payment requests including
 * validation, fraud detection, and request management.
 */

const { v4: uuidv4 } = require('uuid');

class ManualPaymentRequestService {
  constructor(db) {
    if (!db || typeof db.query !== 'function') {
      throw new Error('Invalid database connection: must have a query method');
    }
    this.db = db;
  }

  /**
   * Get all payment request types
   * @returns {Array} Payment request types
   */
  async getPaymentRequestTypes() {
    const query = `
      SELECT id, name, display_name, description, required_fields, 
             validation_rules, is_active, created_at, updated_at
      FROM payment_request_types
      WHERE is_active = true
      ORDER BY display_name
    `;

    try {
      const result = await this.db.query(query);
      return result.rows.map(row => ({
        ...row,
        required_fields: JSON.parse(row.required_fields || '[]'),
        validation_rules: JSON.parse(row.validation_rules || '{}')
      }));
    } catch (error) {
      console.error('Error fetching payment request types:', error);
      throw new Error('Failed to fetch payment request types');
    }
  }

  /**
   * Get a specific payment request type
   * @param {string} typeName - Type name
   * @returns {Object|null} Payment request type
   */
  async getPaymentRequestType(typeName) {
    const query = `
      SELECT id, name, display_name, description, required_fields, 
             validation_rules, is_active
      FROM payment_request_types
      WHERE name = $1 AND is_active = true
    `;

    try {
      const result = await this.db.query(query, [typeName]);
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        ...row,
        required_fields: JSON.parse(row.required_fields || '[]'),
        validation_rules: JSON.parse(row.validation_rules || '{}')
      };
    } catch (error) {
      console.error('Error fetching payment request type:', error);
      throw new Error('Failed to fetch payment request type');
    }
  }

  /**
   * Validate payment details against type requirements
   * @param {string} paymentType - Payment type
   * @param {Object} paymentDetails - Payment details to validate
   * @returns {Object} Validation result
   */
  async validatePaymentDetails(paymentType, paymentDetails) {
    try {
      const typeConfig = await this.getPaymentRequestType(paymentType);
      if (!typeConfig) {
        return {
          isValid: false,
          errors: ['Invalid payment type']
        };
      }

      const errors = [];
      const requiredFields = typeConfig.required_fields || [];
      const validationRules = typeConfig.validation_rules || {};

      // Check required fields
      for (const field of requiredFields) {
        if (!paymentDetails[field] || paymentDetails[field].toString().trim() === '') {
          errors.push(`Field '${field}' is required`);
        }
      }

      // Apply validation rules
      for (const [field, rules] of Object.entries(validationRules)) {
        if (paymentDetails[field]) {
          const fieldValue = paymentDetails[field].toString();
          
          if (rules.min_length && fieldValue.length < rules.min_length) {
            errors.push(`Field '${field}' must be at least ${rules.min_length} characters long`);
          }
          
          if (rules.max_length && fieldValue.length > rules.max_length) {
            errors.push(`Field '${field}' must be no more than ${rules.max_length} characters long`);
          }
          
          if (rules.pattern && !new RegExp(rules.pattern).test(fieldValue)) {
            errors.push(`Field '${field}' has invalid format`);
          }
        }
      }

      return {
        isValid: errors.length === 0,
        errors
      };

    } catch (error) {
      console.error('Error validating payment details:', error);
      return {
        isValid: false,
        errors: ['Validation error occurred']
      };
    }
  }

  /**
   * Create a new payment request
   * @param {Object} requestData - Payment request data
   * @returns {Object} Created payment request
   */
  async createPaymentRequest(requestData) {
    const {
      tenantId,
      userId,
      studentId,
      paymentType,
      amount,
      currency,
      description,
      paymentDetails,
      supportingDocuments,
      priority,
      fraudRiskScore,
      fraudRiskLevel,
      fraudFlags,
      ipAddress,
      userAgent
    } = requestData;

    const requestId = uuidv4();
    const query = `
      INSERT INTO manual_payment_requests (
        id, tenant_id, user_id, student_id, payment_type, amount, currency,
        description, payment_details, supporting_documents, priority,
        fraud_risk_score, fraud_risk_level, fraud_flags,
        ip_address, user_agent, status, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, CURRENT_TIMESTAMP
      ) RETURNING *
    `;

    try {
      const result = await this.db.query(query, [
        requestId,
        tenantId,
        userId,
        studentId || null,
        paymentType,
        amount,
        currency,
        description || null,
        JSON.stringify(paymentDetails),
        JSON.stringify(supportingDocuments),
        priority,
        fraudRiskScore || 0,
        fraudRiskLevel || 'low',
        JSON.stringify(fraudFlags || []),
        ipAddress,
        userAgent,
        'pending'
      ]);

      const request = result.rows[0];
      return {
        ...request,
        payment_details: JSON.parse(request.payment_details || '{}'),
        supporting_documents: JSON.parse(request.supporting_documents || '[]'),
        fraud_flags: JSON.parse(request.fraud_flags || '[]')
      };

    } catch (error) {
      console.error('Error creating payment request:', error);
      throw new Error('Failed to create payment request');
    }
  }

  /**
   * Get user's payment requests
   * @param {string} tenantId - Tenant ID
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Array} Payment requests
   */
  async getUserPaymentRequests(tenantId, userId, options = {}) {
    const { status, limit = 50, offset = 0 } = options;
    
    let query = `
      SELECT id, payment_type, amount, currency, description, status, priority,
             fraud_risk_score, fraud_risk_level, created_at, updated_at,
             approved_at, rejected_at, rejection_reason
      FROM manual_payment_requests
      WHERE tenant_id = $1 AND user_id = $2
    `;
    
    const queryParams = [tenantId, userId];
    let paramCount = 2;

    if (status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      queryParams.push(status);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(limit, offset);

    try {
      const result = await this.db.query(query, queryParams);
      return result.rows.map(row => ({
        ...row,
        amount: parseFloat(row.amount)
      }));
    } catch (error) {
      console.error('Error fetching user payment requests:', error);
      throw new Error('Failed to fetch payment requests');
    }
  }

  /**
   * Get payment request details
   * @param {string} requestId - Request ID
   * @param {string} tenantId - Tenant ID
   * @param {string} userId - User ID (for authorization)
   * @returns {Object|null} Payment request details
   */
  async getPaymentRequestDetails(requestId, tenantId, userId) {
    const query = `
      SELECT mpr.*, u.first_name, u.last_name, u.email,
             s.first_name as student_first_name, s.last_name as student_last_name,
             apr.first_name as approved_by_first_name, apr.last_name as approved_by_last_name,
             rej.first_name as rejected_by_first_name, rej.last_name as rejected_by_last_name
      FROM manual_payment_requests mpr
      LEFT JOIN users u ON mpr.user_id = u.id
      LEFT JOIN students s ON mpr.student_id = s.id
      LEFT JOIN users apr ON mpr.approved_by = apr.id
      LEFT JOIN users rej ON mpr.rejected_by = rej.id
      WHERE mpr.id = $1 AND mpr.tenant_id = $2 AND mpr.user_id = $3
    `;

    try {
      const result = await this.db.query(query, [requestId, tenantId, userId]);
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        ...row,
        amount: parseFloat(row.amount),
        payment_details: JSON.parse(row.payment_details || '{}'),
        supporting_documents: JSON.parse(row.supporting_documents || '[]'),
        fraud_flags: JSON.parse(row.fraud_flags || '[]'),
        user: {
          id: row.user_id,
          first_name: row.first_name,
          last_name: row.last_name,
          email: row.email
        },
        student: row.student_id ? {
          id: row.student_id,
          first_name: row.student_first_name,
          last_name: row.student_last_name
        } : null,
        approved_by: row.approved_by ? {
          id: row.approved_by,
          first_name: row.approved_by_first_name,
          last_name: row.approved_by_last_name
        } : null,
        rejected_by: row.rejected_by ? {
          id: row.rejected_by,
          first_name: row.rejected_by_first_name,
          last_name: row.rejected_by_last_name
        } : null
      };

    } catch (error) {
      console.error('Error fetching payment request details:', error);
      throw new Error('Failed to fetch payment request details');
    }
  }

  /**
   * Check for duplicate payment details
   * @param {string} tenantId - Tenant ID
   * @param {Object} paymentDetails - Payment details
   * @param {string} paymentType - Payment type
   * @returns {Object} Duplicate check result
   */
  async checkDuplicatePaymentDetails(tenantId, paymentDetails, paymentType) {
    try {
      // Check for duplicate account numbers, card numbers, wallet IDs, etc.
      const duplicateFields = [];
      let duplicateCount = 0;

      for (const [field, value] of Object.entries(paymentDetails)) {
        if (value && typeof value === 'string' && value.length > 4) {
          const query = `
            SELECT COUNT(*) as count
            FROM manual_payment_requests
            WHERE tenant_id = $1 
              AND payment_type = $2 
              AND payment_details->>$3 = $4
              AND created_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
          `;

          const result = await this.db.query(query, [tenantId, paymentType, field, value]);
          const count = parseInt(result.rows[0].count);

          if (count > 0) {
            duplicateFields.push({ field, value, count });
            duplicateCount += count;
          }
        }
      }

      return {
        isDuplicate: duplicateCount > 0,
        duplicateCount,
        duplicateFields,
        severity: duplicateCount > 5 ? 'high' : duplicateCount > 2 ? 'medium' : 'low'
      };

    } catch (error) {
      console.error('Error checking duplicate payment details:', error);
      return {
        isDuplicate: false,
        duplicateCount: 0,
        duplicateFields: [],
        severity: 'low',
        error: error.message
      };
    }
  }

  /**
   * Check for unusual payment amounts
   * @param {string} tenantId - Tenant ID
   * @param {string} userId - User ID
   * @param {number} amount - Payment amount
   * @param {string} currency - Currency
   * @returns {Object} Amount check result
   */
  async checkUnusualAmounts(tenantId, userId, amount, currency) {
    try {
      // Get user's payment history
      const query = `
        SELECT amount, created_at
        FROM manual_payment_requests
        WHERE tenant_id = $1 AND user_id = $2 AND currency = $3
          AND created_at > CURRENT_TIMESTAMP - INTERVAL '90 days'
        ORDER BY created_at DESC
        LIMIT 20
      `;

      const result = await this.db.query(query, [tenantId, userId, currency]);
      const historicalAmounts = result.rows.map(row => parseFloat(row.amount));

      if (historicalAmounts.length === 0) {
        // First payment - check against tenant averages
        return await this.checkAgainstTenantAverages(tenantId, amount, currency);
      }

      // Calculate statistics
      const avgAmount = historicalAmounts.reduce((sum, amt) => sum + amt, 0) / historicalAmounts.length;
      const maxAmount = Math.max(...historicalAmounts);
      const minAmount = Math.min(...historicalAmounts);

      // Check for unusual patterns
      const isUnusual = amount > avgAmount * 3 || amount > maxAmount * 2 || amount < minAmount * 0.1;

      return {
        isUnusual,
        currentAmount: amount,
        averageAmount: avgAmount,
        maxAmount,
        minAmount,
        paymentCount: historicalAmounts.length,
        deviation: Math.abs(amount - avgAmount) / avgAmount
      };

    } catch (error) {
      console.error('Error checking unusual amounts:', error);
      return {
        isUnusual: false,
        error: error.message
      };
    }
  }

  /**
   * Check payment amount against tenant averages
   * @param {string} tenantId - Tenant ID
   * @param {number} amount - Payment amount
   * @param {string} currency - Currency
   * @returns {Object} Tenant average check result
   */
  async checkAgainstTenantAverages(tenantId, amount, currency) {
    try {
      const query = `
        SELECT AVG(amount) as avg_amount, MAX(amount) as max_amount, COUNT(*) as payment_count
        FROM manual_payment_requests
        WHERE tenant_id = $1 AND currency = $2
          AND created_at > CURRENT_TIMESTAMP - INTERVAL '90 days'
      `;

      const result = await this.db.query(query, [tenantId, currency]);
      const row = result.rows[0];

      if (!row || row.payment_count === '0') {
        return {
          isUnusual: false,
          currentAmount: amount,
          averageAmount: null,
          maxAmount: null,
          paymentCount: 0
        };
      }

      const avgAmount = parseFloat(row.avg_amount);
      const maxAmount = parseFloat(row.max_amount);
      const paymentCount = parseInt(row.payment_count);

      const isUnusual = amount > avgAmount * 2 || amount > maxAmount * 1.5;

      return {
        isUnusual,
        currentAmount: amount,
        averageAmount: avgAmount,
        maxAmount,
        paymentCount,
        deviation: avgAmount > 0 ? Math.abs(amount - avgAmount) / avgAmount : 0
      };

    } catch (error) {
      console.error('Error checking tenant averages:', error);
      return {
        isUnusual: false,
        error: error.message
      };
    }
  }

  /**
   * Check for blacklisted payment details
   * @param {Object} paymentDetails - Payment details
   * @param {string} paymentType - Payment type
   * @returns {Object} Blacklist check result
   */
  async checkBlacklistedDetails(paymentDetails, paymentType) {
    try {
      const blacklistedFields = [];
      let isBlacklisted = false;

      for (const [field, value] of Object.entries(paymentDetails)) {
        if (value && typeof value === 'string') {
          const query = `
            SELECT id, reason, source
            FROM fraud_blacklists
            WHERE type = $1 AND value = $2 AND active = true
            LIMIT 1
          `;

          // Map payment fields to blacklist types
          let blacklistType = 'other';
          if (field.includes('email')) blacklistType = 'email';
          else if (field.includes('card')) blacklistType = 'card';
          else if (field.includes('account') || field.includes('iban')) blacklistType = 'account';
          else if (field.includes('phone')) blacklistType = 'phone';

          const result = await this.db.query(query, [blacklistType, value.toLowerCase()]);
          
          if (result.rows.length > 0) {
            blacklistedFields.push({
              field,
              value: value.substring(0, 4) + '***', // Masked value
              reason: result.rows[0].reason,
              source: result.rows[0].source
            });
            isBlacklisted = true;
          }
        }
      }

      return {
        isBlacklisted,
        blacklistedFields,
        severity: isBlacklisted ? 'high' : 'low'
      };

    } catch (error) {
      console.error('Error checking blacklisted details:', error);
      return {
        isBlacklisted: false,
        blacklistedFields: [],
        severity: 'low',
        error: error.message
      };
    }
  }

  /**
   * Upload supporting document
   * @param {Object} documentData - Document data
   * @returns {Object} Uploaded document
   */
  async uploadDocument(documentData) {
    const {
      paymentRequestId,
      tenantId,
      userId,
      documentType,
      fileName,
      filePath,
      fileSize,
      mimeType
    } = documentData;

    const documentId = uuidv4();
    const query = `
      INSERT INTO payment_request_documents (
        id, tenant_id, payment_request_id, document_type, file_name,
        file_path, file_size, mime_type, uploaded_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    try {
      const result = await this.db.query(query, [
        documentId,
        tenantId,
        paymentRequestId,
        documentType,
        fileName,
        filePath,
        fileSize,
        mimeType,
        userId
      ]);

      return result.rows[0];

    } catch (error) {
      console.error('Error uploading document:', error);
      throw new Error('Failed to upload document');
    }
  }

  /**
   * Get payment request statistics
   * @param {string} tenantId - Tenant ID
   * @param {string} period - Time period
   * @returns {Object} Statistics
   */
  async getPaymentRequestStats(tenantId, period) {
    try {
      const days = this.parsePeriod(period);
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const query = `
        SELECT 
          COUNT(*) as total_requests,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_requests,
          COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_requests,
          COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_requests,
          COUNT(CASE WHEN fraud_risk_level = 'high' OR fraud_risk_level = 'critical' THEN 1 END) as high_risk_requests,
          AVG(amount) as avg_amount,
          SUM(amount) as total_amount,
          COUNT(CASE WHEN payment_type = 'bank_transfer' THEN 1 END) as bank_transfers,
          COUNT(CASE WHEN payment_type = 'card_payment' THEN 1 END) as card_payments,
          COUNT(CASE WHEN payment_type = 'e_wallet' THEN 1 END) as e_wallets,
          COUNT(CASE WHEN payment_type = 'cryptocurrency' THEN 1 END) as crypto_payments
        FROM manual_payment_requests
        WHERE tenant_id = $1 AND created_at >= $2
      `;

      const result = await this.db.query(query, [tenantId, since]);
      const stats = result.rows[0];

      return {
        period: `${days} days`,
        total_requests: parseInt(stats.total_requests),
        pending_requests: parseInt(stats.pending_requests),
        approved_requests: parseInt(stats.approved_requests),
        rejected_requests: parseInt(stats.rejected_requests),
        high_risk_requests: parseInt(stats.high_risk_requests),
        avg_amount: parseFloat(stats.avg_amount || 0),
        total_amount: parseFloat(stats.total_amount || 0),
        payment_type_breakdown: {
          bank_transfers: parseInt(stats.bank_transfers),
          card_payments: parseInt(stats.card_payments),
          e_wallets: parseInt(stats.e_wallets),
          crypto_payments: parseInt(stats.crypto_payments)
        }
      };

    } catch (error) {
      console.error('Error fetching payment request stats:', error);
      throw new Error('Failed to fetch payment request statistics');
    }
  }

  /**
   * Parse period string to days
   * @param {string} period - Period string (e.g., '7d', '30d', '90d')
   * @returns {number} Number of days
   */
  parsePeriod(period) {
    const match = period.match(/^(\d+)([dwmy])$/);
    if (!match) return 30; // Default to 30 days

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'd': return value;
      case 'w': return value * 7;
      case 'm': return value * 30;
      case 'y': return value * 365;
      default: return 30;
    }
  }
}

module.exports = ManualPaymentRequestService;
