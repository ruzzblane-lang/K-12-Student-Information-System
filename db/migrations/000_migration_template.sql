-- Migration Template: [Migration Number]_[descriptive_name].sql
-- Description: [Brief description of what this migration does]
-- Created: [YYYY-MM-DD]
-- Updated: [YYYY-MM-DD] (if applicable)

-- =============================================================================
-- MIGRATION TEMPLATE - Best Practices for K-12 SIS Database Migrations
-- =============================================================================

-- 1. ALWAYS use transactions for atomicity
BEGIN;

-- 2. Use IF NOT EXISTS for idempotency
CREATE TABLE IF NOT EXISTS example_table (
    -- Primary key with UUID
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Multi-tenant support (if applicable)
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Business fields with appropriate data types
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    
    -- JSONB fields for flexible data (document structure below)
    metadata JSONB DEFAULT '{}',
    
    -- Audit fields (ALWAYS include these)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE, -- Soft deletion
    created_by UUID, -- Reference to user who created this record
    
    -- Constraints (ALWAYS include appropriate CHECK constraints)
    CONSTRAINT valid_status CHECK (status IN ('active', 'inactive', 'suspended', 'pending')),
    CONSTRAINT valid_name CHECK (LENGTH(name) >= 2),
    CONSTRAINT unique_name_per_tenant UNIQUE (tenant_id, name),
    CONSTRAINT valid_created_by CHECK (created_by IS NULL OR created_by != id)
);

-- 3. Create indexes for performance (use IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_example_tenant_id ON example_table(tenant_id);
CREATE INDEX IF NOT EXISTS idx_example_status ON example_table(status);
CREATE INDEX IF NOT EXISTS idx_example_created_by ON example_table(created_by);
CREATE INDEX IF NOT EXISTS idx_example_deleted_at ON example_table(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_example_created_at ON example_table(created_at);

-- 4. Create GIN index for JSONB columns
CREATE INDEX IF NOT EXISTS idx_example_metadata ON example_table USING GIN (metadata);

-- 5. Create updated_at trigger
CREATE OR REPLACE FUNCTION update_example_table_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_example_table_updated_at
    BEFORE UPDATE ON example_table
    FOR EACH ROW
    EXECUTE FUNCTION update_example_table_updated_at();

-- 6. Create trigger to validate created_by within same tenant (if applicable)
CREATE OR REPLACE FUNCTION validate_example_table_created_by_tenant()
RETURNS TRIGGER AS $$
BEGIN
    -- If created_by is set, ensure it references a user within the same tenant
    IF NEW.created_by IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM users 
            WHERE id = NEW.created_by 
            AND tenant_id = NEW.tenant_id 
            AND deleted_at IS NULL
        ) THEN
            RAISE EXCEPTION 'created_by must reference a user within the same tenant';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_example_table_created_by_tenant
    BEFORE INSERT OR UPDATE ON example_table
    FOR EACH ROW
    EXECUTE FUNCTION validate_example_table_created_by_tenant();

-- 7. Add foreign key constraints (defer if referencing users table)
-- ALTER TABLE example_table 
-- ADD CONSTRAINT fk_example_table_created_by 
-- FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- 8. Document JSONB column structures
-- Documentation for metadata JSONB column structure:
-- The metadata column stores additional flexible data as JSONB.
-- Expected structure:
-- {
--   "custom_fields": {
--     "field1": "value1",
--     "field2": "value2"
--   },
--   "settings": {
--     "option1": true,
--     "option2": false
--   },
--   "tags": ["tag1", "tag2", "tag3"]
-- }
--
-- Example queries:
-- SELECT * FROM example_table WHERE metadata->'settings'->>'option1' = 'true';
-- SELECT * FROM example_table WHERE metadata->'tags' ? 'tag1';
-- UPDATE example_table SET metadata = metadata || '{"new_field": "new_value"}' WHERE id = 'record-id';

-- 9. Add comments for complex business logic
COMMENT ON TABLE example_table IS 'Stores example records with multi-tenant support and audit trails';
COMMENT ON COLUMN example_table.deleted_at IS 'Soft deletion timestamp - records with non-null deleted_at are considered deleted';
COMMENT ON COLUMN example_table.metadata IS 'Flexible JSONB field for storing additional data and custom fields';

-- 10. Commit the transaction
COMMIT;

-- =============================================================================
-- MIGRATION CHECKLIST
-- =============================================================================
-- [ ] Transaction wrapped (BEGIN/COMMIT)
-- [ ] Table created with IF NOT EXISTS
-- [ ] Multi-tenant support (tenant_id column)
-- [ ] Audit fields (created_at, updated_at, deleted_at, created_by)
-- [ ] Appropriate CHECK constraints for categorical fields
-- [ ] Unique constraints where needed
-- [ ] Performance indexes created
-- [ ] GIN indexes for JSONB columns
-- [ ] updated_at trigger created
-- [ ] created_by validation trigger (if applicable)
-- [ ] Foreign key constraints added
-- [ ] JSONB column structure documented
-- [ ] Complex business logic commented
-- [ ] Migration is idempotent (can be run multiple times safely)
-- [ ] Migration is transactional (all or nothing)
-- [ ] Migration is well-commented for maintainability
