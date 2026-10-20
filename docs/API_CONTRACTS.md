# NobatAra — API Contracts & REST Schema Specification

**Status:** PROPOSED (Phase 1 Specification)  
**Base URL:** `/api/v1`  
**Content-Type:** `application/json; charset=utf-8`  

---

## 1. Public Storefront & Booking Endpoints (`/api/public/*`)

### `GET /api/public/salons/:slugOrId`
Fetches complete public salon profile, service catalog, active specialists, and weekly working hours.

**Response `200 OK`**:
```json
{
  "success": true,
  "salon": {
    "id": "sal-101",
    "slug": "gisara",
    "name": "سالن زیبایی و عروس گیس‌آرا",
    "tagline": "مرکز تخصصی عروس، رنگ، لایت و خدمات VIP زیبایی در محیطی آرام و مجلل",
    "city": "تهران (زعفرانیه)",
    "address": "خیابان آصف، مجتمع تجاری رویال، طبقه ۳، واحد ۳۰۲",
    "phone": "02122001122",
    "rating": 4.9,
    "reviewsCount": 348,
    "bannerImage": "https://images.unsplash.com/photo-1560066984-138dadb4c035",
    "features": ["پارکینگ اختصاصی", "پذیرایی و نوشیدنی رایگان VIP", "اینترنت پرسرعت وایرلس"],
    "verifiedBadge": true,
    "workingHours": [
      { "dayOfWeek": 0, "dayName": "شنبه", "openTime": "09:30", "closeTime": "20:00", "isClosed": false }
    ],
    "services": [
      {
        "id": "srv-1",
        "name": "رنگ و هایلایت تخصصی مو",
        "category": "hair",
        "price": 2400000,
        "durationMinutes": 180,
        "description": "استفاده از متریال بدون آمونیاک به همراه اولاپلکس تراپی"
      }
    ],
    "staff": [
      {
        "id": "stf-1",
        "name": "ندا سلطانی",
        "role": "متخصص ارشد رنگ و لایت",
        "rating": 4.95,
        "specialty": "رنگ و هایلایت"
      }
    ]
  }
}
```

---

### `GET /api/public/salons/:slugOrId/availability`
Calculates available non-overlapping booking slots for a requested service duration and date.

**Query Parameters**:
- `serviceId`: Required service UUID/ID
- `date`: Requested booking date (e.g. `1403/08/24` or ISO `YYYY-MM-DD`)
- `staffId`: Optional specialist ID (if omitted, slots available across any active specialist are checked)

**Response `200 OK`**:
```json
{
  "success": true,
  "serviceId": "srv-1",
  "serviceName": "رنگ و هایلایت تخصصی مو",
  "durationMinutes": 180,
  "date": "1403/08/24",
  "dayName": "شنبه",
  "isClosed": false,
  "availableSlots": [
    {
      "time": "10:00",
      "endTime": "13:00",
      "staffId": "stf-1",
      "staffName": "ندا سلطانی"
    }
  ]
}
```

---

### `POST /api/public/bookings`
Atomically records a verified booking. Client-supplied price and ID parameters are ignored; server enforces authoritative DB price, validates service duration, and applies atomic row lock and advisory mutex to eliminate double-booking even across parallel concurrent requests.

**Headers**: `Content-Type: application/json`, `X-NobatAra-Client: web`  
**Request Payload**:
```json
{
  "salonId": "sal-101",
  "serviceId": "srv-1",
  "staffId": "stf-1",
  "bookingDate": "1403/08/24",
  "bookingTime": "10:00",
  "clientName": "سارا تهرانی",
  "clientPhone": "۰۹۱۲۳۴۵۶۷۸۹",
  "otpCode": "123456",
  "notes": "اولین مراجعه حضوری"
}
```

**Response `201 Created`**:
```json
{
  "success": true,
  "message": "نوبت با موفقیت ثبت شد.",
  "booking": {
    "id": "apt-8921",
    "trackingCode": "GIS-8921",
    "salonId": "sal-101",
    "salonName": "سالن زیبایی و عروس گیس‌آرا",
    "serviceName": "رنگ و هایلایت تخصصی مو",
    "staffName": "ندا سلطانی",
    "date": "1403/08/24",
    "time": "10:00",
    "endTime": "13:00",
    "durationMinutes": 180,
    "price": 2400000,
    "status": "confirmed",
    "clientName": "سارا تهرانی",
    "clientPhone": "09123456789"
  }
}
```

**Response `409 Conflict`**:
```json
{
  "error": "SLOT_ALREADY_TAKEN",
  "message": "متاسفانه این سانس زمانی قبلا توسط مراجع دیگری رزرو شده است. لطفا زمان دیگری انتخاب فرمایید."
}
```

---

### `GET /api/public/my-bookings`
Returns customer appointments strictly scoped to the verified phone number extracted from the authenticated session cookie (`nobatara_session`).

**Response `200 OK`**:
```json
{
  "success": true,
  "clientPhone": "09123456789",
  "count": 1,
  "bookings": [
    {
      "id": "apt-8921",
      "trackingCode": "GIS-8921",
      "salonName": "سالن زیبایی و عروس گیس‌آرا",
      "serviceName": "رنگ و هایلایت تخصصی مو",
      "staffName": "ندا سلطانی",
      "date": "1403/08/24",
      "time": "10:00",
      "price": 2400000,
      "status": "confirmed"
    }
  ]
}
```

---

### `POST /api/public/bookings/:trackingCode/cancel`
Cancels an appointment. Requires caller to be the verified owner of the appointment (checked against authenticated session phone number). Automatically releases the time slot for new bookings.

**Headers**: `X-NobatAra-Client: web`  
**Response `200 OK`**:
```json
{
  "success": true,
  "message": "نوبت شما با موفقیت لغو شد و زمان آزاد گردید.",
  "appointmentId": "apt-8921",
  "status": "cancelled"
}
```

---

---

## 1. Authentication & Session Endpoints (`/api/auth/*`)

### `POST /api/auth/otp/request`
Initiates a cryptographic phone OTP challenge with rate limiting and anti-bruteforce safeguards.

**Headers**: `X-NobatAra-Client: web`  
**Request Payload**:
```json
{
  "phone": "09121112233",
  "purpose": "login"
}
```
*Purpose options:* `'login'`, `'booking_verification'`, `'admin_step_up'`

**Response `200 OK`**:
```json
{
  "success": true,
  "message": "کد تایید پیامک شد.",
  "phone": "09121112233",
  "resendAvailableInSeconds": 60,
  "expiresInSeconds": 120
}
```

**Response `429 Too Many Requests`**:
```json
{
  "error": "OTP_REQUEST_FAILED",
  "message": "لطفا پیش از درخواست مجدد پیامک، 48 ثانیه صبر کنید.",
  "resendAvailableInSeconds": 48
}
```

---

### `POST /api/auth/otp/verify`
Verifies the cryptographic OTP, consumes it atomically, provisions customer identity (strictly `platform_role = 'user'`), and establishes a persistent 256-bit session token returned in an `HttpOnly` cookie.

**Headers**: `X-NobatAra-Client: web`  
**Request Payload**:
```json
{
  "phone": "09121112233",
  "code": "482190",
  "purpose": "login"
}
```

**Response `200 OK`**:
*Sets Cookie:* `nobatara_session=<64-hex-token>; Path=/; HttpOnly; SameSite=Lax; Max-Age=1209600`
```json
{
  "success": true,
  "message": "ورود با موفقیت انجام شد.",
  "user": {
    "id": "usr-uuid-here",
    "phone": "09121112233",
    "fullName": "کاربر 2233",
    "platformRole": "user",
    "status": "active"
  },
  "sessionExpiresAt": "2026-11-03T12:00:00.000Z"
}
```

---

### `GET /api/auth/me`
Retrieves currently authenticated session profile and salon memberships from server context.

**Response `200 OK` (Authenticated)**:
```json
{
  "authenticated": true,
  "user": {
    "id": "usr-uuid-here",
    "phone": "09121112233",
    "fullName": "کاربر 2233",
    "email": null,
    "platformRole": "user",
    "status": "active",
    "twoFactorEnabled": false
  },
  "salonMemberships": [
    {
      "salonId": "sal-101",
      "role": "manager",
      "status": "active",
      "permissions": ["appointments:read", "appointments:write"]
    }
  ]
}
```

---

### `POST /api/auth/logout`
Revokes the current server session and clears the `nobatara_session` cookie.

**Headers**: `X-NobatAra-Client: web`  
**Response `200 OK`**:
```json
{
  "success": true,
  "message": "با موفقیت از سامانه خارج شدید."
}
```

---

### `GET /api/auth/sessions`
Lists all active sessions for the authenticated user (omits secret token hashes).

**Response `200 OK`**:
```json
{
  "success": true,
  "currentSessionId": "sess-uuid-1",
  "sessions": [
    {
      "id": "sess-uuid-1",
      "ipAddress": "127.0.0.1",
      "userAgent": "Mozilla/5.0 ...",
      "sessionType": "web",
      "createdAt": "2026-10-20T10:00:00.000Z",
      "lastActiveAt": "2026-10-20T10:15:00.000Z",
      "expiresAt": "2026-11-03T10:00:00.000Z",
      "isCurrent": true
    }
  ]
}
```

---

### `POST /api/auth/sessions/:sessionId/revoke`
Revokes a specific session remotely.

**Response `200 OK`**:
```json
{
  "success": true,
  "message": "نشست با موفقیت باطل شد."
}
```

---

### `POST /api/auth/sessions/revoke-others`
Revokes all other active sessions for the user except the current one.

**Response `200 OK`**:
```json
{
  "success": true,
  "revokedCount": 2,
  "message": "2 نشست دیگر با موفقیت باطل شدند."
}
```

---

## 2. Customer Booking Endpoints

### `POST /api/v1/customer/bookings`
Creates a confirmed appointment with in-person settlement.

**Headers**: `Authorization: Bearer <token>`  
**Request Payload**:
```json
{
  "salonId": "sal-101",
  "serviceId": "srv-1",
  "staffId": "stf-1",
  "clientName": "سارا تهرانی",
  "clientPhone": "09121112233",
  "bookingDate": "1403/08/24",
  "bookingTime": "10:30",
  "notes": "اولاپلکس تراپی انجام شود"
}
```

**Response `201 Created`**:
```json
{
  "success": true,
  "data": {
    "id": "bk-1730000000",
    "trackingCode": "GIS-8921",
    "status": "confirmed",
    "paymentMethod": "in_person",
    "price": 2400000,
    "salonName": "سالن زیبایی و عروس گیس‌آرا",
    "serviceName": "رنگ و هایلایت تخصصی مو",
    "staffName": "ندا سلطانی",
    "date": "1403/08/24",
    "time": "10:30",
    "createdAt": "2026-10-19T08:15:00Z"
  }
}
```

---

## 3. Salon Manager Endpoints (`/api/salon/:salonId/*` - Tenant Scoped)

Require active salon membership (`owner`, `manager`, `staff`) for the specified `salonId`. All state-changing requests enforce CSRF protection and record audit logs.

### `GET /api/salon/:salonId/dashboard/overview`
Calculates operational metrics, day capacity usage, collected/pending revenues, and urgent pending actions for the target date.

**Query Parameters**: `date` (e.g. `1403/08/25`)  
**Response `200 OK`**:
```json
{
  "success": true,
  "date": "1403/08/25",
  "metrics": {
    "todayAppointmentsCount": 8,
    "activeBookingsCount": 7,
    "completedCount": 3,
    "confirmedCount": 4,
    "pendingCount": 1,
    "cancelledCount": 1,
    "noShowCount": 0,
    "totalCollectedRevenue": 7200000,
    "pendingCollectionRevenue": 9600000,
    "totalEstimatedRevenue": 16800000,
    "maxCapacitySlots": 12,
    "capacityUsagePercent": 58,
    "isClosedToday": false,
    "workingHours": "09:30 الی 20:00"
  },
  "urgentActions": [
    {
      "appointmentId": "apt-8921",
      "trackingCode": "GIS-8921",
      "clientName": "پریناز معتمدی",
      "clientPhone": "09121112233",
      "bookingTime": "16:00",
      "price": 680000,
      "action": "نیازمند تایید مدیر سالن"
    }
  ]
}
```

---

### `GET /api/salon/:salonId/appointments`
Lists tenant appointments filtered by `date`, `staffId`, `status`, or `search` string.

**Query Parameters**: `status`, `date`, `staffId`, `search`  
**Response `200 OK`**:
```json
{
  "success": true,
  "count": 1,
  "appointments": [
    {
      "id": "apt-8921",
      "tracking_code": "GIS-8921",
      "salon_id": "sal-101",
      "service_id": "srv-101",
      "staff_id": "stf-101",
      "client_name": "سارا تهرانی",
      "client_phone": "09121112233",
      "booking_date": "1403/08/25",
      "booking_time": "10:30",
      "end_time": "13:30",
      "price": 2400000,
      "status": "confirmed",
      "payment_method": "in_person"
    }
  ]
}
```

---

### `POST /api/salon/:salonId/appointments`
Manual walk-in / phone booking creation by receptionist/manager. Validates service, staff, normalized phone number, and prevents overlapping time slots.

**Request Payload**:
```json
{
  "clientName": "شیما نوری",
  "clientPhone": "۰۹۱۲۳۳۳۴۴۵۵",
  "serviceId": "srv-101",
  "staffId": "stf-101",
  "bookingDate": "1403/08/25",
  "bookingTime": "14:00",
  "notes": "ثبت تلفنی"
}
```

**Response `201 Created`**:
```json
{
  "success": true,
  "message": "نوبت حضوری با موفقیت در سیستم ثبت گردید.",
  "appointment": {
    "id": "apt-9901",
    "tracking_code": "MAN-4182",
    "status": "confirmed",
    "price": 2400000
  }
}
```

---

### `PATCH /api/salon/:salonId/appointments/:appointmentId/status`
Updates appointment status (`confirmed`, `completed`, `cancelled`, `no_show`) with state transition validation and audit trail.

**Request Payload**:
```json
{
  "status": "completed",
  "reason": "تسویه کامل با کارتخوان در سالن"
}
```

---

### `PATCH /api/salon/:salonId/appointments/:appointmentId/reschedule`
Reschedules appointment date, time, or specialist while enforcing time slot overlap checks.

**Request Payload**:
```json
{
  "bookingDate": "1403/08/26",
  "bookingTime": "16:00",
  "staffId": "stf-102"
}
```

---

### `GET` / `POST` / `PATCH` / `DELETE /api/salon/:salonId/services`
Catalog service operations (`manage_services` permission required for mutations). Price >= 0 and duration_minutes > 0 enforced on server.

---

### `GET` / `POST` / `PATCH` / `POST /services /api/salon/:salonId/staff`
Specialist management and service mapping (`manage_staff` permission required for mutations).

---

### `GET` / `PUT /api/salon/:salonId/working-hours` & `POST` / `DELETE /api/salon/:salonId/exceptions`
Weekly operating schedule and holiday/leave calendar exceptions (`manage_settings` permission required).

---

## 4. Super Admin Endpoints

### `GET /api/v1/admin/overview`
Platform health, registered salons, subscriber count, and SMS queue status.

### `PATCH /api/v1/admin/salons/:id/status`
Approve or suspend a salon account.

**Request Payload**:
```json
{
  "status": "active",
  "verifiedBadge": true,
  "reason": "مدارک جواز کسب و کارت بهداشت احراز شد"
}
```
