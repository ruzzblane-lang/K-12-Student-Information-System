-- Migration: Implement table partitioning for large tables
-- Description: Partition attendance and audit_logs tables by date for better performance
-- Created: 2024-01-15

-- Create partitioned versions of large tables for better performance
-- Note: This migration assumes the original tables exist and need to be converted to partitioned tables

-- Step 1: Create partitioned attendance table
-- First, we'll create a new partitioned table structure
CREATE TABLE IF NOT EXISTS attendance_partitioned (
    LIKE attendance INCLUDING ALL
) PARTITION BY RANGE (attendance_date);

-- Create monthly partitions for attendance table
-- Create partitions for current year and next year
DO $$
DECLARE
    start_date DATE;
    end_date DATE;
    partition_name TEXT;
    i INTEGER;
BEGIN
    -- Create partitions for current year (2024) and next year (2025)
    FOR i IN 0..23 LOOP
        start_date := DATE_TRUNC('month', CURRENT_DATE) + (i || ' months')::INTERVAL;
        end_date := start_date + INTERVAL '1 month';
        partition_name := 'attendance_' || TO_CHAR(start_date, 'YYYY_MM');
        
        -- Create partition if it doesn't exist
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS %I PARTITION OF attendance_partitioned
            FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date
        );
    END LOOP;
END $$;

-- Step 2: Create partitioned audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs_partitioned (
    LIKE audit_logs INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- Create monthly partitions for audit_logs table
DO $$
DECLARE
    start_date TIMESTAMP WITH TIME ZONE;
    end_date TIMESTAMP WITH TIME ZONE;
    partition_name TEXT;
    i INTEGER;
BEGIN
    -- Create partitions for current year (2024) and next year (2025)
    FOR i IN 0..23 LOOP
        start_date := DATE_TRUNC('month', CURRENT_TIMESTAMP) + (i || ' months')::INTERVAL;
        end_date := start_date + INTERVAL '1 month';
        partition_name := 'audit_logs_' || TO_CHAR(start_date, 'YYYY_MM');
        
        -- Create partition if it doesn't exist
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS %I PARTITION OF audit_logs_partitioned
            FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date
        );
    END LOOP;
END $$;

-- Step 3: Create a function to automatically create new partitions
CREATE OR REPLACE FUNCTION create_monthly_partitions()
RETURNS VOID AS $$
DECLARE
    start_date DATE;
    end_date DATE;
    partition_name TEXT;
    start_timestamp TIMESTAMP WITH TIME ZONE;
    end_timestamp TIMESTAMP WITH TIME ZONE;
    i INTEGER;
BEGIN
    -- Create attendance partitions for the next 12 months
    FOR i IN 0..11 LOOP
        start_date := DATE_TRUNC('month', CURRENT_DATE) + (i || ' months')::INTERVAL;
        end_date := start_date + INTERVAL '1 month';
        partition_name := 'attendance_' || TO_CHAR(start_date, 'YYYY_MM');
        
        -- Create attendance partition if it doesn't exist
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS %I PARTITION OF attendance_partitioned
            FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date
        );
    END LOOP;
    
    -- Create audit_logs partitions for the next 12 months
    FOR i IN 0..11 LOOP
        start_timestamp := DATE_TRUNC('month', CURRENT_TIMESTAMP) + (i || ' months')::INTERVAL;
        end_timestamp := start_timestamp + INTERVAL '1 month';
        partition_name := 'audit_logs_' || TO_CHAR(start_timestamp, 'YYYY_MM');
        
        -- Create audit_logs partition if it doesn't exist
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS %I PARTITION OF audit_logs_partitioned
            FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_timestamp, end_timestamp
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create a function to drop old partitions (for data retention)
CREATE OR REPLACE FUNCTION drop_old_partitions(retention_months INTEGER DEFAULT 24)
RETURNS VOID AS $$
DECLARE
    cutoff_date DATE;
    cutoff_timestamp TIMESTAMP WITH TIME ZONE;
    partition_name TEXT;
    partition_record RECORD;
BEGIN
    cutoff_date := CURRENT_DATE - (retention_months || ' months')::INTERVAL;
    cutoff_timestamp := CURRENT_TIMESTAMP - (retention_months || ' months')::INTERVAL;
    
    -- Drop old attendance partitions
    FOR partition_record IN
        SELECT schemaname, tablename
        FROM pg_tables
        WHERE tablename LIKE 'attendance_%'
        AND tablename ~ 'attendance_\d{4}_\d{2}'
        AND tablename < 'attendance_' || TO_CHAR(cutoff_date, 'YYYY_MM')
    LOOP
        EXECUTE format('DROP TABLE IF EXISTS %I.%I CASCADE',
            partition_record.schemaname, partition_record.tablename);
    END LOOP;
    
    -- Drop old audit_logs partitions
    FOR partition_record IN
        SELECT schemaname, tablename
        FROM pg_tables
        WHERE tablename LIKE 'audit_logs_%'
        AND tablename ~ 'audit_logs_\d{4}_\d{2}'
        AND tablename < 'audit_logs_' || TO_CHAR(cutoff_timestamp, 'YYYY_MM')
    LOOP
        EXECUTE format('DROP TABLE IF EXISTS %I.%I CASCADE',
            partition_record.schemaname, partition_record.tablename);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create a function to migrate data from original tables to partitioned tables
-- This function should be run after creating the partitioned tables
CREATE OR REPLACE FUNCTION migrate_to_partitioned_tables()
RETURNS VOID AS $$
BEGIN
    -- Migrate attendance data
    INSERT INTO attendance_partitioned
    SELECT * FROM attendance
    ON CONFLICT DO NOTHING;
    
    -- Migrate audit_logs data
    INSERT INTO audit_logs_partitioned
    SELECT * FROM audit_logs
    ON CONFLICT DO NOTHING;
    
    -- Note: After successful migration, you would:
    -- 1. Rename original tables to _old
    -- 2. Rename partitioned tables to original names
    -- 3. Update application code to use new table names
    -- 4. Drop old tables after verification
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create indexes on partitioned tables
-- These indexes will be automatically created on all partitions

-- Create indexes for attendance_partitioned
CREATE INDEX IF NOT EXISTS idx_attendance_partitioned_tenant_id ON attendance_partitioned(tenant_id);
CREATE INDEX IF NOT EXISTS idx_attendance_partitioned_student_id ON attendance_partitioned(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_partitioned_class_id ON attendance_partitioned(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_partitioned_date ON attendance_partitioned(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_partitioned_status ON attendance_partitioned(status);
CREATE INDEX IF NOT EXISTS idx_attendance_partitioned_tenant_student ON attendance_partitioned(tenant_id, student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_partitioned_tenant_date ON attendance_partitioned(tenant_id, attendance_date);

-- Create indexes for audit_logs_partitioned
CREATE INDEX IF NOT EXISTS idx_audit_logs_partitioned_tenant_id ON audit_logs_partitioned(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_partitioned_user_id ON audit_logs_partitioned(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_partitioned_action ON audit_logs_partitioned(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_partitioned_resource_type ON audit_logs_partitioned(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_partitioned_created_at ON audit_logs_partitioned(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_partitioned_tenant_date ON audit_logs_partitioned(tenant_id, created_at);

-- Step 7: Create a scheduled job function to maintain partitions
-- This should be called by a cron job or scheduled task
CREATE OR REPLACE FUNCTION maintain_partitions()
RETURNS VOID AS $$
BEGIN
    -- Create new partitions for the next 3 months
    PERFORM create_monthly_partitions();
    
    -- Drop partitions older than 24 months
    PERFORM drop_old_partitions(24);
    
    -- Log the maintenance operation
    INSERT INTO audit_logs_partitioned (
        tenant_id,
        action,
        resource_type,
        success,
        notes
    ) VALUES (
        NULL, -- System operation
        'maintenance',
        'partition_management',
        TRUE,
        'Monthly partition maintenance completed'
    );
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_monthly_partitions() TO authenticated;
GRANT EXECUTE ON FUNCTION drop_old_partitions(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION migrate_to_partitioned_tables() TO authenticated;
GRANT EXECUTE ON FUNCTION maintain_partitions() TO authenticated;

-- Documentation for Table Partitioning:
-- 
-- Partitioning Strategy:
-- - attendance: Partitioned by attendance_date (monthly partitions)
-- - audit_logs: Partitioned by created_at (monthly partitions)
-- 
-- Benefits:
-- - Improved query performance for date-range queries
-- - Easier data archival and cleanup
-- - Better maintenance and backup strategies
-- - Reduced index size per partition
-- 
-- Maintenance:
-- - Run maintain_partitions() monthly via cron job
-- - Automatically creates new partitions for next 3 months
-- - Automatically drops partitions older than 24 months
-- 
-- Migration Process:
-- 1. Run this migration to create partitioned tables
-- 2. Run migrate_to_partitioned_tables() to copy data
-- 3. Verify data integrity
-- 4. Update application to use partitioned tables
-- 5. Drop original tables
-- 
-- Example cron job for maintenance:
-- 0 2 1 * * psql -d your_database -c "SELECT maintain_partitions();"
-- 
-- Query Performance:
-- - Date-range queries will only scan relevant partitions
-- - Indexes are smaller and more efficient per partition
-- - Parallel query execution across partitions
-- - Better cache utilization
