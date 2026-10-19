# NobatAra — Architectural Decision Records (ADRs)

**Audit Date:** 2026-10-19  
**Status:** Approved & Proposed Records  

---

## ADR-01: Full-Stack Express Server with Vite Dev Middleware

- **Context**: The existing prototype runs on client-side Vite. To support secure authentication, session management, OTP verification, database persistence, and payment callbacks, a backend server is required.
- **Decision**: Introduce a top-level Node.js Express server (`server.ts`) running on port 3000. In development mode, mount `vite.middlewares` so that frontend HMR and backend APIs run under a unified process and port.
- **Consequences**: Avoids CORS complexities in development, provides a single endpoint for production builds, and strictly complies with the runtime environment constraints.

---

## ADR-02: Relational Data Model (PostgreSQL / Cloud SQL)

- **Context**: Salon appointments require strict concurrency guarantees (avoiding double booking of specialists), financial transaction auditing, and foreign key constraints linking staff, services, and customers.
- **Decision**: Adopt a relational schema with tables: `salons`, `users`, `salon_services`, `salon_staff`, `bookings`, `transactions`, `sms_queue`, `audit_logs`, and `security_sessions`.
- **Consequences**: Guarantees ACID compliance, transactional integrity on booking confirmations, and strict index-backed tenant filtering (`salon_id`).

---

## ADR-03: Explicit Separation of Demo Mode from Production Mode

- **Context**: The current repository has extensive mock fixtures and an interactive client-side persona switcher. Evolving this into production without losing the ability to test or demonstrate all three personas requires careful separation.
- **Decision**: Introduce an explicit environment variable `VITE_DEMO_MODE=true` (or `APP_ENV=demo`).
  - When in Demo Mode: The floating persona switcher is displayed with an explicit "حالت آزمایشی (Demo Mode)" banner, mock fixtures are available for testing, and simulated OTPs are displayed in toasts.
  - When in Production Mode: The floating persona switcher is completely disabled. Each persona has its dedicated authenticated route (`/`, `/salon/login`, `/admin/login`).
- **Consequences**: Prevents security bypasses in production while preserving seamless UI testing and client presentations.

---

## ADR-04: 100% In-Person Settlement for Customer Bookings

- **Context**: Iranian beauty salon customers prefer settling appointments in person via the salon's POS terminal (دستگاه کارتخوان) after inspecting the service quality. Mandatory online prepayment increases friction and drop-off rates.
- **Decision**: Keep customer bookings 100% in-person settlement (`paymentMethod: 'in_person'`). Online payment gateways (Zarinpal, Mellat) are used strictly for salon B2B software subscriptions and SMS credit recharges.
- **Consequences**: Maximizes booking conversion, eliminates customer online refund disputes, and aligns with operational reality in Iranian salons.

---

## ADR-05: Visual Posture & Semantic Design Tokens

- **Context**: Visual identity needs to balance a modern, high-contrast operational aesthetic with Persian cultural luxury.
- **Decision**: Establish deep navy (`#0B1120` canvas, `#111B2E` surface, `#344258` borders, `#F43F7A` primary accent) as the default dark theme posture, while maintaining a smooth light theme toggle (`#F8FAFC` canvas, `#FFFFFF` surface) via CSS variables. Strict zero-pill typography for metadata with `·` separators, and `tabular-nums` for all numbers.
- **Consequences**: WCAG AA accessibility compliance, zero eye strain in dark environments, and distinctive brand aesthetics.
