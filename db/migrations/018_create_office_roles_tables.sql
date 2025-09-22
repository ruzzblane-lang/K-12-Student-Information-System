-- Migration: Create office roles and class officer tables for portal functionality
-- Description: Creates tables for class officers, student government, and leadership positions
-- Created: 2024-01-15
-- Updated: 2024-01-15

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- CLASS OFFICERS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS class_officers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    
    -- Office position details
    position VARCHAR(100) NOT NULL, -- 'president', 'vice_president', 'secretary', 'treasurer', 'historian', 'representative', etc.
    position_title VARCHAR(150), -- Custom title if different from standard position name
    office_type VARCHAR(50) NOT NULL CHECK (office_type IN ('class', 'student_government', 'club', 'team', 'committee', 'council', 'board')),
    organization_name VARCHAR(255), -- Name of the class, club, or organization
    
    -- Term and tenure
    term_start DATE NOT NULL,
    term_end DATE,
    term_length VARCHAR(20) DEFAULT 'yearly' CHECK (term_length IN ('semester', 'yearly', 'biennial', 'permanent')),
    is_current BOOLEAN DEFAULT TRUE,
    
    -- Election and appointment details
    election_date DATE,
    appointment_date DATE,
    elected BOOLEAN DEFAULT TRUE, -- TRUE if elected, FALSE if appointed
    appointed_by UUID REFERENCES users(id) ON DELETE SET NULL, -- User who made the appointment
    election_results JSONB, -- JSON object with vote counts and results
    
    -- Position status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'resigned', 'removed', 'completed')),
    resignation_date DATE,
    removal_date DATE,
    removal_reason TEXT,
    
    -- Responsibilities and duties
    responsibilities JSONB, -- JSON array of position responsibilities
    duties_description TEXT,
    reporting_to UUID REFERENCES users(id) ON DELETE SET NULL, -- Who they report to
    supervising JSONB, -- JSON array of positions or committees they supervise
    
    -- Performance and evaluation
    performance_rating DECIMAL(5,2) DEFAULT 0.00, -- Overall performance rating (0-100)
    evaluation_periods JSONB, -- JSON array of evaluation periods and scores
    feedback_received JSONB, -- JSON array of feedback from peers, advisors, etc.
    goals_achieved JSONB, -- JSON array of goals and achievement status
    
    -- Leadership development
    training_completed JSONB, -- JSON array of leadership training completed
    certifications JSONB, -- JSON array of leadership certifications
    mentorship_provided JSONB, -- JSON array of mentorship activities
    community_service_hours INTEGER DEFAULT 0,
    
    -- Communication and representation
    meeting_attendance_rate DECIMAL(5,2) DEFAULT 0.00,
    events_organized INTEGER DEFAULT 0,
    initiatives_led JSONB, -- JSON array of initiatives and projects led
    public_speaking_engagements INTEGER DEFAULT 0,
    
    -- Financial responsibilities (for treasurer positions)
    budget_managed DECIMAL(12,2) DEFAULT 0.00,
    fundraising_organized DECIMAL(12,2) DEFAULT 0.00,
    financial_reports_submitted INTEGER DEFAULT 0,
    
    -- Recognition and awards
    awards_received JSONB, -- JSON array of awards and recognition
    honors_achieved JSONB, -- JSON array of honors and achievements
    recognition_notes TEXT,
    
    -- Succession planning
    successor_id UUID REFERENCES students(id) ON DELETE SET NULL,
    transition_notes TEXT,
    handover_completed BOOLEAN DEFAULT FALSE,
    handover_date DATE,
    
    -- Notes and comments
    notes TEXT,
    advisor_notes TEXT,
    peer_feedback TEXT,
    self_evaluation TEXT,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Constraints
    CONSTRAINT valid_position_name CHECK (LENGTH(position) >= 2),
    CONSTRAINT valid_term_dates CHECK (term_end IS NULL OR term_end >= term_start),
    CONSTRAINT valid_performance_rating CHECK (performance_rating >= 0.00 AND performance_rating <= 100.00),
    CONSTRAINT valid_meeting_attendance CHECK (meeting_attendance_rate >= 0.00 AND meeting_attendance_rate <= 100.00),
    CONSTRAINT valid_events_organized CHECK (events_organized >= 0),
    CONSTRAINT valid_public_speaking CHECK (public_speaking_engagements >= 0),
    CONSTRAINT valid_budget_managed CHECK (budget_managed >= 0.00),
    CONSTRAINT valid_fundraising CHECK (fundraising_organized >= 0.00),
    CONSTRAINT valid_financial_reports CHECK (financial_reports_submitted >= 0),
    CONSTRAINT valid_community_service CHECK (community_service_hours >= 0),
    CONSTRAINT valid_resignation_date CHECK (resignation_date IS NULL OR resignation_date >= term_start),
    CONSTRAINT valid_removal_date CHECK (removal_date IS NULL OR removal_date >= term_start),
    CONSTRAINT unique_active_position UNIQUE (tenant_id, student_id, position, office_type, organization_name, term_start) 
        DEFERRABLE INITIALLY DEFERRED
);

-- =============================================================================
-- STUDENT GOVERNMENT POSITIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS student_government_positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Position definition
    position_name VARCHAR(100) NOT NULL,
    position_title VARCHAR(150),
    position_level VARCHAR(50) NOT NULL CHECK (position_level IN ('school_wide', 'grade_level', 'class_level', 'department', 'committee')),
    department VARCHAR(100), -- Department or area of responsibility
    
    -- Position details
    description TEXT,
    responsibilities JSONB, -- JSON array of key responsibilities
    requirements JSONB, -- JSON array of position requirements
    qualifications JSONB, -- JSON array of required qualifications
    
    -- Eligibility criteria
    grade_level_requirements JSONB, -- JSON array of required grade levels
    gpa_requirement DECIMAL(3,2), -- Minimum GPA required
    attendance_requirement DECIMAL(5,2), -- Minimum attendance percentage
    disciplinary_requirement BOOLEAN DEFAULT TRUE, -- Must have clean disciplinary record
    
    -- Election/appointment process
    election_required BOOLEAN DEFAULT TRUE,
    appointment_allowed BOOLEAN DEFAULT FALSE,
    term_length_months INTEGER DEFAULT 12,
    term_limit INTEGER DEFAULT 2, -- Maximum number of terms allowed
    consecutive_terms_allowed BOOLEAN DEFAULT TRUE,
    
    -- Position hierarchy
    reports_to_position_id UUID REFERENCES student_government_positions(id) ON DELETE SET NULL,
    supervises_positions JSONB, -- JSON array of position IDs that report to this position
    committee_membership JSONB, -- JSON array of committees this position serves on
    
    -- Compensation and benefits
    stipend_amount DECIMAL(10,2) DEFAULT 0.00,
    stipend_frequency VARCHAR(20) DEFAULT 'yearly', -- 'monthly', 'semester', 'yearly'
    benefits JSONB, -- JSON array of benefits (parking, priority registration, etc.)
    
    -- Position status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'archived')),
    created_date DATE DEFAULT CURRENT_DATE,
    last_updated DATE DEFAULT CURRENT_DATE,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Constraints
    CONSTRAINT valid_position_name CHECK (LENGTH(position_name) >= 2),
    CONSTRAINT valid_gpa_requirement CHECK (gpa_requirement IS NULL OR (gpa_requirement >= 0.0 AND gpa_requirement <= 4.0)),
    CONSTRAINT valid_attendance_requirement CHECK (attendance_requirement IS NULL OR (attendance_requirement >= 0.0 AND attendance_requirement <= 100.0)),
    CONSTRAINT valid_term_length CHECK (term_length_months > 0),
    CONSTRAINT valid_term_limit CHECK (term_limit > 0),
    CONSTRAINT valid_stipend_amount CHECK (stipend_amount >= 0.00),
    CONSTRAINT unique_position_name_per_tenant UNIQUE (tenant_id, position_name, position_level, department)
);

-- =============================================================================
-- LEADERSHIP COMMITTEES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS leadership_committees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Committee information
    name VARCHAR(255) NOT NULL,
    description TEXT,
    committee_type VARCHAR(50) NOT NULL CHECK (committee_type IN ('academic', 'social', 'service', 'disciplinary', 'budget', 'event_planning', 'sustainability', 'diversity', 'technology', 'other')),
    purpose TEXT,
    mission_statement TEXT,
    
    -- Committee structure
    chair_position_id UUID REFERENCES student_government_positions(id) ON DELETE SET NULL,
    vice_chair_position_id UUID REFERENCES student_government_positions(id) ON DELETE SET NULL,
    secretary_position_id UUID REFERENCES student_government_positions(id) ON DELETE SET NULL,
    max_members INTEGER DEFAULT 15,
    current_members INTEGER DEFAULT 0,
    
    -- Meeting and activity schedule
    meeting_schedule JSONB, -- JSON object with meeting times and frequency
    meeting_location VARCHAR(255),
    meeting_frequency VARCHAR(50) DEFAULT 'monthly', -- 'weekly', 'biweekly', 'monthly', 'quarterly'
    
    -- Committee status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'disbanded')),
    established_date DATE DEFAULT CURRENT_DATE,
    disbanded_date DATE,
    
    -- Committee activities
    current_projects JSONB, -- JSON array of current projects
    completed_projects JSONB, -- JSON array of completed projects
    upcoming_events JSONB, -- JSON array of upcoming events
    annual_goals JSONB, -- JSON array of annual goals and objectives
    
    -- Budget and resources
    budget_allocated DECIMAL(12,2) DEFAULT 0.00,
    budget_spent DECIMAL(12,2) DEFAULT 0.00,
    fundraising_goal DECIMAL(12,2) DEFAULT 0.00,
    fundraising_raised DECIMAL(12,2) DEFAULT 0.00,
    
    -- Advisor and oversight
    faculty_advisor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    administrator_oversight_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reporting_schedule VARCHAR(50) DEFAULT 'monthly', -- How often they report to administration
    
    -- Communication and transparency
    meeting_minutes_required BOOLEAN DEFAULT TRUE,
    public_meetings BOOLEAN DEFAULT FALSE,
    transparency_level VARCHAR(20) DEFAULT 'internal' CHECK (transparency_level IN ('public', 'internal', 'restricted')),
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Constraints
    CONSTRAINT valid_committee_name CHECK (LENGTH(name) >= 2),
    CONSTRAINT valid_max_members CHECK (max_members > 0),
    CONSTRAINT valid_current_members CHECK (current_members >= 0),
    CONSTRAINT valid_budget_allocated CHECK (budget_allocated >= 0.00),
    CONSTRAINT valid_budget_spent CHECK (budget_spent >= 0.00),
    CONSTRAINT valid_fundraising_goal CHECK (fundraising_goal >= 0.00),
    CONSTRAINT valid_fundraising_raised CHECK (fundraising_raised >= 0.00),
    CONSTRAINT valid_disbanded_date CHECK (disbanded_date IS NULL OR disbanded_date >= established_date),
    CONSTRAINT unique_committee_name_per_tenant UNIQUE (tenant_id, name)
);

-- =============================================================================
-- COMMITTEE MEMBERSHIPS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS committee_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    committee_id UUID NOT NULL REFERENCES leadership_committees(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    
    -- Membership details
    position VARCHAR(100), -- 'member', 'chair', 'vice_chair', 'secretary', 'treasurer', etc.
    role_description TEXT,
    responsibilities JSONB, -- JSON array of specific responsibilities
    
    -- Membership period
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    term_length VARCHAR(20) DEFAULT 'yearly', -- 'semester', 'yearly', 'permanent'
    
    -- Membership status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'resigned', 'removed')),
    resignation_date DATE,
    removal_date DATE,
    removal_reason TEXT,
    
    -- Appointment/election details
    appointed BOOLEAN DEFAULT FALSE,
    elected BOOLEAN DEFAULT FALSE,
    appointed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    election_date DATE,
    vote_count INTEGER DEFAULT 0,
    
    -- Performance and participation
    attendance_rate DECIMAL(5,2) DEFAULT 0.00,
    participation_score DECIMAL(5,2) DEFAULT 0.00,
    leadership_rating DECIMAL(5,2) DEFAULT 0.00,
    contribution_rating DECIMAL(5,2) DEFAULT 0.00,
    
    -- Committee work
    projects_led INTEGER DEFAULT 0,
    initiatives_proposed INTEGER DEFAULT 0,
    meetings_attended INTEGER DEFAULT 0,
    meetings_missed INTEGER DEFAULT 0,
    
    -- Recognition and feedback
    awards_received JSONB, -- JSON array of awards and recognition
    peer_feedback JSONB, -- JSON array of feedback from committee members
    advisor_feedback JSONB, -- JSON array of feedback from faculty advisor
    
    -- Notes and comments
    notes TEXT,
    performance_notes TEXT,
    advisor_notes TEXT,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Constraints
    CONSTRAINT valid_attendance_rate CHECK (attendance_rate >= 0.00 AND attendance_rate <= 100.00),
    CONSTRAINT valid_participation_score CHECK (participation_score >= 0.00 AND participation_score <= 100.00),
    CONSTRAINT valid_leadership_rating CHECK (leadership_rating >= 0.00 AND leadership_rating <= 100.00),
    CONSTRAINT valid_contribution_rating CHECK (contribution_rating >= 0.00 AND contribution_rating <= 100.00),
    CONSTRAINT valid_projects_led CHECK (projects_led >= 0),
    CONSTRAINT valid_initiatives_proposed CHECK (initiatives_proposed >= 0),
    CONSTRAINT valid_meetings_attended CHECK (meetings_attended >= 0),
    CONSTRAINT valid_meetings_missed CHECK (meetings_missed >= 0),
    CONSTRAINT valid_vote_count CHECK (vote_count >= 0),
    CONSTRAINT valid_membership_dates CHECK (end_date IS NULL OR end_date >= start_date),
    CONSTRAINT valid_resignation_date CHECK (resignation_date IS NULL OR resignation_date >= start_date),
    CONSTRAINT valid_removal_date CHECK (removal_date IS NULL OR removal_date >= start_date),
    CONSTRAINT unique_committee_membership UNIQUE (tenant_id, committee_id, student_id, start_date)
);

-- =============================================================================
-- LEADERSHIP EVENTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS leadership_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Event information
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('election', 'inauguration', 'retreat', 'training', 'conference', 'meeting', 'ceremony', 'recognition', 'workshop', 'other')),
    category VARCHAR(100), -- More specific categorization
    
    -- Event scheduling
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    all_day BOOLEAN DEFAULT FALSE,
    recurring BOOLEAN DEFAULT FALSE,
    recurring_pattern JSONB, -- JSON object with recurrence rules
    
    -- Event location
    location VARCHAR(255),
    venue_type VARCHAR(50) CHECK (venue_type IN ('indoor', 'outdoor', 'virtual', 'hybrid')),
    address TEXT,
    room_number VARCHAR(50),
    virtual_meeting_link VARCHAR(500),
    
    -- Event organization
    organizer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    co_organizer_ids JSONB, -- JSON array of co-organizer user IDs
    committee_id UUID REFERENCES leadership_committees(id) ON DELETE SET NULL,
    contact_person_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Event details
    max_attendees INTEGER,
    current_attendees INTEGER DEFAULT 0,
    registration_required BOOLEAN DEFAULT FALSE,
    registration_deadline TIMESTAMP WITH TIME ZONE,
    registration_fee DECIMAL(10,2) DEFAULT 0.00,
    
    -- Event requirements
    grade_level_restrictions JSONB, -- JSON array of allowed grade levels
    position_restrictions JSONB, -- JSON array of required positions/roles
    gpa_requirement DECIMAL(3,2), -- Minimum GPA required
    attendance_requirement DECIMAL(5,2), -- Minimum attendance percentage
    
    -- Event status
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled', 'postponed', 'completed', 'in_progress')),
    visibility VARCHAR(20) DEFAULT 'internal' CHECK (visibility IN ('public', 'internal', 'restricted', 'private')),
    approval_required BOOLEAN DEFAULT FALSE,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    
    -- Event outcomes
    attendance_count INTEGER DEFAULT 0,
    feedback_collected BOOLEAN DEFAULT FALSE,
    feedback_summary JSONB, -- JSON object with feedback summary
    outcomes_achieved JSONB, -- JSON array of outcomes and achievements
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_notes TEXT,
    
    -- Financial information
    budget_allocated DECIMAL(10,2) DEFAULT 0.00,
    expenses DECIMAL(10,2) DEFAULT 0.00,
    revenue DECIMAL(10,2) DEFAULT 0.00,
    
    -- Media and documentation
    photos_urls JSONB, -- JSON array of photo URLs
    videos_urls JSONB, -- JSON array of video URLs
    documents_urls JSONB, -- JSON array of document URLs
    presentation_urls JSONB, -- JSON array of presentation URLs
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Constraints
    CONSTRAINT valid_event_title CHECK (LENGTH(title) >= 2),
    CONSTRAINT valid_event_dates CHECK (end_date > start_date),
    CONSTRAINT valid_max_attendees CHECK (max_attendees IS NULL OR max_attendees > 0),
    CONSTRAINT valid_current_attendees CHECK (current_attendees >= 0),
    CONSTRAINT valid_registration_fee CHECK (registration_fee >= 0.00),
    CONSTRAINT valid_gpa_requirement CHECK (gpa_requirement IS NULL OR (gpa_requirement >= 0.0 AND gpa_requirement <= 4.0)),
    CONSTRAINT valid_attendance_requirement CHECK (attendance_requirement IS NULL OR (attendance_requirement >= 0.0 AND attendance_requirement <= 100.0)),
    CONSTRAINT valid_attendance_count CHECK (attendance_count >= 0),
    CONSTRAINT valid_budget_allocated CHECK (budget_allocated >= 0.00),
    CONSTRAINT valid_expenses CHECK (expenses >= 0.00),
    CONSTRAINT valid_revenue CHECK (revenue >= 0.00)
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Class officers indexes
CREATE INDEX IF NOT EXISTS idx_class_officers_tenant_id ON class_officers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_class_officers_student_id ON class_officers(student_id);
CREATE INDEX IF NOT EXISTS idx_class_officers_position ON class_officers(position);
CREATE INDEX IF NOT EXISTS idx_class_officers_office_type ON class_officers(office_type);
CREATE INDEX IF NOT EXISTS idx_class_officers_status ON class_officers(status);
CREATE INDEX IF NOT EXISTS idx_class_officers_is_current ON class_officers(is_current);
CREATE INDEX IF NOT EXISTS idx_class_officers_term_start ON class_officers(term_start);
CREATE INDEX IF NOT EXISTS idx_class_officers_deleted_at ON class_officers(deleted_at) WHERE deleted_at IS NULL;

-- Student government positions indexes
CREATE INDEX IF NOT EXISTS idx_student_gov_positions_tenant_id ON student_government_positions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_student_gov_positions_level ON student_government_positions(position_level);
CREATE INDEX IF NOT EXISTS idx_student_gov_positions_department ON student_government_positions(department);
CREATE INDEX IF NOT EXISTS idx_student_gov_positions_status ON student_government_positions(status);
CREATE INDEX IF NOT EXISTS idx_student_gov_positions_reports_to ON student_government_positions(reports_to_position_id);
CREATE INDEX IF NOT EXISTS idx_student_gov_positions_deleted_at ON student_government_positions(deleted_at) WHERE deleted_at IS NULL;

-- Leadership committees indexes
CREATE INDEX IF NOT EXISTS idx_leadership_committees_tenant_id ON leadership_committees(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leadership_committees_type ON leadership_committees(committee_type);
CREATE INDEX IF NOT EXISTS idx_leadership_committees_status ON leadership_committees(status);
CREATE INDEX IF NOT EXISTS idx_leadership_committees_chair ON leadership_committees(chair_position_id);
CREATE INDEX IF NOT EXISTS idx_leadership_committees_advisor ON leadership_committees(faculty_advisor_id);
CREATE INDEX IF NOT EXISTS idx_leadership_committees_deleted_at ON leadership_committees(deleted_at) WHERE deleted_at IS NULL;

-- Committee memberships indexes
CREATE INDEX IF NOT EXISTS idx_committee_memberships_tenant_committee ON committee_memberships(tenant_id, committee_id);
CREATE INDEX IF NOT EXISTS idx_committee_memberships_student ON committee_memberships(student_id);
CREATE INDEX IF NOT EXISTS idx_committee_memberships_position ON committee_memberships(position);
CREATE INDEX IF NOT EXISTS idx_committee_memberships_status ON committee_memberships(status);
CREATE INDEX IF NOT EXISTS idx_committee_memberships_deleted_at ON committee_memberships(deleted_at) WHERE deleted_at IS NULL;

-- Leadership events indexes
CREATE INDEX IF NOT EXISTS idx_leadership_events_tenant_id ON leadership_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leadership_events_type ON leadership_events(event_type);
CREATE INDEX IF NOT EXISTS idx_leadership_events_start_date ON leadership_events(start_date);
CREATE INDEX IF NOT EXISTS idx_leadership_events_status ON leadership_events(status);
CREATE INDEX IF NOT EXISTS idx_leadership_events_organizer ON leadership_events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_leadership_events_committee ON leadership_events(committee_id);
CREATE INDEX IF NOT EXISTS idx_leadership_events_deleted_at ON leadership_events(deleted_at) WHERE deleted_at IS NULL;

-- GIN indexes for JSONB columns
CREATE INDEX IF NOT EXISTS idx_class_officers_responsibilities ON class_officers USING GIN (responsibilities);
CREATE INDEX IF NOT EXISTS idx_class_officers_election_results ON class_officers USING GIN (election_results);
CREATE INDEX IF NOT EXISTS idx_class_officers_supervising ON class_officers USING GIN (supervising);
CREATE INDEX IF NOT EXISTS idx_class_officers_evaluations ON class_officers USING GIN (evaluation_periods);
CREATE INDEX IF NOT EXISTS idx_class_officers_training ON class_officers USING GIN (training_completed);
CREATE INDEX IF NOT EXISTS idx_class_officers_awards ON class_officers USING GIN (awards_received);

CREATE INDEX IF NOT EXISTS idx_student_gov_positions_responsibilities ON student_government_positions USING GIN (responsibilities);
CREATE INDEX IF NOT EXISTS idx_student_gov_positions_requirements ON student_government_positions USING GIN (requirements);
CREATE INDEX IF NOT EXISTS idx_student_gov_positions_qualifications ON student_government_positions USING GIN (qualifications);
CREATE INDEX IF NOT EXISTS idx_student_gov_positions_grade_requirements ON student_government_positions USING GIN (grade_level_requirements);
CREATE INDEX IF NOT EXISTS idx_student_gov_positions_supervises ON student_government_positions USING GIN (supervises_positions);
CREATE INDEX IF NOT EXISTS idx_student_gov_positions_benefits ON student_government_positions USING GIN (benefits);

CREATE INDEX IF NOT EXISTS idx_leadership_committees_meeting_schedule ON leadership_committees USING GIN (meeting_schedule);
CREATE INDEX IF NOT EXISTS idx_leadership_committees_current_projects ON leadership_committees USING GIN (current_projects);
CREATE INDEX IF NOT EXISTS idx_leadership_committees_completed_projects ON leadership_committees USING GIN (completed_projects);
CREATE INDEX IF NOT EXISTS idx_leadership_committees_upcoming_events ON leadership_committees USING GIN (upcoming_events);
CREATE INDEX IF NOT EXISTS idx_leadership_committees_annual_goals ON leadership_committees USING GIN (annual_goals);

CREATE INDEX IF NOT EXISTS idx_committee_memberships_responsibilities ON committee_memberships USING GIN (responsibilities);
CREATE INDEX IF NOT EXISTS idx_committee_memberships_awards ON committee_memberships USING GIN (awards_received);
CREATE INDEX IF NOT EXISTS idx_committee_memberships_peer_feedback ON committee_memberships USING GIN (peer_feedback);
CREATE INDEX IF NOT EXISTS idx_committee_memberships_advisor_feedback ON committee_memberships USING GIN (advisor_feedback);

CREATE INDEX IF NOT EXISTS idx_leadership_events_recurring_pattern ON leadership_events USING GIN (recurring_pattern);
CREATE INDEX IF NOT EXISTS idx_leadership_events_organizers ON leadership_events USING GIN (co_organizer_ids);
CREATE INDEX IF NOT EXISTS idx_leadership_events_grade_restrictions ON leadership_events USING GIN (grade_level_restrictions);
CREATE INDEX IF NOT EXISTS idx_leadership_events_position_restrictions ON leadership_events USING GIN (position_restrictions);
CREATE INDEX IF NOT EXISTS idx_leadership_events_feedback ON leadership_events USING GIN (feedback_summary);
CREATE INDEX IF NOT EXISTS idx_leadership_events_outcomes ON leadership_events USING GIN (outcomes_achieved);
CREATE INDEX IF NOT EXISTS idx_leadership_events_photos ON leadership_events USING GIN (photos_urls);
CREATE INDEX IF NOT EXISTS idx_leadership_events_videos ON leadership_events USING GIN (videos_urls);
CREATE INDEX IF NOT EXISTS idx_leadership_events_documents ON leadership_events USING GIN (documents_urls);
CREATE INDEX IF NOT EXISTS idx_leadership_events_presentations ON leadership_events USING GIN (presentation_urls);

-- =============================================================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- =============================================================================

-- Create or replace the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for all tables
CREATE TRIGGER update_class_officers_updated_at BEFORE UPDATE ON class_officers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_student_gov_positions_updated_at BEFORE UPDATE ON student_government_positions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leadership_committees_updated_at BEFORE UPDATE ON leadership_committees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_committee_memberships_updated_at BEFORE UPDATE ON committee_memberships FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leadership_events_updated_at BEFORE UPDATE ON leadership_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- TRIGGERS FOR MEMBER COUNT UPDATES
-- =============================================================================

-- Function to update committee member count
CREATE OR REPLACE FUNCTION update_committee_member_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
        UPDATE leadership_committees SET current_members = current_members + 1 WHERE id = NEW.committee_id;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status = 'active' AND NEW.status != 'active' THEN
            UPDATE leadership_committees SET current_members = current_members - 1 WHERE id = NEW.committee_id;
        ELSIF OLD.status != 'active' AND NEW.status = 'active' THEN
            UPDATE leadership_committees SET current_members = current_members + 1 WHERE id = NEW.committee_id;
        END IF;
    ELSIF TG_OP = 'DELETE' AND OLD.status = 'active' THEN
        UPDATE leadership_committees SET current_members = current_members - 1 WHERE id = OLD.committee_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to update leadership event attendee count
CREATE OR REPLACE FUNCTION update_leadership_event_attendee_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'completed' THEN
        UPDATE leadership_events SET current_attendees = current_attendees + 1 WHERE id = NEW.event_id;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
            UPDATE leadership_events SET current_attendees = current_attendees + 1 WHERE id = NEW.event_id;
        ELSIF OLD.status = 'completed' AND NEW.status != 'completed' THEN
            UPDATE leadership_events SET current_attendees = current_attendees - 1 WHERE id = NEW.event_id;
        END IF;
    ELSIF TG_OP = 'DELETE' AND OLD.status = 'completed' THEN
        UPDATE leadership_events SET current_attendees = current_attendees - 1 WHERE id = OLD.event_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for member count updates
CREATE TRIGGER update_committee_member_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON committee_memberships
    FOR EACH ROW EXECUTE FUNCTION update_committee_member_count();

-- Note: Leadership events attendee count would be updated through event_participants table
-- from the previous migration, so we don't need a separate trigger here

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE class_officers ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_government_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE leadership_committees ENABLE ROW LEVEL SECURITY;
ALTER TABLE committee_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE leadership_events ENABLE ROW LEVEL SECURITY;

-- TODO: IMPLEMENTER - Add comprehensive RLS policies for tenant isolation and role-based access
-- The following policies need to be implemented based on the existing RLS patterns in the project:

-- 1. Tenant isolation policies (ensure users can only access data from their tenant)
-- 2. Role-based access policies (different access levels for students, teachers, admins)
-- 3. Student-specific policies (students can only see their own positions/memberships)
-- 4. Teacher/advisor policies (teachers can see students in their committees/positions)
-- 5. Admin policies (admins can see all data within their tenant)
-- 6. Public visibility policies (some leadership events may be public)

-- Example RLS policy structure (to be implemented):
-- CREATE POLICY class_officers_tenant_isolation ON class_officers FOR ALL TO authenticated USING (tenant_id = get_current_tenant_id());
-- CREATE POLICY class_officers_role_access ON class_officers FOR ALL TO authenticated USING (can_access_leadership_data());

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE class_officers IS 'Stores information about student class officers and leadership positions';
COMMENT ON TABLE student_government_positions IS 'Stores definitions and requirements for student government positions';
COMMENT ON TABLE leadership_committees IS 'Stores information about student leadership committees and organizations';
COMMENT ON TABLE committee_memberships IS 'Stores student memberships in leadership committees';
COMMENT ON TABLE leadership_events IS 'Stores information about leadership-related events and activities';

-- JSONB column documentation
COMMENT ON COLUMN class_officers.responsibilities IS 'JSON array of position responsibilities and duties';
COMMENT ON COLUMN class_officers.election_results IS 'JSON object with vote counts and election results';
COMMENT ON COLUMN class_officers.supervising IS 'JSON array of positions or committees they supervise';
COMMENT ON COLUMN class_officers.evaluation_periods IS 'JSON array of evaluation periods and performance scores';
COMMENT ON COLUMN class_officers.training_completed IS 'JSON array of leadership training completed';
COMMENT ON COLUMN class_officers.awards_received IS 'JSON array of awards and recognition received';

COMMENT ON COLUMN student_government_positions.responsibilities IS 'JSON array of key responsibilities for the position';
COMMENT ON COLUMN student_government_positions.requirements IS 'JSON array of position requirements';
COMMENT ON COLUMN student_government_positions.qualifications IS 'JSON array of required qualifications';
COMMENT ON COLUMN student_government_positions.grade_level_requirements IS 'JSON array of required grade levels';
COMMENT ON COLUMN student_government_positions.supervises_positions IS 'JSON array of position IDs that report to this position';
COMMENT ON COLUMN student_government_positions.benefits IS 'JSON array of benefits and perks for the position';

COMMENT ON COLUMN leadership_committees.meeting_schedule IS 'JSON object with meeting times, frequency, and location details';
COMMENT ON COLUMN leadership_committees.current_projects IS 'JSON array of current projects and initiatives';
COMMENT ON COLUMN leadership_committees.completed_projects IS 'JSON array of completed projects and achievements';
COMMENT ON COLUMN leadership_committees.upcoming_events IS 'JSON array of upcoming events and activities';
COMMENT ON COLUMN leadership_committees.annual_goals IS 'JSON array of annual goals and objectives';

COMMENT ON COLUMN committee_memberships.responsibilities IS 'JSON array of specific responsibilities for the member';
COMMENT ON COLUMN committee_memberships.awards_received IS 'JSON array of awards and recognition received';
COMMENT ON COLUMN committee_memberships.peer_feedback IS 'JSON array of feedback from committee members';
COMMENT ON COLUMN committee_memberships.advisor_feedback IS 'JSON array of feedback from faculty advisor';

COMMENT ON COLUMN leadership_events.recurring_pattern IS 'JSON object with recurrence rules for recurring events';
COMMENT ON COLUMN leadership_events.co_organizer_ids IS 'JSON array of co-organizer user IDs';
COMMENT ON COLUMN leadership_events.grade_level_restrictions IS 'JSON array of allowed grade levels';
COMMENT ON COLUMN leadership_events.position_restrictions IS 'JSON array of required positions/roles';
COMMENT ON COLUMN leadership_events.feedback_summary IS 'JSON object with feedback summary and ratings';
COMMENT ON COLUMN leadership_events.outcomes_achieved IS 'JSON array of outcomes and achievements';
COMMENT ON COLUMN leadership_events.photos_urls IS 'JSON array of photo URLs from the event';
COMMENT ON COLUMN leadership_events.videos_urls IS 'JSON array of video URLs from the event';
COMMENT ON COLUMN leadership_events.documents_urls IS 'JSON array of document URLs from the event';
COMMENT ON COLUMN leadership_events.presentation_urls IS 'JSON array of presentation URLs from the event';

-- =============================================================================
-- TODO: IMPLEMENTER NOTES
-- =============================================================================

-- SECURITY IMPLEMENTATION REQUIRED:
-- 1. Implement comprehensive RLS policies for tenant isolation
-- 2. Add role-based access control for different user types
-- 3. Implement data encryption for sensitive information
-- 4. Add audit logging for all CRUD operations
-- 5. Implement consent tracking for student data (GDPR/COPPA compliance)
-- 6. Add data retention policies for old records
-- 7. Implement field-level masking for sensitive data

-- BUSINESS LOGIC IMPLEMENTATION REQUIRED:
-- 1. Add validation for position term limits and eligibility
-- 2. Implement automatic status updates based on dates
-- 3. Add notification system for elections and appointments
-- 4. Implement grade level and GPA requirement validation
-- 5. Add conflict detection for overlapping positions
-- 6. Implement automatic succession planning workflows

-- INTEGRATION IMPLEMENTATION REQUIRED:
-- 1. Connect with existing student and user tables
-- 2. Integrate with grade and attendance systems for eligibility
-- 3. Add calendar integration for leadership events
-- 4. Implement email/SMS notifications for elections
-- 5. Add file upload capabilities for documents and images
-- 6. Integrate with voting systems for elections

-- PERFORMANCE OPTIMIZATION REQUIRED:
-- 1. Add materialized views for frequently accessed data
-- 2. Implement caching for position and committee listings
-- 3. Add database partitioning for large tables
-- 4. Optimize queries for dashboard and reporting
-- 5. Implement background jobs for data processing

-- COMPLIANCE IMPLEMENTATION REQUIRED:
-- 1. Add FERPA compliance for student leadership data
-- 2. Implement COPPA compliance for student elections
-- 3. Add GDPR compliance for international students
-- 4. Implement audit trails for all leadership decisions
-- 5. Add data retention policies for leadership records
-- 6. Implement consent management for leadership participation
