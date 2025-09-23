-- Migration: AI Integration Tables
-- Description: Creates tables for AI modules including search, tagging, insights, translation, fraud detection, summaries, recommendations, and conversational interface.
-- Version: 030
-- Date: 2024-01-25

BEGIN;

-- AI Operation Logs
CREATE TABLE IF NOT EXISTS ai_operation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    module_name VARCHAR(100) NOT NULL,
    function_name VARCHAR(100) NOT NULL,
    parameters JSONB,
    status VARCHAR(50) NOT NULL,
    result JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AI Search Logs
CREATE TABLE IF NOT EXISTS ai_search_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    operation VARCHAR(100) NOT NULL,
    query_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AI Processing Results
CREATE TABLE IF NOT EXISTS ai_processing_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id UUID NOT NULL,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    analysis_data JSONB NOT NULL,
    metadata JSONB NOT NULL,
    captions JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(file_id)
);

-- AI Processing Logs
CREATE TABLE IF NOT EXISTS ai_processing_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    operation VARCHAR(100) NOT NULL,
    file_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Student Consent Records
CREATE TABLE IF NOT EXISTS student_consent_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    consent_type VARCHAR(100) NOT NULL,
    granted BOOLEAN NOT NULL DEFAULT FALSE,
    granted_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    consent_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Learning Insights Logs
CREATE TABLE IF NOT EXISTS learning_insights_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    insights_type VARCHAR(100) NOT NULL,
    time_range VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AI Translation Logs
CREATE TABLE IF NOT EXISTS ai_translation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    source_language VARCHAR(10) NOT NULL,
    target_language VARCHAR(10) NOT NULL,
    text_length INTEGER NOT NULL,
    service VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AI Speech Logs
CREATE TABLE IF NOT EXISTS ai_speech_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    language VARCHAR(10) NOT NULL,
    text_length INTEGER,
    confidence DECIMAL(3,2),
    service VARCHAR(50) NOT NULL,
    operation_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AI Document Translation Logs
CREATE TABLE IF NOT EXISTS ai_document_translation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    file_id UUID NOT NULL,
    source_language VARCHAR(10) NOT NULL,
    target_language VARCHAR(10) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AI Accessibility Logs
CREATE TABLE IF NOT EXISTS ai_accessibility_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    operation VARCHAR(100) NOT NULL,
    operation_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Fraud Risk Assessments
CREATE TABLE IF NOT EXISTS fraud_risk_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    payment_data JSONB NOT NULL,
    risk_score DECIMAL(3,2) NOT NULL,
    risk_level VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Real Time Monitoring Logs
CREATE TABLE IF NOT EXISTS real_time_monitoring_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    activity_data JSONB NOT NULL,
    alerts JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Fraud Detection Logs
CREATE TABLE IF NOT EXISTS fraud_detection_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    operation VARCHAR(100) NOT NULL,
    operation_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AI Summary Logs
CREATE TABLE IF NOT EXISTS ai_summary_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    content_type VARCHAR(100) NOT NULL,
    summary_type VARCHAR(100) NOT NULL,
    content_length INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AI Report Logs
CREATE TABLE IF NOT EXISTS ai_report_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    report_type VARCHAR(100) NOT NULL,
    data_source_count INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AI Summary Operation Logs
CREATE TABLE IF NOT EXISTS ai_summary_operation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    operation VARCHAR(100) NOT NULL,
    operation_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AI Recommendation Logs
CREATE TABLE IF NOT EXISTS ai_recommendation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    recommendation_type VARCHAR(100) NOT NULL,
    recommendation_count INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AI Recommendation Operation Logs
CREATE TABLE IF NOT EXISTS ai_recommendation_operation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    operation VARCHAR(100) NOT NULL,
    operation_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Conversation Logs
CREATE TABLE IF NOT EXISTS conversation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL,
    conversation_id UUID NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    intent VARCHAR(100),
    confidence DECIMAL(3,2),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Conversation Operation Logs
CREATE TABLE IF NOT EXISTS conversation_operation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    operation VARCHAR(100) NOT NULL,
    operation_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User Profiles (for recommendations)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_type VARCHAR(50) NOT NULL DEFAULT 'student',
    grade_level VARCHAR(50),
    subjects JSONB,
    interests JSONB,
    learning_style VARCHAR(50),
    performance_history JSONB,
    preferences JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, tenant_id)
);

-- User Interactions (for recommendations)
CREATE TABLE IF NOT EXISTS user_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    content_id UUID NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    interaction_type VARCHAR(50) NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    duration INTEGER,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    context JSONB
);

-- Content Catalog (for recommendations)
CREATE TABLE IF NOT EXISTS content_catalog (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    type VARCHAR(100) NOT NULL,
    subject VARCHAR(100),
    grade_level VARCHAR(50),
    difficulty VARCHAR(50),
    tags JSONB,
    metadata JSONB,
    access_count INTEGER DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Knowledge Base (for conversational interface)
CREATE TABLE IF NOT EXISTS knowledge_base (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    knowledge_base_type VARCHAR(100) NOT NULL,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    source VARCHAR(200),
    relevance_score DECIMAL(3,2) DEFAULT 0.0,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User Activities (for fraud detection)
CREATE TABLE IF NOT EXISTS user_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    activity_type VARCHAR(100) NOT NULL,
    activity_data JSONB,
    ip_address INET,
    user_agent TEXT,
    location JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User Behavior Profiles (for fraud detection)
CREATE TABLE IF NOT EXISTS user_behavior_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    typical_login_times JSONB,
    typical_session_duration INTEGER,
    typical_navigation JSONB,
    behavior_patterns JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, tenant_id)
);

-- User Network Profiles (for fraud detection)
CREATE TABLE IF NOT EXISTS user_network_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    typical_locations JSONB,
    ip_reputation JSONB,
    network_patterns JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, tenant_id)
);

-- Add AI configuration columns to tenants table
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS ai_config JSONB,
ADD COLUMN IF NOT EXISTS ai_modules_enabled JSONB,
ADD COLUMN IF NOT EXISTS ferpa_compliance_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ferpa_training_completed BOOLEAN DEFAULT FALSE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_operation_logs_tenant_id ON ai_operation_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_operation_logs_module_name ON ai_operation_logs(module_name);
CREATE INDEX IF NOT EXISTS idx_ai_operation_logs_created_at ON ai_operation_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_ai_search_logs_tenant_id ON ai_search_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_search_logs_created_at ON ai_search_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_ai_processing_results_file_id ON ai_processing_results(file_id);
CREATE INDEX IF NOT EXISTS idx_ai_processing_results_tenant_id ON ai_processing_results(tenant_id);

CREATE INDEX IF NOT EXISTS idx_student_consent_records_student_id ON student_consent_records(student_id);
CREATE INDEX IF NOT EXISTS idx_student_consent_records_tenant_id ON student_consent_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_student_consent_records_consent_type ON student_consent_records(consent_type);

CREATE INDEX IF NOT EXISTS idx_learning_insights_logs_student_id ON learning_insights_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_learning_insights_logs_tenant_id ON learning_insights_logs(tenant_id);

CREATE INDEX IF NOT EXISTS idx_ai_translation_logs_tenant_id ON ai_translation_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_translation_logs_created_at ON ai_translation_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_ai_speech_logs_tenant_id ON ai_speech_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_speech_logs_operation_type ON ai_speech_logs(operation_type);

CREATE INDEX IF NOT EXISTS idx_fraud_risk_assessments_tenant_id ON fraud_risk_assessments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fraud_risk_assessments_risk_level ON fraud_risk_assessments(risk_level);

CREATE INDEX IF NOT EXISTS idx_real_time_monitoring_logs_user_id ON real_time_monitoring_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_real_time_monitoring_logs_tenant_id ON real_time_monitoring_logs(tenant_id);

CREATE INDEX IF NOT EXISTS idx_ai_summary_logs_tenant_id ON ai_summary_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_summary_logs_summary_type ON ai_summary_logs(summary_type);

CREATE INDEX IF NOT EXISTS idx_ai_recommendation_logs_user_id ON ai_recommendation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendation_logs_tenant_id ON ai_recommendation_logs(tenant_id);

CREATE INDEX IF NOT EXISTS idx_conversation_logs_conversation_id ON conversation_logs(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_logs_user_id ON conversation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_logs_tenant_id ON conversation_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversation_logs_timestamp ON conversation_logs(timestamp);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_tenant_id ON user_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_type ON user_profiles(user_type);

CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id ON user_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_tenant_id ON user_interactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_content_id ON user_interactions(content_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_timestamp ON user_interactions(timestamp);

CREATE INDEX IF NOT EXISTS idx_content_catalog_tenant_id ON content_catalog(tenant_id);
CREATE INDEX IF NOT EXISTS idx_content_catalog_type ON content_catalog(type);
CREATE INDEX IF NOT EXISTS idx_content_catalog_subject ON content_catalog(subject);
CREATE INDEX IF NOT EXISTS idx_content_catalog_grade_level ON content_catalog(grade_level);

CREATE INDEX IF NOT EXISTS idx_knowledge_base_tenant_id ON knowledge_base(tenant_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_type ON knowledge_base(knowledge_base_type);

CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_tenant_id ON user_activities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_activity_type ON user_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON user_activities(created_at);

CREATE INDEX IF NOT EXISTS idx_user_behavior_profiles_user_id ON user_behavior_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_behavior_profiles_tenant_id ON user_behavior_profiles(tenant_id);

CREATE INDEX IF NOT EXISTS idx_user_network_profiles_user_id ON user_network_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_network_profiles_tenant_id ON user_network_profiles(tenant_id);

-- Add comments for documentation
COMMENT ON TABLE ai_operation_logs IS 'Logs all AI module operations for audit and debugging purposes.';
COMMENT ON TABLE ai_search_logs IS 'Logs search operations performed by the AI search module.';
COMMENT ON TABLE ai_processing_results IS 'Stores results from automated tagging and metadata processing.';
COMMENT ON TABLE student_consent_records IS 'Tracks student consent for AI processing with FERPA/GDPR compliance.';
COMMENT ON TABLE learning_insights_logs IS 'Logs generation of personalized learning insights.';
COMMENT ON TABLE ai_translation_logs IS 'Logs translation operations for compliance and monitoring.';
COMMENT ON TABLE ai_speech_logs IS 'Logs text-to-speech and speech-to-text operations.';
COMMENT ON TABLE fraud_risk_assessments IS 'Stores fraud risk assessment results for payment transactions.';
COMMENT ON TABLE real_time_monitoring_logs IS 'Logs real-time monitoring activities for fraud detection.';
COMMENT ON TABLE ai_summary_logs IS 'Logs summary generation operations.';
COMMENT ON TABLE ai_recommendation_logs IS 'Logs recommendation generation for users.';
COMMENT ON TABLE conversation_logs IS 'Stores conversation history for the conversational interface.';
COMMENT ON TABLE user_profiles IS 'User profiles for personalized recommendations and insights.';
COMMENT ON TABLE user_interactions IS 'User interaction history for recommendation algorithms.';
COMMENT ON TABLE content_catalog IS 'Catalog of available content for recommendations.';
COMMENT ON TABLE knowledge_base IS 'Knowledge base for conversational interface responses.';
COMMENT ON TABLE user_activities IS 'User activity logs for fraud detection and monitoring.';
COMMENT ON TABLE user_behavior_profiles IS 'User behavior profiles for fraud detection.';
COMMENT ON TABLE user_network_profiles IS 'User network profiles for fraud detection.';

COMMIT;
