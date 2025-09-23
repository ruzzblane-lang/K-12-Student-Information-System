/**
 * Google Workspace for Education API Integration
 * 
 * Provides integration with Google Workspace services including:
 * - Google Drive (file storage and sharing)
 * - Google Docs (document collaboration)
 * - Google Calendar (scheduling and events)
 * - Gmail (email communication)
 * - Google Classroom (course management)
 * - Google Meet (video conferencing)
 */

const { google } = require('googleapis');
const winston = require('winston');

class GoogleWorkspaceIntegration {
  constructor() {
    this.name = 'Google Workspace for Education';
    this.provider = 'google_workspace';
    this.version = '1.0.0';
    this.category = 'education';
    
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'google-workspace-integration' },
      transports: [
        new winston.transports.File({ filename: 'logs/google-workspace.log' }),
        new winston.transports.Console()
      ]
    });

    this.oauth2Client = null;
    this.drive = null;
    this.docs = null;
    this.calendar = null;
    this.gmail = null;
    this.classroom = null;
    this.meet = null;
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
        refresh_token,
        redirect_uri,
        scopes = [
          'https://www.googleapis.com/auth/drive',
          'https://www.googleapis.com/auth/documents',
          'https://www.googleapis.com/auth/calendar',
          'https://www.googleapis.com/auth/gmail.send',
          'https://www.googleapis.com/auth/classroom.courses.readonly',
          'https://www.googleapis.com/auth/classroom.rosters.readonly'
        ]
      } = config;

      this.oauth2Client = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uri
      );

      this.oauth2Client.setCredentials({
        refresh_token: refresh_token
      });

      // Initialize API clients
      this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
      this.docs = google.docs({ version: 'v1', auth: this.oauth2Client });
      this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
      this.classroom = google.classroom({ version: 'v1', auth: this.oauth2Client });

      this.logger.info('Google Workspace integration initialized', {
        scopes: scopes.length,
        services: ['drive', 'docs', 'calendar', 'gmail', 'classroom']
      });

      return { success: true, message: 'Google Workspace integration initialized successfully' };
    } catch (error) {
      this.logger.error('Failed to initialize Google Workspace integration', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Authenticate with Google Workspace
   * @param {Object} config - Authentication configuration
   * @returns {Promise<Object>} Authentication result
   */
  async authenticate(config) {
    try {
      if (!this.oauth2Client) {
        throw new Error('Integration not initialized');
      }

      // Test authentication by making a simple API call
      const response = await this.drive.about.get({
        fields: 'user'
      });

      this.logger.info('Google Workspace authentication successful', {
        user: response.data.user
      });

      return {
        success: true,
        authenticated: true,
        user: response.data.user
      };
    } catch (error) {
      this.logger.error('Google Workspace authentication failed', {
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
   * Create a Google Doc
   * @param {Object} config - Tenant configuration
   * @param {Object} options - Document options
   * @returns {Promise<Object>} Created document
   */
  async createDocument(config, options) {
    try {
      const {
        title,
        content = '',
        folderId = null,
        permissions = []
      } = options;

      // Create the document
      const docResponse = await this.docs.documents.create({
        requestBody: {
          title: title
        }
      });

      const documentId = docResponse.data.documentId;

      // Add content if provided
      if (content) {
        await this.docs.documents.batchUpdate({
          documentId: documentId,
          requestBody: {
            requests: [{
              insertText: {
                location: {
                  index: 1
                },
                text: content
              }
            }]
          }
        });
      }

      // Move to folder if specified
      if (folderId) {
        await this.drive.files.update({
          fileId: documentId,
          addParents: folderId,
          removeParents: 'root'
        });
      }

      // Set permissions
      for (const permission of permissions) {
        await this.drive.permissions.create({
          fileId: documentId,
          requestBody: {
            role: permission.role,
            type: permission.type,
            emailAddress: permission.emailAddress
          }
        });
      }

      this.logger.info('Google Doc created successfully', {
        documentId,
        title,
        folderId
      });

      return {
        success: true,
        documentId,
        title,
        url: `https://docs.google.com/document/d/${documentId}/edit`
      };
    } catch (error) {
      this.logger.error('Failed to create Google Doc', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * Create a Google Drive folder
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

      const folderResponse = await this.drive.files.create({
        requestBody: {
          name: name,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentId]
        }
      });

      const folderId = folderResponse.data.id;

      // Set permissions
      for (const permission of permissions) {
        await this.drive.permissions.create({
          fileId: folderId,
          requestBody: {
            role: permission.role,
            type: permission.type,
            emailAddress: permission.emailAddress
          }
        });
      }

      this.logger.info('Google Drive folder created successfully', {
        folderId,
        name,
        parentId
      });

      return {
        success: true,
        folderId,
        name,
        url: `https://drive.google.com/drive/folders/${folderId}`
      };
    } catch (error) {
      this.logger.error('Failed to create Google Drive folder', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * Create a calendar event
   * @param {Object} config - Tenant configuration
   * @param {Object} options - Event options
   * @returns {Promise<Object>} Created event
   */
  async createCalendarEvent(config, options) {
    try {
      const {
        summary,
        description = '',
        start,
        end,
        attendees = [],
        location = '',
        calendarId = 'primary'
      } = options;

      const event = {
        summary: summary,
        description: description,
        start: {
          dateTime: start,
          timeZone: 'UTC'
        },
        end: {
          dateTime: end,
          timeZone: 'UTC'
        },
        attendees: attendees.map(email => ({ email: email })),
        location: location
      };

      const response = await this.calendar.events.insert({
        calendarId: calendarId,
        requestBody: event
      });

      this.logger.info('Google Calendar event created successfully', {
        eventId: response.data.id,
        summary,
        attendees: attendees.length
      });

      return {
        success: true,
        eventId: response.data.id,
        summary,
        start: start,
        end: end,
        attendees: attendees,
        url: response.data.htmlLink
      };
    } catch (error) {
      this.logger.error('Failed to create Google Calendar event', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * Send email via Gmail
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
        to: to,
        cc: cc,
        bcc: bcc,
        subject: subject,
        body: body,
        attachments: attachments
      };

      // Create email message
      const emailMessage = this.createEmailMessage(message);
      
      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: emailMessage
        }
      });

      this.logger.info('Gmail message sent successfully', {
        messageId: response.data.id,
        to: to,
        subject
      });

      return {
        success: true,
        messageId: response.data.id,
        to: to,
        subject
      };
    } catch (error) {
      this.logger.error('Failed to send Gmail message', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * Get Google Classroom courses
   * @param {Object} config - Tenant configuration
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Courses list
   */
  async getClassroomCourses(config, options = {}) {
    try {
      const {
        studentId = null,
        teacherId = null,
        courseStates = ['ACTIVE']
      } = options;

      let query = '';
      if (studentId) {
        query = `studentId=${studentId}`;
      } else if (teacherId) {
        query = `teacherId=${teacherId}`;
      }

      const response = await this.classroom.courses.list({
        studentId: studentId,
        teacherId: teacherId,
        courseStates: courseStates
      });

      this.logger.info('Google Classroom courses retrieved', {
        courseCount: response.data.courses?.length || 0,
        query
      });

      return {
        success: true,
        courses: response.data.courses || [],
        count: response.data.courses?.length || 0
      };
    } catch (error) {
      this.logger.error('Failed to get Google Classroom courses', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * Create Google Meet link
   * @param {Object} config - Tenant configuration
   * @param {Object} options - Meet options
   * @returns {Promise<Object>} Meet link
   */
  async createMeetLink(config, options = {}) {
    try {
      const {
        title = 'Google Meet',
        description = '',
        startTime = null,
        endTime = null
      } = options;

      // Create a calendar event with Google Meet
      const event = {
        summary: title,
        description: description,
        conferenceData: {
          createRequest: {
            requestId: `meet-${Date.now()}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet'
            }
          }
        }
      };

      if (startTime && endTime) {
        event.start = {
          dateTime: startTime,
          timeZone: 'UTC'
        };
        event.end = {
          dateTime: endTime,
          timeZone: 'UTC'
        };
      }

      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
        conferenceDataVersion: 1
      });

      const meetLink = response.data.conferenceData?.entryPoints?.[0]?.uri;

      this.logger.info('Google Meet link created successfully', {
        eventId: response.data.id,
        meetLink
      });

      return {
        success: true,
        eventId: response.data.id,
        meetLink: meetLink,
        joinUrl: meetLink
      };
    } catch (error) {
      this.logger.error('Failed to create Google Meet link', {
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
      if (!this.oauth2Client) {
        return {
          status: 'unhealthy',
          message: 'Integration not initialized'
        };
      }

      // Test API connectivity
      await this.drive.about.get({ fields: 'user' });

      return {
        status: 'healthy',
        message: 'Google Workspace integration is working properly',
        services: {
          drive: 'available',
          docs: 'available',
          calendar: 'available',
          gmail: 'available',
          classroom: 'available'
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message,
        services: {
          drive: 'unavailable',
          docs: 'unavailable',
          calendar: 'unavailable',
          gmail: 'unavailable',
          classroom: 'unavailable'
        }
      };
    }
  }

  /**
   * Create email message in Gmail format
   * @param {Object} message - Email message object
   * @returns {string} Base64 encoded email message
   * @private
   */
  createEmailMessage(message) {
    const boundary = 'boundary_' + Math.random().toString(36).substr(2, 9);
    
    let email = '';
    email += `To: ${message.to.join(', ')}\r\n`;
    if (message.cc && message.cc.length > 0) {
      email += `Cc: ${message.cc.join(', ')}\r\n`;
    }
    if (message.bcc && message.bcc.length > 0) {
      email += `Bcc: ${message.bcc.join(', ')}\r\n`;
    }
    email += `Subject: ${message.subject}\r\n`;
    email += `Content-Type: multipart/alternative; boundary="${boundary}"\r\n\r\n`;
    
    email += `--${boundary}\r\n`;
    email += `Content-Type: text/plain; charset="UTF-8"\r\n\r\n`;
    email += `${message.body}\r\n\r\n`;
    
    email += `--${boundary}--\r\n`;
    
    return Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
}

module.exports = GoogleWorkspaceIntegration;
