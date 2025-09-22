-- Migration: Create clubs, teams, events, and related tables for portal functionality
-- Description: Creates comprehensive tables for student clubs, sports teams, events, and memberships
-- Created: 2024-01-15
-- Updated: 2024-01-15

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- CLUBS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS clubs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Basic club information
    name VARCHAR(255) NOT NULL,
    description TEXT,
    club_type VARCHAR(50) NOT NULL CHECK (club_type IN ('academic', 'sports', 'arts', 'service', 'social', 'cultural', 'religious', 'other')),
    category VARCHAR(100), -- More specific categorization within type
    
    -- Club details
    meeting_schedule JSONB, -- JSON object with meeting times, frequency, location
    meeting_location VARCHAR(255),
    meeting_frequency VARCHAR(50), -- 'weekly', 'biweekly', 'monthly', 'as_needed'
    
    -- Club status and management
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'pending_approval')),
    max_members INTEGER DEFAULT 50,
    current_members INTEGER DEFAULT 0,
    
    -- Contact and leadership
    advisor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    president_id UUID REFERENCES users(id) ON DELETE SET NULL,
    vice_president_id UUID REFERENCES users(id) ON DELETE SET NULL,
    secretary_id UUID REFERENCES users(id) ON DELETE SET NULL,
    treasurer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Club requirements and eligibility
    grade_level_requirements JSONB, -- JSON array of required grade levels
    gpa_requirement DECIMAL(3,2), -- Minimum GPA required
    application_required BOOLEAN DEFAULT FALSE,
    application_deadline DATE,
    
    -- Club activities and achievements
    activities JSONB, -- JSON array of club activities and events
    achievements JSONB, -- JSON array of club achievements and awards
    social_media_links JSONB, -- JSON object with social media URLs
    
    -- Financial information
    dues_amount DECIMAL(10,2) DEFAULT 0.00,
    dues_frequency VARCHAR(20) DEFAULT 'yearly', -- 'yearly', 'semester', 'monthly'
    budget_allocated DECIMAL(10,2) DEFAULT 0.00,
    
    -- Media and branding
    logo_url VARCHAR(500),
    banner_image_url VARCHAR(500),
    club_colors JSONB, -- JSON object with primary and secondary colors
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Constraints
    CONSTRAINT valid_club_name CHECK (LENGTH(name) >= 2),
    CONSTRAINT valid_max_members CHECK (max_members > 0),
    CONSTRAINT valid_current_members CHECK (current_members >= 0),
    CONSTRAINT valid_gpa_requirement CHECK (gpa_requirement IS NULL OR (gpa_requirement >= 0.0 AND gpa_requirement <= 4.0)),
    CONSTRAINT valid_dues_amount CHECK (dues_amount >= 0.00),
    CONSTRAINT valid_budget_allocated CHECK (budget_allocated >= 0.00),
    CONSTRAINT unique_club_name_per_tenant UNIQUE (tenant_id, name)
);

-- =============================================================================
-- TEAMS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Basic team information
    name VARCHAR(255) NOT NULL,
    sport VARCHAR(100) NOT NULL,
    team_type VARCHAR(50) NOT NULL CHECK (team_type IN ('varsity', 'junior_varsity', 'freshman', 'club', 'intramural')),
    gender VARCHAR(20) NOT NULL CHECK (gender IN ('male', 'female', 'coed', 'mixed')),
    season VARCHAR(20) NOT NULL CHECK (season IN ('fall', 'winter', 'spring', 'summer', 'year_round')),
    
    -- Team details
    description TEXT,
    grade_level_requirements JSONB, -- JSON array of required grade levels
    tryout_required BOOLEAN DEFAULT TRUE,
    tryout_dates JSONB, -- JSON object with tryout schedule
    practice_schedule JSONB, -- JSON object with practice times and locations
    game_schedule JSONB, -- JSON object with game schedule
    
    -- Team management
    head_coach_id UUID REFERENCES users(id) ON DELETE SET NULL,
    assistant_coach_ids JSONB, -- JSON array of assistant coach user IDs
    captain_id UUID REFERENCES users(id) ON DELETE SET NULL,
    co_captain_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Team status and capacity
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'season_ended')),
    max_players INTEGER DEFAULT 25,
    current_players INTEGER DEFAULT 0,
    roster_locked BOOLEAN DEFAULT FALSE,
    
    -- Team requirements
    physical_requirements JSONB, -- JSON object with physical requirements
    academic_requirements JSONB, -- JSON object with academic requirements
    equipment_required JSONB, -- JSON array of required equipment
    
    -- Team performance and records
    season_record JSONB, -- JSON object with wins, losses, ties
    team_statistics JSONB, -- JSON object with team stats
    achievements JSONB, -- JSON array of team achievements
    
    -- Financial information
    participation_fee DECIMAL(10,2) DEFAULT 0.00,
    equipment_fee DECIMAL(10,2) DEFAULT 0.00,
    travel_fee DECIMAL(10,2) DEFAULT 0.00,
    budget_allocated DECIMAL(10,2) DEFAULT 0.00,
    
    -- Media and branding
    logo_url VARCHAR(500),
    team_colors JSONB, -- JSON object with primary and secondary colors
    mascot VARCHAR(100),
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Constraints
    CONSTRAINT valid_team_name CHECK (LENGTH(name) >= 2),
    CONSTRAINT valid_max_players CHECK (max_players > 0),
    CONSTRAINT valid_current_players CHECK (current_players >= 0),
    CONSTRAINT valid_participation_fee CHECK (participation_fee >= 0.00),
    CONSTRAINT valid_equipment_fee CHECK (equipment_fee >= 0.00),
    CONSTRAINT valid_travel_fee CHECK (travel_fee >= 0.00),
    CONSTRAINT valid_budget_allocated CHECK (budget_allocated >= 0.00),
    CONSTRAINT unique_team_name_per_tenant UNIQUE (tenant_id, name, season)
);

-- =============================================================================
-- EVENTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Basic event information
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('academic', 'sports', 'social', 'cultural', 'service', 'fundraising', 'meeting', 'performance', 'ceremony', 'other')),
    category VARCHAR(100), -- More specific categorization within type
    
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
    
    -- Event management
    organizer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    co_organizer_ids JSONB, -- JSON array of co-organizer user IDs
    contact_person_id UUID REFERENCES users(id) ON DELETE SET NULL,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    
    -- Event details
    max_attendees INTEGER,
    current_attendees INTEGER DEFAULT 0,
    registration_required BOOLEAN DEFAULT FALSE,
    registration_deadline TIMESTAMP WITH TIME ZONE,
    registration_fee DECIMAL(10,2) DEFAULT 0.00,
    
    -- Event requirements and restrictions
    grade_level_restrictions JSONB, -- JSON array of allowed grade levels
    age_restrictions JSONB, -- JSON object with min/max age requirements
    gender_restrictions VARCHAR(20) CHECK (gender_restrictions IN ('male', 'female', 'coed', 'none')),
    permission_slip_required BOOLEAN DEFAULT FALSE,
    chaperone_required BOOLEAN DEFAULT FALSE,
    min_chaperones INTEGER DEFAULT 0,
    
    -- Event status and visibility
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled', 'postponed', 'completed', 'in_progress')),
    visibility VARCHAR(20) DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'invite_only', 'restricted')),
    approval_required BOOLEAN DEFAULT FALSE,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    
    -- Event resources and materials
    equipment_needed JSONB, -- JSON array of required equipment
    supplies_needed JSONB, -- JSON array of required supplies
    setup_instructions TEXT,
    cleanup_instructions TEXT,
    
    -- Event outcomes and feedback
    attendance_count INTEGER DEFAULT 0,
    feedback_collected BOOLEAN DEFAULT FALSE,
    feedback_summary JSONB, -- JSON object with feedback summary
    photos_urls JSONB, -- JSON array of photo URLs
    videos_urls JSONB, -- JSON array of video URLs
    
    -- Financial information
    budget_allocated DECIMAL(10,2) DEFAULT 0.00,
    expenses DECIMAL(10,2) DEFAULT 0.00,
    revenue DECIMAL(10,2) DEFAULT 0.00,
    
    -- Media and branding
    banner_image_url VARCHAR(500),
    event_colors JSONB, -- JSON object with primary and secondary colors
    
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
    CONSTRAINT valid_min_chaperones CHECK (min_chaperones >= 0),
    CONSTRAINT valid_attendance_count CHECK (attendance_count >= 0),
    CONSTRAINT valid_budget_allocated CHECK (budget_allocated >= 0.00),
    CONSTRAINT valid_expenses CHECK (expenses >= 0.00),
    CONSTRAINT valid_revenue CHECK (revenue >= 0.00)
);

-- =============================================================================
-- CLUB MEMBERSHIPS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS club_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    
    -- Membership details
    membership_type VARCHAR(20) DEFAULT 'member' CHECK (membership_type IN ('member', 'officer', 'president', 'vice_president', 'secretary', 'treasurer', 'advisor')),
    position_title VARCHAR(100), -- Custom position title if not standard officer role
    
    -- Membership status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'pending', 'rejected')),
    application_date DATE DEFAULT CURRENT_DATE,
    approval_date DATE,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Membership period
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    term_length VARCHAR(20) DEFAULT 'yearly', -- 'semester', 'yearly', 'permanent'
    
    -- Membership requirements and compliance
    dues_paid BOOLEAN DEFAULT FALSE,
    dues_amount DECIMAL(10,2) DEFAULT 0.00,
    dues_paid_date DATE,
    requirements_met JSONB, -- JSON object tracking requirement compliance
    
    -- Performance and participation
    attendance_rate DECIMAL(5,2) DEFAULT 0.00,
    participation_score DECIMAL(5,2) DEFAULT 0.00,
    leadership_rating DECIMAL(5,2) DEFAULT 0.00,
    
    -- Notes and comments
    notes TEXT,
    performance_notes TEXT,
    disciplinary_notes TEXT,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Constraints
    CONSTRAINT valid_dues_amount CHECK (dues_amount >= 0.00),
    CONSTRAINT valid_attendance_rate CHECK (attendance_rate >= 0.00 AND attendance_rate <= 100.00),
    CONSTRAINT valid_participation_score CHECK (participation_score >= 0.00 AND participation_score <= 100.00),
    CONSTRAINT valid_leadership_rating CHECK (leadership_rating >= 0.00 AND leadership_rating <= 100.00),
    CONSTRAINT valid_membership_dates CHECK (end_date IS NULL OR end_date >= start_date),
    CONSTRAINT unique_club_membership UNIQUE (tenant_id, club_id, student_id, start_date)
);

-- =============================================================================
-- TEAM ROSTERS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS team_rosters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    
    -- Roster details
    position VARCHAR(50), -- 'starter', 'bench', 'reserve', 'injured', 'ineligible'
    jersey_number INTEGER,
    primary_position VARCHAR(50), -- Sport-specific position
    secondary_position VARCHAR(50), -- Backup position
    
    -- Roster status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'injured', 'suspended', 'ineligible', 'graduated')),
    tryout_date DATE,
    roster_date DATE DEFAULT CURRENT_DATE,
    removal_date DATE,
    removal_reason TEXT,
    
    -- Performance metrics
    games_played INTEGER DEFAULT 0,
    games_started INTEGER DEFAULT 0,
    minutes_played INTEGER DEFAULT 0,
    performance_rating DECIMAL(5,2) DEFAULT 0.00,
    
    -- Academic and eligibility
    academic_eligible BOOLEAN DEFAULT TRUE,
    gpa_requirement_met BOOLEAN DEFAULT TRUE,
    attendance_eligible BOOLEAN DEFAULT TRUE,
    disciplinary_eligible BOOLEAN DEFAULT TRUE,
    
    -- Physical and medical
    physical_completed BOOLEAN DEFAULT FALSE,
    physical_expiration_date DATE,
    medical_clearance BOOLEAN DEFAULT FALSE,
    emergency_contact_updated BOOLEAN DEFAULT FALSE,
    
    -- Equipment and fees
    equipment_issued JSONB, -- JSON array of issued equipment
    equipment_returned BOOLEAN DEFAULT FALSE,
    participation_fee_paid BOOLEAN DEFAULT FALSE,
    equipment_fee_paid BOOLEAN DEFAULT FALSE,
    travel_fee_paid BOOLEAN DEFAULT FALSE,
    
    -- Notes and comments
    notes TEXT,
    coach_notes TEXT,
    performance_notes TEXT,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Constraints
    CONSTRAINT valid_jersey_number CHECK (jersey_number IS NULL OR (jersey_number >= 0 AND jersey_number <= 99)),
    CONSTRAINT valid_games_played CHECK (games_played >= 0),
    CONSTRAINT valid_games_started CHECK (games_started >= 0 AND games_started <= games_played),
    CONSTRAINT valid_minutes_played CHECK (minutes_played >= 0),
    CONSTRAINT valid_performance_rating CHECK (performance_rating >= 0.00 AND performance_rating <= 100.00),
    CONSTRAINT valid_roster_dates CHECK (removal_date IS NULL OR removal_date >= roster_date),
    CONSTRAINT unique_team_roster UNIQUE (tenant_id, team_id, student_id, roster_date)
);

-- =============================================================================
-- EVENT PARTICIPANTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS event_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL, -- Can reference students, users, or external participants
    participant_type VARCHAR(20) NOT NULL CHECK (participant_type IN ('student', 'teacher', 'parent', 'guest', 'external')),
    
    -- Registration details
    registration_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    registration_status VARCHAR(20) DEFAULT 'registered' CHECK (registration_status IN ('registered', 'confirmed', 'cancelled', 'no_show', 'attended')),
    registration_source VARCHAR(50), -- 'online', 'in_person', 'phone', 'email'
    
    -- Participation details
    attendance_status VARCHAR(20) DEFAULT 'pending' CHECK (attendance_status IN ('pending', 'present', 'absent', 'late', 'left_early')),
    check_in_time TIMESTAMP WITH TIME ZONE,
    check_out_time TIMESTAMP WITH TIME ZONE,
    attendance_notes TEXT,
    
    -- Payment and fees
    registration_fee_paid BOOLEAN DEFAULT FALSE,
    registration_fee_amount DECIMAL(10,2) DEFAULT 0.00,
    payment_method VARCHAR(50),
    payment_date TIMESTAMP WITH TIME ZONE,
    refund_issued BOOLEAN DEFAULT FALSE,
    refund_amount DECIMAL(10,2) DEFAULT 0.00,
    
    -- Requirements and compliance
    permission_slip_signed BOOLEAN DEFAULT FALSE,
    emergency_contact_updated BOOLEAN DEFAULT FALSE,
    medical_info_updated BOOLEAN DEFAULT FALSE,
    dietary_restrictions TEXT,
    accessibility_needs TEXT,
    
    -- Group and assignment
    group_assignment VARCHAR(100),
    table_assignment VARCHAR(50),
    seat_assignment VARCHAR(50),
    team_assignment VARCHAR(100),
    
    -- Feedback and evaluation
    feedback_provided BOOLEAN DEFAULT FALSE,
    feedback_rating INTEGER CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
    feedback_comments TEXT,
    satisfaction_score DECIMAL(3,2) CHECK (satisfaction_score >= 1.0 AND satisfaction_score <= 5.0),
    
    -- Notes and comments
    notes TEXT,
    special_requests TEXT,
    organizer_notes TEXT,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Constraints
    CONSTRAINT valid_registration_fee_amount CHECK (registration_fee_amount >= 0.00),
    CONSTRAINT valid_refund_amount CHECK (refund_amount >= 0.00),
    CONSTRAINT valid_check_times CHECK (check_out_time IS NULL OR check_out_time >= check_in_time),
    CONSTRAINT unique_event_participant UNIQUE (tenant_id, event_id, participant_id, participant_type)
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Clubs indexes
CREATE INDEX IF NOT EXISTS idx_clubs_tenant_id ON clubs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clubs_status ON clubs(status);
CREATE INDEX IF NOT EXISTS idx_clubs_type ON clubs(club_type);
CREATE INDEX IF NOT EXISTS idx_clubs_advisor ON clubs(advisor_id);
CREATE INDEX IF NOT EXISTS idx_clubs_deleted_at ON clubs(deleted_at) WHERE deleted_at IS NULL;

-- Teams indexes
CREATE INDEX IF NOT EXISTS idx_teams_tenant_id ON teams(tenant_id);
CREATE INDEX IF NOT EXISTS idx_teams_sport ON teams(sport);
CREATE INDEX IF NOT EXISTS idx_teams_season ON teams(season);
CREATE INDEX IF NOT EXISTS idx_teams_coach ON teams(head_coach_id);
CREATE INDEX IF NOT EXISTS idx_teams_status ON teams(status);
CREATE INDEX IF NOT EXISTS idx_teams_deleted_at ON teams(deleted_at) WHERE deleted_at IS NULL;

-- Events indexes
CREATE INDEX IF NOT EXISTS idx_events_tenant_id ON events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_organizer ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_deleted_at ON events(deleted_at) WHERE deleted_at IS NULL;

-- Club memberships indexes
CREATE INDEX IF NOT EXISTS idx_club_memberships_tenant_club ON club_memberships(tenant_id, club_id);
CREATE INDEX IF NOT EXISTS idx_club_memberships_student ON club_memberships(student_id);
CREATE INDEX IF NOT EXISTS idx_club_memberships_status ON club_memberships(status);
CREATE INDEX IF NOT EXISTS idx_club_memberships_type ON club_memberships(membership_type);
CREATE INDEX IF NOT EXISTS idx_club_memberships_deleted_at ON club_memberships(deleted_at) WHERE deleted_at IS NULL;

-- Team rosters indexes
CREATE INDEX IF NOT EXISTS idx_team_rosters_tenant_team ON team_rosters(tenant_id, team_id);
CREATE INDEX IF NOT EXISTS idx_team_rosters_student ON team_rosters(student_id);
CREATE INDEX IF NOT EXISTS idx_team_rosters_status ON team_rosters(status);
CREATE INDEX IF NOT EXISTS idx_team_rosters_position ON team_rosters(position);
CREATE INDEX IF NOT EXISTS idx_team_rosters_deleted_at ON team_rosters(deleted_at) WHERE deleted_at IS NULL;

-- Event participants indexes
CREATE INDEX IF NOT EXISTS idx_event_participants_tenant_event ON event_participants(tenant_id, event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_participant ON event_participants(participant_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_type ON event_participants(participant_type);
CREATE INDEX IF NOT EXISTS idx_event_participants_status ON event_participants(registration_status);
CREATE INDEX IF NOT EXISTS idx_event_participants_attendance ON event_participants(attendance_status);
CREATE INDEX IF NOT EXISTS idx_event_participants_deleted_at ON event_participants(deleted_at) WHERE deleted_at IS NULL;

-- GIN indexes for JSONB columns
CREATE INDEX IF NOT EXISTS idx_clubs_meeting_schedule ON clubs USING GIN (meeting_schedule);
CREATE INDEX IF NOT EXISTS idx_clubs_activities ON clubs USING GIN (activities);
CREATE INDEX IF NOT EXISTS idx_clubs_achievements ON clubs USING GIN (achievements);
CREATE INDEX IF NOT EXISTS idx_clubs_social_media ON clubs USING GIN (social_media_links);
CREATE INDEX IF NOT EXISTS idx_clubs_colors ON clubs USING GIN (club_colors);

CREATE INDEX IF NOT EXISTS idx_teams_tryout_dates ON teams USING GIN (tryout_dates);
CREATE INDEX IF NOT EXISTS idx_teams_practice_schedule ON teams USING GIN (practice_schedule);
CREATE INDEX IF NOT EXISTS idx_teams_game_schedule ON teams USING GIN (game_schedule);
CREATE INDEX IF NOT EXISTS idx_teams_coaches ON teams USING GIN (assistant_coach_ids);
CREATE INDEX IF NOT EXISTS idx_teams_requirements ON teams USING GIN (physical_requirements);
CREATE INDEX IF NOT EXISTS idx_teams_colors ON teams USING GIN (team_colors);

CREATE INDEX IF NOT EXISTS idx_events_recurring_pattern ON events USING GIN (recurring_pattern);
CREATE INDEX IF NOT EXISTS idx_events_organizers ON events USING GIN (co_organizer_ids);
CREATE INDEX IF NOT EXISTS idx_events_restrictions ON events USING GIN (grade_level_restrictions);
CREATE INDEX IF NOT EXISTS idx_events_equipment ON events USING GIN (equipment_needed);
CREATE INDEX IF NOT EXISTS idx_events_supplies ON events USING GIN (supplies_needed);
CREATE INDEX IF NOT EXISTS idx_events_colors ON events USING GIN (event_colors);

CREATE INDEX IF NOT EXISTS idx_club_memberships_requirements ON club_memberships USING GIN (requirements_met);
CREATE INDEX IF NOT EXISTS idx_team_rosters_equipment ON team_rosters USING GIN (equipment_issued);

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
CREATE TRIGGER update_clubs_updated_at BEFORE UPDATE ON clubs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_club_memberships_updated_at BEFORE UPDATE ON club_memberships FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_team_rosters_updated_at BEFORE UPDATE ON team_rosters FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_event_participants_updated_at BEFORE UPDATE ON event_participants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- TRIGGERS FOR MEMBER COUNT UPDATES
-- =============================================================================

-- Function to update club member count
CREATE OR REPLACE FUNCTION update_club_member_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
        UPDATE clubs SET current_members = current_members + 1 WHERE id = NEW.club_id;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status = 'active' AND NEW.status != 'active' THEN
            UPDATE clubs SET current_members = current_members - 1 WHERE id = NEW.club_id;
        ELSIF OLD.status != 'active' AND NEW.status = 'active' THEN
            UPDATE clubs SET current_members = current_members + 1 WHERE id = NEW.club_id;
        END IF;
    ELSIF TG_OP = 'DELETE' AND OLD.status = 'active' THEN
        UPDATE clubs SET current_members = current_members - 1 WHERE id = OLD.club_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to update team player count
CREATE OR REPLACE FUNCTION update_team_player_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
        UPDATE teams SET current_players = current_players + 1 WHERE id = NEW.team_id;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status = 'active' AND NEW.status != 'active' THEN
            UPDATE teams SET current_players = current_players - 1 WHERE id = NEW.team_id;
        ELSIF OLD.status != 'active' AND NEW.status = 'active' THEN
            UPDATE teams SET current_players = current_players + 1 WHERE id = NEW.team_id;
        END IF;
    ELSIF TG_OP = 'DELETE' AND OLD.status = 'active' THEN
        UPDATE teams SET current_players = current_players - 1 WHERE id = OLD.team_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to update event attendee count
CREATE OR REPLACE FUNCTION update_event_attendee_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.attendance_status = 'present' THEN
        UPDATE events SET current_attendees = current_attendees + 1 WHERE id = NEW.event_id;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.attendance_status = 'present' AND NEW.attendance_status != 'present' THEN
            UPDATE events SET current_attendees = current_attendees - 1 WHERE id = NEW.event_id;
        ELSIF OLD.attendance_status != 'present' AND NEW.attendance_status = 'present' THEN
            UPDATE events SET current_attendees = current_attendees + 1 WHERE id = NEW.event_id;
        END IF;
    ELSIF TG_OP = 'DELETE' AND OLD.attendance_status = 'present' THEN
        UPDATE events SET current_attendees = current_attendees - 1 WHERE id = OLD.event_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for member count updates
CREATE TRIGGER update_club_member_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON club_memberships
    FOR EACH ROW EXECUTE FUNCTION update_club_member_count();

CREATE TRIGGER update_team_player_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON team_rosters
    FOR EACH ROW EXECUTE FUNCTION update_team_player_count();

CREATE TRIGGER update_event_attendee_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON event_participants
    FOR EACH ROW EXECUTE FUNCTION update_event_attendee_count();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;

-- TODO: IMPLEMENTER - Add comprehensive RLS policies for tenant isolation and role-based access
-- The following policies need to be implemented based on the existing RLS patterns in the project:

-- 1. Tenant isolation policies (ensure users can only access data from their tenant)
-- 2. Role-based access policies (different access levels for students, teachers, admins)
-- 3. Student-specific policies (students can only see their own memberships/rosters)
-- 4. Teacher/coach policies (teachers can see students in their classes/teams)
-- 5. Admin policies (admins can see all data within their tenant)

-- Example RLS policy structure (to be implemented):
-- CREATE POLICY clubs_tenant_isolation ON clubs FOR ALL TO authenticated USING (tenant_id = get_current_tenant_id());
-- CREATE POLICY clubs_role_access ON clubs FOR ALL TO authenticated USING (can_access_clubs_data());

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE clubs IS 'Stores information about student clubs and organizations';
COMMENT ON TABLE teams IS 'Stores information about sports teams and athletic programs';
COMMENT ON TABLE events IS 'Stores information about school events, activities, and meetings';
COMMENT ON TABLE club_memberships IS 'Stores student memberships in clubs and their roles/positions';
COMMENT ON TABLE team_rosters IS 'Stores student roster information for sports teams';
COMMENT ON TABLE event_participants IS 'Stores participant information for events and activities';

-- JSONB column documentation
COMMENT ON COLUMN clubs.meeting_schedule IS 'JSON object with meeting times, frequency, and location details';
COMMENT ON COLUMN clubs.activities IS 'JSON array of club activities and events';
COMMENT ON COLUMN clubs.achievements IS 'JSON array of club achievements and awards';
COMMENT ON COLUMN clubs.social_media_links IS 'JSON object with social media URLs (facebook, twitter, instagram, etc.)';
COMMENT ON COLUMN clubs.club_colors IS 'JSON object with primary and secondary color codes';

COMMENT ON COLUMN teams.tryout_dates IS 'JSON object with tryout schedule and requirements';
COMMENT ON COLUMN teams.practice_schedule IS 'JSON object with practice times and locations';
COMMENT ON COLUMN teams.game_schedule IS 'JSON object with game schedule and opponents';
COMMENT ON COLUMN teams.assistant_coach_ids IS 'JSON array of assistant coach user IDs';
COMMENT ON COLUMN teams.team_colors IS 'JSON object with primary and secondary color codes';

COMMENT ON COLUMN events.recurring_pattern IS 'JSON object with recurrence rules for recurring events';
COMMENT ON COLUMN events.co_organizer_ids IS 'JSON array of co-organizer user IDs';
COMMENT ON COLUMN events.grade_level_restrictions IS 'JSON array of allowed grade levels';
COMMENT ON COLUMN events.equipment_needed IS 'JSON array of required equipment';
COMMENT ON COLUMN events.event_colors IS 'JSON object with primary and secondary color codes';

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
-- 1. Add validation for club/team capacity limits
-- 2. Implement automatic status updates based on dates
-- 3. Add notification system for upcoming events/deadlines
-- 4. Implement grade level and GPA requirement validation
-- 5. Add conflict detection for overlapping events
-- 6. Implement automatic roster updates based on academic eligibility

-- INTEGRATION IMPLEMENTATION REQUIRED:
-- 1. Connect with existing student and user tables
-- 2. Integrate with grade and attendance systems
-- 3. Add calendar integration for events
-- 4. Implement email/SMS notifications
-- 5. Add file upload capabilities for documents and images
-- 6. Integrate with payment processing for fees

-- PERFORMANCE OPTIMIZATION REQUIRED:
-- 1. Add materialized views for frequently accessed data
-- 2. Implement caching for club/team/event listings
-- 3. Add database partitioning for large tables
-- 4. Optimize queries for dashboard and reporting
-- 5. Implement background jobs for data processing
