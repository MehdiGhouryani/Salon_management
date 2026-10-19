# NobatAra — Known Issues, Risks & Architectural Gaps

**Audit Date:** 2026-10-19  
**Status:** Documented for Remediation  

---

## 1. High-Severity Security & Privacy Vulnerabilities

### ISSUE-SEC-01: Client-Side Persona Switching Grants Unrestricted Admin Access
- **Source Location:** `src/App.tsx:286-509`
- **Description:** The `MainSwitcher` component allows any visitor to switch the application state to `super_admin` or `salon_app` simply by clicking a button in the UI. There is no server validation, no password or OTP challenge, and no session token verification.
- **Impact:** Any public visitor can access platform administrative functions, view all salons' revenues, alter user permissions, ban users, and access system logs.
- **Remediation Plan (Phase 2 & 5):** Contain the persona switcher strictly as an explicit **Interactive Demo Switcher** with a prominent visual badge when `DEMO_MODE=true`. In production mode, route personas to `/admin/login`, `/salon/login`, and public salon storefront URLs with server-validated session cookies / JWT headers.

---

### ISSUE-SEC-02: Client-Side Mock OTP with Predictable/Bypassed Code
- **Source Location:** `src/components/customer/BookingModal.tsx:154-173`
- **Description:** Customer phone verification executes entirely in the user's browser. The verification code is generated via `Math.floor(1000 + Math.random() * 9000)`, displayed openly in a notification toast, and accepts the static code `1234` unconditionally.
- **Impact:** Spoofed bookings can be submitted under arbitrary phone numbers without the phone owner's knowledge or consent.
- **Remediation Plan (Phase 2 & 7):** Create a secure server-side OTP generation and verification route (`/api/auth/otp/send` and `/api/auth/otp/verify`). Hash codes in memory/database with rate limiting (max 3 attempts, 120-second TTL), and send real SMS only when configured. In demo mode, clearly label the preview OTP.

---

### ISSUE-SEC-03: Plaintext API Keys & Merchant Credentials Exposed in Frontend Component
- **Source Location:** `src/components/views/SettingsView.tsx:23-26`
- **Description:** `SettingsView.tsx` hardcodes sample Kavenegar API keys and Zarinpal Merchant IDs into client state variables with a "Show Keys" button.
- **Impact:** Storing real credentials in client code leaks third-party provider accounts and creates catastrophic financial and communication compromise.
- **Remediation Plan (Phase 2 & 3):** All credentials must reside strictly on the server in `.env` or cloud secret managers. The client UI must only display masked indicators (`kav_***...3D`) and status checks (`Configured / Not Configured`).

---

### ISSUE-SEC-04: Multi-Tenant Data Leakage Across Salons
- **Source Location:** `src/components/views/SalonAppView.tsx:58-79`, `src/context/AdminContext.tsx:151`
- **Description:** The Salon Manager App selects the active salon via `currentSalonSlug` stored in global React state. Any user in the salon manager role can inspect and manipulate any other salon's appointments, revenues, and staff.
- **Impact:** Complete breach of tenant confidentiality between competing salon businesses.
- **Remediation Plan (Phase 4 & 5):** Enforce strict tenant isolation on the backend. When a salon manager authenticates, their verified session must bind to `req.user.salonId`. Every query must filter by `where salon_id = :authenticatedSalonId`.

---

## 2. Architectural & Data Persistence Gaps

### ISSUE-ARCH-01: Zero Data Persistence (Ephemeral React Memory)
- **Source Location:** `src/context/AdminContext.tsx:1-876`
- **Description:** All data (salons, bookings, transactions, users, logs) is stored in React `useState`. Any page refresh or browser restart completely wipes all newly created bookings, updated statuses, and configuration changes, resetting to `initialData.ts`.
- **Impact:** Cannot be deployed as a functioning product.
- **Remediation Plan (Phase 3 & 4):** Deploy a full-stack Node.js Express server (`server.ts`) with persistent database storage (PostgreSQL / SQLite / Cloud SQL / Firestore) and transactional data repositories.

---

### ISSUE-ARCH-02: Missing Server Entry Point and Background Worker
- **Source Location:** `package.json:6-12`
- **Description:** The app uses `"dev": "vite --port=3000 --host=0.0.0.0"`. `express` is listed in dependencies but is not invoked in any development script.
- **Impact:** No backend API routes (`/api/*`) can be served.
- **Remediation Plan (Phase 3):** Implement `server.ts` running Express, mounting Vite dev middleware (`vite.middlewares`) during development and static files in production, with `"dev": "tsx server.ts"`.

---

### ISSUE-ARCH-03: False Success Feedback on Infrastructure Operations
- **Source Location:** `src/context/AdminContext.tsx:664-691`
- **Description:** Actions like `flushRedisCache` and `runSystemDiagnostic` merely mutate local state variables (`setMetrics(...)`) and show a success toast claiming "FLUSHALL executed" even though no Redis or server infrastructure exists.
- **Impact:** Violates the non-negotiable rule: *"Never claim that a message was sent, a setting was saved, a server action succeeded, or data was persisted unless the real operation confirms it."*
- **Remediation Plan (Phase 2 & 9):** Replace false simulated ops with actual server health probes or explicit "Simulated Environment Mode" badges.

---

## 3. UI/UX & Responsive Observations

### ISSUE-UX-01: Floating Switcher Stacking Context on Ultra-Small Displays (<360px)
- **Source Location:** `src/App.tsx:334-364`
- **Description:** While the mobile floating pill switcher collapses cleanly at 375px-430px, on viewports narrower than 360px it can occasionally sit near bottom navigation bars.
- **Remediation Plan (Phase 11):** Ensure strict safe-area-inset and z-index layering with a drag/reposition affordance or complete tucking behind a hamburger menu.
