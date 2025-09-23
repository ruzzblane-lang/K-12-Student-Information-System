/**
 * Notification Service
 * 
 * Handles sending notifications for payment request status changes,
 * approval workflows, and fraud alerts.
 */

const { v4: uuidv4 } = require('uuid');

class NotificationService {
  constructor(db) {
    if (!db || typeof db.query !== 'function') {
      throw new Error('Invalid database connection: must have a query method');
    }
    this.db = db;
  }

  /**
   * Send payment request notifications
   * @param {Object} notificationData - Notification data
   */
  async sendPaymentRequestNotifications(notificationData) {
    const {
      paymentRequestId,
      tenantId,
      userId,
      status,
      fraudRiskLevel,
      adminNotes,
      rejectionReason
    } = notificationData;

    try {
      // Get payment request details
      const paymentRequest = await this.getPaymentRequestDetails(paymentRequestId, tenantId);
      if (!paymentRequest) {
        throw new Error('Payment request not found');
      }

      // Send notification to requester
      await this.sendRequesterNotification({
        paymentRequest,
        status,
        fraudRiskLevel,
        adminNotes,
        rejectionReason
      });

      // Send notification to admins if needed
      if (status === 'submitted' || fraudRiskLevel === 'high' || fraudRiskLevel === 'critical') {
        await this.sendAdminNotification({
          paymentRequest,
          status,
          fraudRiskLevel
        });
      }

    } catch (error) {
      console.error('Error sending payment request notifications:', error);
      // Don't throw here as notifications shouldn't break the main flow
    }
  }

  /**
   * Send notification to payment request submitter
   * @param {Object} data - Notification data
   */
  async sendRequesterNotification(data) {
    const {
      paymentRequest,
      status,
      fraudRiskLevel,
      adminNotes,
      rejectionReason
    } = data;

    const notificationTypes = {
      'submitted': {
        subject: 'Payment Request Submitted',
        template: 'payment_request_submitted'
      },
      'approved': {
        subject: 'Payment Request Approved',
        template: 'payment_request_approved'
      },
      'rejected': {
        subject: 'Payment Request Rejected',
        template: 'payment_request_rejected'
      },
      'under_review': {
        subject: 'Payment Request Under Review',
        template: 'payment_request_under_review'
      }
    };

    const notificationConfig = notificationTypes[status];
    if (!notificationConfig) return;

    const message = this.generateNotificationMessage({
      template: notificationConfig.template,
      paymentRequest,
      status,
      fraudRiskLevel,
      adminNotes,
      rejectionReason
    });

    // Store notification in database
    await this.storeNotification({
      paymentRequestId: paymentRequest.id,
      tenantId: paymentRequest.tenant_id,
      recipientId: paymentRequest.user_id,
      notificationType: status,
      subject: notificationConfig.subject,
      message
    });

    // Send email notification (if configured)
    await this.sendEmailNotification({
      recipientId: paymentRequest.user_id,
      tenantId: paymentRequest.tenant_id,
      subject: notificationConfig.subject,
      message,
      template: notificationConfig.template,
      data: { paymentRequest, status, fraudRiskLevel, adminNotes, rejectionReason }
    });
  }

  /**
   * Send notification to administrators
   * @param {Object} data - Notification data
   */
  async sendAdminNotification(data) {
    const { paymentRequest, status, fraudRiskLevel } = data;

    // Get admin users for the tenant
    const admins = await this.getTenantAdmins(paymentRequest.tenant_id);
    if (admins.length === 0) return;

    const notificationTypes = {
      'submitted': {
        subject: 'New Payment Request Requires Review',
        template: 'admin_payment_request_submitted'
      },
      'high_risk': {
        subject: 'High Risk Payment Request Detected',
        template: 'admin_high_risk_payment_request'
      },
      'critical_risk': {
        subject: 'Critical Risk Payment Request Alert',
        template: 'admin_critical_risk_payment_request'
      }
    };

    let notificationType = status;
    if (fraudRiskLevel === 'critical') {
      notificationType = 'critical_risk';
    } else if (fraudRiskLevel === 'high') {
      notificationType = 'high_risk';
    }

    const notificationConfig = notificationTypes[notificationType];
    if (!notificationConfig) return;

    const message = this.generateNotificationMessage({
      template: notificationConfig.template,
      paymentRequest,
      status,
      fraudRiskLevel
    });

    // Send notification to each admin
    for (const admin of admins) {
      // Store notification in database
      await this.storeNotification({
        paymentRequestId: paymentRequest.id,
        tenantId: paymentRequest.tenant_id,
        recipientId: admin.id,
        notificationType: notificationType,
        subject: notificationConfig.subject,
        message
      });

      // Send email notification
      await this.sendEmailNotification({
        recipientId: admin.id,
        tenantId: paymentRequest.tenant_id,
        subject: notificationConfig.subject,
        message,
        template: notificationConfig.template,
        data: { paymentRequest, status, fraudRiskLevel }
      });
    }
  }

  /**
   * Generate notification message based on template
   * @param {Object} data - Message generation data
   * @returns {string} Generated message
   */
  generateNotificationMessage(data) {
    const {
      template,
      paymentRequest,
      status,
      fraudRiskLevel,
      adminNotes,
      rejectionReason
    } = data;

    const templates = {
      payment_request_submitted: `
        Your payment request has been submitted successfully.
        
        Request Details:
        - Amount: ${paymentRequest.currency} ${paymentRequest.amount}
        - Payment Type: ${paymentRequest.payment_type}
        - Request ID: ${paymentRequest.id}
        
        ${fraudRiskLevel === 'high' || fraudRiskLevel === 'critical' 
          ? 'Note: This request requires additional review due to risk assessment.'
          : 'We will review your request and notify you of the status.'
        }
      `,

      payment_request_approved: `
        Your payment request has been approved!
        
        Request Details:
        - Amount: ${paymentRequest.currency} ${paymentRequest.amount}
        - Payment Type: ${paymentRequest.payment_type}
        - Request ID: ${paymentRequest.id}
        - Approved: ${new Date(paymentRequest.approved_at).toLocaleDateString()}
        
        ${adminNotes ? `Admin Notes: ${adminNotes}` : ''}
        
        Thank you for your payment.
      `,

      payment_request_rejected: `
        Your payment request has been rejected.
        
        Request Details:
        - Amount: ${paymentRequest.currency} ${paymentRequest.amount}
        - Payment Type: ${paymentRequest.payment_type}
        - Request ID: ${paymentRequest.id}
        - Rejection Reason: ${rejectionReason}
        
        ${adminNotes ? `Additional Notes: ${adminNotes}` : ''}
        
        Please review the rejection reason and submit a new request if needed.
      `,

      payment_request_under_review: `
        Your payment request is currently under review.
        
        Request Details:
        - Amount: ${paymentRequest.currency} ${paymentRequest.amount}
        - Payment Type: ${paymentRequest.payment_type}
        - Request ID: ${paymentRequest.id}
        
        Our team is reviewing your request and will notify you once a decision has been made.
      `,

      admin_payment_request_submitted: `
        A new payment request has been submitted and requires review.
        
        Request Details:
        - Amount: ${paymentRequest.currency} ${paymentRequest.amount}
        - Payment Type: ${paymentRequest.payment_type}
        - Request ID: ${paymentRequest.id}
        - Submitter: ${paymentRequest.user?.first_name} ${paymentRequest.user?.last_name}
        - Risk Level: ${fraudRiskLevel || 'low'}
        
        Please review this request in the admin dashboard.
      `,

      admin_high_risk_payment_request: `
        A HIGH RISK payment request has been submitted and requires immediate attention.
        
        Request Details:
        - Amount: ${paymentRequest.currency} ${paymentRequest.amount}
        - Payment Type: ${paymentRequest.payment_type}
        - Request ID: ${paymentRequest.id}
        - Submitter: ${paymentRequest.user?.first_name} ${paymentRequest.user?.last_name}
        - Risk Level: ${fraudRiskLevel}
        
        This request has been flagged for potential fraud and requires manual review.
      `,

      admin_critical_risk_payment_request: `
        🚨 CRITICAL RISK payment request detected - IMMEDIATE ACTION REQUIRED!
        
        Request Details:
        - Amount: ${paymentRequest.currency} ${paymentRequest.amount}
        - Payment Type: ${paymentRequest.payment_type}
        - Request ID: ${paymentRequest.id}
        - Submitter: ${paymentRequest.user?.first_name} ${paymentRequest.user?.last_name}
        - Risk Level: ${fraudRiskLevel}
        
        This request has been flagged as CRITICAL RISK and requires immediate manual review.
        Please investigate this request immediately.
      `
    };

    return templates[template] || 'Payment request notification.';
  }

  /**
   * Store notification in database
   * @param {Object} notificationData - Notification data
   */
  async storeNotification(notificationData) {
    const {
      paymentRequestId,
      tenantId,
      recipientId,
      notificationType,
      subject,
      message
    } = notificationData;

    const query = `
      INSERT INTO payment_request_notifications (
        id, tenant_id, payment_request_id, recipient_id,
        notification_type, subject, message, sent_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
    `;

    try {
      await this.db.query(query, [
        uuidv4(),
        tenantId,
        paymentRequestId,
        recipientId,
        notificationType,
        subject,
        message
      ]);

    } catch (error) {
      console.error('Error storing notification:', error);
      // Don't throw here as this is a logging operation
    }
  }

  /**
   * Send email notification
   * @param {Object} emailData - Email data
   */
  async sendEmailNotification(emailData) {
    const {
      recipientId,
      tenantId,
      subject,
      message,
      template,
      data
    } = emailData;

    try {
      // Get recipient email
      const userQuery = `
        SELECT email, first_name, last_name
        FROM users
        WHERE id = $1 AND tenant_id = $2
      `;

      const userResult = await this.db.query(userQuery, [recipientId, tenantId]);
      if (userResult.rows.length === 0) return;

      const user = userResult.rows[0];

      // TODO: Implement actual email sending logic here
      // This could integrate with services like SendGrid, AWS SES, etc.
      console.log('Email notification would be sent:', {
        to: user.email,
        subject,
        template,
        data: {
          recipient: user,
          message,
          ...data
        }
      });

      // For now, just log the notification
      // In a real implementation, you would:
      // 1. Use an email service (SendGrid, AWS SES, etc.)
      // 2. Apply email templates
      // 3. Handle delivery status
      // 4. Retry failed deliveries

    } catch (error) {
      console.error('Error sending email notification:', error);
      // Don't throw here as email failures shouldn't break the main flow
    }
  }

  /**
   * Get payment request details
   * @param {string} paymentRequestId - Payment request ID
   * @param {string} tenantId - Tenant ID
   * @returns {Object|null} Payment request details
   */
  async getPaymentRequestDetails(paymentRequestId, tenantId) {
    const query = `
      SELECT mpr.*, u.first_name, u.last_name, u.email
      FROM manual_payment_requests mpr
      LEFT JOIN users u ON mpr.user_id = u.id
      WHERE mpr.id = $1 AND mpr.tenant_id = $2
    `;

    try {
      const result = await this.db.query(query, [paymentRequestId, tenantId]);
      if (result.rows.length === 0) return null;

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
        }
      };

    } catch (error) {
      console.error('Error fetching payment request details:', error);
      return null;
    }
  }

  /**
   * Get tenant admin users
   * @param {string} tenantId - Tenant ID
   * @returns {Array} Admin users
   */
  async getTenantAdmins(tenantId) {
    const query = `
      SELECT id, first_name, last_name, email, role
      FROM users
      WHERE tenant_id = $1 
        AND role IN ('admin', 'super_admin', 'payment_admin', 'finance_admin')
        AND is_active = true
    `;

    try {
      const result = await this.db.query(query, [tenantId]);
      return result.rows;

    } catch (error) {
      console.error('Error fetching tenant admins:', error);
      return [];
    }
  }

  /**
   * Get user notifications
   * @param {string} userId - User ID
   * @param {string} tenantId - Tenant ID
   * @param {Object} options - Query options
   * @returns {Array} User notifications
   */
  async getUserNotifications(userId, tenantId, options = {}) {
    const { limit = 50, offset = 0, unreadOnly = false } = options;

    let query = `
      SELECT prn.*, mpr.payment_type, mpr.amount, mpr.currency
      FROM payment_request_notifications prn
      LEFT JOIN manual_payment_requests mpr ON prn.payment_request_id = mpr.id
      WHERE prn.recipient_id = $1 AND prn.tenant_id = $2
    `;

    const queryParams = [userId, tenantId];
    let paramCount = 2;

    if (unreadOnly) {
      paramCount++;
      query += ` AND prn.is_read = false`;
    }

    query += ` ORDER BY prn.sent_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(limit, offset);

    try {
      const result = await this.db.query(query, queryParams);
      
      return result.rows.map(row => ({
        ...row,
        amount: row.amount ? parseFloat(row.amount) : null
      }));

    } catch (error) {
      console.error('Error fetching user notifications:', error);
      throw new Error('Failed to fetch notifications');
    }
  }

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID
   * @param {string} tenantId - Tenant ID
   */
  async markNotificationAsRead(notificationId, userId, tenantId) {
    const query = `
      UPDATE payment_request_notifications
      SET is_read = true, read_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND recipient_id = $2 AND tenant_id = $3
    `;

    try {
      await this.db.query(query, [notificationId, userId, tenantId]);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw new Error('Failed to mark notification as read');
    }
  }

  /**
   * Get notification statistics
   * @param {string} tenantId - Tenant ID
   * @param {string} period - Time period
   * @returns {Object} Statistics
   */
  async getNotificationStats(tenantId, period = '30d') {
    try {
      const days = this.parsePeriod(period);
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const query = `
        SELECT 
          COUNT(*) as total_notifications,
          COUNT(CASE WHEN is_read = false THEN 1 END) as unread_notifications,
          COUNT(CASE WHEN notification_type = 'submitted' THEN 1 END) as submitted_notifications,
          COUNT(CASE WHEN notification_type = 'approved' THEN 1 END) as approved_notifications,
          COUNT(CASE WHEN notification_type = 'rejected' THEN 1 END) as rejected_notifications,
          COUNT(CASE WHEN notification_type = 'high_risk' THEN 1 END) as high_risk_notifications,
          COUNT(CASE WHEN notification_type = 'critical_risk' THEN 1 END) as critical_risk_notifications
        FROM payment_request_notifications
        WHERE tenant_id = $1 AND sent_at >= $2
      `;

      const result = await this.db.query(query, [tenantId, since]);
      const stats = result.rows[0];

      return {
        period: `${days} days`,
        total_notifications: parseInt(stats.total_notifications),
        unread_notifications: parseInt(stats.unread_notifications),
        submitted_notifications: parseInt(stats.submitted_notifications),
        approved_notifications: parseInt(stats.approved_notifications),
        rejected_notifications: parseInt(stats.rejected_notifications),
        high_risk_notifications: parseInt(stats.high_risk_notifications),
        critical_risk_notifications: parseInt(stats.critical_risk_notifications)
      };

    } catch (error) {
      console.error('Error fetching notification stats:', error);
      throw new Error('Failed to fetch notification statistics');
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

module.exports = NotificationService;
