/**
 * K-12 Student Information System - Backend Server
 * Main entry point for the backend API
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import routes
const studentRoutes = require('./api/routes/students');
const whiteLabelingRoutes = require('./api/routes/whiteLabeling');
const tenantRoutes = require('./routes/tenants');
const onboardingRoutes = require('./routes/onboarding');
const analyticsRoutes = require('./analytics/routes/analytics');

// Import middleware
const authMiddleware = require('./middleware/auth');
const tenantContextMiddleware = require('./middleware/tenantContext');
const { general } = require('./middleware/rateLimiting');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ['\'self\''],
      styleSrc: ['\'self\'', '\'unsafe-inline\''],
      scriptSrc: ['\'self\''],
      imgSrc: ['\'self\'', 'data:', 'https:'],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'X-Tenant-Slug']
}));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global rate limiting
app.use(general);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/students', studentRoutes);
app.use('/api/white-labeling', whiteLabelingRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/analytics', analyticsRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'API endpoint not found'
    }
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  // Don't expose internal error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(error.status || 500).json({
    success: false,
    error: {
      code: error.code || 'INTERNAL_SERVER_ERROR',
      message: error.message || 'An internal server error occurred',
      ...(isDevelopment && { stack: error.stack })
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 K-12 SIS Backend Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
