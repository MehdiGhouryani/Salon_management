# NobatAra — Salon Operational API Contract (Phase 10)

**Status:** IMPLEMENTED & TESTED
**Base URL:** `/api/salon/:salonId`
**Auth:** session cookie (`nobatara_session`) or Bearer token. Every route passes the
router-level tenant gate `requireSalonMembership('owner','manager','staff')`; per-route
permissions use `requireSalonPermission(...)`. All state mutations are CSRF-protected
(`X-NobatAra-Client` header or same-origin). All errors follow the shared contract
`{ "success": false, "error": CODE, "message": "…" }` with correct HTTP status.

**Tenant safety:** every query and mutation is scoped by `salon_id`; cross-salon access
returns `403 FORBIDDEN_SALON_ACCESS`; related entities (staff/service/appointment)
are validated to belong to the salon before use.

**Pagination:** list endpoints accept `limit` (1–200, default 50) and `offset` and
return `{ items..., total, limit, offset }` — never unbounded.

---

## 1. Salon profile

| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/profile` | membership | salon record incl. public storefront fields |
| PATCH | `/profile` | `manage_settings` | tagline, phone, address, city, bannerImage, galleryImages, features (audit-logged) |

Business status changes (`active/suspended/...`) are super-admin only
(`PUT /api/admin/salons/:id/status`) and never exposed to the salon panel.

## 2. Services

| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/services` | membership | `?includeInactive=true` |
| POST | `/services` | `manage_services` | name/category/price≥0/duration>0/description/isActive |
| PATCH | `/services/:serviceId` | `manage_services` | partial update + archive via `isActive:false` |
| DELETE | `/services/:serviceId` | `manage_services` | soft-deactivate (preserves appointment history) |

## 3. Staff

| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/staff` | membership | staff roster |
| POST | `/staff` | `manage_staff` | name/phone/role/specialty/avatarUrl/rating/isActive |
| PATCH | `/staff/:staffId` | `manage_staff` | partial update incl. `isActive:false` (deactivation) |
| POST | `/staff/:staffId/services` | `manage_staff` | assign service (+custom price/duration) |
| DELETE | `/staff/:staffId/services/:serviceId` | `manage_staff` | unassign — `404 ASSIGNMENT_NOT_FOUND` if absent |

## 4. Schedule

| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/working-hours` | membership | `{ workingHours (salon-level), staffHours[], exceptions }` |
| PUT | `/working-hours` | `manage_settings` | replaces salon-level weekly hours (transactional) |
| PUT | `/working-hours/staff/:staffId` | `manage_settings` | replaces ONE staff member's weekly hours (transactional); `404 STAFF_NOT_FOUND` for foreign staff; validates day 0–6 (Saturday-first) and `HH:MM` |
| POST | `/exceptions` | `manage_settings` | holiday / time-off / break (`start_time/end_time` optional ⇒ timed break) |
| DELETE | `/exceptions/:exceptionId` | `manage_settings` | removes exception |

## 5. Appointments

| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/appointments` | membership | filters: `status, date, staffId, search, from, to`; pagination `limit/offset`; response `{ appointments, total, limit, offset }` |
| GET | `/appointments/:appointmentId` | membership | single appointment (tenant-scoped) |
| POST | `/appointments` | `manage_calendar` | manual booking — SAME engine as public booking (schedule rules, eligibility, past-date policy, advisory lock); returns 201 `{ appointment, trackingCode }` |
| PATCH | `/appointments/:appointmentId/status` | `manage_calendar` | transition map enforced — `409 INVALID_STATUS_TRANSITION` for terminal states |
| PATCH | `/appointments/:appointmentId/reschedule` | `manage_calendar` | single reschedule engine: rules + advisory lock + overlap inside the transaction |

**Transition map:** `pending → confirmed|cancelled|no_show`,
`confirmed → completed|cancelled|no_show`, `completed/cancelled/no_show` are terminal.

## 6. Customers

| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/customers` | membership | `?search=&limit=&offset=`; salon-scoped (`salon_clients`); response `{ customers, total, limit, offset, piiRestricted }` |
| GET | `/customers/:clientId` | membership | `404 CUSTOMER_NOT_FOUND` when the client is not linked to this salon |

**PII policy:** owners/managers see full contact data (phone/email/notes).
Staff/receptionist see name + masked phone (`0936****02`), `email/notes: null`,
and `piiRestricted: true`. Records come only from real bookings of this salon —
cross-salon customer records are unreachable by construction.

## 7. Operational dashboard

| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/dashboard/overview` | membership | `?date=YYYY-MM-DD` (Jalali accepted); returns today's counts, revenue, capacity, `urgentActions`, and `upcomingAppointments` (next 10 from Tehran-now, pending/confirmed only) |

## 8. Settings

Persisted business configuration = salon profile fields (see 1) + schedule (see 4).
Notification-provider settings are NOT persisted in the current schema; the SMS
gateway is server-side configuration (`KAVENEGAR_API_KEY`), never a salon-panel
setting. No fake success responses are emitted for unimplemented settings.

---

## Example: paginated customer list (owner)

```http
GET /api/salon/sal-101/customers?search=0936&limit=1&offset=0
Authorization: Bearer <session-token>
X-NobatAra-Client: web
```

```json
{
  "success": true,
  "customers": [
    {
      "id": "cli-…",
      "fullName": "مشتری نمونه دو",
      "phone": "09362000002",
      "email": null,
      "notes": null,
      "totalBookings": 1,
      "totalSpent": 2400000,
      "lastVisitAt": "2026-11-12T20:00:00.000Z"
    }
  ],
  "total": 2,
  "limit": 1,
  "offset": 0,
  "piiRestricted": false
}
```

## Example: staff weekly hours (owner)

```http
PUT /api/salon/sal-101/working-hours/staff/stf-101
Content-Type: application/json
X-NobatAra-Client: web
```

```json
{ "hours": [ { "dayOfWeek": 0, "startTime": "09:00", "endTime": "17:00", "isClosed": false } ] }
```

→ `200 { "success": true, "workingHours": [ … ] }`

## Error codes (salon operations)

`FORBIDDEN_SALON_ACCESS` (403) · `FORBIDDEN_SALON_PERMISSION` (403) ·
`SALON_NOT_FOUND` / `SERVICE_NOT_FOUND` / `STAFF_NOT_FOUND` /
`CUSTOMER_NOT_FOUND` / `ASSIGNMENT_NOT_FOUND` / `APPOINTMENT_NOT_FOUND` (404) ·
`INVALID_HOURS_FORMAT` / `INVALID_HOURS_ENTRY` / `INVALID_HOURS_RANGE` /
`INVALID_BOOKING_DATE` / `INVALID_BOOKING_TIME` / `INVALID_DATE` /
`MISSING_REQUIRED_FIELDS` / `MISSING_BOOKING_FIELDS` / `INVALID_PHONE` /
`INVALID_CLIENT_NAME` / `STAFF_NOT_ELIGIBLE_FOR_SERVICE` /
`PAST_DATE_NOT_ALLOWED` / `PAST_TIME_NOT_ALLOWED` /
`WORKING_HOURS_NOT_CONFIGURED` / `SALON_CLOSED` / `SCHEDULE_EXCEPTION_BLOCKED` /
`OUTSIDE_WORKING_HOURS` / `SLOT_ALREADY_TAKEN` / `SLOT_UNAVAILABLE` /
`DUPLICATE_BOOKING` / `INVALID_STATUS_TRANSITION` (409) /
`APPOINTMENT_NOT_CANCELLABLE` (409) / `BOOKING_GRANT_INVALID` /
`BOOKING_GRANT_EXPIRED` / `BOOKING_GRANT_ALREADY_USED` / `GRANT_PHONE_MISMATCH`
(401/403) · `RATE_LIMITED` (429) · `DATABASE_UNAVAILABLE` (503)
