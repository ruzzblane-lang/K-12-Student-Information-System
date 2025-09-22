/**
 * White-Labeling Service
 * Handles tenant branding, customization, and white-label features
 */

const db = require('../config/database');
const { validationResult } = require('express-validator');

class WhiteLabelingService {
    /**
     * Get tenant branding configuration
     */
    async getTenantBranding(tenantId, userId) {
        try {
            const result = await db.query('SELECT get_tenant_branding($1) as branding', [tenantId]);
            
            if (!result.rows[0] || !result.rows[0].branding) {
                throw new Error('Tenant branding configuration not found');
            }

            return result.rows[0].branding;
        } catch (error) {
            console.error('Error getting tenant branding:', error);
            throw error;
        }
    }

    /**
     * Update tenant branding configuration
     */
    async updateTenantBranding(tenantId, brandingData, userId) {
        try {
            const result = await db.query(
                'SELECT update_tenant_branding($1, $2, $3) as updated',
                [tenantId, JSON.stringify(brandingData), userId]
            );

            return result.rows[0].updated;
        } catch (error) {
            console.error('Error updating tenant branding:', error);
            throw error;
        }
    }

    /**
     * Generate CSS for tenant branding
     */
    async generateTenantCSS(tenantId) {
        try {
            const result = await db.query('SELECT generate_white_label_css($1) as css', [tenantId]);
            
            if (!result.rows[0] || !result.rows[0].css) {
                throw new Error('Failed to generate CSS');
            }

            return result.rows[0].css;
        } catch (error) {
            console.error('Error generating CSS:', error);
            throw error;
        }
    }

    /**
     * Update email templates
     */
    async updateEmailTemplates(tenantId, templates, userId) {
        try {
            const brandingData = {
                email_templates: templates
            };

            return await this.updateTenantBranding(tenantId, brandingData, userId);
        } catch (error) {
            console.error('Error updating email templates:', error);
            throw error;
        }
    }

    /**
     * Update dashboard widgets
     */
    async updateDashboardWidgets(tenantId, widgetConfig, userId) {
        try {
            const brandingData = {
                dashboard_widgets: widgetConfig
            };

            return await this.updateTenantBranding(tenantId, brandingData, userId);
        } catch (error) {
            console.error('Error updating dashboard widgets:', error);
            throw error;
        }
    }

    /**
     * Update navigation menu
     */
    async updateNavigationMenu(tenantId, menuConfig, userId) {
        try {
            const brandingData = {
                navigation_menu: menuConfig
            };

            return await this.updateTenantBranding(tenantId, brandingData, userId);
        } catch (error) {
            console.error('Error updating navigation menu:', error);
            throw error;
        }
    }

    /**
     * Update support contact
     */
    async updateSupportContact(tenantId, supportConfig, userId) {
        try {
            const brandingData = {
                support: supportConfig
            };

            return await this.updateTenantBranding(tenantId, brandingData, userId);
        } catch (error) {
            console.error('Error updating support contact:', error);
            throw error;
        }
    }

    /**
     * Update social media
     */
    async updateSocialMedia(tenantId, socialMediaConfig, userId) {
        try {
            const brandingData = {
                social_media: socialMediaConfig
            };

            return await this.updateTenantBranding(tenantId, brandingData, userId);
        } catch (error) {
            console.error('Error updating social media:', error);
            throw error;
        }
    }

    /**
     * Update analytics configuration
     */
    async updateAnalytics(tenantId, analyticsConfig, userId) {
        try {
            const brandingData = {
                analytics: analyticsConfig
            };

            return await this.updateTenantBranding(tenantId, brandingData, userId);
        } catch (error) {
            console.error('Error updating analytics:', error);
            throw error;
        }
    }

    /**
     * Update legal documents
     */
    async updateLegalDocuments(tenantId, legalDocs, userId) {
        try {
            const brandingData = {
                legal_documents: legalDocs
            };

            return await this.updateTenantBranding(tenantId, brandingData, userId);
        } catch (error) {
            console.error('Error updating legal documents:', error);
            throw error;
        }
    }

    /**
     * Get branding preview
     */
    async getBrandingPreview(tenantId) {
        try {
            const branding = await this.getTenantBranding(tenantId);
            const css = await this.generateTenantCSS(tenantId);

            return {
                branding,
                css,
                preview_url: `${process.env.APP_URL}/preview/${tenantId}`,
                generated_at: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error getting branding preview:', error);
            throw error;
        }
    }

    /**
     * Reset to defaults
     */
    async resetToDefaults(tenantId, userId) {
        try {
            const defaultBranding = {
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
                white_label_config: {
                    enabled: true,
                    level: 'basic'
                }
            };

            return await this.updateTenantBranding(tenantId, defaultBranding, userId);
        } catch (error) {
            console.error('Error resetting to defaults:', error);
            throw error;
        }
    }

    /**
     * Export branding configuration
     */
    async exportBrandingConfig(tenantId) {
        try {
            const branding = await this.getTenantBranding(tenantId);
            
            return {
                version: '1.0',
                exported_at: new Date().toISOString(),
                tenant_id: tenantId,
                branding_config: branding
            };
        } catch (error) {
            console.error('Error exporting config:', error);
            throw error;
        }
    }

    /**
     * Import branding configuration
     */
    async importBrandingConfig(tenantId, config, overwriteExisting, userId) {
        try {
            if (!config.branding_config) {
                throw new Error('Invalid configuration format');
            }

            const brandingData = config.branding_config;

            // If not overwriting, merge with existing configuration
            if (!overwriteExisting) {
                const existingBranding = await this.getTenantBranding(tenantId);
                // Deep merge logic would go here
                // For now, we'll use the imported config as-is
            }

            return await this.updateTenantBranding(tenantId, brandingData, userId);
        } catch (error) {
            console.error('Error importing config:', error);
            throw error;
        }
    }

    /**
     * Validate branding configuration
     */
    validateBrandingConfig(config) {
        const errors = [];

        // Validate colors
        if (config.colors) {
            const colorFields = [
                'primary', 'secondary', 'header_background', 'footer_background',
                'text', 'link', 'button', 'button_text', 'accent', 'border'
            ];

            colorFields.forEach(field => {
                if (config.colors[field] && !/^#[0-9A-Fa-f]{6}$/.test(config.colors[field])) {
                    errors.push(`Invalid color format for ${field}: ${config.colors[field]}`);
                }
            });
        }

        // Validate URLs
        const urlFields = ['logo_url', 'favicon_url', 'background_image_url'];
        urlFields.forEach(field => {
            if (config[field] && !this.isValidUrl(config[field])) {
                errors.push(`Invalid URL format for ${field}: ${config[field]}`);
            }
        });

        // Validate white label level
        if (config.white_label_config && config.white_label_config.level) {
            const validLevels = ['basic', 'advanced', 'enterprise'];
            if (!validLevels.includes(config.white_label_config.level)) {
                errors.push(`Invalid white label level: ${config.white_label_config.level}`);
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Get default branding configuration
     */
    getDefaultBranding() {
        return {
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
            custom_content: {
                footer_text: '© 2024 Student Information System. All rights reserved.',
                welcome_message: 'Welcome to your student portal!',
                login_message: 'Please sign in to access your account.'
            },
            white_label_config: {
                enabled: true,
                level: 'basic'
            }
        };
    }

    /**
     * Helper method to validate URLs
     */
    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    /**
     * Get branding statistics
     */
    async getBrandingStats(tenantId) {
        try {
            const branding = await this.getTenantBranding(tenantId);
            
            const stats = {
                customization_level: this.calculateCustomizationLevel(branding),
                assets_uploaded: this.countUploadedAssets(branding),
                features_enabled: this.countEnabledFeatures(branding),
                last_updated: branding.updated_at || branding.created_at
            };

            return stats;
        } catch (error) {
            console.error('Error getting branding stats:', error);
            throw error;
        }
    }

    /**
     * Calculate customization level
     */
    calculateCustomizationLevel(branding) {
        let score = 0;
        const maxScore = 100;

        // Color customization (30 points)
        if (branding.colors) {
            const colorFields = Object.keys(branding.colors);
            score += Math.min(colorFields.length * 3, 30);
        }

        // Asset customization (25 points)
        if (branding.custom_assets) {
            const assetFields = Object.keys(branding.custom_assets);
            score += Math.min(assetFields.length * 5, 25);
        }

        // Content customization (20 points)
        if (branding.custom_content) {
            const contentFields = Object.keys(branding.custom_content);
            score += Math.min(contentFields.length * 4, 20);
        }

        // Advanced features (25 points)
        if (branding.custom_dashboard_widgets) score += 5;
        if (branding.custom_navigation_menu) score += 5;
        if (branding.custom_email_templates) score += 5;
        if (branding.custom_support_contact) score += 5;
        if (branding.custom_analytics_config) score += 5;

        return Math.round((score / maxScore) * 100);
    }

    /**
     * Count uploaded assets
     */
    countUploadedAssets(branding) {
        let count = 0;
        
        if (branding.logo_url) count++;
        if (branding.favicon_url) count++;
        if (branding.background_image_url) count++;
        if (branding.custom_assets) {
            const assetFields = Object.values(branding.custom_assets);
            count += assetFields.filter(asset => asset).length;
        }

        return count;
    }

    /**
     * Count enabled features
     */
    countEnabledFeatures(branding) {
        let count = 0;
        
        const featureFields = [
            'custom_dashboard_widgets',
            'custom_navigation_menu',
            'custom_email_templates',
            'custom_support_contact',
            'custom_analytics_config',
            'custom_social_media',
            'custom_integrations'
        ];

        featureFields.forEach(field => {
            if (branding[field] && Object.keys(branding[field]).length > 0) {
                count++;
            }
        });

        return count;
    }
}

module.exports = new WhiteLabelingService();
