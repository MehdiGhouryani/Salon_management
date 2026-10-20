# NobatAra — System Architecture & Technical Design

**Status:** PROPOSED Architecture  
**Version:** 1.0.0-PROPOSED  

---

## 1. High-Level Architectural Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT TIER (React 19)                          │
├───────────────────────┬──────────────────────────────┬───────────────────────┤
│  Customer Web Portal  │   Salon Operations App       │  Super Admin Console  │
│  (Next-Gen Mobile Web)│   (Snapp / Digikala Style)   │  (Control Center)     │
└───────────┬───────────┴──────────────┬───────────────┴───────────┬───────────┘
            │                          │                           │
            │   HTTPS / JSON           │   Bearer JWT / Cookie     │   Bearer JWT + 2FA
            ▼                          ▼                           ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                    FULL-STACK SERVER RUNTIME (Express + Node.js)             │
├──────────────────────────────────────────────────────────────────────────────┤
│  Middleware Pipeline:                                                        │
│   - Rate Limiter (express-rate-limit)                                        │
│   - Security Headers (Helmet, CORS with whitelist)                           │
│   - Request Logger & Telemetry                                               │
│   - Auth Middleware (JWT Token Verification & Role-Based Access Control)     │
│   - Tenant Isolation Filter (req.tenantId = user.salonId)                    │
├──────────────────────────────────────────────────────────────────────────────┤
│  API Route Handlers:                                                         │
│   ├── /api/public/*         (Public salon discovery, catalog, slots)         │
│   ├── /api/auth/*           (OTP dispatch, OTP verify, password login, 2FA)  │
│   ├── /api/customer/*       (Client appointments, self-management)           │
│   ├── /api/salon/*          (Salon manager appointments, cashflow, staff)    │
│   ├── /api/admin/*          (Super admin platform governance & audit)        │
│   └── /api/integrations/*   (SMS webhooks, Bank payment callbacks)           │
├──────────────────────────────────────────────────────────────────────────────┤
│  Domain Service Layer:                                                       │
│   ├── BookingService        (Slot reservation, concurrency locks, state)     │
│   ├── SmsService            (Kavenegar / MelliSMS pattern dispatch)          │
│   ├── PaymentService        (Zarinpal / Shaparak B2B subscription gateway)   │
│   ├── AuditService          (Tamper-proof event trail recording)             │
│   └── SecurityService       (Session manager, IP blacklist firewall)         │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                          DATA PERSISTENCE TIER                               │
├──────────────────────────────────────────────────────────────────────────────┤
│  Relational Database (PostgreSQL / Cloud SQL):                               │
│   - Salons & Tenant metadata                                                 │
│   - Services & Staff assignments                                             │
│   - Bookings & Tracking codes (Unique constraints)                           │
│   - Users & Role-Based Permissions (RBAC)                                    │
│   - B2B Transactions & Invoices                                              │
│   - SMS Dispatch Queue & Status Logs                                         │
│   - Audit Logs & Active Sessions                                             │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Directory & Component Organization (Phase 3 Implemented Architecture)

The full-stack server architecture is established and verified in Phase 3:

```
├── server.ts                   # Root unified entry point (dev: Vite middleware, prod: static dist/ + API)
├── server/
│   ├── index.ts                # Server runner & graceful shutdown lifecycle
│   ├── app.ts                  # Express application factory & middleware composition
│   ├── config.ts               # Centralized configuration parser with fail-fast validation
│   ├── middleware/
│   │   ├── security.ts         # Security headers, CORS policy, sanitized HTTP logger
│   │   └── errorHandler.ts     # Centralized error handler & strict /api/* 404 handler
│   └── routes/
│       ├── index.ts            # Root API aggregator mounted under /api
│       └── health.ts           # GET /api/health/live and GET /api/health/ready
├── src/                        # React 19 Frontend
│   ├── components/             # Reusable UI components for 3 personas
│   ├── context/                # Client state management
│   ├── utils/                  # Environment & date formatting utilities
│   └── mock/                   # Explicitly tagged demo fixtures
└── docs/                       # Architecture, PRD, Security, and QA docs
```

---

## 3. Security Architecture & Threat Mitigation (Phase 5 Implemented)

1. **Authentication Architecture**:
   - Customer & Staff authentication: Phone-based cryptographic OTP issuing a 256-bit entropy session token (`nobatara_session`) stored hashed at rest (`SHA-256`) and transmitted via `HttpOnly`, `Path=/`, `SameSite=lax`, `Secure` (production) cookies.
   - Public registration strictly binds users to `platform_role = 'user'`.
   - Super admin authentication: Dedicated server session verification (`requirePlatformRole('super_admin')`). Bootstrapping initial super admin is restricted exclusively to CLI operator command (`scripts/bootstrapAdmin.ts`), never exposed over HTTP.
2. **Tenant Isolation Enforcement**:
   - Every `/api/salon/:salonId/*` route passes through `requireSalonMembership`, validating active membership in the target salon. Super admins have platform-wide governance override.
   - Staff operations pass through `requireSalonPermission` checking fine-grained permissions (e.g. `appointments:write`).
3. **Double-Booking & Concurrency Protection**:
   - A PostgreSQL unique constraint `UNIQUE (salon_id, staff_id, booking_date, booking_time)` prevents simultaneous booking of the same specialist.
4. **Rate Limiting & Anti-Bruteforce**:
   - `/api/auth/otp/request`: Enforces 60-second resend cooldown and 5 requests per 10 minutes limit.
   - `/api/auth/otp/verify`: Max 3 failed attempts before code invalidation; atomic single-use consumption (`consumed_at = NOW()`) prevents replay.
5. **CSRF & Origin Protection**:
   - `csrfProtection` middleware validates Origin/Referer or enforces custom anti-CSRF header (`X-NobatAra-Client`) on all state-changing requests (`POST`, `PUT`, `PATCH`, `DELETE`).

