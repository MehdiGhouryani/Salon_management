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

## 2. Directory & Component Organization

When the full-stack server is established (Phase 3), the repository will follow this clean, modular architecture:

```
├── server/
│   ├── server.ts               # Express entry point & Vite middleware mounting
│   ├── config/                 # Environment variables & runtime constants
│   ├── middleware/             # Auth, RBAC, tenant isolation, rate limiting
│   ├── routes/                 # Express API routes grouped by persona & domain
│   │   ├── auth.routes.ts
│   │   ├── public.routes.ts
│   │   ├── salon.routes.ts
│   │   ├── admin.routes.ts
│   │   └── webhooks.routes.ts
│   ├── services/               # Business logic (Booking, SMS, Payment, Audit)
│   ├── db/                     # Database client, migrations, and schema
│   │   ├── schema.ts           # Drizzle / ORM relational schema definition
│   │   └── client.ts           # Database connection pool
│   └── utils/                  # Server-side hashing, crypto, OTP generators
├── src/                        # React 19 Frontend
│   ├── components/
│   │   ├── common/             # Header, Sidebar, Modals, ThemeToggle, Toasts
│   │   ├── customer/           # SalonWebsiteView, BookingModal, Receipts
│   │   └── views/              # Super admin views & SalonAppView
│   ├── context/                # ThemeContext, AuthContext, AdminContext
│   ├── types/                  # Shared TypeScript interfaces & API contracts
│   ├── utils/                  # Persian date/numeral formatters
│   └── mock/                   # Demo fixtures strictly used in DEMO_MODE
└── docs/                       # Architecture, PRD, Security, and QA docs
```

---

## 3. Security Architecture & Threat Mitigation

1. **Authentication Architecture**:
   - Customer authentication: Stateless SMS OTP issuing a temporary JWT (`role: 'customer'`, `phone: '09...'`, expires in 30 days).
   - Salon manager authentication: Phone + OTP or Password issuing an HTTP-only secure cookie or Authorization Bearer header (`role: 'salon_admin'`, `salonId: '...'`).
   - Super admin authentication: Strict 2FA (TOTP / SMS) issuing short-lived admin tokens (`role: 'super_admin'`).
2. **Tenant Isolation Enforcement**:
   - Every `/api/salon/*` route passes through `requireSalonAuth` which extracts `salonId` from the cryptographically verified session token.
   - Any query to the database must include `WHERE salon_id = :salonId`. It is architecturally impossible for a salon manager to pass an arbitrary `salonId` in request parameters to access another salon's records.
3. **Double-Booking & Concurrency Protection**:
   - A PostgreSQL unique constraint `UNIQUE (salon_id, staff_id, booking_date, booking_time)` prevents simultaneous booking of the same specialist.
4. **Rate Limiting & Anti-Bruteforce**:
   - `/api/auth/otp/send`: Limited to 3 requests per 10 minutes per IP and phone number.
   - `/api/auth/otp/verify`: Max 3 attempts before code invalidation.
