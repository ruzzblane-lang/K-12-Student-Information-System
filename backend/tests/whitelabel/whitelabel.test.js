/**
 * White-Labeling Tests
 * 
 * Comprehensive tests for white-labeling functionality including:
 * - Branding configuration management
 * - Asset upload and management
 * - Theme template application
 * - Custom domain setup
 * - CSS generation
 * - Configuration import/export
 */

const request = require('supertest');
const app = require('../../server');
const { generateToken } = require('../../utils/jwt');
const WhiteLabelingService = require('../../services/whiteLabelingService');
const WhiteLabelingController = require('../../api/controllers/whiteLabelingController');

// Mock the database for testing
const mockDb = {
  query: jest.fn()
};

jest.mock('../../middleware/auth', () => ({
  verifyToken: jest.fn((req, res, next) => {
    req.user = { id: 'test-user-id', tenantId: 'test-tenant-id', role: 'admin' };
    next();
  }),
  requireRole: jest.fn((roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: { code: 'AUTH_INSUFFICIENT_PERMISSIONS', message: 'Insufficient permissions' }
      });
    }
    next();
  }),
  requireTenant: jest.fn((req, res, next) => {
    req.tenant = { id: 'test-tenant-id', slug: 'test-tenant' };
    next();
  })
}));

jest.mock('../../middleware/rbac', () => ({
  requireRole: jest.fn((roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: { code: 'AUTH_INSUFFICIENT_PERMISSIONS', message: 'Insufficient permissions' }
      });
    }
    next();
  })
}));

jest.mock('../../middleware/rateLimiting', () => ({
  whitelabelLimiter: jest.fn((req, res, next) => next())
}));

describe('White-Labeling API', () => {
  let adminToken;
  let whiteLabelingService;
  let whiteLabelingController;

  beforeAll(() => {
    adminToken = generateToken('admin-user-id', 'test-tenant-id', 'admin');
    whiteLabelingService = new WhiteLabelingService(mockDb);
    whiteLabelingController = new WhiteLabelingController(mockDb);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Branding Configuration', () => {
    describe('GET /api/white-labeling/branding', () => {
      it('should get branding configuration successfully', async () => {
        const mockBranding = {
          tenant_id: 'test-tenant-id',
          name: 'Test School',
          school_name: 'Test School',
          colors: {
            primary: '#1e40af',
            secondary: '#3b82f6'
          },
          typography: {
            font_family: 'Inter, system-ui, sans-serif',
            font_size_base: '16px'
          },
          white_label_config: {
            enabled: true,
            level: 'basic'
          }
        };

        mockDb.query.mockResolvedValueOnce({ rows: [mockBranding] });

        const response = await request(app)
          .get('/api/white-labeling/branding')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockBranding);
        expect(response.body.meta.tenant.id).toBe('test-tenant-id');
      });

      it('should return 404 when tenant not found', async () => {
        mockDb.query.mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .get('/api/white-labeling/branding')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(500);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('GET_BRANDING_ERROR');
      });
    });

    describe('PUT /api/white-labeling/branding', () => {
      it('should update branding configuration successfully', async () => {
        const brandingData = {
          colors: {
            primary: '#dc2626',
            secondary: '#ef4444'
          },
          typography: {
            font_family: 'Georgia, serif'
          },
          custom_content: {
            welcome_message: 'Welcome to our customized portal!'
          }
        };

        mockDb.query.mockResolvedValueOnce({ rows: [{ id: 'test-tenant-id' }] });

        const response = await request(app)
          .put('/api/white-labeling/branding')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(brandingData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Branding configuration updated successfully');
      });

      it('should return 400 for invalid color values', async () => {
        const invalidBrandingData = {
          colors: {
            primary: 'invalid-color'
          }
        };

        const response = await request(app)
          .put('/api/white-labeling/branding')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidBrandingData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should require admin role', async () => {
        const teacherToken = generateToken('teacher-user-id', 'test-tenant-id', 'teacher');

        const response = await request(app)
          .put('/api/white-labeling/branding')
          .set('Authorization', `Bearer ${teacherToken}`)
          .send({ colors: { primary: '#dc2626' } })
          .expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('AUTH_INSUFFICIENT_PERMISSIONS');
      });
    });
  });

  describe('CSS Generation', () => {
    describe('GET /api/white-labeling/css', () => {
      it('should generate CSS successfully', async () => {
        const mockBranding = {
          colors: {
            primary: '#1e40af',
            secondary: '#3b82f6',
            header_background: '#ffffff',
            footer_background: '#f8fafc',
            text: '#1f2937',
            link: '#3b82f6',
            button: '#1e40af',
            button_text: '#ffffff',
            accent: '#10b981',
            border: '#e5e7eb'
          },
          typography: {
            font_family: 'Inter, system-ui, sans-serif',
            font_size_base: '16px'
          },
          logo_url: 'https://example.com/logo.png',
          background_image_url: 'https://example.com/bg.jpg',
          favicon_url: 'https://example.com/favicon.ico',
          custom_css: '.custom-class { color: red; }'
        };

        mockDb.query.mockResolvedValueOnce({ rows: [mockBranding] });

        const response = await request(app)
          .get('/api/white-labeling/css')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.headers['content-type']).toContain('text/css');
        expect(response.text).toContain('--primary-color: #1e40af');
        expect(response.text).toContain('--secondary-color: #3b82f6');
        expect(response.text).toContain('--font-family: Inter, system-ui, sans-serif');
        expect(response.text).toContain('.custom-class { color: red; }');
        expect(response.text).toContain('.header {');
        expect(response.text).toContain('.button {');
      });

      it('should include cache headers', async () => {
        const mockBranding = {
          colors: { primary: '#1e40af' },
          typography: { font_family: 'Arial' },
          logo_url: '',
          background_image_url: '',
          favicon_url: '',
          custom_css: ''
        };

        mockDb.query.mockResolvedValueOnce({ rows: [mockBranding] });

        const response = await request(app)
          .get('/api/white-labeling/css')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.headers['cache-control']).toContain('max-age=3600');
        expect(response.headers['etag']).toBeDefined();
      });
    });
  });

  describe('Theme Templates', () => {
    describe('GET /api/white-labeling/themes', () => {
      it('should get theme templates successfully', async () => {
        const response = await request(app)
          .get('/api/white-labeling/themes')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.templates).toBeDefined();
        expect(response.body.data.templates.length).toBeGreaterThan(0);
        expect(response.body.data.total).toBeGreaterThan(0);
        
        const template = response.body.data.templates[0];
        expect(template).toHaveProperty('id');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('description');
        expect(template).toHaveProperty('colors');
        expect(template.colors).toHaveProperty('primary');
        expect(template.colors).toHaveProperty('secondary');
        expect(template.colors).toHaveProperty('accent');
      });
    });

    describe('POST /api/white-labeling/themes/apply', () => {
      it('should apply theme template successfully', async () => {
        mockDb.query
          .mockResolvedValueOnce({ rows: [{ id: 'test-tenant-id' }] }) // Update query
          .mockResolvedValueOnce({ rows: [] }); // Log query

        const response = await request(app)
          .post('/api/white-labeling/themes/apply')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ template_id: 'modern_blue' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.template_applied).toBe('modern_blue');
        expect(response.body.data.template_name).toBeDefined();
      });

      it('should return 400 for missing template ID', async () => {
        const response = await request(app)
          .post('/api/white-labeling/themes/apply')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({})
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should return 500 for invalid template ID', async () => {
        const response = await request(app)
          .post('/api/white-labeling/themes/apply')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ template_id: 'invalid_template' })
          .expect(500);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('APPLY_THEME_ERROR');
      });
    });
  });

  describe('Asset Management', () => {
    describe('POST /api/white-labeling/upload-asset', () => {
      it('should upload asset successfully', async () => {
        const mockFile = {
          buffer: Buffer.from('fake-image-data'),
          originalname: 'logo.png',
          mimetype: 'image/png'
        };

        // Mock file system operations
        const fs = require('fs').promises;
        jest.spyOn(fs, 'mkdir').mockResolvedValue();
        jest.spyOn(fs, 'writeFile').mockResolvedValue();

        // Mock Sharp
        const sharp = require('sharp');
        const mockSharp = {
          resize: jest.fn().mockReturnThis(),
          png: jest.fn().mockReturnThis(),
          toBuffer: jest.fn().mockResolvedValue(Buffer.from('processed-image'))
        };
        jest.spyOn(sharp, 'default').mockReturnValue(mockSharp);

        mockDb.query.mockResolvedValueOnce({ rows: [{ id: 'test-tenant-id' }] });

        const response = await request(app)
          .post('/api/white-labeling/upload-asset')
          .set('Authorization', `Bearer ${adminToken}`)
          .field('asset_type', 'logo')
          .attach('asset', Buffer.from('fake-image-data'), 'logo.png')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.asset_url).toBeDefined();
        expect(response.body.data.asset_type).toBe('logo');
      });

      it('should return 400 for invalid asset type', async () => {
        const response = await request(app)
          .post('/api/white-labeling/upload-asset')
          .set('Authorization', `Bearer ${adminToken}`)
          .field('asset_type', 'invalid_type')
          .attach('asset', Buffer.from('fake-image-data'), 'logo.png')
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should return 400 for no file uploaded', async () => {
        const response = await request(app)
          .post('/api/white-labeling/upload-asset')
          .set('Authorization', `Bearer ${adminToken}`)
          .field('asset_type', 'logo')
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('NO_FILE_UPLOADED');
      });
    });
  });

  describe('Custom Domain Setup', () => {
    describe('POST /api/white-labeling/validate-domain', () => {
      it('should validate domain successfully', async () => {
        const response = await request(app)
          .post('/api/white-labeling/validate-domain')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ domain: 'portal.springfield.edu' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.domain).toBe('portal.springfield.edu');
        expect(response.body.data.verification_code).toBeDefined();
        expect(response.body.data.verification_code).toHaveLength(32);
        expect(response.body.data.instructions).toBeDefined();
        expect(response.body.data.instructions.length).toBeGreaterThan(0);
      });

      it('should return 400 for invalid domain', async () => {
        const response = await request(app)
          .post('/api/white-labeling/validate-domain')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ domain: 'invalid-domain' })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should return 400 for missing domain', async () => {
        const response = await request(app)
          .post('/api/white-labeling/validate-domain')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({})
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('DOMAIN_REQUIRED');
      });
    });

    describe('POST /api/white-labeling/setup-custom-domain', () => {
      it('should setup custom domain successfully', async () => {
        mockDb.query
          .mockResolvedValueOnce({ rows: [{ id: 'test-tenant-id' }] }) // Update query
          .mockResolvedValueOnce({ rows: [] }); // Log query

        const response = await request(app)
          .post('/api/white-labeling/setup-custom-domain')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            domain: 'portal.springfield.edu',
            verification_code: 'a'.repeat(32)
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.domain).toBe('portal.springfield.edu');
        expect(response.body.data.verified).toBe(true);
        expect(response.body.data.ssl_status).toBe('pending');
        expect(response.body.data.next_steps).toBeDefined();
      });

      it('should return 400 for invalid verification code', async () => {
        const response = await request(app)
          .post('/api/white-labeling/setup-custom-domain')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            domain: 'portal.springfield.edu',
            verification_code: 'invalid-code'
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('DOMAIN_VERIFICATION_FAILED');
      });
    });

    describe('GET /api/white-labeling/domain-status', () => {
      it('should get domain status successfully', async () => {
        const mockBranding = {
          domain: 'portal.springfield.edu',
          custom_domain_verified: true,
          ssl_certificate_status: 'active',
          ssl_certificate_expires_at: '2024-12-31T23:59:59Z'
        };

        mockDb.query.mockResolvedValueOnce({ rows: [mockBranding] });

        const response = await request(app)
          .get('/api/white-labeling/domain-status')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.domain).toBe('portal.springfield.edu');
        expect(response.body.data.custom_domain_verified).toBe(true);
        expect(response.body.data.ssl_certificate_status).toBe('active');
      });
    });
  });

  describe('Configuration Management', () => {
    describe('GET /api/white-labeling/export-config', () => {
      it('should export configuration successfully', async () => {
        const mockBranding = {
          tenant_id: 'test-tenant-id',
          colors: { primary: '#1e40af' },
          typography: { font_family: 'Arial' }
        };

        mockDb.query.mockResolvedValueOnce({ rows: [mockBranding] });

        const response = await request(app)
          .get('/api/white-labeling/export-config')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.version).toBe('1.0');
        expect(response.body.data.tenant_id).toBe('test-tenant-id');
        expect(response.body.data.branding_config).toEqual(mockBranding);
        expect(response.body.data.exported_at).toBeDefined();
      });
    });

    describe('POST /api/white-labeling/import-config', () => {
      it('should import configuration successfully', async () => {
        const configData = {
          version: '1.0',
          branding_config: {
            colors: { primary: '#dc2626' },
            typography: { font_family: 'Georgia' }
          }
        };

        mockDb.query
          .mockResolvedValueOnce({ rows: [{ id: 'test-tenant-id' }] }) // Update query
          .mockResolvedValueOnce({ rows: [] }); // Log query

        const response = await request(app)
          .post('/api/white-labeling/import-config')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            config: configData,
            overwriteExisting: true
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.imported_at).toBeDefined();
        expect(response.body.data.overwrite_existing).toBe(true);
      });

      it('should return 400 for invalid configuration format', async () => {
        const response = await request(app)
          .post('/api/white-labeling/import-config')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            config: { invalid: 'format' },
            overwriteExisting: false
          })
          .expect(500);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('IMPORT_CONFIG_ERROR');
      });
    });

    describe('POST /api/white-labeling/reset-defaults', () => {
      it('should reset to defaults successfully', async () => {
        mockDb.query
          .mockResolvedValueOnce({ rows: [{ id: 'test-tenant-id' }] }) // Update query
          .mockResolvedValueOnce({ rows: [] }); // Log query

        const response = await request(app)
          .post('/api/white-labeling/reset-defaults')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Branding reset to defaults successfully');
      });
    });
  });

  describe('Advanced Features', () => {
    describe('PUT /api/white-labeling/email-templates', () => {
      it('should update email templates successfully', async () => {
        const templates = {
          welcome: {
            subject: 'Welcome to {{school_name}}!',
            body: 'Welcome message'
          }
        };

        const response = await request(app)
          .put('/api/white-labeling/email-templates')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ templates })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Email templates updated successfully');
      });

      it('should return 400 for invalid template format', async () => {
        const response = await request(app)
          .put('/api/white-labeling/email-templates')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ templates: 'invalid' })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('PUT /api/white-labeling/dashboard-widgets', () => {
      it('should update dashboard widgets successfully', async () => {
        const widgetConfig = {
          student_stats: { enabled: true, position: 'top-left' }
        };

        const response = await request(app)
          .put('/api/white-labeling/dashboard-widgets')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ widgetConfig })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Dashboard widgets updated successfully');
      });
    });

    describe('PUT /api/white-labeling/navigation-menu', () => {
      it('should update navigation menu successfully', async () => {
        const menuConfig = {
          main: [{ label: 'Dashboard', route: '/dashboard' }]
        };

        const response = await request(app)
          .put('/api/white-labeling/navigation-menu')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ menuConfig })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Navigation menu updated successfully');
      });
    });

    describe('PUT /api/white-labeling/support-contact', () => {
      it('should update support contact successfully', async () => {
        const supportConfig = {
          email: 'support@example.com',
          phone: '+1-555-0123'
        };

        const response = await request(app)
          .put('/api/white-labeling/support-contact')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ supportConfig })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Support contact updated successfully');
      });
    });

    describe('PUT /api/white-labeling/social-media', () => {
      it('should update social media successfully', async () => {
        const socialMediaConfig = {
          facebook: 'https://facebook.com/school',
          twitter: 'https://twitter.com/school'
        };

        const response = await request(app)
          .put('/api/white-labeling/social-media')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ socialMediaConfig })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Social media configuration updated successfully');
      });
    });

    describe('PUT /api/white-labeling/legal-documents', () => {
      it('should update legal documents successfully', async () => {
        const legalDocs = {
          terms_of_service: 'Terms of service content...',
          privacy_policy: 'Privacy policy content...'
        };

        const response = await request(app)
          .put('/api/white-labeling/legal-documents')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ legalDocs })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Legal documents updated successfully');
      });
    });
  });

  describe('Audit and History', () => {
    describe('GET /api/white-labeling/audit-log', () => {
      it('should get audit log successfully', async () => {
        const mockAuditLog = [
          {
            id: '1',
            action: 'update',
            data: { colors: { primary: '#dc2626' } },
            created_at: '2024-01-15T10:00:00Z',
            user_email: 'admin@example.com'
          },
          {
            id: '2',
            action: 'apply_theme',
            data: { template_id: 'modern_blue' },
            created_at: '2024-01-14T09:00:00Z',
            user_email: 'admin@example.com'
          }
        ];

        mockDb.query.mockResolvedValueOnce({ rows: mockAuditLog });

        const response = await request(app)
          .get('/api/white-labeling/audit-log?limit=10&offset=0')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.audit_log).toEqual(mockAuditLog);
        expect(response.body.data.total).toBe(2);
      });

      it('should require admin role', async () => {
        const teacherToken = generateToken('teacher-user-id', 'test-tenant-id', 'teacher');

        const response = await request(app)
          .get('/api/white-labeling/audit-log')
          .set('Authorization', `Bearer ${teacherToken}`)
          .expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('AUTH_INSUFFICIENT_PERMISSIONS');
      });
    });
  });

  describe('Authorization', () => {
    it('should allow teachers to view branding', async () => {
      const teacherToken = generateToken('teacher-user-id', 'test-tenant-id', 'teacher');
      
      const mockBranding = {
        tenant_id: 'test-tenant-id',
        colors: { primary: '#1e40af' }
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockBranding] });

      const response = await request(app)
        .get('/api/white-labeling/branding')
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should require admin role for updates', async () => {
      const teacherToken = generateToken('teacher-user-id', 'test-tenant-id', 'teacher');

      const response = await request(app)
        .put('/api/white-labeling/branding')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ colors: { primary: '#dc2626' } })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTH_INSUFFICIENT_PERMISSIONS');
    });
  });
});

describe('White-Labeling Service', () => {
  let whiteLabelingService;

  beforeAll(() => {
    whiteLabelingService = new WhiteLabelingService(mockDb);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTenantBranding', () => {
    it('should get complete tenant branding', async () => {
      const mockTenant = {
        id: 'test-tenant-id',
        name: 'Test School',
        school_name: 'Test School',
        slug: 'test-school',
        domain: 'test.sisplatform.com',
        logo_url: 'https://example.com/logo.png',
        primary_color: '#1e40af',
        secondary_color: '#3b82f6',
        header_background_color: '#ffffff',
        footer_background_color: '#f8fafc',
        text_color: '#1f2937',
        link_color: '#3b82f6',
        button_color: '#1e40af',
        button_text_color: '#ffffff',
        accent_color: '#10b981',
        border_color: '#e5e7eb',
        font_family: 'Inter, system-ui, sans-serif',
        font_size_base: '16px',
        custom_footer_text: 'Custom footer text',
        white_label_enabled: true,
        white_label_level: 'basic',
        custom_domain_verified: false,
        ssl_certificate_status: 'pending',
        custom_css: '.custom { color: red; }',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T10:00:00Z'
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockTenant] });

      const result = await whiteLabelingService.getTenantBranding('test-tenant-id');

      expect(result.tenant_id).toBe('test-tenant-id');
      expect(result.name).toBe('Test School');
      expect(result.colors.primary).toBe('#1e40af');
      expect(result.colors.secondary).toBe('#3b82f6');
      expect(result.typography.font_family).toBe('Inter, system-ui, sans-serif');
      expect(result.white_label_config.enabled).toBe(true);
      expect(result.white_label_config.level).toBe('basic');
      expect(result.custom_css).toBe('.custom { color: red; }');
    });

    it('should handle missing tenant', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        whiteLabelingService.getTenantBranding('non-existent-tenant')
      ).rejects.toThrow('Tenant not found');
    });
  });

  describe('updateTenantBranding', () => {
    it('should update branding configuration', async () => {
      const brandingData = {
        colors: {
          primary: '#dc2626',
          secondary: '#ef4444'
        },
        typography: {
          font_family: 'Georgia, serif'
        },
        custom_content: {
          welcome_message: 'Welcome message'
        }
      };

      mockDb.query.mockResolvedValueOnce({ rows: [{ id: 'test-tenant-id' }] });
      mockDb.query.mockResolvedValueOnce({ rows: [] }); // Log query

      const result = await whiteLabelingService.updateTenantBranding(
        'test-tenant-id',
        brandingData,
        'test-user-id'
      );

      expect(result).toBe(true);
      expect(mockDb.query).toHaveBeenCalledTimes(2);
    });

    it('should throw error for no valid fields', async () => {
      await expect(
        whiteLabelingService.updateTenantBranding('test-tenant-id', {}, 'test-user-id')
      ).rejects.toThrow('No valid fields to update');
    });
  });

  describe('generateTenantCSS', () => {
    it('should generate CSS with tenant branding', async () => {
      const mockBranding = {
        colors: {
          primary: '#1e40af',
          secondary: '#3b82f6',
          header_background: '#ffffff',
          footer_background: '#f8fafc',
          text: '#1f2937',
          link: '#3b82f6',
          button: '#1e40af',
          button_text: '#ffffff',
          accent: '#10b981',
          border: '#e5e7eb'
        },
        typography: {
          font_family: 'Inter, system-ui, sans-serif',
          font_size_base: '16px'
        },
        logo_url: 'https://example.com/logo.png',
        background_image_url: 'https://example.com/bg.jpg',
        favicon_url: 'https://example.com/favicon.ico',
        custom_css: '.custom-class { color: red; }'
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockBranding] });

      const result = await whiteLabelingService.generateTenantCSS('test-tenant-id');

      expect(result).toContain('--primary-color: #1e40af');
      expect(result).toContain('--secondary-color: #3b82f6');
      expect(result).toContain('--font-family: Inter, system-ui, sans-serif');
      expect(result).toContain('--logo-url: url(\'https://example.com/logo.png\')');
      expect(result).toContain('.custom-class { color: red; }');
      expect(result).toContain('.header {');
      expect(result).toContain('.button {');
    });
  });

  describe('getThemeTemplates', () => {
    it('should return available theme templates', async () => {
      const templates = await whiteLabelingService.getThemeTemplates();

      expect(templates).toBeDefined();
      expect(templates.length).toBeGreaterThan(0);
      
      const template = templates[0];
      expect(template).toHaveProperty('id');
      expect(template).toHaveProperty('name');
      expect(template).toHaveProperty('description');
      expect(template).toHaveProperty('colors');
      expect(template.colors).toHaveProperty('primary');
      expect(template.colors).toHaveProperty('secondary');
      expect(template.colors).toHaveProperty('accent');
    });
  });

  describe('applyThemeTemplate', () => {
    it('should apply theme template successfully', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 'test-tenant-id' }] }) // Update query
        .mockResolvedValueOnce({ rows: [] }); // Log query

      const result = await whiteLabelingService.applyThemeTemplate(
        'test-tenant-id',
        'modern_blue',
        'test-user-id'
      );

      expect(result.success).toBe(true);
      expect(result.template_applied).toBe('modern_blue');
      expect(result.template_name).toBeDefined();
    });

    it('should throw error for invalid template', async () => {
      await expect(
        whiteLabelingService.applyThemeTemplate('test-tenant-id', 'invalid_template', 'test-user-id')
      ).rejects.toThrow('Theme template not found: invalid_template');
    });
  });

  describe('resetToDefaults', () => {
    it('should reset branding to defaults', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 'test-tenant-id' }] }) // Update query
        .mockResolvedValueOnce({ rows: [] }); // Log query

      const result = await whiteLabelingService.resetToDefaults('test-tenant-id', 'test-user-id');

      expect(result).toBe(true);
      expect(mockDb.query).toHaveBeenCalledTimes(2);
    });
  });

  describe('exportBrandingConfig', () => {
    it('should export branding configuration', async () => {
      const mockBranding = {
        tenant_id: 'test-tenant-id',
        colors: { primary: '#1e40af' }
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockBranding] });

      const result = await whiteLabelingService.exportBrandingConfig('test-tenant-id');

      expect(result.version).toBe('1.0');
      expect(result.tenant_id).toBe('test-tenant-id');
      expect(result.branding_config).toEqual(mockBranding);
      expect(result.exported_at).toBeDefined();
    });
  });

  describe('importBrandingConfig', () => {
    it('should import branding configuration', async () => {
      const config = {
        branding_config: {
          colors: { primary: '#dc2626' }
        }
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 'test-tenant-id' }] }) // Update query
        .mockResolvedValueOnce({ rows: [] }); // Log query

      const result = await whiteLabelingService.importBrandingConfig(
        'test-tenant-id',
        config,
        false,
        'test-user-id'
      );

      expect(result.success).toBe(true);
      expect(result.imported_at).toBeDefined();
      expect(result.overwrite_existing).toBe(false);
    });

    it('should throw error for invalid configuration format', async () => {
      await expect(
        whiteLabelingService.importBrandingConfig('test-tenant-id', {}, false, 'test-user-id')
      ).rejects.toThrow('Invalid configuration format');
    });
  });
});
