/**
 * Microsoft 365 Education Graph API Integration
 * 
 * Provides integration with Microsoft 365 services including:
 * - Microsoft Teams (collaboration and meetings)
 * - Outlook (email and calendar)
 * - OneDrive (file storage and sharing)
 * - SharePoint (document management)
 * - Microsoft Graph (user and group management)
 */

const { Client } = require('@microsoft/microsoft-graph-client');
const winston = require('winston');

class Microsoft365Integration {
  constructor() {
    this.name = 'Microsoft 365 Education';
    this.provider = 'microsoft_365';
    this.version = '1.0.0';
    this.category = 'education';
    
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'microsoft-365-integration' },
      transports: [
        new winston.transports.File({ filename: 'logs/microsoft-365.log' }),
        new winston.transports.Console()
      ]
    });

    this.graphClient = null;
  }

  /**
   * Initialize the integration with tenant configuration
   * @param {Object} config - Tenant configuration
   */
  async initialize(config) {
    try {
      const {
        client_id,
        client_secret,
        tenant_id,
        access_token,
        refresh_token
      } = config;

      // Initialize Microsoft Graph client
      this.graphClient = Client.init({
        authProvider: {
          getAccessToken: async () => {
            // In a real implementation, you would refresh the token here
            return access_token;
          }
        }
      });

      this.logger.info('Microsoft 365 integration initialized', {
        tenantId: tenant_id,
        services: ['teams', 'outlook', 'onedrive', 'sharepoint', 'graph']
      });

      return { success: true, message: 'Microsoft 365 integration initialized successfully' };
    } catch (error) {
      this.logger.error('Failed to initialize Microsoft 365 integration', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Authenticate with Microsoft 365
   * @param {Object} config - Authentication configuration
   * @returns {Promise<Object>} Authentication result
   */
  async authenticate(config) {
    try {
      if (!this.graphClient) {
        throw new Error('Integration not initialized');
      }

      // Test authentication by getting user profile
      const user = await this.graphClient.me.get();

      this.logger.info('Microsoft 365 authentication successful', {
        userId: user.id,
        displayName: user.displayName
      });

      return {
        success: true,
        authenticated: true,
        user: {
          id: user.id,
          displayName: user.displayName,
          email: user.mail || user.userPrincipalName
        }
      };
    } catch (error) {
      this.logger.error('Microsoft 365 authentication failed', {
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
   * Create a Microsoft Teams team
   * @param {Object} config - Tenant configuration
   * @param {Object} options - Team options
   * @returns {Promise<Object>} Created team
   */
  async createTeam(config, options) {
    try {
      const {
        displayName,
        description = '',
        visibility = 'private',
        members = []
      } = options;

      // Create the team
      const team = {
        displayName: displayName,
        description: description,
        visibility: visibility,
        members: members.map(member => ({
          '@odata.type': '#microsoft.graph.aadUserConversationMember',
          roles: ['owner'],
          'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${member.id}')`
        }))
      };

      const response = await this.graphClient.teams.post(team);

      this.logger.info('Microsoft Teams team created successfully', {
        teamId: response.id,
        displayName,
        memberCount: members.length
      });

      return {
        success: true,
        teamId: response.id,
        displayName,
        webUrl: response.webUrl,
        memberCount: members.length
      };
    } catch (error) {
      this.logger.error('Failed to create Microsoft Teams team', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * Create a Teams meeting
   * @param {Object} config - Tenant configuration
   * @param {Object} options - Meeting options
   * @returns {Promise<Object>} Created meeting
   */
  async createMeeting(config, options) {
    try {
      const {
        subject,
        startTime,
        endTime,
        attendees = [],
        isOnlineMeeting = true
      } = options;

      const meeting = {
        subject: subject,
        start: {
          dateTime: startTime,
          timeZone: 'UTC'
        },
        end: {
          dateTime: endTime,
          timeZone: 'UTC'
        },
        attendees: attendees.map(email => ({
          emailAddress: {
            address: email
          }
        })),
        isOnlineMeeting: isOnlineMeeting
      };

      const response = await this.graphClient.me.events.post(meeting);

      this.logger.info('Microsoft Teams meeting created successfully', {
        eventId: response.id,
        subject,
        attendeeCount: attendees.length
      });

      return {
        success: true,
        eventId: response.id,
        subject,
        startTime,
        endTime,
        joinUrl: response.onlineMeeting?.joinUrl,
        attendees: attendees
      };
    } catch (error) {
      this.logger.error('Failed to create Microsoft Teams meeting', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * Send email via Outlook
   * @param {Object} config - Tenant configuration
   * @param {Object} options - Email options
   * @returns {Promise<Object>} Email result
   */
  async sendEmail(config, options) {
    try {
      const {
        to,
        subject,
        body,
        cc = [],
        bcc = [],
        attachments = []
      } = options;

      const message = {
        message: {
          subject: subject,
          body: {
            contentType: 'HTML',
            content: body
          },
          toRecipients: to.map(email => ({
            emailAddress: {
              address: email
            }
          })),
          ccRecipients: cc.map(email => ({
            emailAddress: {
              address: email
            }
          })),
          bccRecipients: bcc.map(email => ({
            emailAddress: {
              address: email
            }
          })),
          attachments: attachments
        }
      };

      const response = await this.graphClient.me.sendMail.post(message);

      this.logger.info('Outlook email sent successfully', {
        to: to,
        subject
      });

      return {
        success: true,
        to: to,
        subject
      };
    } catch (error) {
      this.logger.error('Failed to send Outlook email', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * Create OneDrive folder
   * @param {Object} config - Tenant configuration
   * @param {Object} options - Folder options
   * @returns {Promise<Object>} Created folder
   */
  async createFolder(config, options) {
    try {
      const {
        name,
        parentId = 'root',
        permissions = []
      } = options;

      const folder = {
        name: name,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'rename'
      };

      const endpoint = parentId === 'root' 
        ? '/me/drive/root/children'
        : `/me/drive/items/${parentId}/children`;

      const response = await this.graphClient.api(endpoint).post(folder);

      this.logger.info('OneDrive folder created successfully', {
        folderId: response.id,
        name,
        parentId
      });

      return {
        success: true,
        folderId: response.id,
        name,
        webUrl: response.webUrl
      };
    } catch (error) {
      this.logger.error('Failed to create OneDrive folder', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * Upload file to OneDrive
   * @param {Object} config - Tenant configuration
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} Upload result
   */
  async uploadFile(config, options) {
    try {
      const {
        fileName,
        fileContent,
        folderId = 'root',
        contentType = 'application/octet-stream'
      } = options;

      const endpoint = folderId === 'root'
        ? `/me/drive/root:/${fileName}:/content`
        : `/me/drive/items/${folderId}:/${fileName}:/content`;

      const response = await this.graphClient
        .api(endpoint)
        .put(fileContent);

      this.logger.info('OneDrive file uploaded successfully', {
        fileId: response.id,
        fileName,
        folderId
      });

      return {
        success: true,
        fileId: response.id,
        fileName,
        webUrl: response.webUrl,
        size: response.size
      };
    } catch (error) {
      this.logger.error('Failed to upload OneDrive file', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * Get SharePoint sites
   * @param {Object} config - Tenant configuration
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Sites list
   */
  async getSharePointSites(config, options = {}) {
    try {
      const {
        search = '',
        filter = ''
      } = options;

      let query = '/sites';
      if (search) {
        query += `?search=${encodeURIComponent(search)}`;
      }
      if (filter) {
        query += search ? '&' : '?';
        query += `$filter=${encodeURIComponent(filter)}`;
      }

      const response = await this.graphClient.api(query).get();

      this.logger.info('SharePoint sites retrieved', {
        siteCount: response.value?.length || 0,
        search,
        filter
      });

      return {
        success: true,
        sites: response.value || [],
        count: response.value?.length || 0
      };
    } catch (error) {
      this.logger.error('Failed to get SharePoint sites', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * Get users from Microsoft Graph
   * @param {Object} config - Tenant configuration
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Users list
   */
  async getUsers(config, options = {}) {
    try {
      const {
        search = '',
        filter = '',
        top = 100
      } = options;

      let query = '/users';
      const params = [];
      
      if (search) {
        params.push(`$search="${encodeURIComponent(search)}"`);
      }
      if (filter) {
        params.push(`$filter=${encodeURIComponent(filter)}`);
      }
      if (top) {
        params.push(`$top=${top}`);
      }

      if (params.length > 0) {
        query += '?' + params.join('&');
      }

      const response = await this.graphClient.api(query).get();

      this.logger.info('Microsoft Graph users retrieved', {
        userCount: response.value?.length || 0,
        search,
        filter
      });

      return {
        success: true,
        users: response.value || [],
        count: response.value?.length || 0
      };
    } catch (error) {
      this.logger.error('Failed to get Microsoft Graph users', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * Create calendar event
   * @param {Object} config - Tenant configuration
   * @param {Object} options - Event options
   * @returns {Promise<Object>} Created event
   */
  async createCalendarEvent(config, options) {
    try {
      const {
        subject,
        startTime,
        endTime,
        attendees = [],
        location = '',
        body = ''
      } = options;

      const event = {
        subject: subject,
        start: {
          dateTime: startTime,
          timeZone: 'UTC'
        },
        end: {
          dateTime: endTime,
          timeZone: 'UTC'
        },
        attendees: attendees.map(email => ({
          emailAddress: {
            address: email
          }
        })),
        location: {
          displayName: location
        },
        body: {
          contentType: 'HTML',
          content: body
        }
      };

      const response = await this.graphClient.me.events.post(event);

      this.logger.info('Outlook calendar event created successfully', {
        eventId: response.id,
        subject,
        attendeeCount: attendees.length
      });

      return {
        success: true,
        eventId: response.id,
        subject,
        startTime,
        endTime,
        attendees: attendees,
        webLink: response.webLink
      };
    } catch (error) {
      this.logger.error('Failed to create Outlook calendar event', {
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
      if (!this.graphClient) {
        return {
          status: 'unhealthy',
          message: 'Integration not initialized'
        };
      }

      // Test API connectivity
      await this.graphClient.me.get();

      return {
        status: 'healthy',
        message: 'Microsoft 365 integration is working properly',
        services: {
          teams: 'available',
          outlook: 'available',
          onedrive: 'available',
          sharepoint: 'available',
          graph: 'available'
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message,
        services: {
          teams: 'unavailable',
          outlook: 'unavailable',
          onedrive: 'unavailable',
          sharepoint: 'unavailable',
          graph: 'unavailable'
        }
      };
    }
  }
}

module.exports = Microsoft365Integration;
