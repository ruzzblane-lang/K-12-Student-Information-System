-- Migration: Enhance white-labeling features for complete customization
-- Description: Add comprehensive white-labeling capabilities for multi-tenant branding
-- Created: 2024-01-15

-- Add additional white-labeling columns to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS favicon_url VARCHAR(500);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS background_image_url VARCHAR(500);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS header_background_color VARCHAR(7);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS footer_background_color VARCHAR(7);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS text_color VARCHAR(7);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS link_color VARCHAR(7);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS button_color VARCHAR(7);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS button_text_color VARCHAR(7);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS accent_color VARCHAR(7);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS border_color VARCHAR(7);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS font_family VARCHAR(100);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS font_size_base VARCHAR(10);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS custom_favicon_url VARCHAR(500);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS custom_apple_touch_icon_url VARCHAR(500);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS custom_manifest_url VARCHAR(500);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS custom_meta_tags JSONB DEFAULT '{}';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS custom_footer_text TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS custom_header_text TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS custom_welcome_message TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS custom_login_message TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS custom_error_pages JSONB DEFAULT '{}';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS custom_email_templates JSONB DEFAULT '{}';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS custom_notification_settings JSONB DEFAULT '{}';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS custom_dashboard_widgets JSONB DEFAULT '{}';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS custom_navigation_menu JSONB DEFAULT '{}';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS custom_feature_flags JSONB DEFAULT '{}';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS custom_terms_of_service TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS custom_privacy_policy TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS custom_help_documentation JSONB DEFAULT '{}';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS custom_api_documentation JSONB DEFAULT '{}';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS custom_support_contact JSONB DEFAULT '{}';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS custom_social_media JSONB DEFAULT '{}';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS custom_analytics_config JSONB DEFAULT '{}';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS custom_integrations JSONB DEFAULT '{}';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS white_label_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS white_label_level VARCHAR(20) DEFAULT 'basic'; -- 'basic', 'advanced', 'enterprise'
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS custom_domain_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS ssl_certificate_status VARCHAR(20) DEFAULT 'pending'; -- 'pending', 'active', 'expired', 'failed'
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS ssl_certificate_expires_at TIMESTAMP WITH TIME ZONE;

-- Add validation constraints for new color fields
ALTER TABLE tenants ADD CONSTRAINT IF NOT EXISTS valid_header_background_color 
    CHECK (header_background_color IS NULL OR header_background_color ~ '^#[0-9A-Fa-f]{6}$');

ALTER TABLE tenants ADD CONSTRAINT IF NOT EXISTS valid_footer_background_color 
    CHECK (footer_background_color IS NULL OR footer_background_color ~ '^#[0-9A-Fa-f]{6}$');

ALTER TABLE tenants ADD CONSTRAINT IF NOT EXISTS valid_text_color 
    CHECK (text_color IS NULL OR text_color ~ '^#[0-9A-Fa-f]{6}$');

ALTER TABLE tenants ADD CONSTRAINT IF NOT EXISTS valid_link_color 
    CHECK (link_color IS NULL OR link_color ~ '^#[0-9A-Fa-f]{6}$');

ALTER TABLE tenants ADD CONSTRAINT IF NOT EXISTS valid_button_color 
    CHECK (button_color IS NULL OR button_color ~ '^#[0-9A-Fa-f]{6}$');

ALTER TABLE tenants ADD CONSTRAINT IF NOT EXISTS valid_button_text_color 
    CHECK (button_text_color IS NULL OR button_text_color ~ '^#[0-9A-Fa-f]{6}$');

ALTER TABLE tenants ADD CONSTRAINT IF NOT EXISTS valid_accent_color 
    CHECK (accent_color IS NULL OR accent_color ~ '^#[0-9A-Fa-f]{6}$');

ALTER TABLE tenants ADD CONSTRAINT IF NOT EXISTS valid_border_color 
    CHECK (border_color IS NULL OR border_color ~ '^#[0-9A-Fa-f]{6}$');

ALTER TABLE tenants ADD CONSTRAINT IF NOT EXISTS valid_white_label_level 
    CHECK (white_label_level IN ('basic', 'advanced', 'enterprise'));

ALTER TABLE tenants ADD CONSTRAINT IF NOT EXISTS valid_ssl_certificate_status 
    CHECK (ssl_certificate_status IN ('pending', 'active', 'expired', 'failed'));

-- Create indexes for white-labeling queries
CREATE INDEX IF NOT EXISTS idx_tenants_white_label_enabled ON tenants(white_label_enabled);
CREATE INDEX IF NOT EXISTS idx_tenants_white_label_level ON tenants(white_label_level);
CREATE INDEX IF NOT EXISTS idx_tenants_custom_domain_verified ON tenants(custom_domain_verified);
CREATE INDEX IF NOT EXISTS idx_tenants_ssl_certificate_status ON tenants(ssl_certificate_status);

-- Create GIN indexes for JSONB white-labeling columns
CREATE INDEX IF NOT EXISTS idx_tenants_custom_meta_tags ON tenants USING GIN (custom_meta_tags);
CREATE INDEX IF NOT EXISTS idx_tenants_custom_error_pages ON tenants USING GIN (custom_error_pages);
CREATE INDEX IF NOT EXISTS idx_tenants_custom_email_templates ON tenants USING GIN (custom_email_templates);
CREATE INDEX IF NOT EXISTS idx_tenants_custom_notification_settings ON tenants USING GIN (custom_notification_settings);
CREATE INDEX IF NOT EXISTS idx_tenants_custom_dashboard_widgets ON tenants USING GIN (custom_dashboard_widgets);
CREATE INDEX IF NOT EXISTS idx_tenants_custom_navigation_menu ON tenants USING GIN (custom_navigation_menu);
CREATE INDEX IF NOT EXISTS idx_tenants_custom_feature_flags ON tenants USING GIN (custom_feature_flags);
CREATE INDEX IF NOT EXISTS idx_tenants_custom_help_documentation ON tenants USING GIN (custom_help_documentation);
CREATE INDEX IF NOT EXISTS idx_tenants_custom_api_documentation ON tenants USING GIN (custom_api_documentation);
CREATE INDEX IF NOT EXISTS idx_tenants_custom_support_contact ON tenants USING GIN (custom_support_contact);
CREATE INDEX IF NOT EXISTS idx_tenants_custom_social_media ON tenants USING GIN (custom_social_media);
CREATE INDEX IF NOT EXISTS idx_tenants_custom_analytics_config ON tenants USING GIN (custom_analytics_config);
CREATE INDEX IF NOT EXISTS idx_tenants_custom_integrations ON tenants USING GIN (custom_integrations);

-- Create a function to get tenant branding configuration
CREATE OR REPLACE FUNCTION get_tenant_branding(tenant_uuid UUID)
RETURNS JSONB AS $$
DECLARE
    branding_config JSONB;
BEGIN
    SELECT jsonb_build_object(
        'tenant_id', id,
        'name', name,
        'school_name', school_name,
        'domain', domain,
        'subdomain', subdomain,
        'logo_url', logo_url,
        'favicon_url', favicon_url,
        'background_image_url', background_image_url,
        'colors', jsonb_build_object(
            'primary', primary_color,
            'secondary', secondary_color,
            'header_background', header_background_color,
            'footer_background', footer_background_color,
            'text', text_color,
            'link', link_color,
            'button', button_color,
            'button_text', button_text_color,
            'accent', accent_color,
            'border', border_color
        ),
        'typography', jsonb_build_object(
            'font_family', font_family,
            'font_size_base', font_size_base
        ),
        'custom_assets', jsonb_build_object(
            'favicon', custom_favicon_url,
            'apple_touch_icon', custom_apple_touch_icon_url,
            'manifest', custom_manifest_url
        ),
        'custom_content', jsonb_build_object(
            'meta_tags', custom_meta_tags,
            'footer_text', custom_footer_text,
            'header_text', custom_header_text,
            'welcome_message', custom_welcome_message,
            'login_message', custom_login_message
        ),
        'custom_pages', custom_error_pages,
        'email_templates', custom_email_templates,
        'notification_settings', custom_notification_settings,
        'dashboard_widgets', custom_dashboard_widgets,
        'navigation_menu', custom_navigation_menu,
        'feature_flags', custom_feature_flags,
        'legal_documents', jsonb_build_object(
            'terms_of_service', custom_terms_of_service,
            'privacy_policy', custom_privacy_policy
        ),
        'documentation', jsonb_build_object(
            'help', custom_help_documentation,
            'api', custom_api_documentation
        ),
        'support', custom_support_contact,
        'social_media', custom_social_media,
        'analytics', custom_analytics_config,
        'integrations', custom_integrations,
        'white_label_config', jsonb_build_object(
            'enabled', white_label_enabled,
            'level', white_label_level,
            'custom_domain_verified', custom_domain_verified,
            'ssl_certificate_status', ssl_certificate_status,
            'ssl_certificate_expires_at', ssl_certificate_expires_at
        ),
        'custom_css', custom_css
    ) INTO branding_config
    FROM tenants
    WHERE id = tenant_uuid AND deleted_at IS NULL;
    
    RETURN branding_config;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to update tenant branding
CREATE OR REPLACE FUNCTION update_tenant_branding(
    tenant_uuid UUID,
    branding_data JSONB,
    updated_by_uuid UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    update_count INTEGER;
BEGIN
    UPDATE tenants SET
        logo_url = COALESCE(branding_data->>'logo_url', logo_url),
        favicon_url = COALESCE(branding_data->>'favicon_url', favicon_url),
        background_image_url = COALESCE(branding_data->>'background_image_url', background_image_url),
        primary_color = COALESCE(branding_data->'colors'->>'primary', primary_color),
        secondary_color = COALESCE(branding_data->'colors'->>'secondary', secondary_color),
        header_background_color = COALESCE(branding_data->'colors'->>'header_background', header_background_color),
        footer_background_color = COALESCE(branding_data->'colors'->>'footer_background', footer_background_color),
        text_color = COALESCE(branding_data->'colors'->>'text', text_color),
        link_color = COALESCE(branding_data->'colors'->>'link', link_color),
        button_color = COALESCE(branding_data->'colors'->>'button', button_color),
        button_text_color = COALESCE(branding_data->'colors'->>'button_text', button_text_color),
        accent_color = COALESCE(branding_data->'colors'->>'accent', accent_color),
        border_color = COALESCE(branding_data->'colors'->>'border', border_color),
        font_family = COALESCE(branding_data->'typography'->>'font_family', font_family),
        font_size_base = COALESCE(branding_data->'typography'->>'font_size_base', font_size_base),
        custom_favicon_url = COALESCE(branding_data->'custom_assets'->>'favicon', custom_favicon_url),
        custom_apple_touch_icon_url = COALESCE(branding_data->'custom_assets'->>'apple_touch_icon', custom_apple_touch_icon_url),
        custom_manifest_url = COALESCE(branding_data->'custom_assets'->>'manifest', custom_manifest_url),
        custom_meta_tags = COALESCE(branding_data->'custom_content'->'meta_tags', custom_meta_tags),
        custom_footer_text = COALESCE(branding_data->'custom_content'->>'footer_text', custom_footer_text),
        custom_header_text = COALESCE(branding_data->'custom_content'->>'header_text', custom_header_text),
        custom_welcome_message = COALESCE(branding_data->'custom_content'->>'welcome_message', custom_welcome_message),
        custom_login_message = COALESCE(branding_data->'custom_content'->>'login_message', custom_login_message),
        custom_error_pages = COALESCE(branding_data->'custom_pages', custom_error_pages),
        custom_email_templates = COALESCE(branding_data->'email_templates', custom_email_templates),
        custom_notification_settings = COALESCE(branding_data->'notification_settings', custom_notification_settings),
        custom_dashboard_widgets = COALESCE(branding_data->'dashboard_widgets', custom_dashboard_widgets),
        custom_navigation_menu = COALESCE(branding_data->'navigation_menu', custom_navigation_menu),
        custom_feature_flags = COALESCE(branding_data->'feature_flags', custom_feature_flags),
        custom_terms_of_service = COALESCE(branding_data->'legal_documents'->>'terms_of_service', custom_terms_of_service),
        custom_privacy_policy = COALESCE(branding_data->'legal_documents'->>'privacy_policy', custom_privacy_policy),
        custom_help_documentation = COALESCE(branding_data->'documentation'->'help', custom_help_documentation),
        custom_api_documentation = COALESCE(branding_data->'documentation'->>'api', custom_api_documentation),
        custom_support_contact = COALESCE(branding_data->'support', custom_support_contact),
        custom_social_media = COALESCE(branding_data->'social_media', custom_social_media),
        custom_analytics_config = COALESCE(branding_data->'analytics', custom_analytics_config),
        custom_integrations = COALESCE(branding_data->'integrations', custom_integrations),
        white_label_enabled = COALESCE((branding_data->'white_label_config'->>'enabled')::BOOLEAN, white_label_enabled),
        white_label_level = COALESCE(branding_data->'white_label_config'->>'level', white_label_level),
        custom_css = COALESCE(branding_data->>'custom_css', custom_css),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = tenant_uuid AND deleted_at IS NULL;
    
    GET DIAGNOSTICS update_count = ROW_COUNT;
    
    -- Log the branding update
    INSERT INTO audit_logs (
        tenant_id,
        user_id,
        action,
        resource_type,
        resource_id,
        new_values,
        success
    ) VALUES (
        tenant_uuid,
        updated_by_uuid,
        'update',
        'tenant_branding',
        tenant_uuid,
        branding_data,
        update_count > 0
    );
    
    RETURN update_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to validate custom domain
CREATE OR REPLACE FUNCTION validate_custom_domain(tenant_uuid UUID, domain_name TEXT)
RETURNS JSONB AS $$
DECLARE
    validation_result JSONB;
    domain_exists BOOLEAN;
BEGIN
    -- Check if domain is already in use by another tenant
    SELECT EXISTS(
        SELECT 1 FROM tenants 
        WHERE domain = domain_name 
        AND id != tenant_uuid 
        AND deleted_at IS NULL
    ) INTO domain_exists;
    
    IF domain_exists THEN
        validation_result := jsonb_build_object(
            'valid', false,
            'error', 'Domain already in use by another tenant',
            'code', 'DOMAIN_IN_USE'
        );
    ELSE
        validation_result := jsonb_build_object(
            'valid', true,
            'message', 'Domain is available',
            'verification_required', true,
            'verification_code', encode(gen_random_bytes(32), 'hex')
        );
    END IF;
    
    RETURN validation_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to generate white-label CSS
CREATE OR REPLACE FUNCTION generate_white_label_css(tenant_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    tenant_record RECORD;
    css_content TEXT;
BEGIN
    SELECT 
        primary_color,
        secondary_color,
        header_background_color,
        footer_background_color,
        text_color,
        link_color,
        button_color,
        button_text_color,
        accent_color,
        border_color,
        font_family,
        font_size_base,
        custom_css
    INTO tenant_record
    FROM tenants
    WHERE id = tenant_uuid AND deleted_at IS NULL;
    
    -- Generate CSS variables
    css_content := ':root {';
    
    IF tenant_record.primary_color IS NOT NULL THEN
        css_content := css_content || E'\n  --primary-color: ' || tenant_record.primary_color || ';';
    END IF;
    
    IF tenant_record.secondary_color IS NOT NULL THEN
        css_content := css_content || E'\n  --secondary-color: ' || tenant_record.secondary_color || ';';
    END IF;
    
    IF tenant_record.header_background_color IS NOT NULL THEN
        css_content := css_content || E'\n  --header-bg: ' || tenant_record.header_background_color || ';';
    END IF;
    
    IF tenant_record.footer_background_color IS NOT NULL THEN
        css_content := css_content || E'\n  --footer-bg: ' || tenant_record.footer_background_color || ';';
    END IF;
    
    IF tenant_record.text_color IS NOT NULL THEN
        css_content := css_content || E'\n  --text-color: ' || tenant_record.text_color || ';';
    END IF;
    
    IF tenant_record.link_color IS NOT NULL THEN
        css_content := css_content || E'\n  --link-color: ' || tenant_record.link_color || ';';
    END IF;
    
    IF tenant_record.button_color IS NOT NULL THEN
        css_content := css_content || E'\n  --button-bg: ' || tenant_record.button_color || ';';
    END IF;
    
    IF tenant_record.button_text_color IS NOT NULL THEN
        css_content := css_content || E'\n  --button-text: ' || tenant_record.button_text_color || ';';
    END IF;
    
    IF tenant_record.accent_color IS NOT NULL THEN
        css_content := css_content || E'\n  --accent-color: ' || tenant_record.accent_color || ';';
    END IF;
    
    IF tenant_record.border_color IS NOT NULL THEN
        css_content := css_content || E'\n  --border-color: ' || tenant_record.border_color || ';';
    END IF;
    
    IF tenant_record.font_family IS NOT NULL THEN
        css_content := css_content || E'\n  --font-family: ' || tenant_record.font_family || ';';
    END IF;
    
    IF tenant_record.font_size_base IS NOT NULL THEN
        css_content := css_content || E'\n  --font-size-base: ' || tenant_record.font_size_base || ';';
    END IF;
    
    css_content := css_content || E'\n}';
    
    -- Add custom CSS if provided
    IF tenant_record.custom_css IS NOT NULL AND tenant_record.custom_css != '' THEN
        css_content := css_content || E'\n\n/* Custom CSS */\n' || tenant_record.custom_css;
    END IF;
    
    RETURN css_content;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_tenant_branding(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_tenant_branding(UUID, JSONB, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_custom_domain(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_white_label_css(UUID) TO authenticated;

-- Documentation for white-labeling JSONB columns:
-- 
-- custom_meta_tags: SEO and meta information
-- {
--   "title": "Springfield High School - Student Portal",
--   "description": "Access your student information and grades",
--   "keywords": ["education", "student", "grades", "springfield"],
--   "og_title": "Springfield High School",
--   "og_description": "Student Information System",
--   "og_image": "https://cdn.example.com/springfield-logo.png",
--   "twitter_card": "summary_large_image"
-- }
--
-- custom_error_pages: Custom error page content
-- {
--   "404": {
--     "title": "Page Not Found",
--     "message": "The page you're looking for doesn't exist.",
--     "image_url": "https://cdn.example.com/404-image.png"
--   },
--   "500": {
--     "title": "Server Error",
--     "message": "Something went wrong. Please try again later.",
--     "image_url": "https://cdn.example.com/500-image.png"
--   }
-- }
--
-- custom_email_templates: Email template customization
-- {
--   "welcome": {
--     "subject": "Welcome to {{school_name}} Student Portal",
--     "template": "<html>...</html>",
--     "from_name": "{{school_name}} Administration"
--   },
--   "password_reset": {
--     "subject": "Reset Your Password - {{school_name}}",
--     "template": "<html>...</html>"
--   }
-- }
--
-- custom_dashboard_widgets: Dashboard customization
-- {
--   "enabled_widgets": ["grades", "attendance", "announcements", "calendar"],
--   "layout": "grid",
--   "widget_order": ["announcements", "grades", "attendance", "calendar"],
--   "custom_widgets": [
--     {
--       "id": "school_news",
--       "title": "School News",
--       "type": "rss_feed",
--       "config": {"url": "https://springfield.edu/news/rss"}
--     }
--   ]
-- }
--
-- custom_navigation_menu: Navigation menu customization
-- {
--   "main_menu": [
--     {"label": "Dashboard", "url": "/dashboard", "icon": "home"},
--     {"label": "Grades", "url": "/grades", "icon": "chart"},
--     {"label": "Attendance", "url": "/attendance", "icon": "calendar"}
--   ],
--   "footer_menu": [
--     {"label": "About", "url": "/about"},
--     {"label": "Contact", "url": "/contact"},
--     {"label": "Privacy Policy", "url": "/privacy"}
--   ]
-- }
--
-- custom_support_contact: Support information
-- {
--   "email": "support@springfield.edu",
--   "phone": "+1-555-123-4567",
--   "hours": "Monday-Friday 8AM-5PM",
--   "chat_enabled": true,
--   "ticket_system": "zendesk",
--   "knowledge_base_url": "https://help.springfield.edu"
-- }
--
-- custom_social_media: Social media links
-- {
--   "facebook": "https://facebook.com/springfieldhigh",
--   "twitter": "https://twitter.com/springfieldhigh",
--   "instagram": "https://instagram.com/springfieldhigh",
--   "linkedin": "https://linkedin.com/school/springfield-high"
-- }
--
-- custom_analytics_config: Analytics configuration
-- {
--   "google_analytics_id": "GA-XXXXXXXXX",
--   "google_tag_manager_id": "GTM-XXXXXXX",
--   "facebook_pixel_id": "123456789",
--   "custom_events": ["login", "grade_view", "attendance_check"]
-- }
--
-- custom_integrations: Third-party integrations
-- {
--   "google_workspace": {
--     "enabled": true,
--     "domain": "springfield.edu",
--     "sync_users": true
--   },
--   "microsoft_365": {
--     "enabled": false
--   },
--   "canvas_lms": {
--     "enabled": true,
--     "api_url": "https://springfield.instructure.com",
--     "api_key": "encrypted_key_here"
--   }
-- }
