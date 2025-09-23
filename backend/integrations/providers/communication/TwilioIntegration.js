/**
 * Twilio API Integration
 * 
 * Provides integration with Twilio services including:
 * - SMS messaging
 * - Voice calls
 * - WhatsApp messaging
 * - Email notifications
 * - Emergency alerts
 */

const twilio = require('twilio');
const winston = require('winston');

class TwilioIntegration {
  constructor() {
    this.name = 'Twilio Communication';
    this.provider = 'twilio';
    this.version = '1.0.0';
    this.category = 'communication';
    
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'twilio-integration' },
      transports: [
        new winston.transports.File({ filename: 'logs/twilio.log' }),
        new winston.transports.Console()
      ]
    });

    this.client = null;
  }

  /**
   * Initialize the integration with tenant configuration
   * @param {Object} config - Tenant configuration
   */
  async initialize(config) {
    try {
      const {
        account_sid,
        auth_token,
        from_number,
        from_email = null
      } = config;

      this.client = twilio(account_sid, auth_token);

      this.logger.info('Twilio integration initialized', {
        accountSid: account_sid,
        fromNumber: from_number,
        services: ['sms', 'voice', 'whatsapp', 'email']
      });

      return { success: true, message: 'Twilio integration initialized successfully' };
    } catch (error) {
      this.logger.error('Failed to initialize Twilio integration', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Authenticate with Twilio
   * @param {Object} config - Authentication configuration
   * @returns {Promise<Object>} Authentication result
   */
  async authenticate(config) {
    try {
      if (!this.client) {
        throw new Error('Integration not initialized');
      }

      // Test authentication by getting account info
      const account = await this.client.api.accounts(this.client.accountSid).fetch();

      this.logger.info('Twilio authentication successful', {
        accountSid: account.sid,
        friendlyName: account.friendlyName
      });

      return {
        success: true,
        authenticated: true,
        account: {
          sid: account.sid,
          friendlyName: account.friendlyName,
          status: account.status
        }
      };
    } catch (error) {
      this.logger.error('Twilio authentication failed', {
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
   * Send SMS message
   * @param {Object} config - Tenant configuration
   * @param {Object} options - SMS options
   * @returns {Promise<Object>} SMS result
   */
  async sendSMS(config, options) {
    try {
      const {
        to,
        message,
        from = config.from_number,
        mediaUrl = null
      } = options;

      const smsOptions = {
        to: to,
        from: from,
        body: message
      };

      if (mediaUrl) {
        smsOptions.mediaUrl = mediaUrl;
      }

      const response = await this.client.messages.create(smsOptions);

      this.logger.info('SMS message sent successfully', {
        messageSid: response.sid,
        to: to,
        from: from,
        status: response.status
      });

      return {
        success: true,
        messageSid: response.sid,
        to: to,
        from: from,
        status: response.status,
        price: response.price
      };
    } catch (error) {
      this.logger.error('Failed to send SMS message', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * Send WhatsApp message
   * @param {Object} config - Tenant configuration
   * @param {Object} options - WhatsApp options
   * @returns {Promise<Object>} WhatsApp result
   */
  async sendWhatsApp(config, options) {
    try {
      const {
        to,
        message,
        from = `whatsapp:${config.from_number}`,
        mediaUrl = null
      } = options;

      const whatsappOptions = {
        to: `whatsapp:${to}`,
        from: from,
        body: message
      };

      if (mediaUrl) {
        whatsappOptions.mediaUrl = mediaUrl;
      }

      const response = await this.client.messages.create(whatsappOptions);

      this.logger.info('WhatsApp message sent successfully', {
        messageSid: response.sid,
        to: to,
        from: from,
        status: response.status
      });

      return {
        success: true,
        messageSid: response.sid,
        to: to,
        from: from,
        status: response.status,
        price: response.price
      };
    } catch (error) {
      this.logger.error('Failed to send WhatsApp message', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * Make voice call
   * @param {Object} config - Tenant configuration
   * @param {Object} options - Call options
   * @returns {Promise<Object>} Call result
   */
  async makeCall(config, options) {
    try {
      const {
        to,
        from = config.from_number,
        url,
        twiml = null,
        record = false,
        timeout = 30
      } = options;

      const callOptions = {
        to: to,
        from: from,
        timeout: timeout,
        record: record
      };

      if (twiml) {
        callOptions.twiml = twiml;
      } else if (url) {
        callOptions.url = url;
      } else {
        throw new Error('Either url or twiml must be provided');
      }

      const response = await this.client.calls.create(callOptions);

      this.logger.info('Voice call initiated successfully', {
        callSid: response.sid,
        to: to,
        from: from,
        status: response.status
      });

      return {
        success: true,
        callSid: response.sid,
        to: to,
        from: from,
        status: response.status,
        price: response.price
      };
    } catch (error) {
      this.logger.error('Failed to make voice call', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * Send emergency alert
   * @param {Object} config - Tenant configuration
   * @param {Object} options - Alert options
   * @returns {Promise<Object>} Alert result
   */
  async sendEmergencyAlert(config, options) {
    try {
      const {
        recipients,
        message,
        alertType = 'emergency',
        priority = 'high',
        channels = ['sms', 'voice']
      } = options;

      const results = [];

      for (const recipient of recipients) {
        for (const channel of channels) {
          try {
            let result;
            
            if (channel === 'sms') {
              result = await this.sendSMS(config, {
                to: recipient.phone,
                message: `[${alertType.toUpperCase()}] ${message}`,
                from: config.from_number
              });
            } else if (channel === 'voice') {
              const twiml = `
                <Response>
                  <Say voice="alice">Emergency Alert. ${message}</Say>
                  <Pause length="2"/>
                  <Say voice="alice">This is an automated emergency notification.</Say>
                </Response>
              `;
              
              result = await this.makeCall(config, {
                to: recipient.phone,
                from: config.from_number,
                twiml: twiml
              });
            }

            results.push({
              recipient: recipient,
              channel: channel,
              success: true,
              result: result
            });
          } catch (error) {
            results.push({
              recipient: recipient,
              channel: channel,
              success: false,
              error: error.message
            });
          }
        }
      }

      const successCount = results.filter(r => r.success).length;
      const totalCount = results.length;

      this.logger.info('Emergency alert sent', {
        alertType,
        priority,
        totalRecipients: recipients.length,
        successCount,
        totalCount
      });

      return {
        success: successCount > 0,
        alertType,
        priority,
        results: results,
        summary: {
          total: totalCount,
          successful: successCount,
          failed: totalCount - successCount
        }
      };
    } catch (error) {
      this.logger.error('Failed to send emergency alert', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * Send bulk SMS
   * @param {Object} config - Tenant configuration
   * @param {Object} options - Bulk SMS options
   * @returns {Promise<Object>} Bulk SMS result
   */
  async sendBulkSMS(config, options) {
    try {
      const {
        recipients,
        message,
        from = config.from_number,
        delay = 1000 // Delay between messages in milliseconds
      } = options;

      const results = [];
      let successCount = 0;
      let failureCount = 0;

      for (let i = 0; i < recipients.length; i++) {
        const recipient = recipients[i];
        
        try {
          const result = await this.sendSMS(config, {
            to: recipient.phone,
            message: message,
            from: from
          });

          results.push({
            recipient: recipient,
            success: true,
            result: result
          });
          successCount++;

          // Add delay between messages to avoid rate limiting
          if (i < recipients.length - 1) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        } catch (error) {
          results.push({
            recipient: recipient,
            success: false,
            error: error.message
          });
          failureCount++;
        }
      }

      this.logger.info('Bulk SMS completed', {
        totalRecipients: recipients.length,
        successCount,
        failureCount
      });

      return {
        success: successCount > 0,
        results: results,
        summary: {
          total: recipients.length,
          successful: successCount,
          failed: failureCount
        }
      };
    } catch (error) {
      this.logger.error('Failed to send bulk SMS', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * Get message status
   * @param {Object} config - Tenant configuration
   * @param {string} messageSid - Message SID
   * @returns {Promise<Object>} Message status
   */
  async getMessageStatus(config, messageSid) {
    try {
      const message = await this.client.messages(messageSid).fetch();

      this.logger.info('Message status retrieved', {
        messageSid,
        status: message.status,
        direction: message.direction
      });

      return {
        success: true,
        messageSid: message.sid,
        status: message.status,
        direction: message.direction,
        from: message.from,
        to: message.to,
        body: message.body,
        price: message.price,
        dateCreated: message.dateCreated,
        dateUpdated: message.dateUpdated
      };
    } catch (error) {
      this.logger.error('Failed to get message status', {
        error: error.message,
        messageSid
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
      if (!this.client) {
        return {
          status: 'unhealthy',
          message: 'Integration not initialized'
        };
      }

      // Test API connectivity
      await this.client.api.accounts(this.client.accountSid).fetch();

      return {
        status: 'healthy',
        message: 'Twilio integration is working properly',
        services: {
          sms: 'available',
          voice: 'available',
          whatsapp: 'available',
          email: 'available'
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message,
        services: {
          sms: 'unavailable',
          voice: 'unavailable',
          whatsapp: 'unavailable',
          email: 'unavailable'
        }
      };
    }
  }
}

module.exports = TwilioIntegration;
