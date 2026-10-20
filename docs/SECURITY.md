# NobatAra — Security & Compliance Architecture

**Audit Date:** 2026-10-19  
**Status:** Security Baseline & Hardening Strategy  

---

## 1. Threat Modeling & Vulnerability Matrix

| Threat / Risk | Current Baseline Status | Mitigation Plan in Phase 2 & 5 |
| :--- | :--- | :--- |
| **Unauthenticated Admin Access** | HIGH RISK: Any user can click the persona switcher in `App.tsx` and access super admin views. | Restrict switcher to explicit `DEMO_MODE=true`. Production requires verified session JWT + 2FA challenge. |
| **Client-Side OTP Bypass** | HIGH RISK: OTP is generated in browser in `BookingModal.tsx` and accepts `1234`. | Shift OTP generation and validation strictly to backend with bcrypt hashing, 120s TTL, and rate limiting. |
| **Cross-Tenant Data Exposure** | HIGH RISK: Salon managers can switch salons via dropdown (`currentSalonSlug`). | Backend queries enforce `WHERE salon_id = :authenticatedSalonId` derived strictly from verified JWT. |
| **Exposed Secret API Keys** | MEDIUM RISK: Fake credentials shown in client `SettingsView.tsx`. | Real API keys kept exclusively in server environment variables (`KAVENEGAR_API_KEY`, `ZARINPAL_MERCHANT`). Client only receives masked status. |
| **Brute Force & Denial of Service** | MEDIUM RISK: No rate limiting on booking creation or simulated dispatch. | Implement `express-rate-limit` (10 requests/min on OTP endpoints, 60 requests/min globally per IP). |
| **Tampering with Audit Logs** | LOW RISK: Audit logs currently stored in volatile React state. | Store audit logs in an append-only database table with actor ID, IP address, user agent, severity, and action details. |

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

