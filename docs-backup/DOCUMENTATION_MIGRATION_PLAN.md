# Documentation Migration Plan - School SIS

## Overview
This document outlines the comprehensive plan to migrate non-essential documentation files to the GitHub wiki while maintaining critical repository files for operational needs.

## File Categorization

### 🚫 **FILES TO MIGRATE TO WIKI** (Non-Essential Documentation)

#### **Core Documentation**
- `docs/API-Specification.md` → Wiki: "API Reference"
- `docs/Database-Schema.md` → Wiki: "Database Schema"
- `docs/Authentication-RBAC.md` → Wiki: "Authentication & Security"
- `docs/Testing-Guide.md` → Wiki: "Testing Guide"
- `docs/Integration-Guide.md` → Wiki: "Integration Guide"
- `docs/Commercial-Product-Specification.md` → Wiki: "Product Specification"

#### **Implementation Summaries & Reports**
- `AI_INTEGRATION_README.md` → Wiki: "AI Integration"
- `docs/AI-Integration-Implementation-Summary.md` → Merge with above
- `ENHANCED_PAYMENT_GATEWAY_README.md` → Wiki: "Payment Gateway"
- `docs/Enhanced-Payment-Gateway-Implementation-Summary.md` → Merge with above
- `docs/Enhanced-Payment-Gateway-API-Specification.md` → Merge with above
- `ENHANCED_FERPA_COMPLIANCE_IMPLEMENTATION_SUMMARY.md` → Wiki: "Compliance"
- `FERPA_COMPLIANCE_IMPLEMENTATION_SUMMARY.md` → Merge with above
- `MANUAL_PAYMENT_IMPLEMENTATION_SUMMARY.md` → Merge with Payment Gateway
- `docs/ENHANCEMENTS_IMPLEMENTATION_SUMMARY.md` → Wiki: "Recent Enhancements"

#### **Architecture & Design**
- `docs/architecture.md` → Wiki: "System Architecture"
- `docs/erd-diagram.md` → Wiki: "Database Design"
- `docs/Multi-Tenant-Architecture.md` → Merge with System Architecture
- `docs/White-Labeling-Developer-Guide.md` → Wiki: "White-Labeling"
- `docs/White-Labeling-Implementation-Guide.md` → Merge with above
- `docs/PWA-Implementation-Guide.md` → Wiki: "PWA Implementation"
- `docs/PWA-Implementation-Summary.md` → Merge with above

#### **Compliance & Security**
- `SECURITY_ANALYSIS_REPORT.md` → Wiki: "Security Analysis"
- `SECURITY_AUDIT_REPORT.md` → Wiki: "Security Audit"
- `COMPLIANCE_ANALYSIS_REPORT.md` → Wiki: "Compliance Analysis"
- `COMPLIANCE_EMERGENCY_CHECKLIST.md` → Wiki: "Compliance Checklist"
- `docs/Compliance-Framework.md` → Merge with Compliance Analysis

#### **Development & CI/CD**
- `docs/Actionlint-Configuration.md` → Wiki: "Development Tools"
- `docs/Actionlint-Setup.md` → Merge with above
- `docs/GitHub-Actions-Final-Status.md` → Wiki: "CI/CD Status"
- `docs/GitHub-Actions-Fixes-Summary.md` → Merge with above
- `docs/GitHub-Actions-Setup.md` → Merge with above

#### **Problem Reports & Fixes**
- `FINAL_PROBLEM_FIXES_REPORT.md` → Wiki: "Problem Resolution"
- `FIX_SUMMARY.md` → Merge with above
- `PROBLEM_FIXES_SUMMARY.md` → Merge with above
- `docs/Problems-Resolved-Summary.md` → Merge with above

#### **Feature-Specific Documentation**
- `docs/Student-Controller-Improvements-Summary.md` → Wiki: "Student Management"
- `docs/Student-Controller-Security-Enhancements.md` → Merge with above
- `docs/Teachers-Table-Enhancement-Summary.md` → Wiki: "Teacher Management"
- `frontend/PWA_ENHANCEMENT_RECOMMENDATIONS.md` → Merge with PWA Implementation
- `frontend/PWA_SERVICE_WORKER_ENHANCEMENTS.md` → Merge with PWA Implementation

#### **Third-Party & Integrations**
- `THIRD_PARTY_INTEGRATIONS_SUMMARY.md` → Wiki: "Third-Party Integrations"
- `backend/integrations/README.md` → Merge with above
- `DOCKER_INFRASTRUCTURE_SUMMARY.md` → Wiki: "Infrastructure"

#### **SDK Documentation**
- `sdk/README.md` → Wiki: "SDK Documentation"

#### **Legacy Documentation**
- `docs/K‑12 Student Information System.md` → Wiki: "Legacy Documentation"
- `docs/K‑12 Student Information System - Enhanced.md` → Merge with above
- `docs/api-spec.md` → Merge with API Reference
- `docs/checks.md` → Wiki: "Development Tools"
- `docs/config.md` → Wiki: "Configuration"
- `docs/install.md` → Wiki: "Installation Guide"
- `docs/usage.md` → Wiki: "Usage Guide"
- `docs/reference.md` → Wiki: "Reference"

#### **Database Documentation**
- `db/seeds/README.md` → Wiki: "Database Seeds"
- `db/seeds/ENHANCEMENT_RECOMMENDATIONS.md` → Merge with Database Schema
- `db/queries/ENHANCEMENT_RECOMMENDATIONS.md` → Merge with Database Schema
- `db/migrations/ENHANCEMENTS_IMPLEMENTATION_SUMMARY.md` → Wiki: "Database Migrations"
- `db/migrations/MIGRATION_IMPROVEMENTS_SUMMARY.md` → Merge with above

#### **Testing Documentation**
- `backend/tests/README.md` → Wiki: "Backend Testing"
- `backend/tests/clients/README.md` → Merge with above
- `tests/README.md` → Wiki: "Testing Overview"

#### **Component-Specific Documentation**
- `frontend/src/README_YEARBOOK_COMPLETE.md` → Wiki: "Yearbook Component"
- `frontend/src/README_YEARBOOK_WIDGET.md` → Merge with above
- `frontend/src/components/YearbookPortalWidget.md` → Merge with above

#### **Payment Documentation**
- `backend/payments/README.md` → Wiki: "Payment System"
- `backend/payments/README_MANUAL_PAYMENTS.md` → Merge with above
- `backend/payments/tests/README.md` → Merge with Payment System

#### **Compliance Documentation**
- `backend/compliance/README.md` → Wiki: "Compliance Implementation"

#### **Scripts Documentation**
- `scripts/README.md` → Wiki: "Scripts & Automation"

### ✅ **FILES TO KEEP IN REPOSITORY** (Essential Operational Files)

#### **Root Level - Critical**
- `README.md` → **KEEP** (Update to focus on overview and quick-start)
- `LICENSE.txt` → **KEEP** (Legal requirement)
- `REPOSITORY_DESCRIPTION.md` → **KEEP** (GitHub description)
- `GITHUB_DESCRIPTION.txt` → **KEEP** (GitHub short description)

#### **Environment & Configuration**
- `env.docker.example` → **KEEP** (Environment template)
- `docker-compose.yml` → **KEEP** (Docker configuration)
- `docker-compose.override.yml` → **KEEP** (Docker overrides)
- `Dockerfile` → **KEEP** (Container definition)

#### **Infrastructure Configuration**
- `caddy/Caddyfile` → **KEEP** (Web server config)
- `traefik/traefik.yml` → **KEEP** (Reverse proxy config)
- `traefik/dynamic.yml` → **KEEP** (Dynamic config)
- `redis/redis.conf` → **KEEP** (Redis configuration)
- `postgres/init/` → **KEEP** (Database initialization)

#### **Development Tools**
- `Makefile` → **KEEP** (Build automation)
- `package.json` → **KEEP** (Node.js dependencies)
- `package-lock.json` → **KEEP** (Dependency lock)
- `backend/package.json` → **KEEP** (Backend dependencies)
- `frontend/package.json` → **KEEP** (Frontend dependencies)

#### **CI/CD & Automation**
- `.github/workflows/` → **KEEP** (GitHub Actions)
- `actionlint` → **KEEP** (Linting tool)
- `scripts/` → **KEEP** (Automation scripts - but move README to wiki)

#### **Backend Core**
- `backend/app.js` → **KEEP** (Main application)
- `backend/server.js` → **KEEP** (Server entry point)
- `backend/config/` → **KEEP** (Configuration files)
- `backend/middleware/` → **KEEP** (Middleware)
- `backend/routes/` → **KEEP** (API routes)
- `backend/models/` → **KEEP** (Data models)
- `backend/controllers/` → **KEEP** (Controllers)
- `backend/services/` → **KEEP** (Business logic)

#### **Frontend Core**
- `frontend/src/` → **KEEP** (Source code)
- `frontend/public/` → **KEEP** (Static assets)
- `frontend/build/` → **KEEP** (Build output)

#### **Database**
- `db/migrations/*.sql` → **KEEP** (Migration scripts)
- `db/seeds/*.sql` → **KEEP** (Seed data)
- `db/queries/*.sql` → **KEEP** (Query files)

#### **Security & SSL**
- `ssl/ssl-config.js` → **KEEP** (SSL configuration)

## Wiki Structure Design

### **Main Pages**
1. **Home** - Overview and navigation
2. **Getting Started** - Quick start guide
3. **API Reference** - Complete API documentation
4. **Database Schema** - Database design and structure
5. **Authentication & Security** - Auth system and security features
6. **Testing Guide** - Comprehensive testing documentation
7. **Integration Guide** - Integration instructions and examples
8. **Product Specification** - Commercial product details

### **Feature Pages**
9. **AI Integration** - AI features and capabilities
10. **Payment Gateway** - Payment processing system
11. **Compliance** - FERPA, GDPR, COPPA compliance
12. **White-Labeling** - Customization and branding
13. **PWA Implementation** - Progressive Web App features
14. **Third-Party Integrations** - External service integrations

### **Development Pages**
15. **System Architecture** - Overall system design
16. **Development Tools** - CI/CD, linting, development setup
17. **Database Migrations** - Migration management
18. **Scripts & Automation** - Automation tools and scripts
19. **SDK Documentation** - Client SDKs and libraries

### **Support Pages**
20. **Installation Guide** - Detailed installation instructions
21. **Configuration** - System configuration options
22. **Troubleshooting** - Common issues and solutions
23. **Problem Resolution** - Historical problem fixes
24. **Security Analysis** - Security assessments and audits

## Migration Process

### Phase 1: Content Consolidation
1. Identify overlapping content between files
2. Create consolidated wiki pages
3. Merge related sections to avoid duplication
4. Ensure all critical information is preserved

### Phase 2: Wiki Page Creation
1. Create wiki pages with consolidated content
2. Add proper navigation and cross-references
3. Include code examples and diagrams
4. Format for wiki readability

### Phase 3: Link Updates
1. Update all internal links in remaining files
2. Update README.md to reference wiki pages
3. Update any scripts that reference documentation
4. Verify all links work correctly

### Phase 4: Repository Cleanup
1. Remove migrated .md files
2. Update .gitignore if needed
3. Verify no broken references remain
4. Test that all operational files still work

### Phase 5: README Update
1. Streamline README.md for overview and quick-start
2. Add prominent links to wiki
3. Keep only essential operational information
4. Ensure GitHub landing page remains informative

## Quality Assurance

### Before Migration
- [ ] Backup all documentation files
- [ ] Verify content completeness
- [ ] Check for overlapping information
- [ ] Identify critical operational dependencies

### During Migration
- [ ] Preserve all technical details
- [ ] Maintain code examples and formatting
- [ ] Ensure proper wiki formatting
- [ ] Test all links and references

### After Migration
- [ ] Verify all wiki pages are accessible
- [ ] Test that operational files still work
- [ ] Confirm no broken internal links
- [ ] Validate README.md clarity and completeness

## Success Criteria

1. **Content Preservation**: All technical information preserved
2. **Link Integrity**: All internal links updated and working
3. **Operational Continuity**: All scripts and tools remain functional
4. **Repository Clarity**: README.md provides clear overview and quick-start
5. **Wiki Organization**: Well-structured, searchable documentation
6. **No Duplication**: Consolidated content without redundancy
7. **Easy Maintenance**: Future documentation updates in wiki

## Timeline

- **Phase 1**: Content Analysis & Consolidation (2-3 hours)
- **Phase 2**: Wiki Page Creation (4-5 hours)
- **Phase 3**: Link Updates (1-2 hours)
- **Phase 4**: Repository Cleanup (1 hour)
- **Phase 5**: README Update (1 hour)

**Total Estimated Time**: 9-12 hours

## Notes

- This migration will significantly reduce repository clutter
- Wiki provides better collaboration and search capabilities
- README.md will focus on essential information for new users
- All operational files remain in repository for development workflow
- Future documentation updates should occur in wiki
