# NobatAra — Relational Data Model & Schema Design

**Status:** IMPLEMENTED (Phase 4 — `server/db/migrations/001_initial_schema.sql`)  
**Target Engine:** PostgreSQL 14+ / Cloud SQL for PostgreSQL  

---

## 1. Entity-Relationship Diagram (ERD Overview)

```
┌──────────────────┐       ┌──────────────────────┐       ┌──────────────────┐
│      salons      │1     *│    salon_services    │       │   salon_staff    │
├──────────────────┼───────┼──────────────────────┤       ├──────────────────┤
│ id (PK)          │       │ id (PK)              │       │ id (PK)          │
│ slug (UQ)        │       │ salon_id (FK)        │       │ salon_id (FK)    │
│ name             │       │ name                 │       │ name             │
│ status           │       │ price                │       │ role             │
│ plan             │       │ duration_minutes     │       │ rating           │
└────────┬─────────┘       └──────────┬───────────┘       └────────┬─────────┘
         │1                           │1                           │1
         │                            │                            │
         │*                           │*                           │*
┌────────┴────────────────────────────┴────────────────────────────┴─────────┐
│                                 bookings                                   │
├────────────────────────────────────────────────────────────────────────────┤
│ id (PK)                                                                    │
│ tracking_code (UQ)                                                         │
│ salon_id (FK)                                                              │
│ service_id (FK)                                                            │
│ staff_id (FK)                                                              │
│ client_name, client_phone                                                  │
│ booking_date, booking_time                                                 │
│ price, payment_method ('in_person')                                        │
│ status ('confirmed', 'completed', 'cancelled')                             │
│ created_at, updated_at                                                     │
│ CONSTRAINT: UNIQUE (salon_id, staff_id, booking_date, booking_time)        │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Table Specifications & DDL

### Table: `salons`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | PRIMARY KEY | Unique UUID or prefixed string (`sal-101`) |
| `slug` | `VARCHAR(64)` | UNIQUE, NOT NULL | URL-safe slug (`gisara`, `kazhal`) |
| `name` | `VARCHAR(255)` | NOT NULL | Official Persian salon name |
| `category` | `VARCHAR(128)` | NOT NULL | Specialization category |
| `owner_name` | `VARCHAR(128)` | NOT NULL | Full name of salon owner |
| `phone` | `VARCHAR(20)` | NOT NULL | Contact telephone |
| `email` | `VARCHAR(255)` | NOT NULL | Contact email |
| `province` | `VARCHAR(64)` | NOT NULL | Iranian province (e.g. تهران) |
| `city` | `VARCHAR(128)` | NOT NULL | City & neighborhood |
| `address` | `TEXT` | NOT NULL | Full street address |
| `status` | `VARCHAR(32)` | NOT NULL, DEFAULT 'pending' | `active`, `pending`, `suspended`, `trial` |
| `plan` | `VARCHAR(32)` | NOT NULL, DEFAULT 'bronze' | `bronze`, `silver`, `gold_vip` |
| `plan_expiry` | `TIMESTAMP` | NOT NULL | Subscription expiration date |
| `verified_badge` | `BOOLEAN` | NOT NULL, DEFAULT FALSE | Whether licensed & verified |
| `created_at` | `TIMESTAMP` | NOT NULL, DEFAULT NOW() | Registration timestamp |

---

### Table: `salon_services`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | PRIMARY KEY | Service UUID |
| `salon_id` | `VARCHAR(36)` | REFERENCES `salons(id)` ON DELETE CASCADE | Parent salon |
| `name` | `VARCHAR(128)` | NOT NULL | Service title (e.g. کاشت ناخن) |
| `category` | `VARCHAR(64)` | NOT NULL | Category slug (`hair`, `nail`, `skin`, `makeup`) |
| `price` | `BIGINT` | NOT NULL | Price in Tomans (تومان) |
| `duration_minutes` | `INT` | NOT NULL, DEFAULT 60 | Duration in minutes |
| `description` | `TEXT` | NULL | Detail of service & materials used |

---

### Table: `bookings`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | PRIMARY KEY | Booking UUID |
| `tracking_code` | `VARCHAR(32)` | UNIQUE, NOT NULL | Customer tracking code (e.g. `GIS-8921`) |
| `salon_id` | `VARCHAR(36)` | REFERENCES `salons(id)` ON DELETE RESTRICT | Salon booked |
| `service_id` | `VARCHAR(36)` | REFERENCES `salon_services(id)` | Service requested |
| `staff_id` | `VARCHAR(36)` | REFERENCES `salon_staff(id)` | Assigned specialist |
| `client_name` | `VARCHAR(128)` | NOT NULL | Customer full name |
| `client_phone` | `VARCHAR(20)` | NOT NULL | Customer mobile (`09...`) |
| `booking_date` | `VARCHAR(32)` | NOT NULL | Persian or ISO date string |
| `booking_time` | `VARCHAR(10)` | NOT NULL | Time string (`10:30`) |
| `price` | `BIGINT` | NOT NULL | Total amount payable in person |
| `payment_method`| `VARCHAR(32)` | NOT NULL, DEFAULT 'in_person' | Always `in_person` |
| `status` | `VARCHAR(32)` | NOT NULL, DEFAULT 'confirmed' | `confirmed`, `completed`, `cancelled` |
| `notes` | `TEXT` | NULL | Special customer instructions |
| `created_at` | `TIMESTAMP` | NOT NULL, DEFAULT NOW() | Booking timestamp |

**Unique Concurrency Constraint**:
```sql
ALTER TABLE bookings ADD CONSTRAINT uq_staff_slot 
UNIQUE (salon_id, staff_id, booking_date, booking_time);
```
This guarantees no specialist can ever be double-booked at the same minute.

---

### Table: `audit_logs`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | PRIMARY KEY | Log UUID |
| `actor` | `VARCHAR(128)` | NOT NULL | Actor name |
| `actor_role` | `VARCHAR(64)` | NOT NULL | Actor role |
| `action` | `VARCHAR(128)` | NOT NULL | Action description |
| `target` | `VARCHAR(128)` | NOT NULL | Entity affected |
| `ip_address` | `VARCHAR(45)` | NOT NULL | IPv4 / IPv6 address |
| `user_agent` | `TEXT` | NOT NULL | Browser and OS signature |
| `severity` | `VARCHAR(32)` | NOT NULL | `info`, `warning`, `critical` |
| `category` | `VARCHAR(64)` | NOT NULL | `auth`, `privilege`, `business`, `financial`, `system` |
| `details` | `TEXT` | NULL | Complete JSON payload / metadata |
| `created_at` | `TIMESTAMP` | NOT NULL, DEFAULT NOW() | Exact event timestamp |

---

## 3. Phase 5 Authentication & Session Tables

### Table: `otp_challenges` (Migration 002)
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | PRIMARY KEY, DEFAULT `gen_random_uuid()` | Challenge UUID |
| `phone` | `VARCHAR(20)` | NOT NULL | Canonical Iranian mobile (`09xxxxxxxxx`) |
| `purpose` | `VARCHAR(32)` | NOT NULL, DEFAULT 'login', CHECK (`login`, `booking_verification`, `admin_step_up`) | Purpose binding |
| `code_hash` | `VARCHAR(64)` | NOT NULL | HMAC-SHA256 hash of OTP code with secret key |
| `attempts` | `INT` | NOT NULL, DEFAULT 0, CHECK (`attempts >= 0`) | Number of failed verification tries |
| `max_attempts` | `INT` | NOT NULL, DEFAULT 3, CHECK (`max_attempts > 0`) | Max allowed attempts before invalidation |
| `resend_available_at`| `TIMESTAMPTZ` | NOT NULL | 60-second resend cooldown threshold |
| `expires_at` | `TIMESTAMPTZ` | NOT NULL | 120-second hard TTL |
| `consumed_at`| `TIMESTAMPTZ` | NULL | Timestamp when verified; prevents replay |
| `ip_address` | `VARCHAR(45)` | NOT NULL | Requester IP address |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | Challenge creation time |

Indices:
- `idx_otp_challenges_phone_purpose ON (phone, purpose, created_at DESC)`
- `idx_otp_challenges_expires_at ON (expires_at)`

---

### Table: `user_sessions` (Migrations 001, 002, 003)
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | PRIMARY KEY, DEFAULT `gen_random_uuid()` | Session UUID |
| `user_id` | `UUID` | REFERENCES `users(id)` ON DELETE CASCADE | Associated authenticated user |
| `token_hash`| `VARCHAR(64)`| UNIQUE, NOT NULL | SHA-256 one-way hash of raw 256-bit token |
| `ip_address`| `VARCHAR(45)`| NOT NULL | Client IP on session establishment |
| `user_agent`| `TEXT` | NOT NULL | Client User-Agent string |
| `expires_at`| `TIMESTAMPTZ` | NOT NULL | Absolute expiration (14 days from issue) |
| `idle_expires_at` | `TIMESTAMPTZ` | NOT NULL | Inactivity timeout (2 hours, sliding window) |
| `revoked_at`| `TIMESTAMPTZ` | NULL | Timestamp when revoked/logged out |
| `revocation_reason` | `VARCHAR(64)` | NULL | Reason: `user_requested`, `revoked_other_devices`, etc. |
| `session_type` | `VARCHAR(32)` | NOT NULL, DEFAULT 'web', CHECK (`web`, `mobile`, `api`) | Session type |
| `last_active_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | Last request timestamp |
| `created_at`| `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | Session creation timestamp |

Indices:
- `idx_user_sessions_token_hash ON (token_hash)`
- `idx_user_sessions_user_active ON (user_id, revoked_at, expires_at)`
- `idx_user_sessions_expires_at ON (expires_at)`
- `idx_user_sessions_idle ON (idle_expires_at)`

