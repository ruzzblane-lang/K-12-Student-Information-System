/**
 * Payment Approval Service
 * 
 * Handles approval workflow management for manual payment requests
 * including ticket creation, assignment, and escalation.
 */

const { v4: uuidv4 } = require('uuid');

class PaymentApprovalService {
  constructor(db) {
    if (!db || typeof db.query !== 'function') {
      throw new Error('Invalid database connection: must have a query method');
    }
    this.db = db;
  }

  /**
   * Create an approval ticket for a payment request
   * @param {Object} ticketData - Ticket data
   * @returns {Object} Created ticket
   */
  async createApprovalTicket(ticketData) {
    const {
      paymentRequestId,
      tenantId,
      priority = 'normal',
      fraudAssessment,
      assignedTo = null,
      dueDate = null
    } = ticketData;

    const ticketId = uuidv4();
    
    // Calculate due date if not provided
    let calculatedDueDate = dueDate;
    if (!calculatedDueDate) {
      const hours = priority === 'high' ? 4 : priority === 'critical' ? 2 : 24;
      calculatedDueDate = new Date(Date.now() + hours * 60 * 60 * 1000);
    }

    const query = `
      INSERT INTO payment_approval_tickets (
        id, tenant_id, payment_request_id, assigned_to, priority,
        status, due_date, escalation_level, notes, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    try {
      const result = await this.db.query(query, [
        ticketId,
        tenantId,
        paymentRequestId,
        assignedTo,
        priority,
        'open',
        calculatedDueDate,
        1,
        fraudAssessment ? `Fraud risk: ${fraudAssessment.riskLevel} (Score: ${fraudAssessment.riskScore})` : null
      ]);

      // Log the ticket creation
      await this.logWorkflowAction({
        paymentRequestId,
        tenantId,
        ticketId,
        action: 'ticket_created',
        performedBy: 'system',
        notes: `Approval ticket created with priority: ${priority}`
      });

      return result.rows[0];

    } catch (error) {
      console.error('Error creating approval ticket:', error);
      throw new Error('Failed to create approval ticket');
    }
  }

  /**
   * Assign a ticket to a user
   * @param {Object} assignmentData - Assignment data
   * @returns {Object} Assignment result
   */
  async assignTicket(assignmentData) {
    const { ticketId, tenantId, assignedTo, assignedBy } = assignmentData;

    const query = `
      UPDATE payment_approval_tickets
      SET assigned_to = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND tenant_id = $3 AND status = 'open'
      RETURNING *
    `;

    try {
      const result = await this.db.query(query, [assignedTo, ticketId, tenantId]);
      
      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'Ticket not found or already closed'
        };
      }

      // Log the assignment
      await this.logWorkflowAction({
        ticketId,
        tenantId,
        action: 'ticket_assigned',
        performedBy: assignedBy,
        notes: `Ticket assigned to user: ${assignedTo}`
      });

      return {
        success: true,
        ticket: result.rows[0]
      };

    } catch (error) {
      console.error('Error assigning ticket:', error);
      return {
        success: false,
        error: 'Failed to assign ticket'
      };
    }
  }

  /**
   * Approve a payment request
   * @param {Object} approvalData - Approval data
   * @returns {Object} Approval result
   */
  async approvePaymentRequest(approvalData) {
    const {
      paymentRequestId,
      tenantId,
      adminId,
      notes
    } = approvalData;

    // Start transaction
    await this.db.query('BEGIN');

    try {
      // Update payment request status
      const updateRequestQuery = `
        UPDATE manual_payment_requests
        SET status = 'approved', approved_by = $1, approved_at = CURRENT_TIMESTAMP,
            admin_notes = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3 AND tenant_id = $4 AND status = 'pending'
        RETURNING *
      `;

      const requestResult = await this.db.query(updateRequestQuery, [
        adminId, notes, paymentRequestId, tenantId
      ]);

      if (requestResult.rows.length === 0) {
        await this.db.query('ROLLBACK');
        return {
          success: false,
          error: 'Payment request not found or not pending'
        };
      }

      // Close associated tickets
      const closeTicketsQuery = `
        UPDATE payment_approval_tickets
        SET status = 'resolved', resolved_by = $1, resolved_at = CURRENT_TIMESTAMP,
            resolution_notes = 'Payment request approved', updated_at = CURRENT_TIMESTAMP
        WHERE payment_request_id = $2 AND tenant_id = $3 AND status = 'open'
        RETURNING *
      `;

      const ticketsResult = await this.db.query(closeTicketsQuery, [
        adminId, paymentRequestId, tenantId
      ]);

      // Log the approval
      await this.logWorkflowAction({
        paymentRequestId,
        tenantId,
        action: 'payment_approved',
        performedBy: adminId,
        notes: notes || 'Payment request approved'
      });

      await this.db.query('COMMIT');

      return {
        success: true,
        paymentRequest: requestResult.rows[0],
        resolvedTickets: ticketsResult.rows
      };

    } catch (error) {
      await this.db.query('ROLLBACK');
      console.error('Error approving payment request:', error);
      return {
        success: false,
        error: 'Failed to approve payment request'
      };
    }
  }

  /**
   * Reject a payment request
   * @param {Object} rejectionData - Rejection data
   * @returns {Object} Rejection result
   */
  async rejectPaymentRequest(rejectionData) {
    const {
      paymentRequestId,
      tenantId,
      adminId,
      reason,
      notes
    } = rejectionData;

    // Start transaction
    await this.db.query('BEGIN');

    try {
      // Update payment request status
      const updateRequestQuery = `
        UPDATE manual_payment_requests
        SET status = 'rejected', rejected_by = $1, rejected_at = CURRENT_TIMESTAMP,
            rejection_reason = $2, admin_notes = $3, updated_at = CURRENT_TIMESTAMP
        WHERE id = $4 AND tenant_id = $5 AND status = 'pending'
        RETURNING *
      `;

      const requestResult = await this.db.query(updateRequestQuery, [
        adminId, reason, notes, paymentRequestId, tenantId
      ]);

      if (requestResult.rows.length === 0) {
        await this.db.query('ROLLBACK');
        return {
          success: false,
          error: 'Payment request not found or not pending'
        };
      }

      // Close associated tickets
      const closeTicketsQuery = `
        UPDATE payment_approval_tickets
        SET status = 'resolved', resolved_by = $1, resolved_at = CURRENT_TIMESTAMP,
            resolution_notes = $2, updated_at = CURRENT_TIMESTAMP
        WHERE payment_request_id = $3 AND tenant_id = $4 AND status = 'open'
        RETURNING *
      `;

      const ticketsResult = await this.db.query(closeTicketsQuery, [
        adminId, `Payment rejected: ${reason}`, paymentRequestId, tenantId
      ]);

      // Log the rejection
      await this.logWorkflowAction({
        paymentRequestId,
        tenantId,
        action: 'payment_rejected',
        performedBy: adminId,
        notes: `Payment rejected: ${reason}`,
        metadata: { reason, notes }
      });

      await this.db.query('COMMIT');

      return {
        success: true,
        paymentRequest: requestResult.rows[0],
        resolvedTickets: ticketsResult.rows
      };

    } catch (error) {
      await this.db.query('ROLLBACK');
      console.error('Error rejecting payment request:', error);
      return {
        success: false,
        error: 'Failed to reject payment request'
      };
    }
  }

  /**
   * Get pending approval tickets
   * @param {string} tenantId - Tenant ID
   * @param {Object} options - Query options
   * @returns {Array} Pending tickets
   */
  async getPendingApprovals(tenantId, options = {}) {
    const { priority, assignedTo, limit = 50, offset = 0 } = options;

    let query = `
      SELECT 
        pat.*,
        mpr.payment_type, mpr.amount, mpr.currency, mpr.description,
        mpr.fraud_risk_score, mpr.fraud_risk_level,
        u.first_name, u.last_name, u.email as requester_email,
        s.first_name as student_first_name, s.last_name as student_last_name,
        assignee.first_name as assignee_first_name, assignee.last_name as assignee_last_name
      FROM payment_approval_tickets pat
      JOIN manual_payment_requests mpr ON pat.payment_request_id = mpr.id
      LEFT JOIN users u ON mpr.user_id = u.id
      LEFT JOIN students s ON mpr.student_id = s.id
      LEFT JOIN users assignee ON pat.assigned_to = assignee.id
      WHERE pat.tenant_id = $1 AND pat.status = 'open'
    `;

    const queryParams = [tenantId];
    let paramCount = 1;

    if (priority) {
      paramCount++;
      query += ` AND pat.priority = $${paramCount}`;
      queryParams.push(priority);
    }

    if (assignedTo) {
      paramCount++;
      query += ` AND pat.assigned_to = $${paramCount}`;
      queryParams.push(assignedTo);
    }

    query += ` ORDER BY 
      CASE pat.priority 
        WHEN 'critical' THEN 1 
        WHEN 'high' THEN 2 
        WHEN 'normal' THEN 3 
        ELSE 4 
      END,
      pat.created_at ASC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;

    queryParams.push(limit, offset);

    try {
      const result = await this.db.query(query, queryParams);
      
      return result.rows.map(row => ({
        ...row,
        amount: parseFloat(row.amount),
        requester: {
          id: row.user_id,
          first_name: row.first_name,
          last_name: row.last_name,
          email: row.requester_email
        },
        student: row.student_id ? {
          id: row.student_id,
          first_name: row.student_first_name,
          last_name: row.student_last_name
        } : null,
        assignee: row.assigned_to ? {
          id: row.assigned_to,
          first_name: row.assignee_first_name,
          last_name: row.assignee_last_name
        } : null
      }));

    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      throw new Error('Failed to fetch pending approvals');
    }
  }

  /**
   * Get ticket details
   * @param {string} ticketId - Ticket ID
   * @param {string} tenantId - Tenant ID
   * @returns {Object|null} Ticket details
   */
  async getTicketDetails(ticketId, tenantId) {
    const query = `
      SELECT 
        pat.*,
        mpr.*,
        u.first_name, u.last_name, u.email as requester_email,
        s.first_name as student_first_name, s.last_name as student_last_name,
        assignee.first_name as assignee_first_name, assignee.last_name as assignee_last_name,
        resolver.first_name as resolver_first_name, resolver.last_name as resolver_last_name
      FROM payment_approval_tickets pat
      JOIN manual_payment_requests mpr ON pat.payment_request_id = mpr.id
      LEFT JOIN users u ON mpr.user_id = u.id
      LEFT JOIN students s ON mpr.student_id = s.id
      LEFT JOIN users assignee ON pat.assigned_to = assignee.id
      LEFT JOIN users resolver ON pat.resolved_by = resolver.id
      WHERE pat.id = $1 AND pat.tenant_id = $2
    `;

    try {
      const result = await this.db.query(query, [ticketId, tenantId]);
      
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
        requester: {
          id: row.user_id,
          first_name: row.first_name,
          last_name: row.last_name,
          email: row.requester_email
        },
        student: row.student_id ? {
          id: row.student_id,
          first_name: row.student_first_name,
          last_name: row.student_last_name
        } : null,
        assignee: row.assigned_to ? {
          id: row.assigned_to,
          first_name: row.assignee_first_name,
          last_name: row.assignee_last_name
        } : null,
        resolver: row.resolved_by ? {
          id: row.resolved_by,
          first_name: row.resolver_first_name,
          last_name: row.resolver_last_name
        } : null
      };

    } catch (error) {
      console.error('Error fetching ticket details:', error);
      throw new Error('Failed to fetch ticket details');
    }
  }

  /**
   * Log workflow action
   * @param {Object} actionData - Action data
   */
  async logWorkflowAction(actionData) {
    const {
      paymentRequestId,
      tenantId,
      ticketId = null,
      action,
      performedBy,
      oldStatus = null,
      newStatus = null,
      notes = null,
      metadata = {}
    } = actionData;

    const query = `
      INSERT INTO payment_approval_workflow_logs (
        id, tenant_id, payment_request_id, ticket_id, action,
        performed_by, old_status, new_status, notes, metadata, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
    `;

    try {
      await this.db.query(query, [
        uuidv4(),
        tenantId,
        paymentRequestId,
        ticketId,
        action,
        performedBy,
        oldStatus,
        newStatus,
        notes,
        JSON.stringify(metadata)
      ]);

    } catch (error) {
      console.error('Error logging workflow action:', error);
      // Don't throw here as this is a logging operation
    }
  }

  /**
   * Get workflow logs for a payment request
   * @param {string} paymentRequestId - Payment request ID
   * @param {string} tenantId - Tenant ID
   * @returns {Array} Workflow logs
   */
  async getWorkflowLogs(paymentRequestId, tenantId) {
    const query = `
      SELECT 
        pawl.*,
        u.first_name, u.last_name
      FROM payment_approval_workflow_logs pawl
      LEFT JOIN users u ON pawl.performed_by = u.id
      WHERE pawl.payment_request_id = $1 AND pawl.tenant_id = $2
      ORDER BY pawl.created_at ASC
    `;

    try {
      const result = await this.db.query(query, [paymentRequestId, tenantId]);
      
      return result.rows.map(row => ({
        ...row,
        metadata: JSON.parse(row.metadata || '{}'),
        performed_by_user: {
          id: row.performed_by,
          first_name: row.first_name,
          last_name: row.last_name
        }
      }));

    } catch (error) {
      console.error('Error fetching workflow logs:', error);
      throw new Error('Failed to fetch workflow logs');
    }
  }

  /**
   * Check for overdue tickets and escalate if needed
   * @param {string} tenantId - Tenant ID
   * @returns {Object} Escalation result
   */
  async checkAndEscalateOverdueTickets(tenantId) {
    try {
      // Find overdue tickets
      const overdueQuery = `
        SELECT pat.*, mpr.amount, mpr.currency, mpr.fraud_risk_level
        FROM payment_approval_tickets pat
        JOIN manual_payment_requests mpr ON pat.payment_request_id = mpr.id
        WHERE pat.tenant_id = $1 
          AND pat.status = 'open' 
          AND pat.due_date < CURRENT_TIMESTAMP
      `;

      const overdueResult = await this.db.query(overdueQuery, [tenantId]);
      const overdueTickets = overdueResult.rows;

      let escalatedCount = 0;
      const escalationResults = [];

      for (const ticket of overdueTickets) {
        // Escalate ticket
        const escalationResult = await this.escalateTicket(ticket, tenantId);
        if (escalationResult.escalated) {
          escalatedCount++;
          escalationResults.push(escalationResult);
        }
      }

      return {
        overdueTicketsCount: overdueTickets.length,
        escalatedCount,
        escalationResults
      };

    } catch (error) {
      console.error('Error checking overdue tickets:', error);
      throw new Error('Failed to check overdue tickets');
    }
  }

  /**
   * Escalate a ticket
   * @param {Object} ticket - Ticket data
   * @param {string} tenantId - Tenant ID
   * @returns {Object} Escalation result
   */
  async escalateTicket(ticket, tenantId) {
    try {
      const newEscalationLevel = ticket.escalation_level + 1;
      
      // Update ticket escalation level and due date
      const updateQuery = `
        UPDATE payment_approval_tickets
        SET escalation_level = $1, due_date = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3 AND tenant_id = $4
        RETURNING *
      `;

      const newDueDate = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4 hours from now

      const result = await this.db.query(updateQuery, [
        newEscalationLevel,
        newDueDate,
        ticket.id,
        tenantId
      ]);

      // Log escalation
      await this.logWorkflowAction({
        paymentRequestId: ticket.payment_request_id,
        tenantId,
        ticketId: ticket.id,
        action: 'ticket_escalated',
        performedBy: 'system',
        notes: `Ticket escalated to level ${newEscalationLevel} due to overdue status`
      });

      return {
        escalated: true,
        ticketId: ticket.id,
        newEscalationLevel,
        newDueDate
      };

    } catch (error) {
      console.error('Error escalating ticket:', error);
      return {
        escalated: false,
        error: error.message
      };
    }
  }

  /**
   * Get approval statistics
   * @param {string} tenantId - Tenant ID
   * @param {string} period - Time period
   * @returns {Object} Statistics
   */
  async getApprovalStats(tenantId, period = '30d') {
    try {
      const days = this.parsePeriod(period);
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const query = `
        SELECT 
          COUNT(*) as total_tickets,
          COUNT(CASE WHEN status = 'open' THEN 1 END) as open_tickets,
          COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_tickets,
          COUNT(CASE WHEN priority = 'critical' THEN 1 END) as critical_tickets,
          COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority_tickets,
          COUNT(CASE WHEN due_date < CURRENT_TIMESTAMP AND status = 'open' THEN 1 END) as overdue_tickets,
          AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) as avg_resolution_hours
        FROM payment_approval_tickets
        WHERE tenant_id = $1 AND created_at >= $2
      `;

      const result = await this.db.query(query, [tenantId, since]);
      const stats = result.rows[0];

      return {
        period: `${days} days`,
        total_tickets: parseInt(stats.total_tickets),
        open_tickets: parseInt(stats.open_tickets),
        resolved_tickets: parseInt(stats.resolved_tickets),
        critical_tickets: parseInt(stats.critical_tickets),
        high_priority_tickets: parseInt(stats.high_priority_tickets),
        overdue_tickets: parseInt(stats.overdue_tickets),
        avg_resolution_hours: parseFloat(stats.avg_resolution_hours || 0)
      };

    } catch (error) {
      console.error('Error fetching approval stats:', error);
      throw new Error('Failed to fetch approval statistics');
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

module.exports = PaymentApprovalService;
