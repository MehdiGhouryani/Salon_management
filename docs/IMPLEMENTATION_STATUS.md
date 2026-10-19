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
| **5** | **Implement auth, sessions, server-side RBAC & tenant isolation** | *PENDING* | Not started. | Next Phase. |
| **6** | **Build shared design system and semantic tokens** | *PENDING* | Baseline tokens verified. Full alignment pending. | Hold. |
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

