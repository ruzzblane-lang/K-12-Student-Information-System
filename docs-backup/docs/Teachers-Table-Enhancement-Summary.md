# Teachers Table Enhancement Summary

## Overview

The `004_create_teachers_table_multi_tenant.sql` migration has been significantly enhanced to include intervention-related fields, granular Row-Level Security (RLS) policies, and comprehensive masked views for improved security consistency with the student risk assessment system.

## ✅ **Enhancements Implemented**

### 1. **Intervention-Related Fields Added**

#### **Core Intervention Fields**
- `intervention_capabilities` (JSONB) - Detailed intervention capabilities and specializations
- `intervention_training_completed` (TEXT[]) - Array of completed intervention training
- `intervention_success_rate` (DECIMAL) - Historical success rate (0.00-100.00)
- `max_intervention_caseload` (INTEGER) - Maximum students teacher can support
- `current_intervention_caseload` (INTEGER) - Current active interventions
- `intervention_specializations` (TEXT[]) - Specialized intervention areas
- `last_intervention_training` (DATE) - Last training completion date
- `intervention_certifications` (TEXT[]) - Professional intervention certifications

#### **Specific Intervention Training Flags**
- `crisis_intervention_trained` (BOOLEAN) - Crisis intervention capability
- `behavioral_intervention_trained` (BOOLEAN) - Behavioral intervention capability
- `academic_intervention_trained` (BOOLEAN) - Academic intervention capability
- `social_emotional_intervention_trained` (BOOLEAN) - Social-emotional intervention capability

#### **Availability and Scheduling**
- `intervention_availability` (JSONB) - When teacher is available for interventions

### 2. **Enhanced Constraints and Validation**

#### **New Constraints Added**
```sql
CONSTRAINT valid_intervention_success_rate CHECK (intervention_success_rate IS NULL OR (intervention_success_rate >= 0.00 AND intervention_success_rate <= 100.00))
CONSTRAINT valid_max_intervention_caseload CHECK (max_intervention_caseload >= 0 AND max_intervention_caseload <= 100)
CONSTRAINT valid_current_intervention_caseload CHECK (current_intervention_caseload >= 0 AND current_intervention_caseload <= max_intervention_caseload)
```

### 3. **Comprehensive Indexing Strategy**

#### **GIN Indexes for JSONB and Array Fields**
- `idx_teachers_intervention_capabilities` - For intervention capabilities JSONB
- `idx_teachers_intervention_training` - For training completed array
- `idx_teachers_intervention_specializations` - For specializations array
- `idx_teachers_intervention_certifications` - For certifications array
- `idx_teachers_intervention_availability` - For availability JSONB

#### **Performance Indexes**
- `idx_teachers_intervention_success_rate` - For success rate filtering
- `idx_teachers_max_intervention_caseload` - For caseload management
- `idx_teachers_current_intervention_caseload` - For current workload tracking
- `idx_teachers_crisis_intervention_trained` - For crisis intervention queries
- `idx_teachers_behavioral_intervention_trained` - For behavioral intervention queries
- `idx_teachers_academic_intervention_trained` - For academic intervention queries
- `idx_teachers_social_emotional_intervention_trained` - For social-emotional queries
- `idx_teachers_last_intervention_training` - For training recency queries

### 4. **Granular Row-Level Security (RLS) Policies**

#### **Security Functions Created**

##### `can_view_teacher_sensitive_data()`
- **Super Admins**: Can view all sensitive data
- **Admins**: Can view sensitive data within their tenant
- **Teachers**: Can view their own sensitive data
- **Counselors**: Can view intervention-related data for teachers in their tenant
- **Other Roles**: Cannot view sensitive data

##### `can_modify_teacher_data()`
- **Super Admins**: Can modify all teacher data
- **Admins**: Can modify teacher data within their tenant
- **Teachers**: Can modify their own basic information (not intervention data)
- **Counselors**: Can modify intervention-related data for teachers in their tenant
- **Other Roles**: Cannot modify teacher data

#### **RLS Policies Implemented**

##### **Basic Tenant Isolation Policy**
```sql
CREATE POLICY teacher_tenant_isolation_policy ON teachers
    FOR ALL TO authenticated
    USING (
        is_super_admin() OR
        tenant_id = get_current_tenant_id()
    );
```

##### **Sensitive Data Access Policy**
```sql
CREATE POLICY teacher_sensitive_data_access_policy ON teachers
    FOR SELECT TO authenticated
    USING (
        is_super_admin() OR
        can_view_teacher_sensitive_data(id, current_setting('app.current_user_role', true), get_current_tenant_id())
    );
```

##### **Modification Access Policy**
```sql
CREATE POLICY teacher_modification_access_policy ON teachers
    FOR INSERT, UPDATE, DELETE TO authenticated
    USING (
        is_super_admin() OR
        can_modify_teacher_data(id, current_setting('app.current_user_role', true), get_current_tenant_id())
    );
```

### 5. **Comprehensive Masked View (`teachers_masked`)**

#### **Data Masking Features**

##### **Personal Information Masking**
- **Names**: Masked using `mask_name()` function
- **Email**: Masked using `mask_email()` function
- **Phone**: Masked using `mask_phone()` function
- **Address**: Replaced with `[ADDRESS MASKED]`
- **Zip Code**: Partially masked (first 3 digits + `**`)

##### **Professional Information Masking**
- **Bio**: Truncated to 100 characters with `...` if longer
- **Resume URL**: Replaced with `[RESUME URL MASKED]`
- **Work Schedule**: Simplified to `{"schedule": "available"}`

##### **Intervention Data Masking**
- **Capabilities**: Masked unless user has appropriate permissions
- **Training**: Masked unless user has appropriate permissions
- **Success Rate**: Hidden unless user has appropriate permissions
- **Specializations**: Masked unless user has appropriate permissions
- **Certifications**: Masked unless user has appropriate permissions
- **Availability**: Simplified unless user has appropriate permissions

#### **Role-Based Data Access**
The masked view uses the `can_view_teacher_sensitive_data()` function to determine what data to show based on user roles, ensuring that sensitive intervention data is only visible to authorized personnel.

### 6. **Comprehensive Documentation**

#### **JSONB Structure Documentation**

##### **Intervention Capabilities Structure**
```json
{
  "crisis_intervention": {
    "trained": true,
    "certification_date": "2024-01-15",
    "expiration_date": "2025-01-15",
    "specializations": ["suicide_prevention", "trauma_response"]
  },
  "behavioral_intervention": {
    "trained": true,
    "certification_date": "2024-02-01",
    "methods": ["positive_behavior_support", "restorative_practices"],
    "age_groups": ["middle_school", "high_school"]
  },
  "academic_intervention": {
    "trained": true,
    "certification_date": "2024-03-01",
    "subjects": ["math", "reading", "writing"],
    "grade_levels": ["k-5", "6-8"]
  },
  "social_emotional_intervention": {
    "trained": true,
    "certification_date": "2024-04-01",
    "approaches": ["counseling", "group_therapy", "peer_mediation"],
    "populations": ["at_risk_youth", "trauma_survivors"]
  }
}
```

##### **Intervention Availability Structure**
```json
{
  "monday": {
    "available": true,
    "time_slots": [
      {"start": "09:00", "end": "10:00", "type": "crisis"},
      {"start": "14:00", "end": "15:00", "type": "academic"}
    ]
  },
  "tuesday": {
    "available": true,
    "time_slots": [
      {"start": "10:00", "end": "11:00", "type": "behavioral"},
      {"start": "15:00", "end": "16:00", "type": "social_emotional"}
    ]
  },
  "emergency_availability": {
    "on_call": true,
    "contact_method": "phone",
    "response_time": "immediate"
  }
}
```

#### **Example Queries**
```sql
-- Find teachers trained in crisis intervention
SELECT * FROM teachers WHERE crisis_intervention_trained = TRUE;

-- Find teachers with available intervention slots
SELECT * FROM teachers WHERE current_intervention_caseload < max_intervention_caseload;

-- Find teachers with specific intervention specializations
SELECT * FROM teachers WHERE intervention_specializations @> '["suicide_prevention"]';

-- Find teachers with high success rates
SELECT * FROM teachers WHERE intervention_success_rate > 80.0;
```

## 🔒 **Security Benefits**

### **Multi-Layer Security Approach**

1. **Row-Level Security (RLS)**: Ensures tenant isolation and role-based access
2. **Masked Views**: Provides privacy protection for sensitive data
3. **Function-Based Access Control**: Granular permission checking
4. **Audit Trail**: All sensitive data access is logged

### **Analytics Dashboard Security**

When analytics dashboards are shared, the masked views ensure that:
- **Personal Information**: Names, emails, and addresses are masked
- **Intervention Data**: Sensitive intervention capabilities are hidden from unauthorized users
- **Professional Data**: Resume URLs and detailed schedules are protected
- **Role-Based Access**: Only authorized personnel can see sensitive intervention data

## 📊 **Integration with Student Risk Assessment**

The enhanced teachers table now perfectly complements the `student_risk_assessments` table by:

1. **Matching Field Structure**: Intervention fields align with student risk assessment needs
2. **Consistent Security**: Both tables use the same masking and RLS patterns
3. **Comprehensive Coverage**: Teachers can be matched with students based on intervention capabilities
4. **Performance Optimization**: Indexes support efficient queries for intervention matching

## 🚀 **Performance Considerations**

### **Optimized Indexing**
- **GIN Indexes**: For JSONB and array fields enable fast complex queries
- **Partial Indexes**: For boolean flags only index TRUE values to save space
- **Composite Indexes**: Support multi-column queries efficiently

### **Query Performance**
- **Intervention Matching**: Fast queries to find teachers with specific intervention capabilities
- **Caseload Management**: Efficient tracking of current vs. maximum intervention capacity
- **Training Tracking**: Quick lookups for training status and expiration dates

## 🔧 **Usage Examples**

### **Finding Available Crisis Intervention Teachers**
```sql
SELECT t.first_name, t.last_name, t.intervention_specializations
FROM teachers t
WHERE t.crisis_intervention_trained = TRUE
  AND t.current_intervention_caseload < t.max_intervention_caseload
  AND t.employment_status = 'active';
```

### **Intervention Capability Matching**
```sql
SELECT t.first_name, t.last_name, t.intervention_capabilities
FROM teachers t
WHERE t.intervention_capabilities->'academic_intervention'->>'trained' = 'true'
  AND t.intervention_capabilities->'academic_intervention'->'subjects' @> '["math"]';
```

### **Training Compliance Check**
```sql
SELECT t.first_name, t.last_name, t.last_intervention_training
FROM teachers t
WHERE t.last_intervention_training < CURRENT_DATE - INTERVAL '1 year'
  AND t.crisis_intervention_trained = TRUE;
```

## ✅ **Migration Status**

The enhanced teachers table migration is now **COMPLETE** and includes:

- ✅ **Intervention-related fields** matching student_risk_assessments structure
- ✅ **Granular RLS policies** with role-based access control
- ✅ **Comprehensive masked views** for sensitive data protection
- ✅ **Performance-optimized indexes** for all new fields
- ✅ **Complete documentation** with examples and usage patterns
- ✅ **Security consistency** with existing masked view patterns

The teachers table is now fully equipped to support advanced intervention capabilities while maintaining strict security and privacy protections for sensitive data.
