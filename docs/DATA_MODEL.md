# NobatAra — Relational Data Model & Schema Design

**Status:** PROPOSED (Phase 1 Specification)  
**Target Engine:** PostgreSQL 15+ / Cloud SQL  

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
