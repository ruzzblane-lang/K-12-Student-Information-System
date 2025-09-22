#!/usr/bin/env node

/**
 * White-Labeling Demo Client
 * 
 * This script demonstrates the complete white-labeling functionality including:
 * - Branding configuration management
 * - Asset upload and management
 * - Theme template application
 * - Custom domain setup
 * - CSS generation and preview
 * - Configuration import/export
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class WhiteLabelDemoClient {
  constructor(config = {}) {
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:3000/api',
      tenantSlug: config.tenantSlug || 'springfield',
      email: config.email || 'admin@springfield.edu',
      password: config.password || 'secure-password',
      ...config
    };
    
    this.session = {
      isAuthenticated: false,
      accessToken: null,
      user: null,
      tenant: null
    };
    
    this.axios = axios.create({
      baseURL: this.config.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'WhiteLabelDemoClient/1.0.0'
      }
    });
    
    this.setupInterceptors();
  }
  
  setupInterceptors() {
    this.axios.interceptors.request.use(
      (config) => {
        if (this.session.accessToken) {
          config.headers.Authorization = `Bearer ${this.session.accessToken}`;
        }
        if (this.config.tenantSlug) {
          config.headers['X-Tenant-Slug'] = this.config.tenantSlug;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
  }
  
  async authenticate() {
    console.log('🔐 Authenticating for white-labeling demo...');
    
    try {
      const response = await this.axios.post('/auth/login', {
        email: this.config.email,
        password: this.config.password,
        tenantSlug: this.config.tenantSlug
      });
      
      if (response.data.success) {
        this.session.isAuthenticated = true;
        this.session.accessToken = response.data.data.accessToken;
        this.session.user = response.data.data.user;
        this.session.tenant = response.data.data.tenant;
        
        console.log(`✅ Authenticated as ${this.session.user.email}`);
        console.log(`🏫 Tenant: ${this.session.tenant.schoolName}`);
        return true;
      } else {
        throw new Error('Authentication failed');
      }
    } catch (error) {
      console.error('❌ Authentication failed:', error.response?.data?.message || error.message);
      throw error;
    }
  }
  
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Demonstrate branding configuration management
   */
  async demonstrateBrandingManagement() {
    console.log('\n🎨 === BRANDING CONFIGURATION MANAGEMENT ===');
    
    try {
      // Get current branding
      console.log('📊 Fetching current branding configuration...');
      const currentBrandingResponse = await this.axios.get('/white-labeling/branding');
      
      if (currentBrandingResponse.data.success) {
        const branding = currentBrandingResponse.data.data;
        console.log('\n🎯 Current Branding Configuration:');
        console.log(`   School Name: ${branding.school_name}`);
        console.log(`   Primary Color: ${branding.colors.primary}`);
        console.log(`   Secondary Color: ${branding.colors.secondary}`);
        console.log(`   Font Family: ${branding.typography.font_family}`);
        console.log(`   White-Label Level: ${branding.white_label_config.level}`);
        console.log(`   Custom Domain Verified: ${branding.white_label_config.custom_domain_verified}`);
      }
      
      // Update branding with new colors
      console.log('\n🎨 Updating branding with new color scheme...');
      const newBranding = {
        colors: {
          primary: '#dc2626',      // Red
          secondary: '#ef4444',    // Light Red
          header_background: '#fef2f2', // Very Light Red
          footer_background: '#fef2f2',
          text: '#1f2937',         // Dark Gray
          link: '#dc2626',
          button: '#dc2626',
          button_text: '#ffffff',
          accent: '#f59e0b',       // Amber
          border: '#fecaca'        // Light Red Border
        },
        typography: {
          font_family: 'Georgia, serif'
        },
        custom_content: {
          welcome_message: 'Welcome to our beautifully customized student portal!',
          footer_text: '© 2024 Springfield High School. Proudly powered by our custom white-label system.'
        }
      };
      
      const updateResponse = await this.axios.put('/white-labeling/branding', newBranding);
      
      if (updateResponse.data.success) {
        console.log('   ✅ Branding configuration updated successfully');
        console.log('   🎨 New color scheme applied');
        console.log('   📝 Custom content updated');
      }
      
      // Generate CSS
      console.log('\n🎨 Generating custom CSS...');
      const cssResponse = await this.axios.get('/white-labeling/css');
      
      if (cssResponse.status === 200) {
        console.log('   ✅ Custom CSS generated successfully');
        console.log(`   📏 CSS Length: ${cssResponse.data.length} characters`);
        
        // Save CSS to file for inspection
        const cssPath = `/tmp/whitelabel-css-${Date.now()}.css`;
        await fs.writeFile(cssPath, cssResponse.data);
        console.log(`   💾 CSS saved to: ${cssPath}`);
      }
      
      // Get preview
      console.log('\n👁️ Getting branding preview...');
      const previewResponse = await this.axios.get('/white-labeling/preview');
      
      if (previewResponse.data.success) {
        const preview = previewResponse.data.data;
        console.log('   ✅ Preview generated successfully');
        console.log(`   🔗 Preview URL: ${preview.preview_url}`);
        console.log(`   ⏰ Generated at: ${preview.generated_at}`);
      }
      
    } catch (error) {
      console.error('❌ Error demonstrating branding management:', error.response?.data?.message || error.message);
    }
  }
  
  /**
   * Demonstrate theme template management
   */
  async demonstrateThemeTemplates() {
    console.log('\n🎨 === THEME TEMPLATE MANAGEMENT ===');
    
    try {
      // Get available theme templates
      console.log('📋 Fetching available theme templates...');
      const templatesResponse = await this.axios.get('/white-labeling/themes');
      
      if (templatesResponse.data.success) {
        const templates = templatesResponse.data.data.templates;
        console.log(`\n🎨 Available Theme Templates (${templates.length}):`);
        
        templates.forEach((template, index) => {
          console.log(`\n${index + 1}. ${template.name}`);
          console.log(`   ID: ${template.id}`);
          console.log(`   Description: ${template.description}`);
          console.log(`   Primary Color: ${template.colors.primary}`);
          console.log(`   Secondary Color: ${template.colors.secondary}`);
          console.log(`   Accent Color: ${template.colors.accent}`);
        });
        
        // Apply a theme template
        const selectedTemplate = templates[2]; // Select the third template
        console.log(`\n🎨 Applying theme template: ${selectedTemplate.name}...`);
        
        const applyResponse = await this.axios.post('/white-labeling/themes/apply', {
          template_id: selectedTemplate.id
        });
        
        if (applyResponse.data.success) {
          console.log('   ✅ Theme template applied successfully');
          console.log(`   🎨 Template: ${applyResponse.data.data.template_name}`);
          
          // Verify the change by getting updated branding
          console.log('\n🔍 Verifying theme application...');
          const updatedBrandingResponse = await this.axios.get('/white-labeling/branding');
          
          if (updatedBrandingResponse.data.success) {
            const updatedBranding = updatedBrandingResponse.data.data;
            console.log(`   ✅ Primary Color Updated: ${updatedBranding.colors.primary}`);
            console.log(`   ✅ Secondary Color Updated: ${updatedBranding.colors.secondary}`);
            console.log(`   ✅ Accent Color Updated: ${updatedBranding.colors.accent}`);
          }
        }
      }
      
    } catch (error) {
      console.error('❌ Error demonstrating theme templates:', error.response?.data?.message || error.message);
    }
  }
  
  /**
   * Demonstrate custom domain setup
   */
  async demonstrateCustomDomainSetup() {
    console.log('\n🌐 === CUSTOM DOMAIN SETUP ===');
    
    try {
      // Validate domain
      const testDomain = 'portal.springfield.edu';
      console.log(`🌐 Validating custom domain: ${testDomain}...`);
      
      const validateResponse = await this.axios.post('/white-labeling/validate-domain', {
        domain: testDomain
      });
      
      if (validateResponse.data.success) {
        const validation = validateResponse.data.data;
        console.log('   ✅ Domain validation initiated');
        console.log(`   🔑 Verification Code: ${validation.verification_code}`);
        console.log('   📋 DNS Instructions:');
        validation.instructions.forEach((instruction, index) => {
          console.log(`      ${index + 1}. ${instruction}`);
        });
        
        // Simulate domain setup (in real scenario, DNS would be configured)
        console.log('\n🔧 Setting up custom domain...');
        const setupResponse = await this.axios.post('/white-labeling/setup-custom-domain', {
          domain: testDomain,
          verification_code: validation.verification_code
        });
        
        if (setupResponse.data.success) {
          const setup = setupResponse.data.data;
          console.log('   ✅ Custom domain setup completed');
          console.log(`   🌐 Domain: ${setup.domain}`);
          console.log(`   ✅ Verified: ${setup.verified}`);
          console.log(`   🔒 SSL Status: ${setup.ssl_status}`);
          console.log('   📋 Next Steps:');
          setup.next_steps.forEach((step, index) => {
            console.log(`      ${index + 1}. ${step}`);
          });
        }
      }
      
      // Check domain status
      console.log('\n📊 Checking domain status...');
      const statusResponse = await this.axios.get('/white-labeling/domain-status');
      
      if (statusResponse.data.success) {
        const status = statusResponse.data.data;
        console.log('   📊 Domain Status:');
        console.log(`      Domain: ${status.domain}`);
        console.log(`      Verified: ${status.custom_domain_verified}`);
        console.log(`      SSL Status: ${status.ssl_certificate_status}`);
        console.log(`      SSL Expires: ${status.ssl_certificate_expires_at || 'N/A'}`);
      }
      
    } catch (error) {
      console.error('❌ Error demonstrating custom domain setup:', error.response?.data?.message || error.message);
    }
  }
  
  /**
   * Demonstrate configuration import/export
   */
  async demonstrateConfigurationManagement() {
    console.log('\n📁 === CONFIGURATION MANAGEMENT ===');
    
    try {
      // Export current configuration
      console.log('📤 Exporting current branding configuration...');
      const exportResponse = await this.axios.get('/white-labeling/export-config', {
        responseType: 'json'
      });
      
      if (exportResponse.data.success) {
        const config = exportResponse.data.data;
        console.log('   ✅ Configuration exported successfully');
        console.log(`   📋 Version: ${config.version}`);
        console.log(`   📅 Exported at: ${config.exported_at}`);
        console.log(`   🏢 Tenant ID: ${config.tenant_id}`);
        
        // Save configuration to file
        const configPath = `/tmp/whitelabel-config-${Date.now()}.json`;
        await fs.writeFile(configPath, JSON.stringify(config, null, 2));
        console.log(`   💾 Configuration saved to: ${configPath}`);
        
        // Modify configuration for import test
        const modifiedConfig = {
          ...config,
          branding_config: {
            ...config.branding_config,
            colors: {
              ...config.branding_config.colors,
              primary: '#059669',    // Green
              secondary: '#10b981',  // Light Green
              accent: '#84cc16'      // Lime Green
            },
            custom_content: {
              ...config.branding_config.custom_content,
              welcome_message: 'Welcome to our imported green theme!',
              footer_text: '© 2024 Springfield High School. Theme imported from configuration file.'
            }
          }
        };
        
        // Import modified configuration
        console.log('\n📥 Importing modified configuration...');
        const importResponse = await this.axios.post('/white-labeling/import-config', {
          config: modifiedConfig,
          overwriteExisting: true
        });
        
        if (importResponse.data.success) {
          console.log('   ✅ Configuration imported successfully');
          console.log(`   📅 Imported at: ${importResponse.data.data.imported_at}`);
          console.log(`   🔄 Overwrite Existing: ${importResponse.data.data.overwrite_existing}`);
          
          // Verify import by checking updated branding
          console.log('\n🔍 Verifying imported configuration...');
          const verifyResponse = await this.axios.get('/white-labeling/branding');
          
          if (verifyResponse.data.success) {
            const importedBranding = verifyResponse.data.data;
            console.log(`   ✅ Primary Color: ${importedBranding.colors.primary}`);
            console.log(`   ✅ Secondary Color: ${importedBranding.colors.secondary}`);
            console.log(`   ✅ Accent Color: ${importedBranding.colors.accent}`);
            console.log(`   ✅ Welcome Message: ${importedBranding.custom_content.welcome_message}`);
          }
        }
      }
      
    } catch (error) {
      console.error('❌ Error demonstrating configuration management:', error.response?.data?.message || error.message);
    }
  }
  
  /**
   * Demonstrate advanced features
   */
  async demonstrateAdvancedFeatures() {
    console.log('\n⚡ === ADVANCED FEATURES ===');
    
    try {
      // Update email templates
      console.log('📧 Updating email templates...');
      const emailTemplates = {
        welcome: {
          subject: 'Welcome to {{school_name}}!',
          body: 'Welcome to our student information system. Your account has been created successfully.',
          template: 'welcome.html'
        },
        password_reset: {
          subject: 'Password Reset - {{school_name}}',
          body: 'Click the link below to reset your password: {{reset_link}}',
          template: 'password-reset.html'
        }
      };
      
      const emailResponse = await this.axios.put('/white-labeling/email-templates', {
        templates: emailTemplates
      });
      
      if (emailResponse.data.success) {
        console.log('   ✅ Email templates updated successfully');
      }
      
      // Update dashboard widgets
      console.log('\n📊 Updating dashboard widgets...');
      const dashboardWidgets = {
        student_stats: {
          enabled: true,
          position: 'top-left',
          size: 'medium'
        },
        attendance_chart: {
          enabled: true,
          position: 'top-right',
          size: 'large'
        },
        recent_activities: {
          enabled: true,
          position: 'bottom-left',
          size: 'medium'
        }
      };
      
      const widgetsResponse = await this.axios.put('/white-labeling/dashboard-widgets', {
        widgetConfig: dashboardWidgets
      });
      
      if (widgetsResponse.data.success) {
        console.log('   ✅ Dashboard widgets updated successfully');
      }
      
      // Update navigation menu
      console.log('\n🧭 Updating navigation menu...');
      const navigationMenu = {
        main: [
          { label: 'Dashboard', icon: 'home', route: '/dashboard' },
          { label: 'Students', icon: 'users', route: '/students' },
          { label: 'Grades', icon: 'book', route: '/grades' },
          { label: 'Attendance', icon: 'calendar', route: '/attendance' }
        ],
        secondary: [
          { label: 'Reports', icon: 'chart', route: '/reports' },
          { label: 'Settings', icon: 'settings', route: '/settings' }
        ]
      };
      
      const navResponse = await this.axios.put('/white-labeling/navigation-menu', {
        menuConfig: navigationMenu
      });
      
      if (navResponse.data.success) {
        console.log('   ✅ Navigation menu updated successfully');
      }
      
      // Update support contact
      console.log('\n📞 Updating support contact...');
      const supportContact = {
        email: 'support@springfield.edu',
        phone: '+1-555-0123',
        hours: 'Monday-Friday 8AM-5PM',
        website: 'https://help.springfield.edu'
      };
      
      const supportResponse = await this.axios.put('/white-labeling/support-contact', {
        supportConfig: supportContact
      });
      
      if (supportResponse.data.success) {
        console.log('   ✅ Support contact updated successfully');
      }
      
      // Update social media
      console.log('\n📱 Updating social media...');
      const socialMedia = {
        facebook: 'https://facebook.com/springfieldhigh',
        twitter: 'https://twitter.com/springfieldhigh',
        instagram: 'https://instagram.com/springfieldhigh',
        linkedin: 'https://linkedin.com/school/springfieldhigh'
      };
      
      const socialResponse = await this.axios.put('/white-labeling/social-media', {
        socialMediaConfig: socialMedia
      });
      
      if (socialResponse.data.success) {
        console.log('   ✅ Social media updated successfully');
      }
      
    } catch (error) {
      console.error('❌ Error demonstrating advanced features:', error.response?.data?.message || error.message);
    }
  }
  
  /**
   * Demonstrate audit and history
   */
  async demonstrateAuditHistory() {
    console.log('\n📋 === AUDIT HISTORY ===');
    
    try {
      // Get audit log
      console.log('📊 Fetching branding audit log...');
      const auditResponse = await this.axios.get('/white-labeling/audit-log?limit=10');
      
      if (auditResponse.data.success) {
        const auditLog = auditResponse.data.data.audit_log;
        console.log(`\n📋 Recent Branding Changes (${auditLog.length}):`);
        
        auditLog.forEach((entry, index) => {
          console.log(`\n${index + 1}. ${entry.action.toUpperCase()}`);
          console.log(`   👤 User: ${entry.user_email || 'System'}`);
          console.log(`   📅 Date: ${new Date(entry.created_at).toLocaleString()}`);
          console.log(`   📊 Data: ${JSON.stringify(entry.data).substring(0, 100)}...`);
        });
      }
      
    } catch (error) {
      console.error('❌ Error demonstrating audit history:', error.response?.data?.message || error.message);
    }
  }
  
  /**
   * Demonstrate reset functionality
   */
  async demonstrateResetFunctionality() {
    console.log('\n🔄 === RESET FUNCTIONALITY ===');
    
    try {
      // Reset to defaults
      console.log('🔄 Resetting branding to defaults...');
      const resetResponse = await this.axios.post('/white-labeling/reset-defaults');
      
      if (resetResponse.data.success) {
        console.log('   ✅ Branding reset to defaults successfully');
        
        // Verify reset
        console.log('\n🔍 Verifying reset...');
        const verifyResponse = await this.axios.get('/white-labeling/branding');
        
        if (verifyResponse.data.success) {
          const resetBranding = verifyResponse.data.data;
          console.log('   ✅ Reset Verification:');
          console.log(`      Primary Color: ${resetBranding.colors.primary}`);
          console.log(`      Font Family: ${resetBranding.typography.font_family}`);
          console.log(`      White-Label Level: ${resetBranding.white_label_config.level}`);
          console.log(`      Custom CSS: ${resetBranding.custom_css ? 'Present' : 'Empty'}`);
        }
      }
      
    } catch (error) {
      console.error('❌ Error demonstrating reset functionality:', error.response?.data?.message || error.message);
    }
  }
  
  /**
   * Generate comprehensive white-labeling report
   */
  async generateWhiteLabelingReport() {
    console.log('\n📄 === GENERATING WHITE-LABELING REPORT ===');
    
    try {
      const reportData = {
        timestamp: new Date().toISOString(),
        tenant: {
          id: this.session.tenant.id,
          name: this.session.tenant.schoolName,
          slug: this.session.tenant.slug
        },
        user: {
          id: this.session.user.id,
          email: this.session.user.email,
          role: this.session.user.role
        },
        white_labeling: {}
      };
      
      // Collect all white-labeling data
      console.log('📊 Collecting white-labeling data for report...');
      
      // Get current branding
      const brandingResponse = await this.axios.get('/white-labeling/branding');
      if (brandingResponse.data.success) {
        reportData.white_labeling.current_branding = brandingResponse.data.data;
      }
      
      // Get theme templates
      const themesResponse = await this.axios.get('/white-labeling/themes');
      if (themesResponse.data.success) {
        reportData.white_labeling.available_themes = themesResponse.data.data.templates;
      }
      
      // Get domain status
      const domainResponse = await this.axios.get('/white-labeling/domain-status');
      if (domainResponse.data.success) {
        reportData.white_labeling.domain_status = domainResponse.data.data;
      }
      
      // Get audit log
      const auditResponse = await this.axios.get('/white-labeling/audit-log?limit=20');
      if (auditResponse.data.success) {
        reportData.white_labeling.recent_changes = auditResponse.data.data.audit_log;
      }
      
      // Save report
      const reportPath = `/tmp/whitelabel-demo-report-${Date.now()}.json`;
      await fs.writeFile(reportPath, JSON.stringify(reportData, null, 2));
      
      console.log('   ✅ White-labeling report generated');
      console.log(`   📄 Report saved to: ${reportPath}`);
      console.log('   📊 Report contains:');
      console.log('      - Current branding configuration');
      console.log(`      - Available theme templates: ${reportData.white_labeling.available_themes?.length || 0}`);
      console.log('      - Domain status information');
      console.log(`      - Recent changes: ${reportData.white_labeling.recent_changes?.length || 0}`);
      
      return reportData;
      
    } catch (error) {
      console.error('❌ Error generating white-labeling report:', error.response?.data?.message || error.message);
      throw error;
    }
  }
  
  /**
   * Run the complete white-labeling demonstration
   */
  async runDemo() {
    console.log('🚀 White-Labeling Demo Client - K-12 SIS');
    console.log('==========================================\n');
    
    try {
      // Authenticate
      await this.authenticate();
      
      // Run all demonstrations
      await this.demonstrateBrandingManagement();
      await this.demonstrateThemeTemplates();
      await this.demonstrateCustomDomainSetup();
      await this.demonstrateConfigurationManagement();
      await this.demonstrateAdvancedFeatures();
      await this.demonstrateAuditHistory();
      await this.demonstrateResetFunctionality();
      await this.generateWhiteLabelingReport();
      
      console.log('\n🎉 White-labeling demonstration completed successfully!');
      console.log('\n📋 Summary of demonstrated features:');
      console.log('   ✅ Branding configuration management');
      console.log('   ✅ Theme template application');
      console.log('   ✅ Custom domain setup');
      console.log('   ✅ Configuration import/export');
      console.log('   ✅ Advanced features (email templates, widgets, navigation)');
      console.log('   ✅ Audit history tracking');
      console.log('   ✅ Reset to defaults functionality');
      console.log('   ✅ Comprehensive reporting');
      
      console.log('\n🎯 Key White-Labeling Capabilities:');
      console.log('   🎨 Complete visual customization (colors, fonts, logos)');
      console.log('   🖼️ Asset management and optimization');
      console.log('   🎨 Pre-built theme templates');
      console.log('   🌐 Custom domain setup with SSL');
      console.log('   📧 Custom email templates');
      console.log('   📊 Dashboard widget customization');
      console.log('   🧭 Navigation menu customization');
      console.log('   📞 Support contact configuration');
      console.log('   📱 Social media integration');
      console.log('   📋 Audit trail and history');
      console.log('   📁 Configuration backup and restore');
      
    } catch (error) {
      console.error('\n❌ White-labeling demonstration failed:', error.message);
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  const client = new WhiteLabelDemoClient({
    baseUrl: process.env.API_BASE_URL || 'http://localhost:3000/api',
    tenantSlug: process.env.TENANT_SLUG || 'springfield',
    email: process.env.ADMIN_EMAIL || 'admin@springfield.edu',
    password: process.env.ADMIN_PASSWORD || 'secure-password'
  });
  
  await client.runDemo();
}

// Export for use as module
module.exports = WhiteLabelDemoClient;

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
