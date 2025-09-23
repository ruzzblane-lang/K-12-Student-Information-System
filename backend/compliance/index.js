/**
 * School SIS Compliance System
 * Comprehensive compliance implementation for K-12 educational institutions
 * 
 * Features:
 * - PCI DSS Level 1 compliance with hosted fields/tokens
 * - GDPR, CCPA, FERPA, COPPA, LGPD audit coverage
 * - PSD2 compliance for EU (SCA + 2FA)
 * - SOC 2 Type II aligned logging and auditing
 * - Regional compliance (Interac, ASIC, Consumer Data Right)
 * - KYC/AML checks integration
 * - Double-encryption vault for transaction metadata
 * - Data residency support
 * - Tamper-proof audit trail logging
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');

const ComplianceAuditService = require('./services/ComplianceAuditService');
const DataResidencyService = require('./services/DataResidencyService');
const EncryptionVaultService = require('./services/EncryptionVaultService');
const RegionalComplianceService = require('./services/RegionalComplianceService');
const KYCService = require('./services/KYCService');
const AuditTrailService = require('./services/AuditTrailService');

const complianceRoutes = require('./routes/compliance');
const auditRoutes = require('./routes/audit');
const regionalRoutes = require('./routes/regional');
const kycRoutes = require('./routes/kyc');

class ComplianceSystem {
  constructor(config = {}) {
    this.config = {
      port: config.port || process.env.COMPLIANCE_PORT || 3001,
      environment: config.environment || process.env.NODE_ENV || 'development',
      logLevel: config.logLevel || process.env.LOG_LEVEL || 'info',
      ...config
    };

    this.app = express();
    this.services = {};
    this.isInitialized = false;
  }

  async initialize() {
    try {
      console.log('🔒 Initializing Compliance System...');

      // Initialize services
      await this.initializeServices();

      // Setup middleware
      this.setupMiddleware();

      // Setup routes
      this.setupRoutes();

      // Setup error handling
      this.setupErrorHandling();

      this.isInitialized = true;
      console.log('✅ Compliance System initialized successfully');

      return this;
    } catch (error) {
      console.error('❌ Failed to initialize Compliance System:', error);
      throw error;
    }
  }

  async initializeServices() {
    console.log('🔧 Initializing compliance services...');

    // Core compliance services
    this.services.audit = new ComplianceAuditService(this.config);
    this.services.dataResidency = new DataResidencyService(this.config);
    this.services.encryptionVault = new EncryptionVaultService(this.config);
    this.services.regional = new RegionalComplianceService(this.config);
    this.services.kyc = new KYCService(this.config);
    this.services.auditTrail = new AuditTrailService(this.config);

    // Initialize all services
    await Promise.all([
      this.services.audit.initialize(),
      this.services.dataResidency.initialize(),
      this.services.encryptionVault.initialize(),
      this.services.regional.initialize(),
      this.services.kyc.initialize(),
      this.services.auditTrail.initialize()
    ]);

    console.log('✅ All compliance services initialized');
  }

  setupMiddleware() {
    console.log('🛡️ Setting up security middleware...');

    // Security headers
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    }));

    // CORS configuration
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Tenant-ID']
    }));

    // Compression
    this.app.use(compression());

    // Request logging
    this.app.use(morgan('combined', {
      stream: {
        write: (message) => {
          this.services.auditTrail?.logRequest(message.trim());
        }
      }
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: {
        error: 'Too many requests from this IP, please try again later.',
        code: 'RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

    const speedLimiter = slowDown({
      windowMs: 15 * 60 * 1000, // 15 minutes
      delayAfter: 50, // allow 50 requests per 15 minutes, then...
      delayMs: 500 // begin adding 500ms of delay per request above 50
    });

    this.app.use('/api/', limiter);
    this.app.use('/api/', speedLimiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request ID middleware
    this.app.use((req, res, next) => {
      req.requestId = require('uuid').v4();
      res.setHeader('X-Request-ID', req.requestId);
      next();
    });

    // Tenant context middleware
    this.app.use((req, res, next) => {
      req.tenantId = req.headers['x-tenant-id'] || req.body.tenantId || req.query.tenantId;
      if (!req.tenantId) {
        return res.status(400).json({
          error: 'Tenant ID is required',
          code: 'TENANT_ID_REQUIRED'
        });
      }
      next();
    });
  }

  setupRoutes() {
    console.log('🛣️ Setting up compliance routes...');

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: Object.keys(this.services).reduce((acc, key) => {
          acc[key] = this.services[key].isHealthy ? 'healthy' : 'unhealthy';
          return acc;
        }, {})
      });
    });

    // API routes
    this.app.use('/api/compliance', complianceRoutes);
    this.app.use('/api/audit', auditRoutes);
    this.app.use('/api/regional', regionalRoutes);
    this.app.use('/api/kyc', kycRoutes);

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Endpoint not found',
        code: 'NOT_FOUND',
        path: req.originalUrl
      });
    });
  }

  setupErrorHandling() {
    // Global error handler
    this.app.use((error, req, res, next) => {
      console.error('Compliance System Error:', error);

      // Log error to audit trail
      this.services.auditTrail?.logError({
        requestId: req.requestId,
        tenantId: req.tenantId,
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });

      // Don't expose internal errors in production
      const isDevelopment = this.config.environment === 'development';
      
      res.status(error.status || 500).json({
        error: isDevelopment ? error.message : 'Internal server error',
        code: error.code || 'INTERNAL_ERROR',
        requestId: req.requestId,
        ...(isDevelopment && { stack: error.stack })
      });
    });
  }

  async start() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.config.port, (error) => {
        if (error) {
          console.error('❌ Failed to start Compliance System:', error);
          reject(error);
        } else {
          console.log(`🚀 Compliance System running on port ${this.config.port}`);
          console.log(`📊 Health check: http://localhost:${this.config.port}/health`);
          resolve(this);
        }
      });
    });
  }

  async stop() {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(() => {
          console.log('🛑 Compliance System stopped');
          resolve();
        });
      });
    }
  }

  getService(serviceName) {
    return this.services[serviceName];
  }

  getAllServices() {
    return this.services;
  }
}

// Export for use as module
module.exports = ComplianceSystem;

// If running directly, start the server
if (require.main === module) {
  const complianceSystem = new ComplianceSystem();
  
  complianceSystem.start().catch((error) => {
    console.error('Failed to start compliance system:', error);
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    complianceSystem.stop().then(() => {
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    complianceSystem.stop().then(() => {
      process.exit(0);
    });
  });
}
