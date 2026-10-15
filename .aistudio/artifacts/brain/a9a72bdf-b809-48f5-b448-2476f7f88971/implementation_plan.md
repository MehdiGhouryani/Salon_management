# NobatAra — Full-Platform UI/UX & Dark Design System Optimization

Audit and implement a full-platform dark design system overhaul and operational UX refinement for NobatAra across all three core personas (**Super Admin Panel**, **Salon Manager App**, and **Customer Website**).

> [!IMPORTANT] Critical Decisions Confirmed in Phase 1
> - **Confirmed Color System**: Primary canvas set to deep navy (`#0B1120`), card surfaces to slate navy (`#111B2E`), elevated hover states to `#18243A`, and borders to `#344258`. Brand primary accent is Rose (`#F43F7A` / `rose-500`).
> - **Confirmed Theme Posture**: Deep navy dark mode set as the default posture across all personas, while retaining a smooth, token-synchronized light mode toggle (`#F4F4F5` canvas) via CSS variables/Tailwind dark class.
> - **Zero-Pill & Persian Discipline**: Metadata is rendered as clean unboxed typography with `·` separators. All dates, times, prices, and mobile numbers strictly use tabular figures (`tabular-nums font-mono`). Tracking codes removed in favor of prominent date/time displays.

---

## 1. Overview & Core Concept

**NobatAra** is a multi-persona Iranian beauty salon reservation and management platform. This overhaul transforms the entire application into a cohesive, high-contrast, accessible, and operational-grade experience.

- **Super Admin Console**: Operational health, salon approvals, subscription management, SMS gateway dispatch monitoring, security logs, and support ticket management.
- **Salon Manager Mobile App**: Daily cashflow settlement, queue management, in-person booking creation/rescheduling via Snapp/Digikala style bottom sheets, QR code generation, and website showcase settings.
- **Customer Reservation Site**: Hero showcase, interactive category & service discovery, specialist selection, friction-free booking drawer, and client booking receipts.

---

## 2. User Experience & Visual Design

### Visual Identity & Theme Tokens
Centralize CSS custom variables and Tailwind utilities in `src/index.css` and theme context:

```css
:root {
  /* Light Mode Tokens */
  --canvas: #F4F4F5;
  --surface: #FFFFFF;
  --surface-hover: #F1F5F9;
  --border: #E2E8F0;
  --text-primary: #0F172A;
  --text-secondary: #64748B;
  --accent: #F43F7A;
  --success: #10B981;
  --warning: #F59E0B;
  --error: #EF4444;
}

.dark {
  /* Dark Mode Tokens */
  --canvas: #0B1120;
  --surface: #111B2E;
  --surface-hover: #18243A;
  --border: #344258;
  --text-primary: #E7ECF5;
  --text-secondary: #9AAAC2;
  --accent: #F43F7A;
  --success: #34D399;
  --warning: #FBBF24;
  --error: #FB7185;
}
```

### Layout & Component Refinement
1. **Header & Navigation**: Clean 3-zone contract with single-line wordmark, contextual breadcrumbs, quick global command palette trigger (`Ctrl+K`), shortcuts trigger (`?`), and persona switcher.
2. **Dashboard Cards & Tables**: Single-level card elevation, compact 40px table row heights with left-aligned text and right-aligned tabular numerals (`font-mono tabular-nums`).
3. **Snapp / Digikala Style Bottom Sheets**: Drag-handle affordances, quick service selection chips, staff selection, quick time slots, and direct client call/SMS actions in the Salon Manager App.
4. **RTL & Persian Polish**: Directional icons (`ChevronLeft`/`ChevronRight`), Persian digit formatting, and proper text wrapping.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Centralized CSS Variables + Tailwind Tokens**
  - *Chosen Approach*: Map background, surface, border, and text tokens to CSS variables so changing theme toggle instantly updates every view without hardcoded inline hex codes.
  - *Why*: Eliminates color fragmentation across 25+ view components while ensuring WCAG AA contrast compliance (4.5:1 text contrast).

- **Decision 2: Snapp/Digikala Mobile Bottom Sheets for Appointments**
  - *Chosen Approach*: Interactive slide-up bottom sheets for booking creation, detail inspection, and time rescheduling in `SalonAppView`.
  - *Why*: Aligns with standard Iranian mobile app UX (Snapp/Digikala), making salon management effortless on mobile devices.

---

## 4. Technical Architecture & Component Mapping

```
┌────────────────────────────────────────────────────────────────────────┐
│                        NOBATARA APP SHELL                             │
│       ThemeContext (Dark #0B1120 Default) | AdminContext (State & CRUD)│
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
      ┌────────────────────────────┼────────────────────────────┐
      ▼                            ▼                            ▼
┌─────────────┐            ┌─────────────┐            ┌─────────────────┐
│ SUPER ADMIN │            │  SALON APP  │            │ CUSTOMER SITE   │
├─────────────┤            ├─────────────┤            ├─────────────────┤
│ Sidebar /   │            │ Cashflow /  │            │ Elevated Hero / │
│ Header /    │            │ Queue List /│            │ Category Filter/│
│ Dashboard / │            │ Bottom      │            │ Service Cards / │
│ Salons /    │            │ Sheets      │            │ Drawer Menu &   │
│ Dispatch    │            │ (Snapp UX)  │            │ Booking Modal   │
└─────────────┘            └─────────────┘            └─────────────────┘
```

### Phased Execution Steps
- **Phase A (Audit & Cleaning)**: Verify current view components (`OverviewView`, `BusinessesView`, `UsersView`, `SubscriptionsView`, `MessagesView`, `SupportView`, `OperationsView`, `SecurityView`, `SettingsView`, `SalonAppView`, `SalonWebsiteView`).
- **Phase B (Token System)**: Update `src/index.css` with centralized design tokens (`#0B1120`, `#111B2E`, `#18243A`, `#344258`, `#E7ECF5`, `#9AAAC2`, `#F43F7A`).
- **Phase C (Full-Platform Overhaul)**: Update view components to consume semantic color classes and tabular numbers.
- **Phase D (RTL, Keyboard & Accessibility)**: Verify `focus-visible` rings, RTL directions, shortcut modal, command palette, and mobile responsiveness.
- **Phase E (Verification & Build)**: Run `lint_applet` and `compile_applet`.
