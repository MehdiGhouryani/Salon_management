# NobatAra — API Contracts & REST Schema Specification

**Status:** PROPOSED (Phase 1 Specification)  
**Base URL:** `/api/v1`  
**Content-Type:** `application/json; charset=utf-8`  

---

## 1. Public Endpoints (Unauthenticated)

### `GET /api/v1/public/salons/:slug`
Fetches public salon storefront, service catalog, verified status, and working hours.

**Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "id": "sal-101",
    "slug": "gisara",
    "name": "سالن زیبایی و عروس گیس‌آرا",
    "category": "سالن تخصصی عروس، رنگ و زیبایی VIP",
    "city": "تهران (زعفرانیه)",
    "address": "خیابان آصف، مجتمع تجاری رویال، طبقه ۳",
    "phone": "02122001122",
    "verifiedBadge": true,
    "rating": 4.9,
    "reviewCount": 348,
    "workingHours": "۹:۳۰ الی ۲۰:۰۰ (همه‌روزه)",
    "bannerUrl": "https://images.unsplash.com/photo-1560066984-138dadb4c035",
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
        "rating": 4.95
      }
    ]
  }
}
```

---

### `POST /api/v1/public/auth/otp/send`
Dispatches a 4-digit verification code to the customer's mobile phone.

**Request Payload**:
```json
{
  "phone": "09121112233"
}
```

**Response `200 OK`**:
```json
{
  "success": true,
  "message": "کد تایید ارسال گردید",
  "expiresInSeconds": 120
}
```

---

### `POST /api/v1/public/auth/otp/verify`
Verifies OTP code and returns client auth token.

**Request Payload**:
```json
{
  "phone": "09121112233",
  "code": "4821"
}
```

**Response `200 OK`**:
```json
{
  "success": true,
  "token": "jwt_token_here",
  "client": {
    "phone": "09121112233",
    "verifiedAt": "2026-10-19T08:00:00Z"
  }
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

## 3. Salon Manager Endpoints (Tenant-Scoped)

### `GET /api/v1/salon/appointments`
Returns queue of appointments for the authenticated salon.

**Headers**: `Authorization: Bearer <salon_token>`  
**Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "appointments": [
      {
        "id": "bk-1730000000",
        "trackingCode": "GIS-8921",
        "clientName": "سارا تهرانی",
        "clientPhone": "09121112233",
        "serviceName": "رنگ و هایلایت تخصصی مو",
        "staffName": "ندا سلطانی",
        "date": "1403/08/24",
        "time": "10:30",
        "price": 2400000,
        "status": "confirmed",
        "paymentMethod": "in_person"
      }
    ],
    "dailyStats": {
      "todayCompletedCount": 4,
      "todayConfirmedCount": 6,
      "totalCollected": 4800000,
      "pendingCollection": 6200000
    }
  }
}
```

### `PATCH /api/v1/salon/appointments/:id/status`
Updates appointment status (e.g. mark completed after in-person payment).

**Request Payload**:
```json
{
  "status": "completed",
  "paymentMethod": "in_person"
}
```

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
