-- Anonymization: Student data anonymization for privacy compliance
-- Description: Replace real student data with safe fake data for testing/demo
-- Compliance: US (FERPA), EU (GDPR), Indonesia (UU No. 19 Tahun 2016)
-- Created: 2024-09-22
-- Idempotent: Yes (can be run multiple times safely)

-- =============================================================================
-- STUDENT DATA ANONYMIZATION
-- =============================================================================

-- Create anonymized names mapping (if not exists)
CREATE TABLE IF NOT EXISTS anonymized_names (
    original_name VARCHAR(255) PRIMARY KEY,
    anonymized_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to generate anonymized first names
CREATE OR REPLACE FUNCTION anonymize_first_name(original_name VARCHAR(100))
RETURNS VARCHAR(100) AS $$
DECLARE
    anonymized_name VARCHAR(100);
BEGIN
    -- Check if already anonymized
    SELECT anonymized_name INTO anonymized_name 
    FROM anonymized_names 
    WHERE original_name = anonymize_first_name.original_name;
    
    IF anonymized_name IS NOT NULL THEN
        RETURN anonymized_name;
    END IF;
    
    -- Generate anonymized name based on original
    anonymized_name := CASE 
        WHEN original_name LIKE 'A%' THEN 'Alex'
        WHEN original_name LIKE 'B%' THEN 'Blake'
        WHEN original_name LIKE 'C%' THEN 'Casey'
        WHEN original_name LIKE 'D%' THEN 'Dakota'
        WHEN original_name LIKE 'E%' THEN 'Emery'
        WHEN original_name LIKE 'F%' THEN 'Finley'
        WHEN original_name LIKE 'G%' THEN 'Gray'
        WHEN original_name LIKE 'H%' THEN 'Hayden'
        WHEN original_name LIKE 'I%' THEN 'Indigo'
        WHEN original_name LIKE 'J%' THEN 'Jordan'
        WHEN original_name LIKE 'K%' THEN 'Kai'
        WHEN original_name LIKE 'L%' THEN 'Logan'
        WHEN original_name LIKE 'M%' THEN 'Morgan'
        WHEN original_name LIKE 'N%' THEN 'Noah'
        WHEN original_name LIKE 'O%' THEN 'Ocean'
        WHEN original_name LIKE 'P%' THEN 'Parker'
        WHEN original_name LIKE 'Q%' THEN 'Quinn'
        WHEN original_name LIKE 'R%' THEN 'River'
        WHEN original_name LIKE 'S%' THEN 'Sage'
        WHEN original_name LIKE 'T%' THEN 'Taylor'
        WHEN original_name LIKE 'U%' THEN 'Unity'
        WHEN original_name LIKE 'V%' THEN 'Valley'
        WHEN original_name LIKE 'W%' THEN 'Willow'
        WHEN original_name LIKE 'X%' THEN 'Xenon'
        WHEN original_name LIKE 'Y%' THEN 'Yale'
        WHEN original_name LIKE 'Z%' THEN 'Zion'
        ELSE 'Alex'
    END;
    
    -- Store mapping for consistency
    INSERT INTO anonymized_names (original_name, anonymized_name)
    VALUES (original_name, anonymized_name)
    ON CONFLICT (original_name) DO NOTHING;
    
    RETURN anonymized_name;
END;
$$ LANGUAGE plpgsql;

-- Function to generate anonymized last names
CREATE OR REPLACE FUNCTION anonymize_last_name(original_name VARCHAR(100))
RETURNS VARCHAR(100) AS $$
DECLARE
    anonymized_name VARCHAR(100);
BEGIN
    -- Check if already anonymized
    SELECT anonymized_name INTO anonymized_name 
    FROM anonymized_names 
    WHERE original_name = anonymize_last_name.original_name;
    
    IF anonymized_name IS NOT NULL THEN
        RETURN anonymized_name;
    END IF;
    
    -- Generate anonymized name based on original
    anonymized_name := CASE 
        WHEN original_name LIKE 'A%' THEN 'Anderson'
        WHEN original_name LIKE 'B%' THEN 'Brown'
        WHEN original_name LIKE 'C%' THEN 'Clark'
        WHEN original_name LIKE 'D%' THEN 'Davis'
        WHEN original_name LIKE 'E%' THEN 'Evans'
        WHEN original_name LIKE 'F%' THEN 'Foster'
        WHEN original_name LIKE 'G%' THEN 'Garcia'
        WHEN original_name LIKE 'H%' THEN 'Harris'
        WHEN original_name LIKE 'I%' THEN 'Irwin'
        WHEN original_name LIKE 'J%' THEN 'Johnson'
        WHEN original_name LIKE 'K%' THEN 'King'
        WHEN original_name LIKE 'L%' THEN 'Lee'
        WHEN original_name LIKE 'M%' THEN 'Miller'
        WHEN original_name LIKE 'N%' THEN 'Nelson'
        WHEN original_name LIKE 'O%' THEN 'Owens'
        WHEN original_name LIKE 'P%' THEN 'Parker'
        WHEN original_name LIKE 'Q%' THEN 'Quinn'
        WHEN original_name LIKE 'R%' THEN 'Roberts'
        WHEN original_name LIKE 'S%' THEN 'Smith'
        WHEN original_name LIKE 'T%' THEN 'Taylor'
        WHEN original_name LIKE 'U%' THEN 'Underwood'
        WHEN original_name LIKE 'V%' THEN 'Valdez'
        WHEN original_name LIKE 'W%' THEN 'Wilson'
        WHEN original_name LIKE 'X%' THEN 'Xu'
        WHEN original_name LIKE 'Y%' THEN 'Young'
        WHEN original_name LIKE 'Z%' THEN 'Zimmerman'
        ELSE 'Smith'
    END;
    
    -- Store mapping for consistency
    INSERT INTO anonymized_names (original_name, anonymized_name)
    VALUES (original_name, anonymized_name)
    ON CONFLICT (original_name) DO NOTHING;
    
    RETURN anonymized_name;
END;
$$ LANGUAGE plpgsql;

-- Function to generate anonymized email
CREATE OR REPLACE FUNCTION anonymize_email(original_email VARCHAR(255), tenant_slug VARCHAR(100))
RETURNS VARCHAR(255) AS $$
DECLARE
    anonymized_email VARCHAR(255);
    email_prefix VARCHAR(100);
    domain VARCHAR(100);
BEGIN
    -- Extract prefix and domain
    email_prefix := SPLIT_PART(original_email, '@', 1);
    domain := SPLIT_PART(original_email, '@', 2);
    
    -- Generate anonymized email
    anonymized_email := CONCAT(
        'student', 
        LPAD(ABS(HASHTEXT(original_email))::text, 6, '0'),
        '@demo.', 
        COALESCE(tenant_slug, 'school'), 
        '.edu'
    );
    
    RETURN anonymized_email;
END;
$$ LANGUAGE plpgsql;

-- Function to generate anonymized phone
CREATE OR REPLACE FUNCTION anonymize_phone(original_phone VARCHAR(20))
RETURNS VARCHAR(20) AS $$
BEGIN
    -- Generate consistent fake phone number
    RETURN CONCAT(
        '555-',
        LPAD((ABS(HASHTEXT(original_phone)) % 900)::text, 3, '0'),
        '-',
        LPAD((ABS(HASHTEXT(original_phone)) % 9000)::text, 4, '0')
    );
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- ANONYMIZATION EXECUTION
-- =============================================================================

-- Anonymize student names
UPDATE students 
SET 
    first_name = anonymize_first_name(first_name),
    last_name = anonymize_last_name(last_name),
    preferred_name = CASE 
        WHEN preferred_name IS NOT NULL THEN anonymize_first_name(preferred_name)
        ELSE NULL 
    END
WHERE first_name NOT LIKE 'student%'  -- Skip already anonymized data
  AND last_name NOT LIKE '%Smith'     -- Skip already anonymized data
  AND last_name NOT LIKE '%Johnson';  -- Skip already anonymized data

-- Anonymize student emails
UPDATE students 
SET primary_email = anonymize_email(primary_email, t.slug)
FROM tenants t
WHERE students.tenant_id = t.id
  AND primary_email IS NOT NULL
  AND primary_email NOT LIKE '%@demo.%';

-- Anonymize student phone numbers
UPDATE students 
SET primary_phone = anonymize_phone(primary_phone)
WHERE primary_phone IS NOT NULL
  AND primary_phone NOT LIKE '555-%';

-- Anonymize student addresses (keep city/state but anonymize street)
UPDATE students 
SET address = CONCAT(
    LPAD((ABS(HASHTEXT(id)) % 9999)::text, 4, '0'),
    ' Anonymized Street'
)
WHERE address IS NOT NULL
  AND address NOT LIKE '%Anonymized Street%';

-- Anonymize emergency contact information
UPDATE students 
SET 
    emergency_contact_1_name = CASE 
        WHEN emergency_contact_1_name IS NOT NULL THEN 
            CONCAT(anonymize_first_name(SPLIT_PART(emergency_contact_1_name, ' ', 1)), ' ', 
                   anonymize_last_name(SPLIT_PART(emergency_contact_1_name, ' ', 2)))
        ELSE NULL 
    END,
    emergency_contact_1_phone = CASE 
        WHEN emergency_contact_1_phone IS NOT NULL THEN anonymize_phone(emergency_contact_1_phone)
        ELSE NULL 
    END,
    emergency_contact_1_email = CASE 
        WHEN emergency_contact_1_email IS NOT NULL THEN anonymize_email(emergency_contact_1_email, t.slug)
        ELSE NULL 
    END
FROM tenants t
WHERE students.tenant_id = t.id;

-- Anonymize medical information (remove sensitive data)
UPDATE students 
SET 
    medical_conditions = CASE 
        WHEN medical_conditions IS NOT NULL THEN 'No known conditions'
        ELSE NULL 
    END,
    allergies = CASE 
        WHEN allergies IS NOT NULL THEN 'No known allergies'
        ELSE NULL 
    END,
    medications = CASE 
        WHEN medications IS NOT NULL THEN 'No current medications'
        ELSE NULL 
    END,
    medical_insurance = CASE 
        WHEN medical_insurance IS NOT NULL THEN 'Private Insurance'
        ELSE NULL 
    END,
    medical_insurance_number = CASE 
        WHEN medical_insurance_number IS NOT NULL THEN 'INS-***-****'
        ELSE NULL 
    END,
    physician_name = CASE 
        WHEN physician_name IS NOT NULL THEN 'Dr. Anonymous'
        ELSE NULL 
    END,
    physician_phone = CASE 
        WHEN physician_phone IS NOT NULL THEN '555-000-0000'
        ELSE NULL 
    END;

-- Add comments for documentation
COMMENT ON TABLE anonymized_names IS 'Mapping of original names to anonymized names for consistency';
COMMENT ON FUNCTION anonymize_first_name IS 'Generates consistent anonymized first names';
COMMENT ON FUNCTION anonymize_last_name IS 'Generates consistent anonymized last names';
COMMENT ON FUNCTION anonymize_email IS 'Generates anonymized email addresses';
COMMENT ON FUNCTION anonymize_phone IS 'Generates anonymized phone numbers';
