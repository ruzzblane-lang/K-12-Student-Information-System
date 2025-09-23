/**
 * SendGrid API Integration
 * 
 * Provides integration with SendGrid services including:
 * - Email delivery
 * - Email templates
 * - Marketing campaigns
 * - Email analytics
 * - Webhook handling
 */

const sgMail = require('@sendgrid/mail');
const winston = require('winston');

class SendGridIntegration {
  constructor() {
    this.name = 'SendGrid Email';
    this.provider = 'sendgrid';
    this.version = '1.0.0';
    this.category = 'communication';
    
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'sendgrid-integration' },
      transports: [
        new winston.transports.File({ filename: 'logs/sendgrid.log' }),
        new winston.transports.Console()
      ]
    });

    this.apiKey = null;
  }

  /**
   * Initialize the integration with tenant configuration
   * @param {Object} config - Tenant configuration
   */
  async initialize(config) {
    try {
      const {
        api_key,
        from_email,
        from_name = 'School SIS'
      } = config;

      this.apiKey = api_key;
      sgMail.setApiKey(api_key);

      this.logger.info('SendGrid integration initialized', {
        fromEmail: from_email,
        fromName: from_name,
        services: ['email', 'templates', 'analytics', 'webhooks']
      });

      return { success: true, message: 'SendGrid integration initialized successfully' };
    } catch (error) {
      this.logger.error('Failed to initialize SendGrid integration', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Authenticate with SendGrid
   * @param {Object} config - Authentication configuration
   * @returns {Promise<Object>} Authentication result
   */
  async authenticate(config) {
    try {
      if (!this.apiKey) {
        throw new Error('Integration not initialized');
      }

      // Test authentication by getting account info
      const response = await sgMail.request({
        method: 'GET',
        url: '/v3/user/account'
      });

      this.logger.info('SendGrid authentication successful', {
        username: response.body.username,
        email: response.body.email
      });

      return {
        success: true,
        authenticated: true,
        account: {
          username: response.body.username,
          email: response.body.email
        }
      };
    } catch (error) {
      this.logger.error('SendGrid authentication failed', {
        error: error.message
      });
      return {
        success: false,
        authenticated: false,
        error: error.message
      };
    }
  }

  /**
   * Send email
   * @param {Object} config - Tenant configuration
   * @param {Object} options - Email options
   * @returns {Promise<Object>} Email result
   */
  async sendEmail(config, options) {
    try {
      const {
        to,
        subject,
        html,
        text = null,
        from = config.from_email,
        fromName = config.from_name,
        cc = [],
        bcc = [],
        attachments = [],
        templateId = null,
        dynamicTemplateData = {},
        categories = []
      } = options;

      const msg = {
        to: to,
        from: {
          email: from,
          name: fromName
        },
        subject: subject,
        html: html,
        text: text,
        cc: cc,
        bcc: bcc,
        attachments: attachments,
        categories: categories
      };

      if (templateId) {
        msg.templateId = templateId;
        msg.dynamicTemplateData = dynamicTemplateData;
        // Remove html and text when using template
        delete msg.html;
        delete msg.text;
      }

      const response = await sgMail.send(msg);

      this.logger.info('SendGrid email sent successfully', {
        messageId: response[0].headers['x-message-id'],
        to: to,
        subject,
        templateId
      });

      return {
        success: true,
        messageId: response[0].headers['x-message-id'],
        to: to,
        subject,
        templateId
      };
    } catch (error) {
      this.logger.error('Failed to send SendGrid email', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * Send bulk email
   * @param {Object} config - Tenant configuration
   * @param {Object} options - Bulk email options
   * @returns {Promise<Object>} Bulk email result
   */
  async sendBulkEmail(config, options) {
    try {
      const {
        recipients,
        subject,
        html,
        text = null,
        from = config.from_email,
        fromName = config.from_name,
        templateId = null,
        dynamicTemplateData = {},
        categories = []
      } = options;

      const messages = recipients.map(recipient => {
        const msg = {
          to: recipient.email,
          from: {
            email: from,
            name: fromName
          },
          subject: subject,
          html: html,
          text: text,
          categories: categories
        };

        if (templateId) {
          msg.templateId = templateId;
          msg.dynamicTemplateData = {
            ...dynamicTemplateData,
            ...recipient.data
          };
          delete msg.html;
          delete msg.text;
        }

        return msg;
      });

      const response = await sgMail.send(messages);

      this.logger.info('SendGrid bulk email sent successfully', {
        recipientCount: recipients.length,
        subject,
        templateId
      });

      return {
        success: true,
        recipientCount: recipients.length,
        subject,
        templateId,
        messageIds: response.map(r => r.headers['x-message-id'])
      };
    } catch (error) {
      this.logger.error('Failed to send SendGrid bulk email', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * Create email template
   * @param {Object} config - Tenant configuration
   * @param {Object} options - Template options
   * @returns {Promise<Object>} Template result
   */
  async createTemplate(config, options) {
    try {
      const {
        name,
        subject,
        htmlContent,
        textContent = null,
        categories = []
      } = options;

      const template = {
        name: name,
        generation: 'dynamic',
        subject: subject,
        html_content: htmlContent,
        plain_content: textContent
      };

      const response = await sgMail.request({
        method: 'POST',
        url: '/v3/templates',
        body: template
      });

      this.logger.info('SendGrid template created successfully', {
        templateId: response.body.id,
        name
      });

      return {
        success: true,
        templateId: response.body.id,
        name,
        subject
      };
    } catch (error) {
      this.logger.error('Failed to create SendGrid template', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * Get email statistics
   * @param {Object} config - Tenant configuration
   * @param {Object} options - Statistics options
   * @returns {Promise<Object>} Statistics result
   */
  async getEmailStats(config, options = {}) {
    try {
      const {
        startDate,
        endDate,
        categories = [],
        aggregatedBy = 'day'
      } = options;

      let query = `/v3/stats?aggregated_by=${aggregatedBy}`;
      
      if (startDate) {
        query += `&start_date=${startDate}`;
      }
      if (endDate) {
        query += `&end_date=${endDate}`;
      }
      if (categories.length > 0) {
        query += `&categories=${categories.join(',')}`;
      }

      const response = await sgMail.request({
        method: 'GET',
        url: query
      });

      this.logger.info('SendGrid email statistics retrieved', {
        startDate,
        endDate,
        categories: categories.length
      });

      return {
        success: true,
        stats: response.body,
        period: {
          startDate,
          endDate,
          aggregatedBy
        }
      };
    } catch (error) {
      this.logger.error('Failed to get SendGrid email statistics', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * Send notification email
   * @param {Object} config - Tenant configuration
   * @param {Object} options - Notification options
   * @returns {Promise<Object>} Notification result
   */
  async sendNotification(config, options) {
    try {
      const {
        to,
        notificationType,
        data = {},
        priority = 'normal',
        templateId = null
      } = options;

      let subject, html, text;

      switch (notificationType) {
        case 'student_absence':
          subject = `Student Absence Notification - ${data.studentName}`;
          html = `
            <h2>Student Absence Notification</h2>
            <p><strong>Student:</strong> ${data.studentName}</p>
            <p><strong>Date:</strong> ${data.date}</p>
            <p><strong>Class:</strong> ${data.className}</p>
            <p><strong>Reason:</strong> ${data.reason || 'Not specified'}</p>
          `;
          break;
        case 'grade_update':
          subject = `Grade Update - ${data.studentName}`;
          html = `
            <h2>Grade Update</h2>
            <p><strong>Student:</strong> ${data.studentName}</p>
            <p><strong>Subject:</strong> ${data.subject}</p>
            <p><strong>Grade:</strong> ${data.grade}</p>
            <p><strong>Assignment:</strong> ${data.assignment}</p>
          `;
          break;
        case 'emergency_alert':
          subject = `[EMERGENCY] ${data.title}`;
          html = `
            <h2 style="color: red;">Emergency Alert</h2>
            <p><strong>Title:</strong> ${data.title}</p>
            <p><strong>Message:</strong> ${data.message}</p>
            <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          `;
          break;
        default:
          subject = 'School Notification';
          html = `<h2>School Notification</h2><p>${data.message}</p>`;
      }

      const emailOptions = {
        to: to,
        subject: subject,
        html: html,
        text: text,
        categories: ['notification', notificationType],
        templateId: templateId
      };

      if (templateId) {
        emailOptions.dynamicTemplateData = data;
        delete emailOptions.html;
        delete emailOptions.text;
      }

      const result = await this.sendEmail(config, emailOptions);

      this.logger.info('SendGrid notification sent successfully', {
        notificationType,
        to: to,
        priority
      });

      return {
        success: true,
        notificationType,
        to: to,
        priority,
        messageId: result.messageId
      };
    } catch (error) {
      this.logger.error('Failed to send SendGrid notification', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * Health check for the integration
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    try {
      if (!this.apiKey) {
        return {
          status: 'unhealthy',
          message: 'Integration not initialized'
        };
      }

      // Test API connectivity
      await sgMail.request({
        method: 'GET',
        url: '/v3/user/account'
      });

      return {
        status: 'healthy',
        message: 'SendGrid integration is working properly',
        services: {
          email: 'available',
          templates: 'available',
          analytics: 'available',
          webhooks: 'available'
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message,
        services: {
          email: 'unavailable',
          templates: 'unavailable',
          analytics: 'unavailable',
          webhooks: 'unavailable'
        }
      };
    }
  }
}

module.exports = SendGridIntegration;
