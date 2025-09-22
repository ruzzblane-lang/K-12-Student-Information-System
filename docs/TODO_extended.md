PROJECT TASK: Scaffold tenant-aware, white-labelable, role-based portal API extensions (STUBS ONLY)

Goal:
Create scaffolding (files, routes, controllers, models, migration templates, tests stubs, and documentation updates) to support role-based portal APIs and white-label configuration for each tenant. Do NOT implement business logic, data transformations, security rules, or run any migrations. Create clear TODO markers in every stub where implementation is required.

Deliverables to scaffold:

1) Database migrations (templates only — SQL files with table definitions but without triggers/complex functions)
- /db/migrations/015_create_tenant_branding_table.sql
  - tenant_id (FK), brand_name, logo_url, primary_color, secondary_color, css_overrides JSONB, custom_domain, contact_info JSONB, is_active, created_at, updated_at
- /db/migrations/016_create_portal_roles_and_permissions.sql
  - portal_role_id, tenant_id, name (student, parent, coach, officer, club_admin, etc.), permissions JSONB, created_at
- /db/migrations/017_create_clubs_teams_events_tables.sql
  - tables: clubs, teams, events, club_memberships, team_rosters, event_participants (tenant scoped)
- /db/migrations/018_create_office_roles_tables.sql
  - class_officers table (role, term_start, term_end, responsibilities JSONB)
- Provide brief SQL comments marked TODO where row-level security (RLS) and encryption hooks must be added by implementer.

2) Backend scaffolding (Node/Express style layout or project’s chosen backend stack — create analogous structure if different)
- /backend/api/routes/portal/
  - students.js        # route stubs: GET /:tenant/students/:id, GET /:tenant/students/:id/grades
  - parents.js         # GET /:tenant/parents/:id, GET /:tenant/parents/:id/children
  - coaches.js         # GET /:tenant/coaches/:id, GET /:tenant/teams
  - clubs.js           # CRUD stubs for clubs and memberships
  - officers.js        # CRUD stubs for class officers
  - teams.js           # CRUD stubs for teams and rosters
  - events.js          # CRUD stubs for events and registrations
  - leaderboards.js    # GET /:tenant/leaderboards/:type (academic, sports), with query params
- /backend/api/controllers/portal/
  - create stub controller files matching routes; include example signatures and TODO markers for auth, validation, tenant resolution
- /backend/api/models/
  - stub model files for branding, clubs, teams, events, officer_roles; include field definitions and TODOs for constraints/indexes
- /backend/api/middleware/
  - tenantResolver.js  # stub: resolve tenant from subdomain/custom_domain/header; include security TODOs
  - brandLoader.js     # stub: load tenant brand settings into request/context
  - roleGuard.js       # stub: role-based access-check middleware (note to wire into RBAC service)
- /backend/api/services/
  - portalAuthService.js   # stub for token/session checks and tenant-scoped auth
  - portalNotificationService.js # stub for notifications (email/SMS/webhook) — mark as optional
- Add route registration entries in /backend/api/routes/index.js (stubs only)

3) API specification updates
- Update /docs/API-Specification.md and add new section "Portal APIs — Tenant Scoped"
  - Document each new endpoint path, methods, expected request/response schemas (example JSON only), authentication header requirements, and sample error responses. Mark all business logic and validation as TODO.
- Add OpenAPI snippet file: /docs/openapi/portal_apis.yaml with endpoint stubs and models (no server URLs, use variables).

4) Tests scaffolding (no test logic — skeletons only)
- /tests/integration/test_api_portal_students.js  # describe tests and include TODOs for assertions
- /tests/integration/test_api_portal_parents.js
- /tests/integration/test_api_portal_coaches.js
- /tests/unit/test_tenantResolver.js
- Add example Postman collection file: /scripts/postman_portal_collection.json with sample requests placeholders and comments.

5) Documentation & readme updates (explicit, developer-facing)
- Update README.md at project root: add section "Portal APIs & White-Labeling (Scaffolded)" describing intent, where to find stubs, and strict NOTE that nothing is implemented.
- Update /docs/Integration-Guide.md with subsection "How frontends should integrate with tenant-scoped portal APIs" — list authentication flow patterns, caching, and suggested behaviors (all as guidance, not implementation).
- Update /docs/To-Do.md: add prioritized tasks for implementing portals (RBAC hookup, RLS policies, encryption, consent handling, audit hooks, rate limiting) and tag each task with estimated complexity level: [low|medium|high].

6) White-label support scaffolding
- /backend/api/models/tenant_branding.js (stub) and migration (see above)
- /backend/api/routes/branding.js (GET /:tenant/branding, PATCH /:tenant/branding — stub)
- /docs/WhiteLabeling.md: include sections
  - What white-labeling means for this project (single codebase, per-tenant branding, custom domains)
  - Security considerations (CSP, tenant isolation for assets, domain mapping verification)
  - Implementation checklist (asset storage, theme overrides, tenant CSS injection policy, custom domain verification steps)
  - NOTE: list items that must be implemented server-side, and mark them as security-critical.

7) Security/compliance placeholders and TODOs
- In every controller/model/migration stub, insert TODO comments highlighting where compliance-specific code must be added: consent tracking (GDPR/COPPA), audit logging, encryption at rest, field-level masking, data retention policies, RLS enforcement points.
- Create /docs/Compliance-TODOs.md listing region-specific requirements (FERPA, COPPA, GDPR, Indonesia PDP) and exact DB schema fields to record consents, data retention durations, and breach notification hooks.

8) Project management tasks
- Update /docs/ROADMAP.md with explicit milestones for portal implementation:
  - Phase A: Database + RLS + Auth (critical)
  - Phase B: API implementation + RBAC
  - Phase C: Minimal frontend plugin (optional) for manual testing
  - Phase D: White-label assets + domain mapping
- Create /docs/IMPLEMENTATION-PRIORITY.md listing what to implement first and a checklist for security review before deployment.

Hard constraints for Cursor (CRITICAL):
- DO NOT implement business logic, security rules, RLS policies, encryption code, or run any DB migrations.
- DO NOT modify existing migration files (001-014); only add new migration templates (015-018) as drafts.
- All created files must contain clear TODO: IMPLEMENTER comments explaining exactly what needs coding and where to inject security checks.
- All added docs must explicitly state: "SCaffold only — implementation required. Do not consider this production-ready."
- Leave all new code non-executable (export stubs or placeholder functions returning 501 / Not Implemented in route comments).
- Create git commits for the scaffolding, but do not push to remote without user confirmation.

Output expectations:
- A list of created files and their paths.
- A short summary at the end of the run describing next recommended developer tasks in priority order (no automatic task execution).
- A short example curl command per portal endpoint showing how a frontend would call it (placeholders for host, tenant, token).

End.
