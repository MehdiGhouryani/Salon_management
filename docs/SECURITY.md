# NobatAra — Security & Compliance Architecture

**Audit Date:** 2026-10-19 (baseline) · **Reconciled:** Phase 18, 2026-11-17  
**Status:** Implemented architecture + verification state per control  

---

## 1. Threat Modeling & Vulnerability Matrix

The baseline findings below were the October 2026 audit of the pre-hardening
client-only SPA. **Every item has since been remediated server-side**; the
"Verification (Phase 18)" column states exactly what currently proves it, so no
claim outruns its evidence.

| Threat / Risk | Baseline (2026-10-19) | Current implementation | Verification (Phase 18) |
| :--- | :--- | :--- | :--- |
| **Unauthenticated Admin Access** | HIGH RISK: persona switcher granted admin views client-side. | Super-admin console requires a server-verified session (`requirePlatformRole('super_admin')`); bootstrap only via operator CLI (`scripts/bootstrapAdmin.ts --confirm`). | Implemented + tested: 401/403 RBAC tests (`tests/integration/http-api.test.ts`), E2E super-admin journey, `SUPER_ADMIN_ASSIGNMENT_FORBIDDEN` on role escalation. |
| **Client-Side OTP Bypass** | HIGH RISK: OTP generated in browser, `1234` bypass. | OTP generated server-side (`crypto.randomInt`), stored as keyed HMAC only, TTL/cooldown/attempt caps, atomic consumption. | Implemented + tested: unit OTP lifecycle tests + integration HTTP OTP tests + E2E real-OTP journeys. **Live SMS delivery (Kavenegar): BLOCKED — needs real credentials.** |
| **Cross-Tenant Data Exposure** | HIGH RISK: salon switcher leaked other tenants' data. | Every salon query binds to the membership-verified `salon_id` (`requireSalonMembership`). | Implemented + tested: tenant-boundary HTTP tests + salon E2E journey. |
| **Exposed Secret API Keys** | MEDIUM RISK: fake keys in client `SettingsView`. | Super-admin can manage supported provider credentials in the admin panel; secrets are AES-256-GCM encrypted in PostgreSQL and never returned to the browser or audit logs. Environment variables remain a fallback/emergency override. | Implemented in code; encryption, redaction and PostgreSQL persistence are covered by unit/DB tests. The encryption key is derived from `SESSION_SECRET`; changing that secret requires re-entering saved provider credentials. |
| **Brute Force & DoS** | MEDIUM RISK: no rate limiting. | In-process fixed-window limiter on OTP/booking/admin routes; per-IP + per-phone OTP counters + resend cooldown; fail-closed on DB errors. | Implemented + tested (integration rate-limit tests). **Single-process scope honestly documented — horizontal deployments need a shared limiter.** |
| **Tampering with Audit Logs** | LOW RISK: logs in React state. | Append-only `audit_logs` table with actor, role, IP, user agent, severity, details; admin panel reads from the API. | Implemented + tested (admin/audit integration tests + E2E governance journey). **Real-PostgreSQL persistence verified in Phase 18 (migrations 001–005 executed from empty DB).** |

### Verification state legend (used across this document)

- **Implemented + tested** — source code exists AND automated tests execute against it.
- **Implemented, not verified against real infrastructure** — code + tests exist, but live external dependency unproven.
- **Not implemented** — no code.
- **Blocked** — external prerequisite missing (credentials, accounts, devices).

---

## 2. Authentication & Session Strategy

### Role-Based Access Control (RBAC) Matrix

| Resource / Endpoint | Anonymous / Customer | Salon Staff | Salon Admin | Super Admin |
| :--- | :---: | :---: | :---: | :---: |
| View Public Salon Storefront (`/api/public/salons/:slug`) | ✅ Read | ✅ Read | ✅ Read | ✅ Read |
| Request Customer OTP (`/api/auth/otp/send`) | ✅ Write | ✅ Write | ✅ Write | ✅ Write |
| Book Appointment (`/api/bookings`) | ✅ Verified OTP | ✅ Write | ✅ Write | ✅ Write |
| View Salon Cashflow & Queue (`/api/salon/appointments`) | ❌ Denied | ✅ Assigned | ✅ Full Salon | ✅ Full Platform |
| Reschedule / Cancel Salon Booking | ❌ Denied | ✅ Assigned | ✅ Full Salon | ✅ Full Platform |
| Manage Services & Staff (`/api/salon/services`) | ❌ Denied | ❌ Denied | ✅ Full Salon | ✅ Full Platform |
| Purchase B2B Subscription (`/api/salon/subscription`) | ❌ Denied | ❌ Denied | ✅ Write | ✅ Write |
| Approve / Suspend Salons (`/api/admin/salons`) | ❌ Denied | ❌ Denied | ❌ Denied | ✅ Full Control |
| View System Metrics & Security Logs | ❌ Denied | ❌ Denied | ❌ Denied | ✅ Full Control |

---

## 3. Data Masking & PII Protection Guidelines

1. **Customer Phone Numbers**:
   - In public or semi-public views, customer phone numbers must be masked: `0912***2233`.
   - Only the salon manager or assigned staff member handling the appointment may unmask the phone number or tap the call button.
2. **Payment Card & Banking Data**:
   - No bank card numbers, CVV2, or banking passwords ever touch NobatAra servers. All online B2B payments redirect to Shaparak/Zarinpal gateway servers.
3. **Session Revocation**:
   - The security console (`SecurityView.tsx`) allows super admins to terminate individual active sessions or terminate all other sessions globally, revoking the session token in the database.

---

## 4. Phase 3 Runtime Security Controls

1. **Non-Bypassable Mode Governance**:
   - Runtime mode (`production` vs `development`) is strictly determined by server/build configuration.
   - Client-side storage (`sessionStorage`, `localStorage`) is completely excluded from mode determination.
   - Production mode enforces a hard barrier preventing unauthenticated access to super-admin functionality.
2. **Security Headers & CORS**:
   - `X-Content-Type-Options: nosniff` protects against MIME sniffing.
   - `X-XSS-Protection: 1; mode=block` enabled.
   - `Referrer-Policy: strict-origin-when-cross-origin` enabled.
   - Production enforces explicit CORS origin matching or same-origin.
3. **Information Disclosure Prevention**:
   - Centralized error handler strictly suppresses error stacks and internal diagnostic messages in production.
   - Request logger formats method, path, and duration without logging request payloads, query tokens, passwords, or Authorization headers.
   - Unknown `/api/*` routes consistently return JSON 404 rather than leaking frontend HTML.

---

## 5. Phase 5 Authentication, Sessions & Server-Side RBAC

1. **Cryptographic OTP Architecture**:
   - Phone normalization guarantees single canonical format (`09xxxxxxxxx` national and `+989xxxxxxxxx` E.164).
   - OTP codes are 6 digits generated via OS-level CSPRNG (`crypto.randomInt`).
   - Plaintext OTPs are NEVER persisted or logged; challenges store HMAC-SHA256 keyed hashes (`code:phone:purpose`).
   - Challenge state enforcement: 120-second validity, 60-second resend cooldown, 3 max failed attempts, atomic consumption (`consumed_at = NOW()`), and anti-replay prevention.
   - Purpose binding prevents cross-purpose reuse (`login`, `booking_verification`, `admin_step_up`).
2. **Session Security & Hashing at Rest**:
   - 256-bit entropy opaque tokens generated via `crypto.randomBytes(32).toString('hex')`.
   - Raw tokens are transmitted exclusively via `HttpOnly`, `Path=/`, `SameSite=lax`, `Secure` (production) cookies (`nobatara_session`).
   - The database stores only the one-way SHA-256 hash (`token_hash`). Compromise of the database does not compromise raw session cookies.
   - Sessions enforce dual-expiration: 14 days absolute (`expires_at`) and 2 hours inactivity (`idle_expires_at`), updated at most once every 5 minutes on active requests.
   - Granular session revocation allows logging out, terminating remote sessions by ID, or revoking all other sessions.
3. **State-Changing CSRF & Origin Validation**:
   - All state-changing HTTP requests (`POST`, `PUT`, `PATCH`, `DELETE`) are protected by `csrfProtection`.
   - Rejection occurs if Origin/Referer is invalid or mismatched, unless accompanied by a verified client anti-CSRF header (`X-NobatAra-Client`).
4. **Platform Privilege Isolation & Controlled Provisioning**:
   - Customer public phone registration strictly defaults to `platform_role = 'user'`.
   - Customer phone verification never grants administrative or salon management roles.
   - Initial super-admin bootstrap is restricted to a CLI operator command (`scripts/bootstrapAdmin.ts`) requiring explicit `--confirm` flag, phone normalization, and tamper-evident audit logging. No public HTTP admin-registration endpoint exists.
5. **Server-Enforced RBAC & Policy Middleware**:
   - `requireAuth`: Validates active, unexpired, non-revoked session.
   - `requirePlatformRole`: Enforces platform role boundaries (`super_admin`, `platform_support`, `platform_auditor`, `financial_manager`).
   - `requireSalonMembership`: Strictly binds salon managers and staff to authorized tenants.
   - `requireSalonPermission`: Granularly checks staff permissions (`appointments:read`, `appointments:write`, `cashflow:read`, etc.) while granting full governance to salon owners and managers.

