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
