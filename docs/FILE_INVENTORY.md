# NobatAra — File Inventory & Component Directory

**Audit Date:** 2026-10-19  
**Status:** Verified Baseline  

## 1. Project Root & Configuration Files

| File | Purpose | Modification Plan in Roadmap |
| :--- | :--- | :--- |
| `index.html` | HTML entry point, Persian typography (Vazirmatn), meta tags | Retain & ensure PWA meta tags & title consistency |
| `package.json` | Dependencies, devDependencies, and scripts | Update dev script in Phase 3 to mount full-stack `server.ts` (`tsx server.ts`) |
| `vite.config.ts` | Vite configuration with `@tailwindcss/vite` and `@vitejs/plugin-react` | Retain port 3000 & alias setup |
| `tsconfig.json` | TypeScript configuration | Retain strict ES2022 setup |
| `metadata.json` | AI Studio applet metadata | Retain application name & description |
| `.gitignore` | Git exclusion rules | Ensure `node_modules`, `dist`, `.env` are excluded |

---

## 2. Core Application Shell & Providers

| File | Purpose | Roadmap Role |
| :--- | :--- | :--- |
| `src/main.tsx` | React 19 DOM Root Mount | Entry mount |
| `src/App.tsx` | App shell, Persona router, Admin category tabs | In Phase 2: Decouple demo switcher from real authentication |
| `src/context/ThemeContext.tsx` | Theme state (light / dark) with CSS class synchronization | Retain; provides tokens |
| `src/context/AdminContext.tsx` | Monolithic application state & in-memory CRUD operations | In Phase 3-5: Transition from purely mock state to server-backed data layer with client fallback for demo mode |
| `src/types/admin.ts` | Central TypeScript interfaces & enums | Evolve with strict API response contracts and DB schema types |
| `src/index.css` | Tailwind v4 import, custom theme variables, scrollbar styling | Centralized design tokens |
| `src/utils/formatters.ts` | Persian numbers, currency, date, and masking utilities | Retain & expand for ISO-8601 to Jalali conversion |

---

## 3. Mock Data Layer (Phase 0 Baseline)

| File | Purpose | Roadmap Role |
| :--- | :--- | :--- |
| `src/mock/initialData.ts` | Static fixtures for salons, users, transactions, dispatch messages, audit logs, and tickets | Isolate strictly as Demo Seed fixtures (`DEMO_MODE=true` only) |
| `src/mock/salonDirectoryData.ts` | Static fixtures for salon services, staff, working hours, and banner presets | Isolate as initial seed data for database migrations |

---

## 4. Persona 1: Customer Reservation Website

| File | Purpose | Roadmap Role |
| :--- | :--- | :--- |
| `src/components/customer/SalonWebsiteView.tsx` | Public salon landing page, category chips, service search | Connect to `/api/salons/:slug` public endpoint |
| `src/components/customer/BookingModal.tsx` | 3-step booking flow (Service -> Time -> OTP -> Done) | Replace client-side OTP with real `/api/auth/otp` and `/api/bookings` |
| `src/components/customer/BookingReceiptModal.tsx` | Digital booking receipt & QR modal | Connect to verified booking confirmation |
| `src/components/customer/CustomerSiteDrawer.tsx` | Mobile side drawer for salon info and active booking lookup | Retain responsive drawer behavior |
| `src/components/customer/MyBookingsDrawer.tsx` | Client active/past booking history drawer | Fetch authenticated client bookings |
| `src/components/common/SalonQrModal.tsx` | Salon QR code display for quick scanning | Retain |

---

## 5. Persona 2: Salon Manager App

| File | Purpose | Roadmap Role |
| :--- | :--- | :--- |
| `src/components/views/SalonAppView.tsx` | All-in-one salon operations app: daily cashflow, queue, bottom sheets, showcase editing, and plan upgrade | Enforce authenticated salon admin session; isolate competitor data |

---

## 6. Persona 3: Super Admin Console

| File | Purpose | Roadmap Role |
| :--- | :--- | :--- |
| `src/components/views/OverviewView.tsx` | Platform KPIs, system health indicators, quick action cards | Connect to `/api/admin/metrics` and live summaries |
| `src/components/views/BusinessesView.tsx` | Salons management table, approval/suspension workflows | Connect to `/api/admin/salons` |
| `src/components/views/UsersView.tsx` | User list, role management, 2FA toggle | Connect to `/api/admin/users` |
| `src/components/views/SubscriptionsView.tsx` | Plan tiers, pricing, B2B payment history | Connect to `/api/admin/subscriptions` |
| `src/components/views/MessagesView.tsx` | SMS dispatch queue, retry failed messages, message templates | Connect to `/api/admin/sms/queue` |
| `src/components/views/OperationsView.tsx` | System metrics, Redis cache flush, diagnostic checks | Connect to `/api/admin/system/diagnostics` |
| `src/components/views/SecurityView.tsx` | Audit logs, active session termination, IP firewall blacklist | Connect to `/api/admin/security` |
| `src/components/views/SettingsView.tsx` | System maintenance mode, broadcast banner | Secure credentials server-side; strip client secrets |
| `src/components/views/SalonSimulatorView.tsx` | Companion simulator embedded in the admin panel | Retain as an admin preview tool |

---

## 7. Common Reusable UI Components

| File | Purpose | Roadmap Role |
| :--- | :--- | :--- |
| `src/components/common/Header.tsx` | Admin header with breadcrumbs, command palette trigger, notifications, and theme toggle | Retain |
| `src/components/common/Sidebar.tsx` | Admin sidebar with badge counters and collapsible state | Retain |
| `src/components/common/CommandPalette.tsx` | Global command search (`Ctrl+K`) | Retain |
| `src/components/common/ShortcutsModal.tsx` | Keyboard shortcut help modal | Retain |
| `src/components/common/ThemeToggle.tsx` | Segmented and icon theme switchers | Retain |
| `src/components/common/ToastContainer.tsx` | Toast notification container with auto-dismiss | Retain |
| `src/components/common/ConfirmModal.tsx` | Reusable confirmation modal for dangerous actions | Retain |
