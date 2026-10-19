# NobatAra — Product Requirements Specification (PRD)

**Status:** PROPOSED (Phase 1 Specification — Awaiting User Review & Approval)  
**Version:** 1.0.0-PROPOSED  
**Governing Standard:** Production-Ready Multi-Tenant Beauty Reservation & Central Admin Platform  

---

## 1. Vision & Core Philosophy

NobatAra is a specialized, multi-tenant digital management and booking platform built specifically for Iranian beauty salons, barbershops, skin clinics, and nail studios.

### Core Tenets
1. **Zero Client-Side Settlement Friction**: Customer appointments are booked online with instant confirmation and settled **100% in-person at the salon** via POS (کارتخوان) or cash. No online payment gateway is required from customers for booking.
2. **B2B Subscription & Top-up Monetization**: Online payment gateways (Zarinpal, Mellat, Saman) are utilized exclusively by salon owners to purchase monthly/annual software subscriptions and purchase SMS notification credits.
3. **Multi-Tenant Privacy & Security**: Each salon's operational data, client contact numbers, financial totals, and staff calendars are strictly isolated. No salon can view another salon's data.
4. **Persian Cultural & Technical Ergonomics**: Full Persian RTL layout, Vazirmatn typography, Solar Hijri (شمسی) calendar integration, Persian phone number verification (`09xx`), and tabular Persian numerals.

---

## 2. Personas & Access Profiles

### Persona 1: Customer (مشتری سالن)
- **Profile**: A client seeking a beauty service (hair styling, nail care, facial, makeup, men's grooming) at a specific salon or discovering nearby salons.
- **Access Surface**: Public Web App (`/` or `/:salonSlug`). No password account required; authenticated via fast mobile OTP.
- **Key Goals**:
  - Browse salon portfolio, photos, ratings, verified badge, and exact address.
  - Explore services categorized with prices, duration, and staff specialists.
  - Pick a date and time slot with real availability.
  - Verify mobile number via 4-digit SMS OTP.
  - Receive an instant booking tracking code (`ARA-XXXX`), digital receipt, and confirmation SMS.
  - View and manage upcoming or past appointments via "My Bookings" (`/my-bookings`).

---

### Persona 2: Salon Manager & Staff (مدیر و پرسنل سالن)
- **Profile**: Salon owners, branch managers, receptionists, and independent stylists working within the salon.
- **Access Surface**: Salon Operations App (`/salon/app` or `/salon/login`). Accessible on mobile screens (Snapp/Digikala-style ergonomics) and desktop workstations.
- **Key Goals**:
  - Real-time daily dashboard: today's appointments, completed services, pending in-person settlements, and daily revenue.
  - Appointment queue management: change status (Confirmed -> In Progress -> Completed -> Cancelled), reschedule time slots, assign staff.
  - In-salon manual appointment creation (for walk-in or phone-in clients).
  - Salon showcase management: update banner, tagline, working hours, and Instagram/contact details.
  - Service & staff catalog management: add/edit services, set pricing, assign specialist staff.
  - QR Code generation for in-salon display (allowing walk-in customers to scan and book online).
  - Subscription & SMS credit renewal via Zarinpal / Shaparak gateway.

---

### Persona 3: Super Admin & Central Auditor (ادمین مرکزی و نظارت پلتفرم)
- **Profile**: Platform executives, system administrators, financial managers, and support auditors.
- **Access Surface**: Central Admin Console (`/admin` or `/admin/login`).
- **Key Goals**:
  - Global overview dashboard: total registered salons, active subscribers, MRR/ARR, SMS queue throughput, and server health.
  - Salon approvals & compliance: review business licenses, health cards, verify salon badges, or suspend delinquent accounts.
  - User administration: manage super admins, auditors, financial controllers, enforce 2FA, and ban malicious actors.
  - Financial monitoring: track B2B subscription payments, gateway tracking codes, and billing invoices.
  - SMS & Communication center: monitor Kavenegar/MelliSMS/FarazSMS queues, view delivery rates, retry failed messages, and manage SMS notification templates.
  - Security & audit center: review tamper-proof audit trails (actor, target, timestamp, IP, user-agent), active session terminations, and firewall IP blacklists.
  - Support ticket triage: communicate directly with salon managers to resolve technical, financial, or SMS inquiries.

---

## 3. High-Priority User Workflows & Acceptance Criteria

### Workflow 1: Customer Discovery & Booking (End-to-End)
```
[Select Salon] ➔ [Select Service] ➔ [Pick Specialist/Any] ➔ [Select Date & Time] ➔ [Enter Name & Phone] ➔ [Verify OTP] ➔ [Instant Confirmation & Receipt]
```
- **Acceptance Criteria**:
  - The booking modal prevents duplicate bookings for the same staff member at the same time slot.
  - Pricing is clearly displayed with in-person settlement guarantee.
  - Real SMS OTP is dispatched via server API with 120-second expiration and maximum 3 attempts per 10 minutes.
  - Once verified, the booking is permanently saved in the database with a unique tracking code (e.g. `GIS-4819`).
  - An automated confirmation SMS is queued for dispatch to both the customer and the salon manager.

---

### Workflow 2: Salon Daily Cashflow & Appointment Management
```
[Salon Login] ➔ [View Today's Queue] ➔ [Customer Arrives] ➔ [Mark Completed] ➔ [Confirm In-Person Settlement] ➔ [Stats Update Real-Time]
```
- **Acceptance Criteria**:
  - The manager can view all appointments for today, sorted chronologically.
  - Clicking an appointment opens a Snapp/Digikala-style bottom sheet with client details, phone call trigger, and service summary.
  - Tapping "تسویه حضوری و تکمیل خدمت" updates status to `completed`, records the in-person transaction in the salon's daily ledger, and prompts for an optional invoice SMS.
  - Tapping "لغو نوبت" prompts for a reason and automatically frees up the specialist's calendar slot.

---

### Workflow 3: Salon Subscription Purchase & SMS Top-Up (B2B Gateway)
```
[Select Plan / SMS Package] ➔ [Initiate Payment] ➔ [Redirect to Bank Gateway] ➔ [Bank Callback] ➔ [Verify Transaction] ➔ [Activate Plan / Top-up SMS]
```
- **Acceptance Criteria**:
  - The salon manager selects Bronze (490,000 T), Silver (890,000 T), or Gold VIP (1,590,000 T).
  - The server creates a payment intent with the Iranian payment gateway (Zarinpal/Mellat) and issues a redirect URL.
  - Upon callback verification (`Authority` & `Status=OK`), the server verifies the payment with the gateway and extends the salon's subscription expiry date.
  - A transaction record is created with tracking code, timestamp, and amount.

---

### Workflow 4: Super Admin Inspection & Salon Approval
```
[Admin Login] ➔ [Filter Salons: Pending] ➔ [Inspect Documentation] ➔ [Approve / Suspend] ➔ [Audit Log Auto-Recorded]
```
- **Acceptance Criteria**:
  - Pending salons appear with a warning badge in the sidebar and category tabs.
  - Admin reviews salon details, owner phone, address, and uploaded documents.
  - Clicking "تایید سالن" sets `status = 'active'`, grants `verifiedBadge = true`, and emits an audit log event.
  - An SMS is dispatched to the salon owner notifying them of their account activation.

---

## 4. Key Unresolved Product Decisions & Proposed Defaults

| Decision Area | Question / Ambiguity | Proposed Default (Subject to Review) |
| :--- | :--- | :--- |
| **Authentication Flow for Salon Managers** | Should salon managers use Password + 2FA or Passwordless SMS OTP? | **Proposed Default**: Mobile Phone + SMS OTP with optional Password & Authenticator App (TOTP) for high-tier salons. |
| **Database Technology** | Cloud SQL (PostgreSQL) relational vs. Document-based Firestore? | **Proposed Default**: PostgreSQL with relational tables (`salons`, `users`, `services`, `bookings`, `transactions`, `audit_logs`) to ensure strict transactional consistency and ACID compliance for salon bookings. |
| **Demo Mode Coexistence** | How should demo data coexist with production data? | **Proposed Default**: Explicit `DEMO_MODE=true` toggle in environment; when enabled, displays a clear "حالت نمایشی (Demo Mode)" banner, isolates mock fixtures from production tables, and allows simulated testing without spending real SMS/payment funds. |
| **Customer Cancellation Policy** | Can customers cancel their appointment online without calling the salon? | **Proposed Default**: Allow customer online cancellation up to 3 hours prior to the appointment; within 3 hours, require direct phone contact with the salon. |
| **SMS Gateway Provider** | Which Iranian SMS provider to prioritize? | **Proposed Default**: Kavenegar Pattern API (کاوه‌نگار پترن خدماتی) as primary with fallback to MelliSMS for non-blacklist delivery. |
