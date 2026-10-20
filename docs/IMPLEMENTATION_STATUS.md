# NobatAra — Master Implementation Status Tracker

**Governing Roadmap:** NobatAra Full-Stack Evolution  
**Last Updated:** 2026-10-19  

---

## Roadmap Phases Summary & Current Status

| Phase | Description | Status | Pass/Fail Evidence | Next Step |
| :---: | :--- | :---: | :--- | :--- |
| **0** | **Read-only repository audit and baseline evidence** | **COMPLETED** | Audited all 29 source files. `compile_applet` passed. `lint_applet` passed. Documented in `docs/BASELINE_AUDIT.md`. | **PASSED (GO FOR PROPOSED PHASE 1)** |
| **1** | **Product requirements, personas, workflows, architecture & PRD** | **COMPLETED** | Formulated PRD, Architecture, Data Model, API Contracts, ADRs, Security & QA specs in `docs/`. Baseline validated. | **PASSED** |
| **2** | **Contain confirmed security risks & separate demo behavior** | **COMPLETED** | Fixed customer booking privacy leak; removed fake OTP & hardcoded bypass; protected super-admin with production mode barrier; neutralized CSV injection; tagged synthetic demo fixtures; verified clean `tsc --noEmit` & `npm run build`. | **PASSED (READY FOR PHASE 3)** |
| **3** | **Establish full-stack server architecture & configuration** | **COMPLETED** | Unified Express runtime (`server.ts`, `server/*`); dev with Vite middleware (`npm run dev`), prod with static dist/ (`npm start`); `/api/health/live` & `ready` verified 200; strict JSON 404 on `/api/*`; fail-fast config validation; client-side posture bypass eliminated. | **PASSED (READY FOR PHASE 4)** |
| **4** | **Design relational data model, migrations, & repositories** | **COMPLETED** | Normalized 15-table schema with constraints, indexes, versioned SQL migrations (`001_initial_schema.sql` up/down), typed PostgreSQL pool/transaction runner, 8 repository modules, separated fixtures seeder, and DB-aware health/readiness reporting. | **PASSED (READY FOR PHASE 5)** |
| **5** | **Implement auth, sessions, server-side RBAC & tenant isolation** | **COMPLETED** | Real cryptographic OTP auth (`/api/auth/otp/request`, `/api/auth/otp/verify`), 256-bit token hashed at rest (`SHA-256`), HttpOnly cookie sessions, granular session revocation, server-enforced RBAC (`requireAuth`, `requirePlatformRole`, `requireSalonMembership`, `requireSalonPermission`), CSRF validation, operator-only bootstrap, and 31 automated security tests passing. External PostgreSQL connection marked NOT VERIFIED. | **PASSED (READY FOR PHASE 6)** |
| **6** | **Build shared design system and semantic tokens** | *PENDING* | Baseline tokens verified. Full alignment pending. | Next Phase. |
| **7** | **Complete customer discovery and booking journey** | *PENDING* | UI wizard exists; server persistence pending. | Hold. |
| **8** | **Complete salon manager's operational workflows** | *PENDING* | Snapp-style UI exists; backend cashflow pending. | Hold. |
| **9** | **Complete super-admin console and operational modules** | *PENDING* | Rich UI exists; live backend hooks pending. | Hold. |
| **10** | **Integrate real SMS, payment, & infrastructure services** | *PENDING* | Not started. | Hold. |
| **11** | **Perform cross-persona UI/UX, responsive, & accessibility refinement** | *PENDING* | Mobile switcher fix verified; further audits pending. | Hold. |
| **12** | **Execute automated tests, security verification & regression testing** | *PENDING* | Not started. | Hold. |
| **13** | **Prepare production deployment, monitoring, backup & rollback** | *PENDING* | Not started. | Hold. |

---

## Phase 0 Sign-Off Evidence

1. **Scope and files inspected**:
   - `index.html`, `package.json`, `metadata.json`, `vite.config.ts`, `tsconfig.json`.
   - `src/App.tsx`, `src/main.tsx`, `src/index.css`.
   - `src/context/AdminContext.tsx`, `src/context/ThemeContext.tsx`.
   - `src/types/admin.ts`, `src/utils/formatters.ts`.
   - `src/mock/initialData.ts`, `src/mock/salonDirectoryData.ts`.
   - All components under `src/components/common/`, `src/components/customer/`, and `src/components/views/`.
2. **Commands executed**:
   - `compile_applet`: `vite build` completed cleanly without errors.
   - `lint_applet`: `tsc --noEmit` completed with 0 errors.
3. **Confirmed findings**:
   - Application is currently a client-side in-memory mock SPA.
   - Persona switching allows anyone to view super admin data.
   - OTP in customer booking is generated on the client and easily bypassed.
   - Hardcoded sample API keys in `SettingsView.tsx`.
   - Zero persistent storage: page refresh resets all newly created appointments and salon modifications.
4. **Phase 0 Status**: **PASSED**.
5. **Phase 1 Status**: **PASSED**.
6. **Phase 2 Status**: **PASSED (Implemented & Verified)**.
7. **Phase 3 Status**: **PASSED (Implemented & Verified)**.

---

## Phase 2 Implementation & Verification Sign-Off

1. **Security Containments Executed**:
   - **Admin Access Protection (`src/App.tsx`)**: Persona switcher treated strictly as preview tool. In production mode (`!isDemoMode`), super-admin access is blocked behind an explicit unconfigured server barrier.
   - **Customer Booking Privacy (`CustomerSiteDrawer.tsx`, `MyBookingsDrawer.tsx`, `CustomerPortal.tsx`)**: Removed fallback that exposed all salon bookings to visitors. Strictly displays bookings matching the verified client session. Removed aggregate counts leaking customer activity.
   - **Elimination of Fake OTP & Login (`BookingModal.tsx`, `CustomerSiteDrawer.tsx`)**: Removed hard-coded `1234` bypass and false claims of telecom SMS delivery. Added explicit `[شبیه‌ساز پیش‌نمایش دمو]` labeling. Disabled unauthenticated direct login in production mode.
   - **Elimination of Misleading Operational Claims (`AdminContext.tsx`, `SettingsView.tsx`, `OperationsView.tsx`, `MessagesView.tsx`, `SalonAppView.tsx`)**: Clearly distinguished simulated actions from real infrastructure calls (Redis FLUSHALL, system diagnostics, Shaparak gateway, SMS retry).
   - **Data Fixture Tagging (`src/mock/initialData.ts`, `src/types/admin.ts`, `src/components/views/SecurityView.tsx`)**: Seeded audit logs and synthetic appointments explicitly flagged with `isDemo: true` and labeled in UI.
   - **CSV Formula Injection Hardening (`src/utils/formatters.ts`)**: Cells prefixed with `=`, `+`, `-`, `@`, `\t`, `\r` are safely escaped with `'` while preserving Persian UTF-8 BOM encoding.
2. **Static & Verification Checks**:
   - `compile_applet`: `npm run build` completed with 0 errors.
   - `lint_applet`: `tsc --noEmit` completed with 0 errors.

---

## Phase 3 Implementation & Verification Sign-Off

1. **Architecture & Runtime Established**:
   - **Unified Entry Point (`server.ts` & `server/index.ts`)**:
     - Development (`npm run dev`): Runs `tsx server.ts` with Express and dynamically mounted Vite middlewares on port 3000. Preserves HMR and AI Studio iframe preview.
     - Production (`npm start`): Runs `node server.ts` serving built `dist/` frontend assets with long-term immutable caching (`/assets/*`) and SPA routing fallback.
   - **Centralized Configuration (`server/config.ts`)**:
     - Validates `NODE_ENV`, `APP_MODE`, `PORT`, `HOST`, `CORS_ORIGIN`, `BODY_LIMIT`.
     - Fail-fast enforcement: Tested invalid values (`APP_MODE=invalid_foo`, `PORT=99999`) and verified immediate descriptive termination.
     - Dotenv loaded exclusively in non-production.
   - **Security Middleware & Logging (`server/middleware/security.ts`)**:
     - Security headers: `X-Content-Type-Options: nosniff`, `X-XSS-Protection: 1; mode=block`, `Referrer-Policy: strict-origin-when-cross-origin`.
     - Non-restrictive frame headers in dev for AI Studio iframe compatibility; `SAMEORIGIN` in production.
     - Request logger prints `[HTTP] METHOD /path STATUS - DURATIONms` without logging authorization headers, cookies, passwords, or personal data.
   - **Centralized Error & 404 Handlers (`server/middleware/errorHandler.ts`)**:
     - Traps unknown `/api/*` routes returning JSON `API_ENDPOINT_NOT_FOUND` (404), never HTML.
     - Centralized error handler hides stack traces and internal errors in production.
   - **API Health Foundation (`server/routes/health.ts` & `server/routes/index.ts`)**:
     - `GET /api/health/live`: Tested HTTP 200 `{ status: "ok", service: "nobatara-server", uptimeSeconds: ... }`.
     - `GET /api/health/ready`: Tested HTTP 200 with honest reports that database and external integrations are pending Phase 4, 5, and 10.
2. **Prerequisite Correction**:
   - Removed `sessionStorage.getItem('nobatara_simulate_prod')` and UI mode toggle button from `src/utils/env.ts`, `src/context/AdminContext.tsx`, and `src/App.tsx`.
   - Mode is non-mutable from client UI and strictly dictated by server/build environment.
3. **Verification Checklist**:
   - `compile_applet`: `npm run build` completed cleanly (0 errors).
   - `lint_applet`: `tsc --noEmit` completed cleanly (0 errors).
   - `curl /api/health/live`: HTTP 200 OK.
   - `curl /api/health/ready`: HTTP 200 OK.
   - `curl /api/nonexistent-route`: HTTP 404 JSON error.
   - `curl /` (Dev): HTTP 200 HTML with Vite client script.
   - `PORT=3006 NODE_ENV=production node server.ts`: Production test passed (served `/`, `/salon/gisara`, and `/api/*` correctly, respected custom port, clean SIGTERM shutdown).
4. **Next Phase**: Phase 5 (Implement auth, sessions, server-side RBAC & tenant isolation).

---

## Phase 4 Implementation & Verification Sign-Off

1. **Relational Schema & Architecture (`server/db/migrations/001_initial_schema.sql`)**:
   - **Identity & Tenancy Foundation**: `users`, `platform_role` CHECK constraint, `salon_memberships` with `UNIQUE(user_id, salon_id)`, and `user_sessions` tracking with hashed tokens.
   - **Salon & Service Management**: `salons`, `staff`, `services`, `staff_services` (composite PK), `working_hours` (Iranian week 0=Saturday to 6=Friday), and `availability_exceptions` (holidays, leaves, blocked intervals).
   - **Appointments & Clients**: `clients`, `salon_clients` with `UNIQUE(salon_id, client_id)`, `appointments` with double-booking prevention constraint `UNIQUE(salon_id, staff_id, booking_date, booking_time)`, `appointment_status_history`, and `payment_records`.
   - **Governance**: `audit_logs` with severity, category, and demo fixture flags.
   - **Rollback script**: `server/db/migrations/001_initial_schema_down.sql` with cascading teardown.
2. **Typed Database Engine (`server/db/pool.ts` & `server/db/index.ts`)**:
   - Single PostgreSQL connection pool with connection timeout, idle timeout, pool min/max, and error listeners.
   - `withTransaction<T>(client => ...)` helper with automatic `BEGIN`, `COMMIT`, `ROLLBACK`, and guaranteed client release.
   - Credentials redaction in query error logs.
   - Graceful pool termination integrated into server shutdown lifecycle (`closePool`).
3. **Versioned Migration Runner & CLI (`server/db/migrator.ts` & `scripts/migrate.ts`)**:
   - Auto-creates `schema_migrations` tracking table.
   - Supports `npm run db:migrate` (`up`), `npm run db:rollback` (`down`), and `npm run db:status`.
   - Non-crashing graceful exits on unconfigured environment.
4. **Typed Repositories (`server/repositories/`)**:
   - `userRepository`, `salonRepository`, `serviceRepository`, `staffRepository`, `clientRepository`, `appointmentRepository`, `paymentRecordRepository`, `auditLogRepository`.
   - Parameterized queries throughout (zero SQL concatenation).
   - Transaction client pass-through support.
5. **Separated Fixture Seeder (`server/db/seeds/initialSeed.ts` & `scripts/seed.ts`)**:
   - Production safety lock prevents accidental execution in production without `--force-production-seed`.
   - Seeds canonical salons (Gisara, Kazhal), services, specialists, working hours, sample appointments (`GIS-8921`), and audit logs.
6. **Database-Aware Health & Readiness (`server/routes/health.ts`)**:
   - Real lightweight `SELECT 1` probing via `checkDbHealth()`.
   - Tested: Returns HTTP 200 with `status: "degraded"` when DB is not configured (Cloud SQL pending).
   - Tested: Returns HTTP 503 with `status: "unhealthy"` when DB is configured but unreachable.
   - Verified `GET /api/health/live` remains fast and completely isolated from DB status.
7. **Verification Checklist**:
   - `compile_applet`: `npm run build` completed with 0 errors.
   - `lint_applet`: `tsc --noEmit` completed with 0 errors.
   - Migration CLI test: `npx tsx scripts/migrate.ts status` passed (clean unconfigured guard).
   - Seeder CLI test: `npx tsx scripts/seed.ts` passed (clean unconfigured guard).
   - Health probe test: `curl http://localhost:3000/api/health/ready` returned `status: "degraded"` (Cloud SQL pending).
   - Health probe unreachable test: returned `isHealthy: false` with sanitized error.
8. **Phase 4 Status**: **PASSED (Implemented & Verified)**.
9. **Next Phase**: Phase 5 (Implement auth, sessions, server-side RBAC & tenant isolation).

---

## Phase 5 Implementation & Verification Sign-Off

1. **Cryptographic OTP Authentication (`server/services/auth/otpService.ts` & `server/routes/auth.ts`)**:
   - **Iranian Phone Normalization**: Robust parser handling `0912...`, `+98912...`, `0098912...`, 10-digit `912...`, Persian/Arabic numerals, spaces, and hyphens. Strict rejection of landlines, foreign numbers, and malformed strings.
   - **Cryptographic Challenge Generation**: 6-digit numeric OTP generated via `crypto.randomInt(100000, 1000000)`.
   - **HMAC-SHA256 Hashing**: Plaintext OTP is NEVER stored. Keyed HMAC (`code:phone:purpose`) stored in `otp_challenges` (or in-memory dev store when DB pending).
   - **Lifecycle Hardening**: Purpose-specific challenges (`login`, `booking_verification`, `admin_step_up`), 60s resend cooldown, 120s TTL, max 3 attempts, atomic consumption (`consumed_at = NOW()`), and anti-replay protection.
   - **SMS Delivery Boundary (`server/services/sms/`)**: `NullSmsProvider` fails closed in production. `DevMockSmsProvider` isolated strictly to development. Real Kavenegar integration interface ready.
2. **Persistent, Secure Server-Side Sessions (`server/services/auth/sessionService.ts`)**:
   - **256-bit Token Generation**: `crypto.randomBytes(32).toString('hex')`. Raw token returned ONLY in `HttpOnly`, `Path=/`, `SameSite=lax`, `Secure` (in prod) cookie (`nobatara_session`). Never serialized in JSON bodies.
   - **One-Way Hashing at Rest**: Stored as SHA-256 token hash in `user_sessions`.
   - **Expiration & Idle Timeout**: Enforces 14-day absolute expiration (`expires_at`) and 2-hour idle timeout (`idle_expires_at`), updated every 5 minutes on active requests.
   - **Granular Revocation**:
     - `POST /api/auth/logout`: Revokes current session and clears cookie.
     - `GET /api/auth/sessions`: Lists active sessions (sanitized, omitting hashes).
     - `POST /api/auth/sessions/:sessionId/revoke`: Revokes a specific remote session.
     - `POST /api/auth/sessions/revoke-others`: Revokes all other sessions.
   - **Client-Side Live Session Integration (`AdminContext.tsx`)**: `terminateSession` and `terminateAllOtherSessions` wired directly to server revocation endpoints with `fetchServerSessions` keeping UI state synchronized.
3. **Server-Enforced RBAC & Policy Middleware (`server/middleware/auth.ts` & `server/routes/salon.ts`)**:
   - `requireAuth`: Enforces active, unexpired, non-revoked session.
   - `requirePlatformRole(...roles)`: Enforces platform governance (`super_admin`, `platform_support`, `platform_auditor`, `financial_manager`).
   - `requireSalonMembership(...roles)`: Prevents cross-tenant access; verifies membership in target `salon_id`. Super admin override supported.
   - `requireSalonPermission(...permissions)`: Enforces specific salon permissions for staff while granting full access to salon owners and managers. Demonstrated on operational route `PATCH /api/salon/:salonId/appointments/:appointmentId/status`.
   - `Policies` helper object providing centralized verification functions.
   - `csrfProtection`: Enforces Origin/Referer matching or custom anti-CSRF header (`X-NobatAra-Client`) on all state-changing HTTP methods.
4. **Identity Separation & Dedicated Access Gates (`ProductionAdminLogin.tsx`, `ProductionSalonLogin.tsx`, `MyBookingsDrawer.tsx`)**:
   - **Customer Portal**: Public customer login strictly provisions `platform_role = 'user'`. Integrated `ServerAuthModal` in `MyBookingsDrawer` and `BookingModal` with mobile OTP challenge.
   - **Salon Manager / Staff**: Protected by `ProductionSalonLogin` in production mode; verifies salon membership (`salonMemberships.length > 0`) before permitting app entry.
   - **Super-Admin**: Protected by `ProductionAdminLogin` requiring server-verified `super_admin` role. Initial provisioning restricted to CLI operator script `tsx scripts/bootstrapAdmin.ts --phone <phone> --confirm`.
5. **Database Schema Enhancements & Fallback**:
   - Additive migration `002_auth_and_sessions.sql`: `otp_challenges`, `clients.user_id`, `user_sessions.idle_expires_at`, `user_sessions.session_type`.
   - Additive migration `003_rbac_and_roles.sql`: expanded platform roles (`financial_manager`), `user_sessions.revocation_reason`, and compound index `idx_user_sessions_user_active`.
   - Resilient in-memory mock fallback in `server/db/pool.ts` prevents preview crashes when PostgreSQL is not configured.
6. **Automated Security Verification (`npm run test:auth`)**:
   - **32 automated test cases executed and passed with 0 failures**:
     - 9 Phone normalization & validation tests
     - 6 Cryptographic OTP lifecycle & anti-bruteforce tests
     - 1 SMS provider fail-closed safeguard test
     - 4 Session security, hashing & revocation tests
     - 7 Server-side RBAC, tenant isolation, role governance & granular permission tests
     - 2 Multi-session management & remote revocation tests
     - 1 Customer identity privilege separation test
     - 2 CSRF protection tests
   - Build checks: `compile_applet` passed. `lint_applet` (`tsc --noEmit`) passed with 0 errors.
7. **Infrastructure Connectivity Truth in Reporting**:
   - **PostgreSQL Database Connectivity**: **NOT VERIFIED** (Database connection string not configured in current preview environment; Cloud SQL provisioning pending).
   - **SMS Delivery (Kavenegar)**: **NOT VERIFIED** with live telco (Requires valid `KAVENEGAR_API_KEY`; dev mock used safely in local tests).
8. **Phase 5 Status**: **PASSED (Implemented & Verified)**.

---

## Phase 6: Design System Foundation — COMPLETED & VERIFIED

1. **Semantic Design Tokens (`src/index.css`)**:
   - Centralized CSS variables for background, surface, text, border, rose accent, status, radius, shadows, and focus rings.
   - Deep navy dark mode (`#0B1120` canvas, `#111B2E` surface, `#18243A` elevated) as the default.
   - Warm coherent light theme with consistent contrast ratios.
   - Accessible visible focus rings with `var(--color-ring-focus)` and 2px offset.
   - Reduced-motion accessibility media queries (`@media (prefers-reduced-motion: reduce)`).

2. **Persistent Theme System (`src/context/ThemeContext.tsx`)**:
   - Stored in `localStorage` under `nobatara_theme`.
   - Dynamic class toggle on `document.documentElement` (`dark` / light).
   - Theme toggle component available globally and persistent across reloads.

3. **Accessible Shared Primitives**:
   - Buttons, inputs, modals, toasts, drawers, badges, and empty/error states updated to use semantic design tokens.
   - Minimum 44×44px touch targets where practical on mobile viewports.
   - Full RTL directionality with standard Vazirmatn typography.

---

## Phase 7: Customer Experience & Production-Ready Booking — COMPLETED & VERIFIED

1. **Public Salon Storefront (`src/components/customer/SalonWebsiteView.tsx`)**:
   - Public salon landing page for salons (e.g. `gisara`).
   - Live server synchronization via `GET /api/public/salons/:slugOrId` with graceful static fallback.
   - Categorized service catalog with price, duration, and direct booking CTA.
   - Specialist roster with ratings and specialties.
   - Working hours, location address, contact phone, and verified badge.
   - RTL native, fully responsive layout obeying Phase 6 design system tokens.

2. **Step-by-Step Customer Booking Flow (`src/components/customer/BookingModal.tsx`)**:
   - **Step 1 — Service Selection**: Browse services by category or search, select service with duration and price breakdown.
   - **Step 2 — Specialist & Date Selection**: Choose specific specialist or any available specialist; pick dynamic Persian date (Saturday through Friday).
   - **Step 3 — Time Slot Selection**: Real-time availability calculation via `GET /api/public/salons/:slug/availability`, showing only valid, unbooked time slots. Detects closed days (e.g., Friday) with clear empty state.
   - **Step 4 — Customer Phone & OTP Verification**: Mobile number input with Iranian format normalization (Persian digit conversion, prefixes), server OTP request, 60s cooldown timer, and verification code input.
   - **Step 5 — Summary Review & Submission**: Full booking summary with tracking code creation and 100% in-person settlement guarantee.

3. **Server-Side Authoritative Booking Engine (`server/services/booking/bookingService.ts` & `server/routes/public.ts`)**:
   - **Zero Trust Client**: Client-sent price and salon/service IDs are disregarded; price is fetched authoritatively from the service database.
   - **Service Duration & End-Time Computation**: Automatically computes `end_time` from service `duration_minutes`.
   - **Atomic Overlap & Race Condition Prevention**:
     - Time interval arithmetic (`doIntervalsOverlap`) prevents exact and partial slot overlaps.
     - Staff-level mutex locks (`withBookingLock`) ensure that parallel concurrent requests for the same slot execute sequentially without duplicate bookings.
     - Database-level transaction with row lock (`FOR UPDATE`) and unique constraint `uq_staff_slot`.
   - **Duplicate Double-Click Safeguard**: Rejects identical client submissions for the same staff/date/time within 5 minutes (`DUPLICATE_SUBMISSION`).

4. **Customer Privacy & Booking Ownership (`server/routes/public.ts` & `src/components/customer/MyBookingsDrawer.tsx`)**:
   - `GET /api/public/my-bookings`: Access restricted strictly to authenticated session phone number (`nobatara_session` cookie).
   - `POST /api/public/bookings/:trackingCode/cancel`: Validates that the appointment's client phone strictly matches the authenticated user; unauthorized cancellations return `FORBIDDEN_CANCELLATION`.
   - Cancelling an appointment automatically frees up the time slot for subsequent bookings.
   - Personal information and plaintext OTPs are strictly sanitized and never logged.

5. **Automated Verification & Test Suite (`npm test`)**:
   - **48 automated test cases executed and passed with 0 failures**:
     - `npm run test:auth`: 32/32 tests passing.
     - `npm run test:booking`: 16/16 tests passing:
       - 3 Working hours & availability calculation tests (including closed Friday detection).
       - 3 Booking creation & authoritative price enforcement tests.
       - 4 Overlap, back-to-back, and duplicate submission prevention tests.
       - 1 Parallel concurrency race test (5 simultaneous requests for 1 slot -> exactly 1 succeeds).
       - 4 Customer privacy, session scoping, and cancellation ownership tests.
       - 1 Production fail-closed database safeguard test.
   - **Build & Quality Gates**:
     - `lint_applet` (`tsc --noEmit`): PASSED (0 errors).
     - `compile_applet` (Vite production build): PASSED.

6. **Infrastructure Connectivity Truth in Reporting**:
   - **PostgreSQL Database Connectivity**: **NOT VERIFIED** (PostgreSQL instance not yet provisioned in this preview environment; production code fails closed safely with 503 while development environment utilizes thread-safe in-memory storage).
   - **SMS Delivery (Kavenegar)**: **NOT VERIFIED** with live telco (Requires production `KAVENEGAR_API_KEY`; dev mock dispatched securely in local testing).

7. **Phase 7 Status**: **PASSED (Implemented & Verified)**.

---

## Phase 8: Salon Manager Operations — COMPLETED & VERIFIED

1. **Operational Dashboard & Real-Time Metrics (`GET /api/salon/:salonId/dashboard/overview`)**:
   - Calculates today's appointment breakdown (`todayAppointmentsCount`, `completedCount`, `confirmedCount`, `pendingCount`, `cancelledCount`, `noShowCount`).
   - Computes collected revenue from completed appointments and pending revenue from confirmed appointments.
   - Calculates theoretical maximum day capacity based on active specialists' working hours and computes `capacityUsagePercent`.
   - Returns urgent pending actions needing manager review.

2. **Appointment Management & Rescheduling (`server/routes/salon.ts`)**:
   - Filterable appointments queue by status, date, specialist, and client search string (`GET /api/salon/:salonId/appointments`).
   - Status transitions (`confirmed` -> `completed`, `cancelled`, `no_show`) enforced on server (`PATCH /api/salon/:salonId/appointments/:appointmentId/status`). Marking `completed` sets `payment_status = 'paid_in_person'`.
   - Rescheduling endpoint (`PATCH /api/salon/:salonId/appointments/:appointmentId/reschedule`) verifies target time slot overlap (`checkSlotOverlap`) excluding current appointment ID. Overlapping reschedules are rejected with 409 Conflict.
   - Manual walk-in / phone booking creation (`POST /api/salon/:salonId/appointments`) normalizes client mobile numbers and checks slot availability.

3. **Catalog & Service Management (`POST/PATCH/DELETE /api/salon/:salonId/services`)**:
   - Catalog service CRUD operations guarded by `requireSalonPermission('manage_services')`.
   - Server enforces `price >= 0` and `duration_minutes > 0`.
   - Deleting a service soft-deactivates it (`is_active = false`) to preserve appointment history.

4. **Staff Roster & Working Hours / Exceptions (`server/routes/salon.ts`)**:
   - Specialist management (`POST/PATCH /api/salon/:salonId/staff`) and service mapping (`POST /api/salon/:salonId/staff/:staffId/services`) guarded by `manage_staff`.
   - Weekly operating schedule configuration (`PUT /api/salon/:salonId/working-hours`) validates day range (0-6) and `start_time < end_time`.
   - Calendar exceptions (`POST/DELETE /api/salon/:salonId/exceptions`) for holidays, leave, and blocked periods.

5. **Tenant Isolation, RBAC & Audit Trails**:
   - All manager routes strictly enforce `requireSalonMembership('owner', 'manager', 'staff')` for the target `salonId`. Cross-tenant requests return `FORBIDDEN_SALON_ACCESS`.
   - All state-changing operations enforce CSRF protection (`csrfProtection`) and record structured audit logs in `audit_logs` with actor name, role, IP address, and details.

6. **Automated Verification & Test Suite (`npm test`)**:
   - **57 automated test cases executed and passed with 0 failures**:
     - `npm run test:auth`: 32/32 tests passing.
     - `npm run test:booking`: 16/16 tests passing.
     - `npm run test:salon`: 9/9 tests passing:
       - 2 Tenant isolation and cross-tenant access prevention tests.
       - 2 Service creation and edit/deactivation constraint tests.
       - 1 Staff creation and service assignment test.
       - 1 Appointment status transition to completed test.
       - 2 Reschedule to free slot and rejection of overlapping slot tests.
       - 1 Working hours update and holiday exception creation/deletion test.
   - **Build & Quality Gates**:
     - `lint_applet` (`tsc --noEmit`): PASSED (0 errors).
     - `compile_applet` (Vite production build): PASSED.

7. **Infrastructure Connectivity Truth in Reporting**:
   - **PostgreSQL Database Connectivity**: **NOT VERIFIED** (Database instance not provisioned in current environment; production code fails closed safely with 503 while development utilizes thread-safe in-memory stores).
   - **SMS Delivery (Kavenegar)**: **NOT VERIFIED** with live telco (Requires production `KAVENEGAR_API_KEY`; dev mock used in local tests).

8. **Phase 8 Status**: **PASSED (Implemented & Verified)**.

---

## Phase 9: Super Admin & Platform Governance — COMPLETED & VERIFIED

1. **Global Overview Dashboard (`src/components/views/OverviewView.tsx` & `GET /api/admin/stats`)**:
   - **Live Metric Cards**: Calculates total salons (active, pending approval, suspended, trial), total platform users, total appointments, total monthly network volume, SMS queue health, and server latency. All stats computed from authoritative server repository data.
   - **Pending Approvals Queue**: Dedicated action panel displaying salons awaiting documentation review with direct Approve/Reject modal triggers.
   - **Platform Activity Chart**: Interactive time-range chart (7 days, 30 days, 12 months) displaying volume and revenue trends styled with Phase 6 Design System tokens.

2. **Salon Approval & Management (`src/components/views/BusinessesView.tsx` & `PUT /api/admin/salons/:id/status`)**:
   - Queue of pending requests, active salons, suspended salons, and trial accounts with search, province/city filter, plan filter, and sorting options.
   - **Compulsory Reason Entry (`src/components/common/StatusReasonModal.tsx`)**: Clicking Approve, Suspend, Activate, or Reject opens a modal requiring a mandatory reason text input (`reason` >= 3 characters) before state modification.
   - Server validates status transitions inside DB transaction and records immutable `audit_logs` entry with operator identity (`actor`), `target`, `ip_address`, `severity`, and `details` (including `oldStatus`, `newStatus`, `reason`).

3. **Platform User Management & Privilege Security (`src/components/views/UsersView.tsx` & `/api/admin/users/*`)**:
   - Search and filter users by role (`super_admin`, `platform_support`, `platform_auditor`, `financial_manager`, `user`), status (`active`, `suspended`), and text search.
   - View profile details, 2FA status, last login IP, and associated salon memberships.
   - Suspend / Activate user accounts requiring compulsory reason input and recording audit log entries.
   - Role updates via `PUT /api/admin/users/:id/role` strictly prevent assigning `super_admin` role via standard UI or API routes (returns `403 SUPER_ADMIN_ASSIGNMENT_FORBIDDEN`). Super admin accounts are strictly provisioned via protected operator bootstrap scripts.

4. **Dedicated Audit Logs Panel (`src/components/views/SecurityView.tsx` & `GET /api/admin/audit-logs`)**:
   - Dedicated table view with multi-filtering by Severity (`critical`, `warning`, `info`), Category (`auth`, `privilege`, `business`, `financial`, `system`), Actor/Operator search, and text search.
   - Paginated display of timestamp, actor name, actor role, operation action, target entity, client IP address, severity badge, and category badge.
   - **Detail Modal**: Inspect full audit detail JSON payload cleanly while ensuring zero leakage of user OTPs, passwords, or session tokens.

5. **Automated Verification & Complete Test Suite (`npm test`)**:
   - **64 automated test cases executed and passed with 0 failures across all project phases**:
     - `npm run test:auth`: 32/32 tests passing.
     - `npm run test:booking`: 16/16 tests passing.
     - `npm run test:salon`: 9/9 tests passing.
     - `npm run test:admin`: 7/7 tests passing:
       - 1 Unauthenticated 401 rejection test.
       - 1 Regular user 403 forbidden access prevention test.
       - 1 Super admin authenticated access & live stats calculation test.
       - 1 Compulsory reason validation test (rejection of status change without reason).
       - 1 Salon suspension with reason & audit log verification test.
       - 1 Privilege escalation prevention test (403 when assigning `super_admin`).
       - 1 Audit log multi-filtering by severity & category test.
   - **Build & Quality Gates**:
     - `lint_applet` (`tsc --noEmit`): PASSED (0 errors).
     - `compile_applet` (Vite production build): PASSED.

6. **Infrastructure Connectivity Truth in Reporting**:
   - **PostgreSQL Database Connectivity**: **NOT VERIFIED** (Database instance not provisioned in current environment; production code fails closed safely with 503 while development environment utilizes thread-safe in-memory stores).
   - **SMS Delivery (Kavenegar)**: **NOT VERIFIED** with live telco (Requires production `KAVENEGAR_API_KEY`; dev mock used safely in local tests).

7. **Phase 9 Status**: **PASSED (Implemented & Verified)**.





