# NobatAra — QA Test Matrix & Verification Protocols

**Audit Date:** 2026-10-19  
**Status:** Verification Protocols  

---

## 1. Test Suite Overview

| Category | Scope | Method | Target Threshold |
| :--- | :--- | :--- | :--- |
| **Static Analysis** | Full TypeScript codebase | `npm run lint` (`tsc --noEmit`) | 0 errors |
| **Build Integrity** | Bundler & CSS engine | `compile_applet` (`vite build`) | 0 build failures |
| **Security Audits** | Route access & tenant isolation | Automated API tests + manual pen-testing | Zero unauthorized access |
| **Responsive UX** | 375px (iPhone SE), 412px (Android), 768px (iPad), 1440px (Desktop) | Visual inspection | Zero horizontal overflow, zero button collision |
| **Persian RTL** | Font rendering, number formatting, direction | UI Inspection | Vazirmatn font, Persian digits in tabular numbers |

---

## 2. Test Cases by Persona & Workflow

| ID | Persona | Test Case Description | Expected Result | Baseline Status |
| :--- | :--- | :--- | :--- | :--- |
| **TC-CUST-01** | Customer | Browse salon services and filter by category | Service list updates instantly without page reload | PASS |
| **TC-CUST-02** | Customer | Complete 3-step booking flow | Unique tracking code generated, receipt modal opens | PASS (Mock OTP) |
| **TC-CUST-03** | Customer | Verify in-person settlement label | Both modal and receipt state "تسویه ۱۰۰٪ حضوری در سالن" | PASS |
| **TC-CUST-04** | Customer | Mobile view (390px) sticky booking CTA | CTA remains fixed at bottom; persona switcher does not overlap | PASS |
| **TC-SAL-01** | Salon App | Open Snapp-style appointment bottom sheet | Slide-up modal displays customer phone, service, price, and actions | PASS |
| **TC-SAL-02** | Salon App | Mark appointment completed with in-person payment | Status updates to `completed`, daily collected cash increases | PASS |
| **TC-SAL-03** | Salon App | Add walk-in appointment manually | New appointment added to today's queue | PASS |
| **TC-SAL-04** | Salon App | Generate and copy salon booking link | Link copied to clipboard (`nobatara.ir/:slug`) | PASS |
| **TC-ADM-01** | Super Admin | Approve a pending salon (`sal-104`) | Status becomes `active`, verified badge added, audit log recorded | PASS |
| **TC-ADM-02** | Super Admin | Suspend a delinquent salon (`sal-106`) | Status becomes `suspended`, toast alert appears with undo action | PASS |
| **TC-ADM-03** | Super Admin | Retry failed SMS in dispatch queue | Retry count increments, status becomes `delivered` | PASS |
| **TC-ADM-04** | Super Admin | Terminate active user session | Session removed from list, security log entry generated | PASS |
| **TC-ADM-05** | Super Admin | Add IP to firewall blacklist | IP added to blacklist, blocked status confirmed | PASS |
| **TC-ADM-06** | Super Admin | Global command palette (`Ctrl+K`) | Fast search opens and routes between salons and tabs | PASS |
| **TC-SEC-01** | Security | Unauthenticated visitor accesses `/admin` or super-admin APIs | 401 Unauthorized / Production gate blocks unverified session | **PASS (Phase 5)** |
| **TC-SEC-02** | Security | Salon A queries Salon B's appointment queue | 403 Forbidden (`requireSalonMembership`) | **PASS (Phase 5)** |
| **TC-SEC-03** | Security | Real OTP verification expires after 120s | Code invalidation enforced by server | **PASS (Phase 5)** |

---

## 3. Phase 5 Automated Security Test Matrix (`tests/auth.test.ts`)

Run Command: `npm run test:auth` (31 Tests, 100% Passing)

| Test ID | Test Scope | Verification Criterion | Status |
| :--- | :--- | :--- | :---: |
| **AST-01** | Phone Normalization | Parses standard `09123456789` -> `+989123456789` (E.164) & `09123456789` (National) | **PASS** |
| **AST-02** | Phone Normalization | Parses international `+989123456789` -> canonical representation | **PASS** |
| **AST-03** | Phone Normalization | Parses `00989123456789` format correctly | **PASS** |
| **AST-04** | Phone Normalization | Parses 10-digit `9123456789` format | **PASS** |
| **AST-05** | Phone Normalization | Converts Persian/Arabic digits (`۰۹۱۲۳۴۵۶۷۸۹`) to canonical ASCII digits | **PASS** |
| **AST-06** | Phone Normalization | Handles spaces, hyphens, and parenthesis (`0912-345 6789`) | **PASS** |
| **AST-07** | Phone Validation | Rejects non-Iranian mobile numbers (e.g. US `+1415...`) | **PASS** |
| **AST-08** | Phone Validation | Rejects landlines and invalid area codes (`021...`, `081...`) | **PASS** |
| **AST-09** | Phone Validation | Rejects empty, too short, or non-numeric garbage | **PASS** |
| **AST-10** | OTP Generation | Requests OTP and generates 6-digit numeric CSPRNG code | **PASS** |
| **AST-11** | OTP Rate Limiting | Enforces 60-second resend cooldown returning HTTP 429 | **PASS** |
| **AST-12** | OTP Verification | Verifies valid code, marks challenge consumed atomically | **PASS** |
| **AST-13** | Anti-Replay | Rejects reusing already-consumed OTP code (prevents replay attacks) | **PASS** |
| **AST-14** | Anti-Bruteforce | Rejects invalid code and decrements attempt count (max 3 tries) | **PASS** |
| **AST-15** | Purpose Isolation | Prevents cross-purpose OTP code reuse (`booking_verification` cannot login) | **PASS** |
| **AST-16** | SMS Fail-Closed | `NullSmsProvider` fails closed in production with descriptive error | **PASS** |
| **AST-17** | Session Creation | Generates 256-bit entropy token and sets `HttpOnly`, `Path=/`, `SameSite=lax` cookie | **PASS** |
| **AST-18** | Hashing at Rest | Validates session token is stored only as SHA-256 hash in database | **PASS** |
| **AST-19** | Session Validation | Rejects invalid or nonexistent session tokens | **PASS** |
| **AST-20** | Session Revocation | Revokes session on logout and rejects subsequent requests (`SESSION_REVOKED`) | **PASS** |
| **AST-21** | Platform RBAC | `requirePlatformRole` denies access to unauthorized roles with HTTP 403 | **PASS** |
| **AST-22** | Platform RBAC | `requirePlatformRole` permits authorized `super_admin` | **PASS** |
| **AST-23** | Tenant Isolation | `requireSalonMembership` blocks cross-tenant access to other salons | **PASS** |
| **AST-24** | Tenant Isolation | `requireSalonMembership` permits active member of specified salon | **PASS** |
| **AST-25** | Salon Permissions | `requireSalonPermission` permits salon owners/managers unconditionally | **PASS** |
| **AST-26** | Staff Permissions | `requireSalonPermission` checks specific permissions array for staff | **PASS** |
| **AST-27** | Session Management | `getUserSessions` lists active sessions; `revokeSessionById` revokes remote session | **PASS** |
| **AST-28** | Session Management | `revokeOtherSessions` revokes all other devices leaving current active | **PASS** |
| **AST-29** | Privilege Separation| Public phone verification strictly provisions `platform_role = 'user'`, never admin | **PASS** |
| **AST-30** | CSRF Protection | `csrfProtection` permits safe GET requests without tokens | **PASS** |
| **AST-31** | Anti-CSRF Header | `csrfProtection` permits state-changing POST when `X-NobatAra-Client` is provided | **PASS** |

