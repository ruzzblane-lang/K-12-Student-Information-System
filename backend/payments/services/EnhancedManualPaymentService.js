/**
 * Enhanced Manual Payment Service
 * 
 * Manages manual payment approval flows, school-side approval tickets,
 * secure review processes, and comprehensive audit trails.
 */

const { v4: uuidv4 } = require('uuid');
const AuditTrailService = require('./AuditTrailService');
const ComplianceAutomationService = require('./ComplianceAutomationService');
const NotificationService = require('./NotificationService');

class EnhancedManualPaymentService {
  constructor(db, config = {}) {
    this.db = db;
    this.config = config;
    
    // Initialize services
    this.auditTrail = new AuditTrailService(db, config);
    this.complianceService = new ComplianceAutomationService(db, config);
    this.notificationService = new NotificationService(db, config);
    
    // Payment request statuses
    this.statuses = {
      PENDING: 'pending',
      UNDER_REVIEW: 'under_review',
      APPROVED: 'approved',
      REJECTED: 'rejected',
      CANCELLED: 'cancelled',
      EXPIRED: 'expired',
      PROCESSING: 'processing',
      COMPLETED: 'completed',
      FAILED: 'failed'
    };
    
    // Approval ticket statuses
    this.ticketStatuses = {
      OPEN: 'open',
      ASSIGNED: 'assigned',
      IN_PROGRESS: 'in_progress',
      PENDING_APPROVAL: 'pending_approval',
      APPROVED: 'approved',
      REJECTED: 'rejected',
      ESCALATED: 'escalated',
      RESOLVED: 'resolved',
      CLOSED: 'closed'
    };
    
    // Priority levels
    this.priorities = {
      LOW: 'low',
      NORMAL: 'normal',
      HIGH: 'high',
      URGENT: 'urgent',
      CRITICAL: 'critical'
    };
    
    // Escalation levels
    this.escalationLevels = {
      LEVEL_1: 1, // Initial reviewer
      LEVEL_2: 2, // Supervisor
      LEVEL_3: 3, // Manager
      LEVEL_4: 4, // Director
      LEVEL_5: 5  // Executive
    };
  }

  /**
   * Submit a manual payment request
   * @param {Object} requestData - Payment request data
   * @returns {Object} Created payment request
   */
  async submitPaymentRequest(requestData) {
    try {
      const requestId = uuidv4();
      const request = {
        id: requestId,
        tenantId: requestData.tenantId,
        userId: requestData.userId,
        studentId: requestData.studentId,
        paymentType: requestData.paymentType,
        amount: requestData.amount,
        currency: requestData.currency || 'USD',
        description: requestData.description,
        paymentDetails: requestData.paymentDetails || {},
        supportingDocuments: requestData.supportingDocuments || [],
        status: this.statuses.PENDING,
        priority: this.determinePriority(requestData),
        fraudRiskScore: 0,
        fraudRiskLevel: 'low',
        fraudFlags: [],
        adminNotes: '',
        createdBy: requestData.userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Validate request data
      this.validatePaymentRequest(request);

      // Perform fraud assessment
      const fraudAssessment = await this.performFraudAssessment(request);
      request.fraudRiskScore = fraudAssessment.riskScore;
      request.fraudRiskLevel = fraudAssessment.riskLevel;
      request.fraudFlags = fraudAssessment.riskFactors;

      // Apply compliance checks
      const complianceResult = await this.complianceService.validatePaymentCompliance(request, {
        tenantId: request.tenantId
      });

      if (!complianceResult.passed) {
        throw new Error(`Compliance validation failed: ${complianceResult.violations.map(v => v.message).join(', ')}`);
      }

      // Store payment request
      await this.storePaymentRequest(request);

      // Create approval ticket
      const ticket = await this.createApprovalTicket(request);

      // Send notifications
      await this.sendRequestNotifications(request, ticket);

      // Log audit event
      await this.auditTrail.logPaymentEvent('payment_request_submitted', request, null, {
        tenantId: request.tenantId,
        userId: request.userId,
        ticketId: ticket.id
      });

      return {
        success: true,
        requestId: request.id,
        ticketId: ticket.id,
        status: request.status,
        fraudAssessment,
        complianceResult
      };

    } catch (error) {
      console.error('Failed to submit payment request:', error);
      throw error;
    }
  }

  /**
   * Create approval ticket for payment request
   * @param {Object} request - Payment request
   * @returns {Object} Created approval ticket
   */
  async createApprovalTicket(request) {
    try {
      const ticketId = uuidv4();
      
      // Determine initial assignment based on rules
      const assignment = await this.determineInitialAssignment(request);
      
      const ticket = {
        id: ticketId,
        tenantId: request.tenantId,
        paymentRequestId: request.id,
        assignedTo: assignment.assignedTo,
        priority: request.priority,
        status: this.ticketStatuses.OPEN,
        dueDate: this.calculateDueDate(request.priority),
        escalationLevel: this.escalationLevels.LEVEL_1,
        notes: '',
        resolutionNotes: '',
        createdBy: request.userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Store approval ticket
      await this.storeApprovalTicket(ticket);

      // Log workflow event
      await this.logWorkflowEvent(request.id, ticket.id, 'ticket_created', request.userId, {
        assignedTo: assignment.assignedTo,
        priority: ticket.priority,
        dueDate: ticket.dueDate
      });

      return ticket;

    } catch (error) {
      console.error('Failed to create approval ticket:', error);
      throw error;
    }
  }

  /**
   * Assign ticket to reviewer
   * @param {string} ticketId - Ticket ID
   * @param {string} assignedTo - User ID to assign to
   * @param {string} assignedBy - User ID who assigned
   * @param {string} notes - Assignment notes
   * @returns {Object} Updated ticket
   */
  async assignTicket(ticketId, assignedTo, assignedBy, notes = '') {
    try {
      // Get current ticket
      const ticket = await this.getApprovalTicket(ticketId);
      
      // Update ticket
      const updatedTicket = {
        ...ticket,
        assignedTo,
        status: this.ticketStatuses.ASSIGNED,
        notes: notes,
        updatedAt: new Date().toISOString()
      };

      await this.updateApprovalTicket(updatedTicket);

      // Log workflow event
      await this.logWorkflowEvent(ticket.paymentRequestId, ticketId, 'ticket_assigned', assignedBy, {
        assignedTo,
        previousAssignee: ticket.assignedTo,
        notes
      });

      // Send notification to new assignee
      await this.notificationService.sendTicketAssignmentNotification(assignedTo, ticket);

      return updatedTicket;

    } catch (error) {
      console.error('Failed to assign ticket:', error);
      throw error;
    }
  }

  /**
   * Start ticket review
   * @param {string} ticketId - Ticket ID
   * @param {string} reviewerId - Reviewer user ID
   * @param {string} notes - Review notes
   * @returns {Object} Updated ticket
   */
  async startTicketReview(ticketId, reviewerId, notes = '') {
    try {
      // Get current ticket
      const ticket = await this.getApprovalTicket(ticketId);
      
      // Update ticket
      const updatedTicket = {
        ...ticket,
        status: this.ticketStatuses.IN_PROGRESS,
        notes: notes,
        updatedAt: new Date().toISOString()
      };

      await this.updateApprovalTicket(updatedTicket);

      // Log workflow event
      await this.logWorkflowEvent(ticket.paymentRequestId, ticketId, 'review_started', reviewerId, {
        notes
      });

      return updatedTicket;

    } catch (error) {
      console.error('Failed to start ticket review:', error);
      throw error;
    }
  }

  /**
   * Approve payment request
   * @param {string} requestId - Payment request ID
   * @param {string} approverId - Approver user ID
   * @param {string} approvalNotes - Approval notes
   * @param {Object} conditions - Approval conditions
   * @returns {Object} Approval result
   */
  async approvePaymentRequest(requestId, approverId, approvalNotes = '', conditions = {}) {
    try {
      // Get payment request
      const request = await this.getPaymentRequest(requestId);
      
      // Get approval ticket
      const ticket = await this.getApprovalTicketByRequestId(requestId);

      // Validate approval authority
      await this.validateApprovalAuthority(approverId, request, ticket);

      // Update payment request
      const updatedRequest = {
        ...request,
        status: this.statuses.APPROVED,
        approvedBy: approverId,
        approvedAt: new Date().toISOString(),
        adminNotes: approvalNotes,
        updatedAt: new Date().toISOString()
      };

      await this.updatePaymentRequest(updatedRequest);

      // Update approval ticket
      const updatedTicket = {
        ...ticket,
        status: this.ticketStatuses.APPROVED,
        resolutionNotes: approvalNotes,
        resolvedBy: approverId,
        resolvedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await this.updateApprovalTicket(updatedTicket);

      // Log workflow event
      await this.logWorkflowEvent(requestId, ticket.id, 'payment_approved', approverId, {
        approvalNotes,
        conditions
      });

      // Send notifications
      await this.sendApprovalNotifications(updatedRequest, updatedTicket);

      // Log audit event
      await this.auditTrail.logPaymentEvent('payment_request_approved', updatedRequest, null, {
        tenantId: request.tenantId,
        approverId,
        approvalNotes
      });

      return {
        success: true,
        requestId,
        status: updatedRequest.status,
        approvedBy: approverId,
        approvedAt: updatedRequest.approvedAt
      };

    } catch (error) {
      console.error('Failed to approve payment request:', error);
      throw error;
    }
  }

  /**
   * Reject payment request
   * @param {string} requestId - Payment request ID
   * @param {string} rejectorId - Rejector user ID
   * @param {string} rejectionReason - Rejection reason
   * @param {Object} conditions - Rejection conditions
   * @returns {Object} Rejection result
   */
  async rejectPaymentRequest(requestId, rejectorId, rejectionReason, conditions = {}) {
    try {
      // Get payment request
      const request = await this.getPaymentRequest(requestId);
      
      // Get approval ticket
      const ticket = await this.getApprovalTicketByRequestId(requestId);

      // Validate rejection authority
      await this.validateApprovalAuthority(rejectorId, request, ticket);

      // Update payment request
      const updatedRequest = {
        ...request,
        status: this.statuses.REJECTED,
        rejectedBy: rejectorId,
        rejectedAt: new Date().toISOString(),
        rejectionReason: rejectionReason,
        updatedAt: new Date().toISOString()
      };

      await this.updatePaymentRequest(updatedRequest);

      // Update approval ticket
      const updatedTicket = {
        ...ticket,
        status: this.ticketStatuses.REJECTED,
        resolutionNotes: rejectionReason,
        resolvedBy: rejectorId,
        resolvedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await this.updateApprovalTicket(updatedTicket);

      // Log workflow event
      await this.logWorkflowEvent(requestId, ticket.id, 'payment_rejected', rejectorId, {
        rejectionReason,
        conditions
      });

      // Send notifications
      await this.sendRejectionNotifications(updatedRequest, updatedTicket);

      // Log audit event
      await this.auditTrail.logPaymentEvent('payment_request_rejected', updatedRequest, null, {
        tenantId: request.tenantId,
        rejectorId,
        rejectionReason
      });

      return {
        success: true,
        requestId,
        status: updatedRequest.status,
        rejectedBy: rejectorId,
        rejectedAt: updatedRequest.rejectedAt
      };

    } catch (error) {
      console.error('Failed to reject payment request:', error);
      throw error;
    }
  }

  /**
   * Escalate payment request
   * @param {string} requestId - Payment request ID
   * @param {string} escalatorId - User ID who escalated
   * @param {string} escalationReason - Escalation reason
   * @param {number} targetLevel - Target escalation level
   * @returns {Object} Escalation result
   */
  async escalatePaymentRequest(requestId, escalatorId, escalationReason, targetLevel) {
    try {
      // Get payment request
      const request = await this.getPaymentRequest(requestId);
      
      // Get approval ticket
      const ticket = await this.getApprovalTicketByRequestId(requestId);

      // Validate escalation
      if (targetLevel <= ticket.escalationLevel) {
        throw new Error('Target escalation level must be higher than current level');
      }

      // Determine new assignee based on escalation level
      const newAssignee = await this.determineEscalationAssignee(request.tenantId, targetLevel);

      // Update approval ticket
      const updatedTicket = {
        ...ticket,
        assignedTo: newAssignee,
        escalationLevel: targetLevel,
        status: this.ticketStatuses.ESCALATED,
        notes: escalationReason,
        updatedAt: new Date().toISOString()
      };

      await this.updateApprovalTicket(updatedTicket);

      // Log workflow event
      await this.logWorkflowEvent(requestId, ticket.id, 'payment_escalated', escalatorId, {
        escalationReason,
        fromLevel: ticket.escalationLevel,
        toLevel: targetLevel,
        newAssignee
      });

      // Send escalation notifications
      await this.sendEscalationNotifications(request, updatedTicket, escalatorId);

      // Log audit event
      await this.auditTrail.logPaymentEvent('payment_request_escalated', request, null, {
        tenantId: request.tenantId,
        escalatorId,
        escalationReason,
        targetLevel
      });

      return {
        success: true,
        requestId,
        ticketId: ticket.id,
        escalationLevel: targetLevel,
        newAssignee
      };

    } catch (error) {
      console.error('Failed to escalate payment request:', error);
      throw error;
    }
  }

  /**
   * Get payment request by ID
   * @param {string} requestId - Request ID
   * @returns {Object} Payment request
   */
  async getPaymentRequest(requestId) {
    try {
      const query = `
        SELECT * FROM manual_payment_requests 
        WHERE id = $1
      `;

      const result = await this.db.query(query, [requestId]);
      
      if (result.rows.length === 0) {
        throw new Error('Payment request not found');
      }

      return result.rows[0];

    } catch (error) {
      console.error('Failed to get payment request:', error);
      throw error;
    }
  }

  /**
   * Get payment requests for tenant
   * @param {string} tenantId - Tenant ID
   * @param {Object} filters - Filter options
   * @returns {Array} List of payment requests
   */
  async getPaymentRequests(tenantId, filters = {}) {
    try {
      let query = `
        SELECT mpr.*, 
               u.first_name, u.last_name, u.email as user_email,
               s.first_name as student_first_name, s.last_name as student_last_name
        FROM manual_payment_requests mpr
        LEFT JOIN users u ON mpr.user_id = u.id
        LEFT JOIN students s ON mpr.student_id = s.id
        WHERE mpr.tenant_id = $1
      `;
      const params = [tenantId];
      let paramIndex = 2;

      // Apply filters
      if (filters.status) {
        query += ` AND mpr.status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }

      if (filters.paymentType) {
        query += ` AND mpr.payment_type = $${paramIndex}`;
        params.push(filters.paymentType);
        paramIndex++;
      }

      if (filters.priority) {
        query += ` AND mpr.priority = $${paramIndex}`;
        params.push(filters.priority);
        paramIndex++;
      }

      if (filters.fraudRiskLevel) {
        query += ` AND mpr.fraud_risk_level = $${paramIndex}`;
        params.push(filters.fraudRiskLevel);
        paramIndex++;
      }

      if (filters.userId) {
        query += ` AND mpr.user_id = $${paramIndex}`;
        params.push(filters.userId);
        paramIndex++;
      }

      if (filters.studentId) {
        query += ` AND mpr.student_id = $${paramIndex}`;
        params.push(filters.studentId);
        paramIndex++;
      }

      if (filters.dateFrom) {
        query += ` AND mpr.created_at >= $${paramIndex}`;
        params.push(filters.dateFrom);
        paramIndex++;
      }

      if (filters.dateTo) {
        query += ` AND mpr.created_at <= $${paramIndex}`;
        params.push(filters.dateTo);
        paramIndex++;
      }

      // Add ordering and pagination
      query += ` ORDER BY mpr.created_at DESC`;
      
      if (filters.limit) {
        query += ` LIMIT $${paramIndex}`;
        params.push(filters.limit);
        paramIndex++;
      }

      if (filters.offset) {
        query += ` OFFSET $${paramIndex}`;
        params.push(filters.offset);
      }

      const result = await this.db.query(query, params);
      return result.rows;

    } catch (error) {
      console.error('Failed to get payment requests:', error);
      throw error;
    }
  }

  /**
   * Get approval ticket by ID
   * @param {string} ticketId - Ticket ID
   * @returns {Object} Approval ticket
   */
  async getApprovalTicket(ticketId) {
    try {
      const query = `
        SELECT * FROM payment_approval_tickets 
        WHERE id = $1
      `;

      const result = await this.db.query(query, [ticketId]);
      
      if (result.rows.length === 0) {
        throw new Error('Approval ticket not found');
      }

      return result.rows[0];

    } catch (error) {
      console.error('Failed to get approval ticket:', error);
      throw error;
    }
  }

  /**
   * Get approval ticket by payment request ID
   * @param {string} requestId - Payment request ID
   * @returns {Object} Approval ticket
   */
  async getApprovalTicketByRequestId(requestId) {
    try {
      const query = `
        SELECT * FROM payment_approval_tickets 
        WHERE payment_request_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `;

      const result = await this.db.query(query, [requestId]);
      
      if (result.rows.length === 0) {
        throw new Error('Approval ticket not found');
      }

      return result.rows[0];

    } catch (error) {
      console.error('Failed to get approval ticket by request ID:', error);
      throw error;
    }
  }

  /**
   * Get approval tickets for tenant
   * @param {string} tenantId - Tenant ID
   * @param {Object} filters - Filter options
   * @returns {Array} List of approval tickets
   */
  async getApprovalTickets(tenantId, filters = {}) {
    try {
      let query = `
        SELECT pat.*, 
               mpr.amount, mpr.currency, mpr.payment_type, mpr.description,
               u.first_name, u.last_name, u.email as user_email,
               assigned_user.first_name as assigned_first_name, 
               assigned_user.last_name as assigned_last_name,
               assigned_user.email as assigned_email
        FROM payment_approval_tickets pat
        JOIN manual_payment_requests mpr ON pat.payment_request_id = mpr.id
        LEFT JOIN users u ON mpr.user_id = u.id
        LEFT JOIN users assigned_user ON pat.assigned_to = assigned_user.id
        WHERE pat.tenant_id = $1
      `;
      const params = [tenantId];
      let paramIndex = 2;

      // Apply filters
      if (filters.status) {
        query += ` AND pat.status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }

      if (filters.priority) {
        query += ` AND pat.priority = $${paramIndex}`;
        params.push(filters.priority);
        paramIndex++;
      }

      if (filters.assignedTo) {
        query += ` AND pat.assigned_to = $${paramIndex}`;
        params.push(filters.assignedTo);
        paramIndex++;
      }

      if (filters.escalationLevel) {
        query += ` AND pat.escalation_level = $${paramIndex}`;
        params.push(filters.escalationLevel);
        paramIndex++;
      }

      if (filters.overdue) {
        query += ` AND pat.due_date < NOW() AND pat.status NOT IN ('resolved', 'closed')`;
      }

      // Add ordering and pagination
      query += ` ORDER BY pat.created_at DESC`;
      
      if (filters.limit) {
        query += ` LIMIT $${paramIndex}`;
        params.push(filters.limit);
        paramIndex++;
      }

      if (filters.offset) {
        query += ` OFFSET $${paramIndex}`;
        params.push(filters.offset);
      }

      const result = await this.db.query(query, params);
      return result.rows;

    } catch (error) {
      console.error('Failed to get approval tickets:', error);
      throw error;
    }
  }

  /**
   * Get workflow logs for payment request
   * @param {string} requestId - Payment request ID
   * @returns {Array} List of workflow logs
   */
  async getWorkflowLogs(requestId) {
    try {
      const query = `
        SELECT pawl.*, 
               u.first_name, u.last_name, u.email
        FROM payment_approval_workflow_logs pawl
        LEFT JOIN users u ON pawl.performed_by = u.id
        WHERE pawl.payment_request_id = $1
        ORDER BY pawl.created_at ASC
      `;

      const result = await this.db.query(query, [requestId]);
      return result.rows;

    } catch (error) {
      console.error('Failed to get workflow logs:', error);
      throw error;
    }
  }

  /**
   * Get system statistics
   * @param {string} tenantId - Tenant ID (optional)
   * @param {string} period - Time period
   * @returns {Object} Statistics
   */
  async getStatistics(tenantId, period = '30d') {
    try {
      const whereClause = tenantId ? 'WHERE tenant_id = $1' : '';
      const params = tenantId ? [tenantId] : [];

      // Payment request statistics
      const requestQuery = `
        SELECT 
          COUNT(*) as total_requests,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_requests,
          COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_requests,
          COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_requests,
          COUNT(CASE WHEN fraud_risk_level = 'high' THEN 1 END) as high_risk_requests,
          AVG(amount) as average_amount,
          SUM(amount) as total_amount
        FROM manual_payment_requests 
        ${whereClause}
        AND created_at >= NOW() - INTERVAL '${period}'
      `;

      const requestResult = await this.db.query(requestQuery, params);
      const requestStats = requestResult.rows[0];

      // Approval ticket statistics
      const ticketQuery = `
        SELECT 
          COUNT(*) as total_tickets,
          COUNT(CASE WHEN status = 'open' THEN 1 END) as open_tickets,
          COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_tickets,
          COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_tickets,
          AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) as avg_resolution_time_hours
        FROM payment_approval_tickets 
        ${whereClause}
        AND created_at >= NOW() - INTERVAL '${period}'
      `;

      const ticketResult = await this.db.query(ticketQuery, params);
      const ticketStats = ticketResult.rows[0];

      return {
        requests: {
          total: parseInt(requestStats.total_requests),
          pending: parseInt(requestStats.pending_requests),
          approved: parseInt(requestStats.approved_requests),
          rejected: parseInt(requestStats.rejected_requests),
          highRisk: parseInt(requestStats.high_risk_requests),
          averageAmount: parseFloat(requestStats.average_amount) || 0,
          totalAmount: parseFloat(requestStats.total_amount) || 0
        },
        tickets: {
          total: parseInt(ticketStats.total_tickets),
          open: parseInt(ticketStats.open_tickets),
          inProgress: parseInt(ticketStats.in_progress_tickets),
          resolved: parseInt(ticketStats.resolved_tickets),
          avgResolutionTimeHours: parseFloat(ticketStats.avg_resolution_time_hours) || 0
        },
        period: period,
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      console.error('Failed to get manual payment statistics:', error);
      return {
        requests: { total: 0, pending: 0, approved: 0, rejected: 0, highRisk: 0, averageAmount: 0, totalAmount: 0 },
        tickets: { total: 0, open: 0, inProgress: 0, resolved: 0, avgResolutionTimeHours: 0 },
        period: period,
        lastUpdated: new Date().toISOString(),
        error: error.message
      };
    }
  }

  // Helper methods
  validatePaymentRequest(request) {
    if (!request.tenantId) {
      throw new Error('Tenant ID is required');
    }
    
    if (!request.userId) {
      throw new Error('User ID is required');
    }
    
    if (!request.paymentType) {
      throw new Error('Payment type is required');
    }
    
    if (!request.amount || request.amount <= 0) {
      throw new Error('Valid amount is required');
    }
    
    if (!request.currency) {
      throw new Error('Currency is required');
    }
  }

  determinePriority(requestData) {
    // Determine priority based on amount, type, and other factors
    if (requestData.amount > 10000) {
      return this.priorities.HIGH;
    } else if (requestData.amount > 5000) {
      return this.priorities.NORMAL;
    } else {
      return this.priorities.LOW;
    }
  }

  async performFraudAssessment(request) {
    // Basic fraud assessment logic
    let riskScore = 0;
    const riskFactors = [];

    // Amount-based risk
    if (request.amount > 10000) {
      riskScore += 30;
      riskFactors.push('high_amount');
    }

    // Time-based risk (late night submissions)
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) {
      riskScore += 15;
      riskFactors.push('unusual_time');
    }

    // Determine risk level
    let riskLevel = 'low';
    if (riskScore >= 50) riskLevel = 'high';
    else if (riskScore >= 25) riskLevel = 'medium';

    return {
      riskScore,
      riskLevel,
      riskFactors
    };
  }

  async determineInitialAssignment(request) {
    // Determine initial assignment based on rules
    // This would typically query escalation rules and user roles
    return {
      assignedTo: null, // Would be determined by business rules
      assignmentReason: 'automatic_assignment'
    };
  }

  calculateDueDate(priority) {
    const now = new Date();
    const hours = {
      [this.priorities.LOW]: 72,
      [this.priorities.NORMAL]: 48,
      [this.priorities.HIGH]: 24,
      [this.priorities.URGENT]: 12,
      [this.priorities.CRITICAL]: 4
    };

    const dueDate = new Date(now.getTime() + (hours[priority] || 48) * 60 * 60 * 1000);
    return dueDate.toISOString();
  }

  async determineEscalationAssignee(tenantId, level) {
    // Determine assignee based on escalation level
    // This would typically query user roles and escalation rules
    return null; // Would be determined by business rules
  }

  async validateApprovalAuthority(userId, request, ticket) {
    // Validate that the user has authority to approve/reject this request
    // This would typically check user roles and permissions
    return true;
  }

  async storePaymentRequest(request) {
    const query = `
      INSERT INTO manual_payment_requests (
        id, tenant_id, user_id, student_id, payment_type, amount, currency,
        description, payment_details, supporting_documents, status, priority,
        fraud_risk_score, fraud_risk_level, fraud_flags, admin_notes,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
    `;

    await this.db.query(query, [
      request.id,
      request.tenantId,
      request.userId,
      request.studentId,
      request.paymentType,
      request.amount,
      request.currency,
      request.description,
      JSON.stringify(request.paymentDetails),
      JSON.stringify(request.supportingDocuments),
      request.status,
      request.priority,
      request.fraudRiskScore,
      request.fraudRiskLevel,
      JSON.stringify(request.fraudFlags),
      request.adminNotes,
      request.createdAt,
      request.updatedAt
    ]);
  }

  async updatePaymentRequest(request) {
    const query = `
      UPDATE manual_payment_requests 
      SET status = $1, approved_by = $2, approved_at = $3, rejected_by = $4, 
          rejected_at = $5, rejection_reason = $6, admin_notes = $7, updated_at = $8
      WHERE id = $9
    `;

    await this.db.query(query, [
      request.status,
      request.approvedBy || null,
      request.approvedAt || null,
      request.rejectedBy || null,
      request.rejectedAt || null,
      request.rejectionReason || null,
      request.adminNotes,
      request.updatedAt,
      request.id
    ]);
  }

  async storeApprovalTicket(ticket) {
    const query = `
      INSERT INTO payment_approval_tickets (
        id, tenant_id, payment_request_id, assigned_to, priority, status,
        due_date, escalation_level, notes, resolution_notes, resolved_by,
        resolved_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `;

    await this.db.query(query, [
      ticket.id,
      ticket.tenantId,
      ticket.paymentRequestId,
      ticket.assignedTo,
      ticket.priority,
      ticket.status,
      ticket.dueDate,
      ticket.escalationLevel,
      ticket.notes,
      ticket.resolutionNotes,
      ticket.resolvedBy,
      ticket.resolvedAt,
      ticket.createdAt,
      ticket.updatedAt
    ]);
  }

  async updateApprovalTicket(ticket) {
    const query = `
      UPDATE payment_approval_tickets 
      SET assigned_to = $1, status = $2, notes = $3, resolution_notes = $4,
          resolved_by = $5, resolved_at = $6, escalation_level = $7, updated_at = $8
      WHERE id = $9
    `;

    await this.db.query(query, [
      ticket.assignedTo,
      ticket.status,
      ticket.notes,
      ticket.resolutionNotes,
      ticket.resolvedBy,
      ticket.resolvedAt,
      ticket.escalationLevel,
      ticket.updatedAt,
      ticket.id
    ]);
  }

  async logWorkflowEvent(requestId, ticketId, action, performedBy, metadata = {}) {
    const query = `
      INSERT INTO payment_approval_workflow_logs (
        id, tenant_id, payment_request_id, ticket_id, action, performed_by,
        old_status, new_status, notes, metadata, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
    `;

    await this.db.query(query, [
      uuidv4(),
      metadata.tenantId || null,
      requestId,
      ticketId,
      action,
      performedBy,
      metadata.oldStatus || null,
      metadata.newStatus || null,
      metadata.notes || '',
      JSON.stringify(metadata)
    ]);
  }

  async sendRequestNotifications(request, ticket) {
    // Send notifications to relevant users
    console.log('Sending request notifications');
  }

  async sendApprovalNotifications(request, ticket) {
    // Send approval notifications
    console.log('Sending approval notifications');
  }

  async sendRejectionNotifications(request, ticket) {
    // Send rejection notifications
    console.log('Sending rejection notifications');
  }

  async sendEscalationNotifications(request, ticket, escalatorId) {
    // Send escalation notifications
    console.log('Sending escalation notifications');
  }
}

module.exports = EnhancedManualPaymentService;
