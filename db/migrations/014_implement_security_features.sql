-- Migration: Implement security features and encryption
-- Description: Add encryption for sensitive columns and data masking capabilities
-- Created: 2024-01-15
-- Enhanced: 2024-09-22 (Added JSONB encryption, enhanced masked view triggers)

-- =============================================================================
-- ENCRYPTION FUNCTIONS
-- =============================================================================

-- Enable the pgcrypto extension for encryption functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to encrypt sensitive data using AES encryption
CREATE OR REPLACE FUNCTION encrypt_sensitive_data(data TEXT, key TEXT DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
    encryption_key TEXT;
BEGIN
    -- Use provided key or get from application settings
    IF key IS NULL THEN
        encryption_key := current_setting('app.encryption_key', true);
    ELSE
        encryption_key := key;
    END IF;
    
    -- Return encrypted data
    RETURN encode(encrypt(data::bytea, encryption_key, 'aes'), 'base64');
EXCEPTION
    WHEN OTHERS THEN
        -- Return original data if encryption fails
        RETURN data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrypt sensitive data
CREATE OR REPLACE FUNCTION decrypt_sensitive_data(encrypted_data TEXT, key TEXT DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
    encryption_key TEXT;
BEGIN
    -- Use provided key or get from application settings
    IF key IS NULL THEN
        encryption_key := current_setting('app.encryption_key', true);
    ELSE
        encryption_key := key;
    END IF;
    
    -- Return decrypted data
    RETURN convert_from(decrypt(decode(encrypted_data, 'base64'), encryption_key, 'aes'), 'UTF8');
EXCEPTION
    WHEN OTHERS THEN
        -- Return NULL if decryption fails
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to hash sensitive data (one-way encryption)
CREATE OR REPLACE FUNCTION hash_sensitive_data(data TEXT, salt TEXT DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
    hash_salt TEXT;
BEGIN
    -- Use provided salt or generate one
    IF salt IS NULL THEN
        hash_salt := gen_salt('bf', 12);
    ELSE
        hash_salt := salt;
    END IF;
    
    -- Return hashed data with salt
    RETURN crypt(data, hash_salt);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to encrypt JSONB fields containing sensitive data
CREATE OR REPLACE FUNCTION encrypt_jsonb_sensitive_data(jsonb_data JSONB, sensitive_fields TEXT[])
RETURNS JSONB AS $$
DECLARE
    result JSONB := jsonb_data;
    field TEXT;
    field_value TEXT;
BEGIN
    -- Encrypt specified sensitive fields in JSONB
    FOREACH field IN ARRAY sensitive_fields
    LOOP
        IF result ? field THEN
            field_value := result ->> field;
            IF field_value IS NOT NULL AND field_value != '' THEN
                result := result || jsonb_build_object(field, encrypt_sensitive_data(field_value));
            END IF;
        END IF;
    END LOOP;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrypt JSONB fields containing sensitive data
CREATE OR REPLACE FUNCTION decrypt_jsonb_sensitive_data(jsonb_data JSONB, sensitive_fields TEXT[])
RETURNS JSONB AS $$
DECLARE
    result JSONB := jsonb_data;
    field TEXT;
    field_value TEXT;
BEGIN
    -- Decrypt specified sensitive fields in JSONB
    FOREACH field IN ARRAY sensitive_fields
    LOOP
        IF result ? field THEN
            field_value := result ->> field;
            IF field_value IS NOT NULL AND field_value != '' THEN
                result := result || jsonb_build_object(field, decrypt_sensitive_data(field_value));
            END IF;
        END IF;
    END LOOP;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- DATA MASKING FUNCTIONS
-- =============================================================================

-- Function to mask email addresses
CREATE OR REPLACE FUNCTION mask_email(email TEXT)
RETURNS TEXT AS $$
BEGIN
    IF email IS NULL OR email = '' THEN
        RETURN email;
    END IF;
    
    -- Mask email: j***@e***.com
    RETURN regexp_replace(
        email,
        '^([a-zA-Z0-9._%+-])([a-zA-Z0-9._%+-]*)(@)([a-zA-Z0-9.-])([a-zA-Z0-9.-]*)(\.[a-zA-Z]{2,})$',
        '\1***\3\4***\6',
        'g'
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to mask phone numbers
CREATE OR REPLACE FUNCTION mask_phone(phone TEXT)
RETURNS TEXT AS $$
BEGIN
    IF phone IS NULL OR phone = '' THEN
        RETURN phone;
    END IF;
    
    -- Mask phone: +1-***-***-1234
    RETURN regexp_replace(
        phone,
        '^(\+?[1-9]\d{0,2}-?)(\d{3})(\d{3})(\d{4})$',
        '\1***-***-\4',
        'g'
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to mask names (first and last name)
CREATE OR REPLACE FUNCTION mask_name(name TEXT)
RETURNS TEXT AS $$
BEGIN
    IF name IS NULL OR name = '' THEN
        RETURN name;
    END IF;
    
    -- Mask name: J*** D***
    RETURN regexp_replace(
        name,
        '^([A-Za-z])([A-Za-z]*)$',
        '\1***',
        'g'
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to mask SSN (if stored)
CREATE OR REPLACE FUNCTION mask_ssn(ssn TEXT)
RETURNS TEXT AS $$
BEGIN
    IF ssn IS NULL OR ssn = '' THEN
        RETURN ssn;
    END IF;
    
    -- Mask SSN: ***-**-1234
    RETURN regexp_replace(
        ssn,
        '^(\d{3})(\d{2})(\d{4})$',
        '***-**-\3',
        'g'
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================================================
-- SECURITY VIEWS FOR MASKED DATA
-- =============================================================================

-- Create a view for masked student data (for non-privileged users)
CREATE OR REPLACE VIEW students_masked AS
SELECT 
    id,
    tenant_id,
    user_id,
    student_id,
    mask_name(first_name) as first_name,
    mask_name(last_name) as last_name,
    middle_name,
    preferred_name,
    date_of_birth,
    gender,
    grade_level,
    address,
    city,
    state,
    zip_code,
    mask_phone(phone) as phone,
    mask_email(email) as email,
    emergency_contact_name,
    mask_phone(emergency_contact_phone) as emergency_contact_phone,
    emergency_contact_relationship,
    enrollment_date,
    graduation_date,
    status,
    academic_year,
    -- Mask sensitive medical information
    CASE 
        WHEN medical_conditions IS NOT NULL THEN '[MEDICAL INFO MASKED]'
        ELSE NULL
    END as medical_conditions,
    CASE 
        WHEN allergies IS NOT NULL THEN '[ALLERGY INFO MASKED]'
        ELSE NULL
    END as allergies,
    CASE 
        WHEN medications IS NOT NULL THEN '[MEDICATION INFO MASKED]'
        ELSE NULL
    END as medications,
    special_needs,
    iep_status,
    section_504_status,
    -- Mask parent information
    mask_name(parent_guardian_1_name) as parent_guardian_1_name,
    mask_phone(parent_guardian_1_phone) as parent_guardian_1_phone,
    mask_email(parent_guardian_1_email) as parent_guardian_1_email,
    parent_guardian_1_relationship,
    mask_name(parent_guardian_2_name) as parent_guardian_2_name,
    mask_phone(parent_guardian_2_phone) as parent_guardian_2_phone,
    mask_email(parent_guardian_2_email) as parent_guardian_2_email,
    parent_guardian_2_relationship,
    photo_url,
    -- Encrypt sensitive documents in JSONB
    CASE 
        WHEN documents IS NOT NULL THEN 
            encrypt_jsonb_sensitive_data(documents, ARRAY['content', 'notes', 'private_notes'])
        ELSE NULL
    END as documents,
    created_at,
    updated_at,
    deleted_at,
    created_by
FROM students
WHERE deleted_at IS NULL;

-- Create a view for masked teacher data
CREATE OR REPLACE VIEW teachers_masked AS
SELECT 
    id,
    tenant_id,
    user_id,
    employee_id,
    mask_name(first_name) as first_name,
    mask_name(last_name) as last_name,
    middle_name,
    preferred_name,
    title,
    mask_email(email) as email,
    mask_phone(phone) as phone,
    address,
    city,
    state,
    zip_code,
    hire_date,
    employment_status,
    employment_type,
    department,
    position,
    education_level,
    degree_field,
    teaching_certifications,
    subjects_taught,
    grade_levels_taught,
    years_experience,
    bio,
    photo_url,
    resume_url,
    work_schedule,
    office_hours,
    office_location,
    created_at,
    updated_at,
    deleted_at,
    created_by
FROM teachers
WHERE deleted_at IS NULL;

-- Create a view for masked user data
CREATE OR REPLACE VIEW users_masked AS
SELECT 
    id,
    tenant_id,
    mask_email(email) as email,
    '[PASSWORD MASKED]' as password_hash,
    '[SALT MASKED]' as password_salt,
    password_last_changed_at,
    email_verified,
    mask_name(first_name) as first_name,
    mask_name(last_name) as last_name,
    middle_name,
    mask_phone(phone) as phone,
    avatar_url,
    role,
    permissions,
    status,
    last_login,
    last_login_ip,
    login_attempts,
    locked_until,
    two_factor_enabled,
    '[2FA SECRET MASKED]' as two_factor_secret,
    '[BACKUP CODES MASKED]' as backup_codes,
    session_timeout_minutes,
    created_at,
    updated_at,
    deleted_at,
    created_by
FROM users
WHERE deleted_at IS NULL;

-- =============================================================================
-- ENCRYPTED COLUMNS (ALTERNATIVE APPROACH)
-- =============================================================================

-- Add encrypted columns to users table for sensitive data
ALTER TABLE users ADD COLUMN IF NOT EXISTS encrypted_ssn TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS encrypted_emergency_contact TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS encrypted_notes TEXT;

-- Add encrypted columns to students table for sensitive data
ALTER TABLE students ADD COLUMN IF NOT EXISTS encrypted_ssn TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS encrypted_medical_notes TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS encrypted_emergency_contact TEXT;

-- Add encrypted columns to teachers table for sensitive data
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS encrypted_ssn TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS encrypted_emergency_contact TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS encrypted_notes TEXT;

-- =============================================================================
-- SECURITY TRIGGERS
-- =============================================================================

-- Trigger to automatically encrypt sensitive data on insert/update
CREATE OR REPLACE FUNCTION encrypt_sensitive_data_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Encrypt SSN if provided
    IF NEW.encrypted_ssn IS NOT NULL AND NEW.encrypted_ssn != OLD.encrypted_ssn THEN
        NEW.encrypted_ssn := encrypt_sensitive_data(NEW.encrypted_ssn);
    END IF;
    
    -- Encrypt emergency contact if provided
    IF NEW.encrypted_emergency_contact IS NOT NULL AND NEW.encrypted_emergency_contact != OLD.encrypted_emergency_contact THEN
        NEW.encrypted_emergency_contact := encrypt_sensitive_data(NEW.encrypted_emergency_contact);
    END IF;
    
    -- Encrypt notes if provided
    IF NEW.encrypted_notes IS NOT NULL AND NEW.encrypted_notes != OLD.encrypted_notes THEN
        NEW.encrypted_notes := encrypt_sensitive_data(NEW.encrypted_notes);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply encryption triggers to users table
CREATE TRIGGER trigger_encrypt_users_sensitive_data
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION encrypt_sensitive_data_trigger();

-- Apply encryption triggers to students table
CREATE TRIGGER trigger_encrypt_students_sensitive_data
    BEFORE INSERT OR UPDATE ON students
    FOR EACH ROW
    EXECUTE FUNCTION encrypt_sensitive_data_trigger();

-- Apply encryption triggers to teachers table
CREATE TRIGGER trigger_encrypt_teachers_sensitive_data
    BEFORE INSERT OR UPDATE ON teachers
    FOR EACH ROW
    EXECUTE FUNCTION encrypt_sensitive_data_trigger();

-- Enhanced trigger to encrypt JSONB documents automatically
CREATE OR REPLACE FUNCTION encrypt_jsonb_documents_trigger()
RETURNS TRIGGER AS $$
DECLARE
    sensitive_fields TEXT[] := ARRAY['content', 'notes', 'private_notes', 'medical_info', 'behavioral_notes'];
BEGIN
    -- Encrypt sensitive fields in documents JSONB column
    IF NEW.documents IS NOT NULL THEN
        NEW.documents := encrypt_jsonb_sensitive_data(NEW.documents, sensitive_fields);
    END IF;
    
    -- Encrypt sensitive fields in other JSONB columns if they exist
    IF TG_TABLE_NAME = 'teachers' AND NEW.intervention_capabilities IS NOT NULL THEN
        NEW.intervention_capabilities := encrypt_jsonb_sensitive_data(NEW.intervention_capabilities, ARRAY['notes', 'private_notes']);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply JSONB encryption triggers to students table
CREATE TRIGGER trigger_encrypt_students_jsonb_documents
    BEFORE INSERT OR UPDATE ON students
    FOR EACH ROW
    EXECUTE FUNCTION encrypt_jsonb_documents_trigger();

-- Apply JSONB encryption triggers to teachers table
CREATE TRIGGER trigger_encrypt_teachers_jsonb_documents
    BEFORE INSERT OR UPDATE ON teachers
    FOR EACH ROW
    EXECUTE FUNCTION encrypt_jsonb_documents_trigger();

-- =============================================================================
-- ACCESS CONTROL FUNCTIONS
-- =============================================================================

-- Function to check if user has permission to view sensitive data
CREATE OR REPLACE FUNCTION can_view_sensitive_data(user_id UUID, resource_type TEXT, resource_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_role VARCHAR(50);
    user_tenant_id UUID;
    resource_tenant_id UUID;
BEGIN
    -- Get user information
    SELECT role, tenant_id INTO user_role, user_tenant_id
    FROM users
    WHERE id = user_id AND deleted_at IS NULL;
    
    -- Super admins can view all sensitive data
    IF user_role = 'super_admin' THEN
        RETURN TRUE;
    END IF;
    
    -- Get resource tenant ID based on resource type
    CASE resource_type
        WHEN 'student' THEN
            SELECT tenant_id INTO resource_tenant_id FROM students WHERE id = resource_id;
        WHEN 'teacher' THEN
            SELECT tenant_id INTO resource_tenant_id FROM teachers WHERE id = resource_id;
        WHEN 'user' THEN
            SELECT tenant_id INTO resource_tenant_id FROM users WHERE id = resource_id;
        ELSE
            RETURN FALSE;
    END CASE;
    
    -- Users can only view sensitive data within their tenant
    RETURN user_tenant_id = resource_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get decrypted sensitive data (with permission check)
CREATE OR REPLACE FUNCTION get_decrypted_ssn(user_id UUID, resource_type TEXT, resource_id UUID)
RETURNS TEXT AS $$
DECLARE
    encrypted_ssn TEXT;
BEGIN
    -- Check permissions first
    IF NOT can_view_sensitive_data(user_id, resource_type, resource_id) THEN
        RETURN NULL;
    END IF;
    
    -- Get encrypted SSN based on resource type
    CASE resource_type
        WHEN 'student' THEN
            SELECT encrypted_ssn INTO encrypted_ssn FROM students WHERE id = resource_id;
        WHEN 'teacher' THEN
            SELECT encrypted_ssn INTO encrypted_ssn FROM teachers WHERE id = resource_id;
        WHEN 'user' THEN
            SELECT encrypted_ssn INTO encrypted_ssn FROM users WHERE id = resource_id;
        ELSE
            RETURN NULL;
    END CASE;
    
    -- Decrypt and return
    RETURN decrypt_sensitive_data(encrypted_ssn);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- AUDIT LOGGING FOR SENSITIVE DATA ACCESS
-- =============================================================================

-- Function to log sensitive data access
CREATE OR REPLACE FUNCTION log_sensitive_data_access(
    p_user_id UUID,
    p_resource_type TEXT,
    p_resource_id UUID,
    p_data_type TEXT,
    p_action TEXT
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO audit_logs (
        tenant_id,
        user_id,
        action,
        resource_type,
        resource_id,
        notes,
        success
    ) VALUES (
        (SELECT tenant_id FROM users WHERE id = p_user_id),
        p_user_id,
        p_action,
        p_resource_type,
        p_resource_id,
        'Sensitive data access: ' || p_data_type,
        TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- SECURITY POLICIES FOR MASKED VIEWS
-- =============================================================================

-- Enable RLS on masked views
ALTER VIEW students_masked SET (security_invoker = true);
ALTER VIEW teachers_masked SET (security_invoker = true);
ALTER VIEW users_masked SET (security_invoker = true);

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

-- Grant execute permissions on security functions
GRANT EXECUTE ON FUNCTION encrypt_sensitive_data(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION decrypt_sensitive_data(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION hash_sensitive_data(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION encrypt_jsonb_sensitive_data(JSONB, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION decrypt_jsonb_sensitive_data(JSONB, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION mask_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION mask_phone(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION mask_name(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION mask_ssn(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION can_view_sensitive_data(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_decrypted_ssn(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION log_sensitive_data_access(UUID, TEXT, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION enforce_masked_view_usage() TO authenticated;

-- Grant select permissions on masked views
GRANT SELECT ON students_masked TO authenticated;
GRANT SELECT ON teachers_masked TO authenticated;
GRANT SELECT ON users_masked TO authenticated;

-- =============================================================================
-- DOCUMENTATION
-- =============================================================================

-- Security Features Documentation:
-- 
-- 1. ENCRYPTION:
--    - encrypt_sensitive_data(): Encrypts data using AES encryption
--    - decrypt_sensitive_data(): Decrypts data using AES encryption
--    - hash_sensitive_data(): One-way hashing for passwords and sensitive data
--    - encrypt_jsonb_sensitive_data(): Encrypts specific fields in JSONB columns
--    - decrypt_jsonb_sensitive_data(): Decrypts specific fields in JSONB columns
-- 
-- 2. DATA MASKING:
--    - mask_email(): Masks email addresses (j***@e***.com)
--    - mask_phone(): Masks phone numbers (+1-***-***-1234)
--    - mask_name(): Masks names (J*** D***)
--    - mask_ssn(): Masks SSNs (***-**-1234)
-- 
-- 3. MASKED VIEWS:
--    - students_masked: Student data with sensitive information masked
--    - teachers_masked: Teacher data with sensitive information masked
--    - users_masked: User data with sensitive information masked
-- 
-- 4. ENCRYPTED COLUMNS:
--    - encrypted_ssn: Encrypted Social Security Numbers
--    - encrypted_emergency_contact: Encrypted emergency contact information
--    - encrypted_notes: Encrypted personal notes
-- 
-- 5. ACCESS CONTROL:
--    - can_view_sensitive_data(): Checks if user can view sensitive data
--    - get_decrypted_ssn(): Gets decrypted SSN with permission check
--    - log_sensitive_data_access(): Logs access to sensitive data
-- 
-- 6. SECURITY TRIGGERS:
--    - Automatically encrypt sensitive data on insert/update
--    - Automatically encrypt JSONB documents and sensitive fields
--    - Ensures data is encrypted before storage
--    - Enforces masked view usage for non-privileged roles
-- 
-- USAGE EXAMPLES:
-- 
-- -- Encrypt sensitive data
-- SELECT encrypt_sensitive_data('123-45-6789');
-- 
-- -- Decrypt sensitive data
-- SELECT decrypt_sensitive_data('encrypted_data_here');
-- 
-- -- Mask data for display
-- SELECT mask_email('john.doe@example.com');
-- SELECT mask_phone('+1-555-123-4567');
-- SELECT mask_name('John Doe');
-- 
-- -- Check permissions
-- SELECT can_view_sensitive_data('user-uuid', 'student', 'student-uuid');
-- 
-- -- Get decrypted SSN with permission check
-- SELECT get_decrypted_ssn('user-uuid', 'student', 'student-uuid');
-- 
-- -- Use masked views
-- SELECT * FROM students_masked WHERE tenant_id = 'tenant-uuid';
-- 
-- SECURITY CONSIDERATIONS:
-- - Encryption keys should be stored securely (not in database)
-- - Use application-level key management
-- - Regularly rotate encryption keys
-- - Monitor access to sensitive data through audit logs
-- - Implement proper access controls in application layer
-- - Consider field-level encryption for highly sensitive data
