-- Analytics and Alerts System Tables
-- This migration creates tables for advanced analytics, at-risk student identification,
-- attendance trends, and predictive analytics

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Student Risk Assessment Table
CREATE TABLE IF NOT EXISTS student_risk_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    
    -- Risk factors and scores
    attendance_risk_score DECIMAL(5,2) DEFAULT 0.0,
    academic_risk_score DECIMAL(5,2) DEFAULT 0.0,
    behavioral_risk_score DECIMAL(5,2) DEFAULT 0.0,
    social_risk_score DECIMAL(5,2) DEFAULT 0.0,
    overall_risk_score DECIMAL(5,2) DEFAULT 0.0,
    
    -- Risk level classification
    risk_level VARCHAR(20) DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    
    -- Specific risk indicators
    attendance_issues BOOLEAN DEFAULT FALSE,
    grade_decline BOOLEAN DEFAULT FALSE,
    frequent_tardiness BOOLEAN DEFAULT FALSE,
    discipline_issues BOOLEAN DEFAULT FALSE,
    social_isolation BOOLEAN DEFAULT FALSE,
    family_issues BOOLEAN DEFAULT FALSE,
    
    -- Assessment metadata
    assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    assessment_period VARCHAR(20) NOT NULL, -- 'weekly', 'monthly', 'quarterly'
    algorithm_version VARCHAR(20) DEFAULT '1.0',
    
    -- Intervention tracking
    intervention_required BOOLEAN DEFAULT FALSE,
    intervention_plan TEXT,
    last_intervention_date DATE,
    intervention_success_rate DECIMAL(5,2),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    CONSTRAINT unique_student_assessment UNIQUE (tenant_id, student_id, assessment_date, assessment_period)
);

-- Attendance Analytics Table
CREATE TABLE IF NOT EXISTS attendance_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    
    -- Time period
    analysis_date DATE NOT NULL,
    period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'quarterly')),
    
    -- Attendance metrics
    total_days INTEGER NOT NULL DEFAULT 0,
    present_days INTEGER NOT NULL DEFAULT 0,
    absent_days INTEGER NOT NULL DEFAULT 0,
    tardy_days INTEGER NOT NULL DEFAULT 0,
    excused_absences INTEGER NOT NULL DEFAULT 0,
    unexcused_absences INTEGER NOT NULL DEFAULT 0,
    
    -- Calculated percentages
    attendance_rate DECIMAL(5,2) NOT NULL DEFAULT 0.0,
    punctuality_rate DECIMAL(5,2) NOT NULL DEFAULT 0.0,
    
    -- Trend analysis
    attendance_trend VARCHAR(20) CHECK (attendance_trend IN ('improving', 'stable', 'declining', 'critical')),
    trend_direction VARCHAR(10) CHECK (trend_direction IN ('up', 'down', 'stable')),
    trend_magnitude DECIMAL(5,2) DEFAULT 0.0, -- Percentage change
    
    -- Pattern analysis
    frequent_absence_days VARCHAR(50)[], -- Array of day names with frequent absences
    seasonal_patterns JSONB, -- JSON object storing seasonal attendance patterns
    time_patterns JSONB, -- JSON object storing time-based patterns
    
    -- Flags and alerts
    attendance_alert BOOLEAN DEFAULT FALSE,
    chronic_absenteeism BOOLEAN DEFAULT FALSE,
    tardiness_concern BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    CONSTRAINT unique_attendance_analysis UNIQUE (tenant_id, student_id, analysis_date, period_type)
);

-- Grade Analytics Table
CREATE TABLE IF NOT EXISTS grade_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    
    -- Time period
    analysis_date DATE NOT NULL,
    period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('weekly', 'monthly', 'quarterly', 'semester')),
    
    -- Grade metrics
    total_assignments INTEGER NOT NULL DEFAULT 0,
    completed_assignments INTEGER NOT NULL DEFAULT 0,
    missing_assignments INTEGER NOT NULL DEFAULT 0,
    late_assignments INTEGER NOT NULL DEFAULT 0,
    
    -- Grade statistics
    average_grade DECIMAL(5,2) NOT NULL DEFAULT 0.0,
    grade_trend VARCHAR(20) CHECK (grade_trend IN ('improving', 'stable', 'declining', 'critical')),
    grade_volatility DECIMAL(5,2) DEFAULT 0.0, -- Standard deviation of grades
    
    -- Subject-specific analytics
    subject_performance JSONB, -- JSON object with subject-wise performance
    weak_subjects VARCHAR(100)[], -- Array of subjects with low performance
    strong_subjects VARCHAR(100)[], -- Array of subjects with high performance
    
    -- Predictive indicators
    predicted_grade DECIMAL(5,2), -- Predicted final grade
    grade_decline_probability DECIMAL(5,2) DEFAULT 0.0,
    improvement_probability DECIMAL(5,2) DEFAULT 0.0,
    
    -- Flags and alerts
    grade_alert BOOLEAN DEFAULT FALSE,
    failing_risk BOOLEAN DEFAULT FALSE,
    improvement_opportunity BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    CONSTRAINT unique_grade_analysis UNIQUE (tenant_id, student_id, analysis_date, period_type)
);

-- Predictive Analytics Models Table
CREATE TABLE IF NOT EXISTS predictive_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Model information
    model_name VARCHAR(100) NOT NULL,
    model_type VARCHAR(50) NOT NULL CHECK (model_type IN ('regression', 'classification', 'clustering', 'time_series')),
    model_version VARCHAR(20) NOT NULL DEFAULT '1.0',
    
    -- Model purpose
    prediction_target VARCHAR(100) NOT NULL, -- 'student_success', 'dropout_risk', 'grade_prediction', etc.
    input_features TEXT[] NOT NULL, -- Array of feature names used in the model
    output_type VARCHAR(50) NOT NULL, -- 'probability', 'score', 'classification'
    
    -- Model performance metrics
    accuracy DECIMAL(5,4) DEFAULT 0.0,
    precision_score DECIMAL(5,4) DEFAULT 0.0,
    recall_score DECIMAL(5,4) DEFAULT 0.0,
    f1_score DECIMAL(5,4) DEFAULT 0.0,
    
    -- Model metadata
    training_data_size INTEGER,
    training_date DATE,
    last_updated DATE,
    model_parameters JSONB, -- JSON object storing model parameters
    
    -- Model status
    is_active BOOLEAN DEFAULT TRUE,
    deployment_status VARCHAR(20) DEFAULT 'active' CHECK (deployment_status IN ('active', 'inactive', 'training', 'failed')),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Student Predictions Table
CREATE TABLE IF NOT EXISTS student_predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    model_id UUID NOT NULL REFERENCES predictive_models(id) ON DELETE CASCADE,
    
    -- Prediction details
    prediction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    prediction_type VARCHAR(100) NOT NULL, -- 'dropout_risk', 'grade_prediction', 'success_probability'
    
    -- Prediction results
    predicted_value DECIMAL(10,4), -- The actual predicted value
    confidence_score DECIMAL(5,4) DEFAULT 0.0, -- Confidence in the prediction
    prediction_interval JSONB, -- JSON object with lower/upper bounds
    
    -- Feature importance
    top_features JSONB, -- JSON object with most important features for this prediction
    
    -- Prediction metadata
    input_data_hash VARCHAR(64), -- Hash of input data for reproducibility
    prediction_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    CONSTRAINT unique_student_prediction UNIQUE (tenant_id, student_id, model_id, prediction_date, prediction_type)
);

-- Alerts and Notifications Table
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    
    -- Alert information
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('attendance', 'academic', 'behavioral', 'risk_assessment', 'system')),
    alert_level VARCHAR(20) NOT NULL CHECK (alert_level IN ('info', 'warning', 'critical', 'emergency')),
    alert_category VARCHAR(50) NOT NULL, -- 'at_risk_student', 'attendance_trend', 'grade_decline', etc.
    
    -- Alert content
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    description TEXT,
    
    -- Alert data
    alert_data JSONB, -- JSON object with additional alert-specific data
    trigger_conditions JSONB, -- JSON object with conditions that triggered the alert
    
    -- Alert status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'dismissed')),
    acknowledged_by UUID REFERENCES users(id),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    -- Notification settings
    notify_teachers BOOLEAN DEFAULT TRUE,
    notify_parents BOOLEAN DEFAULT TRUE,
    notify_administrators BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE -- When the alert should expire
);

-- Analytics Dashboard Configuration Table
CREATE TABLE IF NOT EXISTS analytics_dashboard_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Dashboard configuration
    dashboard_name VARCHAR(100) NOT NULL,
    dashboard_type VARCHAR(50) NOT NULL CHECK (dashboard_type IN ('student', 'teacher', 'administrator', 'parent')),
    
    -- Widget configuration
    widgets JSONB NOT NULL DEFAULT '[]', -- JSON array of widget configurations
    layout_config JSONB, -- JSON object with layout settings
    refresh_interval INTEGER DEFAULT 300, -- Seconds between refreshes
    
    -- Access control
    is_public BOOLEAN DEFAULT FALSE,
    shared_with_roles VARCHAR(50)[], -- Array of roles that can access this dashboard
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT unique_user_dashboard UNIQUE (tenant_id, user_id, dashboard_name)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_student_risk_assessments_tenant_student ON student_risk_assessments(tenant_id, student_id);
CREATE INDEX IF NOT EXISTS idx_student_risk_assessments_date ON student_risk_assessments(assessment_date);
CREATE INDEX IF NOT EXISTS idx_student_risk_assessments_risk_level ON student_risk_assessments(risk_level);
CREATE INDEX IF NOT EXISTS idx_student_risk_assessments_intervention ON student_risk_assessments(intervention_required);

CREATE INDEX IF NOT EXISTS idx_attendance_analytics_tenant_student ON attendance_analytics(tenant_id, student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_analytics_date ON attendance_analytics(analysis_date);
CREATE INDEX IF NOT EXISTS idx_attendance_analytics_alert ON attendance_analytics(attendance_alert);

CREATE INDEX IF NOT EXISTS idx_grade_analytics_tenant_student ON grade_analytics(tenant_id, student_id);
CREATE INDEX IF NOT EXISTS idx_grade_analytics_date ON grade_analytics(analysis_date);
CREATE INDEX IF NOT EXISTS idx_grade_analytics_alert ON grade_analytics(grade_alert);

CREATE INDEX IF NOT EXISTS idx_predictive_models_tenant ON predictive_models(tenant_id);
CREATE INDEX IF NOT EXISTS idx_predictive_models_active ON predictive_models(is_active);

CREATE INDEX IF NOT EXISTS idx_student_predictions_tenant_student ON student_predictions(tenant_id, student_id);
CREATE INDEX IF NOT EXISTS idx_student_predictions_model ON student_predictions(model_id);
CREATE INDEX IF NOT EXISTS idx_student_predictions_date ON student_predictions(prediction_date);

CREATE INDEX IF NOT EXISTS idx_alerts_tenant ON alerts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_alerts_student ON alerts(student_id);
CREATE INDEX IF NOT EXISTS idx_alerts_type_level ON alerts(alert_type, alert_level);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at);

CREATE INDEX IF NOT EXISTS idx_analytics_dashboard_tenant_user ON analytics_dashboard_config(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_dashboard_type ON analytics_dashboard_config(dashboard_type);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_student_risk_assessments_updated_at BEFORE UPDATE ON student_risk_assessments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_attendance_analytics_updated_at BEFORE UPDATE ON attendance_analytics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_grade_analytics_updated_at BEFORE UPDATE ON grade_analytics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_predictive_models_updated_at BEFORE UPDATE ON predictive_models FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_student_predictions_updated_at BEFORE UPDATE ON student_predictions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_analytics_dashboard_config_updated_at BEFORE UPDATE ON analytics_dashboard_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE student_risk_assessments IS 'Stores comprehensive risk assessments for students including academic, attendance, behavioral, and social risk factors';
COMMENT ON TABLE attendance_analytics IS 'Stores attendance trend analysis and pattern recognition data for students';
COMMENT ON TABLE grade_analytics IS 'Stores grade trend analysis and academic performance predictions';
COMMENT ON TABLE predictive_models IS 'Stores metadata about machine learning models used for predictions';
COMMENT ON TABLE student_predictions IS 'Stores individual predictions made by predictive models for students';
COMMENT ON TABLE alerts IS 'Stores alerts and notifications generated by the analytics system';
COMMENT ON TABLE analytics_dashboard_config IS 'Stores dashboard configuration and widget settings for analytics displays';

-- Row Level Security (RLS) policies
ALTER TABLE student_risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictive_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_dashboard_config ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tenant isolation
CREATE POLICY student_risk_assessments_tenant_isolation ON student_risk_assessments FOR ALL TO authenticated USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY attendance_analytics_tenant_isolation ON attendance_analytics FOR ALL TO authenticated USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY grade_analytics_tenant_isolation ON grade_analytics FOR ALL TO authenticated USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY predictive_models_tenant_isolation ON predictive_models FOR ALL TO authenticated USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY student_predictions_tenant_isolation ON student_predictions FOR ALL TO authenticated USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY alerts_tenant_isolation ON alerts FOR ALL TO authenticated USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY analytics_dashboard_config_tenant_isolation ON analytics_dashboard_config FOR ALL TO authenticated USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
