# NobatAra — Phase 0: Baseline Repository & Architectural Audit

**Audit Date:** 2026-10-19  
**Status:** Completed (Read-Only Analysis)  
**Lead Auditor:** Principal Software Architect, Security Engineer, Product Designer & QA Lead  
**Verification Command Output:**
- `compile_applet`: Build succeeded (`vite build` finished cleanly).
- `lint_applet` (`tsc --noEmit`): Completed successfully with 0 errors.

---

## 1. Executive Summary

NobatAra is a multi-persona platform for Iranian beauty salons, barbershops, and aesthetic clinics. The current codebase contains a rich, high-fidelity React 19 frontend prototype styled with Tailwind CSS v4 and Framer Motion / Motion v12, featuring three distinct application personas:
1. **Customer Reservation Website (`SalonWebsiteView.tsx`)**: Salon showcase, category/service catalog, staff selection, interactive booking modal with step-by-step wizard, in-person settlement indicators, and printable/digital reservation receipts.
2. **Salon Manager Mobile/Desktop App (`SalonAppView.tsx`)**: Daily cashflow tracking, appointment queue management, manual booking entry, client communication triggers, Snapp/Digikala-style bottom sheet drawers, QR code generation, and subscription package upgrades.
3. **Super Admin Management Console (`App.tsx`, `OverviewView.tsx`, `BusinessesView.tsx`, etc.)**: Platform health metrics, salon approvals/suspensions, user role & 2FA administration, SMS dispatch queue monitoring, audit log viewing, active session management, firewall IP blacklisting, and support ticket triage.

### Critical Baseline Finding
While the frontend UI is feature-complete and visually refined in Persian RTL with dual light/dark themes (`#0B1120` dark posture default), the application is currently **100% client-side in-memory mock architecture**:
- **No Backend Persistence**: Express is declared in `package.json` (`express: ^4.21.2`), but there is no running `server.ts` or database connection. All state lives inside `AdminContext.tsx` in React `useState` hooks initialized from static fixtures in `src/mock/initialData.ts` and `src/mock/salonDirectoryData.ts`. A browser page refresh resets all state.
- **Critical Security Exposure — Client-Side Persona Switching**: The floating pill switcher (`MainSwitcher` in `src/App.tsx:286-509`) allows any unauthenticated visitor to toggle freely between the customer site, salon manager portal, and super admin console with full administrative privileges.
- **Client-Side OTP Simulation**: In `src/components/customer/BookingModal.tsx:154-173`, the customer SMS verification code is generated directly in the browser (`Math.floor(1000 + Math.random() * 9000)`), displayed in a client toast message, and accepts hardcoded bypass code `1234`.
- **Exposed Placeholder Secret Keys**: In `src/components/views/SettingsView.tsx:23-26`, placeholder API credentials (Kavenegar API key, Zarinpal merchant ID, Saman terminal ID) are embedded in client component state with an unmask toggle.
- **Non-Standard Dev Runner**: `package.json` currently uses `"dev": "vite --port=3000 --host=0.0.0.0"`. In this environment, full-stack Express + Vite middleware architectures require `"dev": "tsx server.ts"`.

---

## 2. Inventory of Current Capabilities & Source Code

| File Path | Role / Domain | Lines | Current State / Dependencies |
| :--- | :--- | :--- | :--- |
| `src/App.tsx` | Main Layout & Persona Switcher | 557 | Houses top navigation, 5 main category selectors, and the floating/modal 3-persona switcher. |
| `src/context/AdminContext.tsx` | Global Application State | 876 | Monolithic React Context holding salons, users, transactions, messages, audit logs, sessions, and bookings. |
| `src/context/ThemeContext.tsx` | Theme Provider | 72 | Manages light/dark mode with `localStorage` persistence and `data-theme` HTML attribute synchronization. |
| `src/types/admin.ts` | TypeScript Data Contracts | 193 | Full type definitions for Salon, User, Plan, Transaction, DispatchMessage, SupportTicket, AuditLog, and CustomerBooking. |
| `src/mock/initialData.ts` | Static Platform Fixtures | 779 | Initial mock fixtures for 8 salons, 8 users, 3 subscription tiers, transactions, dispatch messages, audit logs, and tickets. |
| `src/mock/salonDirectoryData.ts` | Static Salon Directory | 415 | Detailed services, staff, working hours, and luxury banner presets for salons. |
| `src/components/customer/SalonWebsiteView.tsx` | Persona 1: Customer Portal | 465 | Public storefront, hero section, service category filters, search bar, and booking triggers. |
| `src/components/customer/BookingModal.tsx` | Booking Wizard | 640 | 3-step modal (Service/Staff -> Date/Time -> Phone/OTP -> Confirm). |
| `src/components/customer/BookingReceiptModal.tsx` | Booking Confirmation | 230 | Receipt modal with tracking code, QR display, and print/save actions. |
| `src/components/customer/CustomerSiteDrawer.tsx` | Mobile Navigation Drawer | 240 | Side drawer for salon information, hours, location, and client booking lookups. |
| `src/components/customer/MyBookingsDrawer.tsx` | Customer Appointment Drawer | 185 | Lists active/past appointments for the verified phone session. |
| `src/components/views/SalonAppView.tsx` | Persona 2: Salon Manager App | 1646 | Comprehensive mobile/desktop salon app: daily cashflow, queue management, bottom sheets, showcase editor, and plan upgrade. |
| `src/components/views/OverviewView.tsx` | Persona 3: Super Admin Overview | 250 | High-level KPI metric cards, revenue trends, platform alerts, and quick actions. |
| `src/components/views/BusinessesView.tsx` | Super Admin: Salons Directory | 350 | Table view of registered salons, approval/suspension workflows, and inspection modal. |
| `src/components/views/UsersView.tsx` | Super Admin: User & RBAC | 310 | Table view of staff and admins, 2FA toggle, ban/unban, and role escalation. |
| `src/components/views/SubscriptionsView.tsx` | Super Admin: Financials | 320 | Pricing plan management, subscription transactions, and revenue tracking. |
| `src/components/views/MessagesView.tsx` | Super Admin: SMS Gateway | 280 | SMS dispatch queue, retry failed messages, and template editor. |
| `src/components/views/OperationsView.tsx` | Super Admin: System Ops | 240 | Real-time mock metrics (CPU, RAM, DB QPS, Redis hit rate) and cache flushing. |
| `src/components/views/SecurityView.tsx` | Super Admin: Security Audit | 335 | Security event logs, active sessions termination, and IP firewall blacklisting. |
| `src/components/views/SettingsView.tsx` | Super Admin: System Config | 174 | System maintenance toggle, broadcast announcements, and gateway settings. |
| `src/components/views/SalonSimulatorView.tsx` | Super Admin: Companion View | 180 | Embedded iframe-like preview of the salon manager app inside the admin panel. |
| `src/components/common/Header.tsx` | Super Admin Header Contract | 273 | Breadcrumb navigation, quick search shortcut (`Ctrl+K`), alerts popover, and theme switcher. |
| `src/components/common/Sidebar.tsx` | Super Admin Navigation Sidebar | 340 | Collapsible desktop and mobile drawer navigation with badge counters. |
| `src/components/common/CommandPalette.tsx` | Global Quick Navigation | 210 | Keyboard-accessible command palette for instant navigation across all views and entities. |
| `src/components/common/ShortcutsModal.tsx` | Keyboard Shortcuts Legend | 120 | Displays hotkeys (`Ctrl+K`, `1-9`, `?`, `Esc`). |
| `src/components/common/ThemeToggle.tsx` | Theme Switcher Component | 95 | Provides segmented and icon variants for switching light/dark mode. |
| `src/components/common/ToastContainer.tsx` | Centralized Notifications | 85 | Stacked toast notifications with undo actions. |
| `src/utils/formatters.ts` | Localization & Persian Utils | 95 | Number to Persian digit conversion, currency formatting, and date formatting. |
| `src/index.css` | Global Styling & CSS Tokens | 175 | Tailwind CSS v4 setup, `@custom-variant dark`, CSS color variables, and custom scrollbars. |

---

## 3. Security & Threat Model Findings

1. **Authorization Bypass (Critical)**:
   - Client can set `persona = 'super_admin'` by clicking the floating pill or dispatching `setPersona('super_admin')`.
   - Actions like `approveSalon`, `suspendSalon`, `banUser`, and `flushRedisCache` execute directly without backend validation or JWT token checks.
2. **Authentication Spoofing (High)**:
   - Customer OTP verification in `BookingModal.tsx` is completely insecure:
     - Client generates the code locally.
     - Toast exposes the OTP code to anyone viewing the screen.
     - Hardcoded static bypass code `1234` exists in code.
3. **Secret Credential Exposure (High)**:
   - `SettingsView.tsx` displays fake/sample API keys in plain text on the client.
   - Any sensitive operational tokens must live strictly in server-side environment variables and never be sent to the browser.
4. **Data Isolation & Tenant Integrity (High)**:
   - Salon managers can switch between salons via a dropdown (`currentSalonSlug`), giving any salon manager full visual and operational access to competitors' revenues, appointments, and client lists.
   - Production must strictly isolate salon data based on verified authenticated session tokens with tenant ID constraints.

---

## 4. UI/UX, Design System, & Responsiveness Findings

1. **Theme Posture & Contrast**:
   - Deep navy (`#0B1120` canvas, `#111B2E` surface, `#344258` border, `#E7ECF5` primary text) is properly configured in `src/index.css`.
   - Brand primary accent is Rose (`#F43F7A` / `#E11D48`).
   - Light mode is available via CSS variable toggling with `#F8FAFC` / `#F4F4F5` canvas.
2. **Persian Localization & Typography**:
   - Vazirmatn and Plus Jakarta Sans are linked in `index.html`.
   - All digits in financial, date, and appointment cards use `tabular-nums` and Persian conversion utilities (`src/utils/formatters.ts`).
3. **Mobile Ergonomics**:
   - Collapsible floating action button (FAB) implemented in `src/App.tsx:334-364` prevents the persona switcher from blocking booking buttons on mobile viewports.
   - Touch targets for primary CTAs conform to the 44px-48px minimum height guideline.

---

## 5. Verification Commands Executed

```bash
# Compilation check
compile_applet
# Output: Build succeeded - the applet is compiled

# Type-checking and lint verification
lint_applet
# Output: tsc --noEmit completed with 0 errors
```

---

## 6. Phase 0 Acceptance Criteria & Status

- [x] Read-only audit conducted across all components, styles, types, and mock fixtures.
- [x] Zero application source code modified in Phase 0.
- [x] Verified build and type check cleanly pass on initial state.
- [x] Confirmed security risks identified and documented with source line references.
- [x] Baseline file inventory and known issues cataloged in dedicated documentation files.

**Phase 0 Decision: PASS (GO FOR PROPOSED PHASE 1)**
