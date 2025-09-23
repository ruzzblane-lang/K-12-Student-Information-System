/**
 * Third-Party API Integrations Framework
 * 
 * This module provides a comprehensive, modular framework for integrating
 * third-party APIs with role-based access control and tenant-specific configuration.
 * 
 * Features:
 * - Modular integration architecture
 * - Tenant-based configuration and toggling
 * - Role-based access control
 * - Security and compliance features
 * - Rate limiting and error handling
 * - Audit logging
 * 
 * @author School SIS Team
 * @version 1.0.0
 */

const IntegrationManager = require('./services/IntegrationManager');
const TenantConfigService = require('./services/TenantConfigService');
const SecurityService = require('./services/SecurityService');
const AuditService = require('./services/AuditService');

// Integration categories
const INTEGRATION_CATEGORIES = {
  EDUCATION: 'education',
  COMMUNICATION: 'communication',
  PAYMENT: 'payment',
  LEARNING: 'learning',
  UTILITY: 'utility',
  EMERGENCY: 'emergency',
  PRODUCTIVITY: 'productivity'
};

// Integration providers
const INTEGRATION_PROVIDERS = {
  // Education & Productivity
  GOOGLE_WORKSPACE: 'google_workspace',
  MICROSOFT_365: 'microsoft_365',
  ZOOM: 'zoom',
  GOOGLE_MEET: 'google_meet',
  
  // Communication
  TWILIO: 'twilio',
  VONAGE: 'vonage',
  SENDGRID: 'sendgrid',
  SLACK: 'slack',
  DISCORD: 'discord',
  
  // Payment
  STRIPE: 'stripe',
  PAYPAL: 'paypal',
  SQUARE: 'square',
  APPLE_PAY: 'apple_pay',
  GOOGLE_PAY: 'google_pay',
  ALIPAY: 'alipay',
  WECHAT_PAY: 'wechat_pay',
  
  // Learning
  KHAN_ACADEMY: 'khan_academy',
  COURSERA: 'coursera',
  TURNITIN: 'turnitin',
  KAHOOT: 'kahoot',
  DUOLINGO: 'duolingo',
  
  // Utility
  GOOGLE_MAPS: 'google_maps',
  WAZE: 'waze',
  WEATHER: 'weather',
  OVERDRIVE: 'overdrive',
  SORA: 'sora',
  
  // Emergency
  RAVE_ALERT: 'rave_alert',
  EVERBRIDGE: 'everbridge'
};

// Role-based permissions
const INTEGRATION_PERMISSIONS = {
  ADMIN: 'admin',
  TEACHER: 'teacher',
  STUDENT: 'student',
  PARENT: 'parent',
  STAFF: 'staff'
};

module.exports = {
  IntegrationManager,
  TenantConfigService,
  SecurityService,
  AuditService,
  INTEGRATION_CATEGORIES,
  INTEGRATION_PROVIDERS,
  INTEGRATION_PERMISSIONS
};
