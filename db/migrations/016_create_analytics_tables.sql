-- Analytics and Alerts System Tables
-- This migration creates tables for advanced analytics, at-risk student identification,
-- attendance trends, and predictive analytics
-- Enhanced: 2024-09-22 (Added auto-update triggers, comprehensive RLS policies, and JSONB validation)

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
    
    -- Validation constraints for JSONB structure
    CONSTRAINT valid_seasonal_patterns CHECK (
        seasonal_patterns IS NULL OR 
        (seasonal_patterns ? 'spring' AND seasonal_patterns ? 'summer' AND 
         seasonal_patterns ? 'fall' AND seasonal_patterns ? 'winter' AND
         jsonb_typeof(seasonal_patterns->'spring') = 'number' AND
         jsonb_typeof(seasonal_patterns->'summer') = 'number' AND
         jsonb_typeof(seasonal_patterns->'fall') = 'number' AND
         jsonb_typeof(seasonal_patterns->'winter') = 'number')
    ),
    CONSTRAINT valid_trend_magnitude CHECK (
        trend_magnitude IS NULL OR 
        (trend_magnitude >= -100.0 AND trend_magnitude <= 100.0)
    )
    
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
    
    -- Validation constraints for JSONB structure
    CONSTRAINT valid_subject_performance CHECK (
        subject_performance IS NULL OR 
        (jsonb_typeof(subject_performance) = 'object' AND
         jsonb_array_length(jsonb_object_keys(subject_performance)) > 0)
    ),
    CONSTRAINT valid_grade_volatility CHECK (
        grade_volatility IS NULL OR 
        (grade_volatility >= 0.0 AND grade_volatility <= 100.0)
    )
    
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
    
    -- Validation constraints for JSONB structure
    CONSTRAINT valid_prediction_interval CHECK (
        prediction_interval IS NULL OR 
        (prediction_interval ? 'lower_bound' AND prediction_interval ? 'upper_bound' AND
         jsonb_typeof(prediction_interval->'lower_bound') = 'number' AND
         jsonb_typeof(prediction_interval->'upper_bound') = 'number')
    ),
    CONSTRAINT valid_top_features CHECK (
        top_features IS NULL OR 
        (jsonb_typeof(top_features) = 'object' AND
         jsonb_array_length(jsonb_object_keys(top_features)) > 0)
    ),
    CONSTRAINT valid_confidence_score CHECK (
        confidence_score IS NULL OR 
        (confidence_score >= 0.0 AND confidence_score <= 1.0)
    )
    
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

-- =============================================================================
-- AUTO-UPDATE TRIGGERS FOR ANALYTICS SUMMARIES
-- =============================================================================

-- Function to update attendance analytics when attendance records change
CREATE OR REPLACE FUNCTION update_attendance_analytics_trigger()
RETURNS TRIGGER AS $$
DECLARE
    tenant_uuid UUID;
    student_uuid UUID;
    analysis_date DATE;
BEGIN
    -- Determine tenant_id and student_id based on trigger context
    IF TG_OP = 'DELETE' THEN
        tenant_uuid := OLD.tenant_id;
        student_uuid := OLD.student_id;
        analysis_date := OLD.attendance_date::DATE;
    ELSE
        tenant_uuid := NEW.tenant_id;
        student_uuid := NEW.student_id;
        analysis_date := NEW.attendance_date::DATE;
    END IF;

    -- Update or insert attendance analytics for the affected period
    INSERT INTO attendance_analytics (
        tenant_id, student_id, analysis_date, period_type,
        total_days, present_days, absent_days, tardy_days,
        excused_absences, unexcused_absences,
        attendance_rate, punctuality_rate,
        attendance_trend, trend_direction, trend_magnitude,
        seasonal_patterns, time_patterns,
        attendance_alert, chronic_absenteeism, tardiness_concern
    )
    SELECT 
        tenant_uuid,
        student_uuid,
        analysis_date,
        'daily',
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'present'),
        COUNT(*) FILTER (WHERE status = 'absent'),
        COUNT(*) FILTER (WHERE status = 'tardy'),
        COUNT(*) FILTER (WHERE status = 'absent' AND excused = true),
        COUNT(*) FILTER (WHERE status = 'absent' AND excused = false),
        ROUND((COUNT(*) FILTER (WHERE status = 'present')::DECIMAL / COUNT(*)) * 100, 2),
        ROUND((COUNT(*) FILTER (WHERE status IN ('present', 'tardy'))::DECIMAL / COUNT(*)) * 100, 2),
        CASE 
            WHEN (COUNT(*) FILTER (WHERE status = 'absent')::DECIMAL / COUNT(*)) > 0.2 THEN 'critical'
            WHEN (COUNT(*) FILTER (WHERE status = 'absent')::DECIMAL / COUNT(*)) > 0.1 THEN 'declining'
            ELSE 'stable'
        END,
        'stable', -- Will be calculated by analytics service
        0.0, -- Will be calculated by analytics service
        '{}', -- Will be calculated by analytics service
        '{}', -- Will be calculated by analytics service
        (COUNT(*) FILTER (WHERE status = 'absent')::DECIMAL / COUNT(*)) > 0.1,
        (COUNT(*) FILTER (WHERE status = 'absent')::DECIMAL / COUNT(*)) > 0.2,
        (COUNT(*) FILTER (WHERE status = 'tardy')::DECIMAL / COUNT(*)) > 0.15
    FROM attendance 
    WHERE tenant_id = tenant_uuid 
      AND student_id = student_uuid 
      AND attendance_date::DATE = analysis_date
    ON CONFLICT (tenant_id, student_id, analysis_date, period_type)
    DO UPDATE SET
        total_days = EXCLUDED.total_days,
        present_days = EXCLUDED.present_days,
        absent_days = EXCLUDED.absent_days,
        tardy_days = EXCLUDED.tardy_days,
        excused_absences = EXCLUDED.excused_absences,
        unexcused_absences = EXCLUDED.unexcused_absences,
        attendance_rate = EXCLUDED.attendance_rate,
        punctuality_rate = EXCLUDED.punctuality_rate,
        attendance_trend = EXCLUDED.attendance_trend,
        attendance_alert = EXCLUDED.attendance_alert,
        chronic_absenteeism = EXCLUDED.chronic_absenteeism,
        tardiness_concern = EXCLUDED.tardiness_concern,
        updated_at = CURRENT_TIMESTAMP;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS) policies
ALTER TABLE student_risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictive_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_dashboard_config ENABLE ROW LEVEL SECURITY;

-- Function to check if user can view sensitive analytics data
CREATE OR REPLACE FUNCTION can_view_analytics_sensitive_data(
    p_user_role TEXT,
    p_tenant_id UUID,
    p_data_type TEXT DEFAULT 'general'
) RETURNS BOOLEAN AS $$
BEGIN
    -- Super admins can view all analytics data
    IF p_user_role = 'super_admin' THEN
        RETURN TRUE;
    END IF;
    
    -- Admins can view all analytics data within their tenant
    IF p_user_role = 'admin' THEN
        RETURN TRUE;
    END IF;
    
    -- Counselors can view risk assessment and predictive analytics
    IF p_user_role = 'counselor' AND p_data_type IN ('risk_assessment', 'predictions', 'alerts') THEN
        RETURN TRUE;
    END IF;
    
    -- Teachers can view analytics for their students
    IF p_user_role = 'teacher' AND p_data_type IN ('attendance', 'grades', 'general') THEN
        RETURN TRUE;
    END IF;
    
    -- Parents can view basic analytics for their children
    IF p_user_role = 'parent' AND p_data_type = 'basic' THEN
        RETURN TRUE;
    END IF;
    
    -- Students can view their own basic analytics
    IF p_user_role = 'student' AND p_data_type = 'basic' THEN
        RETURN TRUE;
    END IF;
    
    -- Other roles cannot view sensitive analytics data
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing basic RLS policies
DROP POLICY IF EXISTS student_risk_assessments_tenant_isolation ON student_risk_assessments;
DROP POLICY IF EXISTS attendance_analytics_tenant_isolation ON attendance_analytics;
DROP POLICY IF EXISTS grade_analytics_tenant_isolation ON grade_analytics;
DROP POLICY IF EXISTS predictive_models_tenant_isolation ON predictive_models;
DROP POLICY IF EXISTS student_predictions_tenant_isolation ON student_predictions;
DROP POLICY IF EXISTS alerts_tenant_isolation ON alerts;
DROP POLICY IF EXISTS analytics_dashboard_config_tenant_isolation ON analytics_dashboard_config;

-- Comprehensive RLS policies for student_risk_assessments
CREATE POLICY student_risk_assessments_comprehensive_access ON student_risk_assessments
    FOR ALL TO authenticated
    USING (
        -- Super admins can access all data
        is_super_admin() OR
        -- Tenant isolation with role-based access
        (tenant_id = get_current_tenant_id() AND
         can_view_analytics_sensitive_data(
             current_setting('app.current_user_role', true),
             get_current_tenant_id(),
             'risk_assessment'
         ))
    );

-- Comprehensive RLS policies for attendance_analytics
CREATE POLICY attendance_analytics_comprehensive_access ON attendance_analytics
    FOR ALL TO authenticated
    USING (
        -- Super admins can access all data
        is_super_admin() OR
        -- Tenant isolation with role-based access
        (tenant_id = get_current_tenant_id() AND
         can_view_analytics_sensitive_data(
             current_setting('app.current_user_role', true),
             get_current_tenant_id(),
             'attendance'
         ))
    );

-- Comprehensive RLS policies for grade_analytics
CREATE POLICY grade_analytics_comprehensive_access ON grade_analytics
    FOR ALL TO authenticated
    USING (
        -- Super admins can access all data
        is_super_admin() OR
        -- Tenant isolation with role-based access
        (tenant_id = get_current_tenant_id() AND
         can_view_analytics_sensitive_data(
             current_setting('app.current_user_role', true),
             get_current_tenant_id(),
             'grades'
         ))
    );

-- Comprehensive RLS policies for predictive_models (most sensitive)
CREATE POLICY predictive_models_comprehensive_access ON predictive_models
    FOR ALL TO authenticated
    USING (
        -- Super admins can access all data
        is_super_admin() OR
        -- Only admins and counselors can access predictive models
        (tenant_id = get_current_tenant_id() AND
         current_setting('app.current_user_role', true) IN ('admin', 'counselor'))
    );

-- Comprehensive RLS policies for student_predictions (most sensitive)
CREATE POLICY student_predictions_comprehensive_access ON student_predictions
    FOR ALL TO authenticated
    USING (
        -- Super admins can access all data
        is_super_admin() OR
        -- Only admins and counselors can access predictions
        (tenant_id = get_current_tenant_id() AND
         current_setting('app.current_user_role', true) IN ('admin', 'counselor'))
    );

-- Comprehensive RLS policies for alerts
CREATE POLICY alerts_comprehensive_access ON alerts
    FOR ALL TO authenticated
    USING (
        -- Super admins can access all data
        is_super_admin() OR
        -- Tenant isolation with role-based access
        (tenant_id = get_current_tenant_id() AND
         can_view_analytics_sensitive_data(
             current_setting('app.current_user_role', true),
             get_current_tenant_id(),
             'alerts'
         ))
    );

-- Comprehensive RLS policies for analytics_dashboard_config
CREATE POLICY analytics_dashboard_config_comprehensive_access ON analytics_dashboard_config
    FOR ALL TO authenticated
    USING (
        -- Super admins can access all data
        is_super_admin() OR
        -- Users can access their own dashboard configs within their tenant
        (tenant_id = get_current_tenant_id() AND
         (user_id = get_current_user_id() OR 
          current_setting('app.current_user_role', true) = 'admin'))
    );

-- =============================================================================
-- MASKED VIEWS FOR ANALYTICS DATA
-- =============================================================================

-- Create masked view for student_risk_assessments
CREATE OR REPLACE VIEW student_risk_assessments_masked AS
SELECT 
    id,
    tenant_id,
    student_id,
    -- Risk scores are rounded for privacy unless user has appropriate permissions
    CASE 
        WHEN can_view_analytics_sensitive_data(
            current_setting('app.current_user_role', true),
            get_current_tenant_id(),
            'risk_assessment'
        ) THEN attendance_risk_score
        ELSE ROUND(attendance_risk_score, 0) -- Round to nearest integer
    END as attendance_risk_score,
    CASE 
        WHEN can_view_analytics_sensitive_data(
            current_setting('app.current_user_role', true),
            get_current_tenant_id(),
            'risk_assessment'
        ) THEN academic_risk_score
        ELSE ROUND(academic_risk_score, 0) -- Round to nearest integer
    END as academic_risk_score,
    behavioral_risk_score,
    social_risk_score,
    overall_risk_score,
    risk_level,
    -- Risk indicators are shown based on permissions
    CASE 
        WHEN can_view_analytics_sensitive_data(
            current_setting('app.current_user_role', true),
            get_current_tenant_id(),
            'risk_assessment'
        ) THEN attendance_issues
        ELSE NULL
    END as attendance_issues,
    grade_decline,
    frequent_tardiness,
    discipline_issues,
    social_isolation,
    family_issues,
    assessment_date,
    assessment_period,
    algorithm_version,
    intervention_required,
    -- Intervention plan is masked unless user has appropriate permissions
    CASE 
        WHEN can_view_analytics_sensitive_data(
            current_setting('app.current_user_role', true),
            get_current_tenant_id(),
            'risk_assessment'
        ) THEN intervention_plan
        ELSE '[INTERVENTION PLAN MASKED]'
    END as intervention_plan,
    last_intervention_date,
    intervention_success_rate,
    created_at,
    updated_at
FROM student_risk_assessments;

-- Enable security invoker on masked views
ALTER VIEW student_risk_assessments_masked SET (security_invoker = true);
