# NobatAra — Production Deployment, Runtime & Rollback Guide

**Audit Date:** 2026-10-19  
**Status:** Operational Deployment Standard  

---

## 1. Environment Configuration (`.env.example`)

```bash
# Server & Environment
PORT=3000
NODE_ENV=production
APP_URL=https://nobatara.ir
VITE_DEMO_MODE=false

# Security & Sessions
JWT_SECRET=your_super_secret_jwt_key_at_least_32_characters
SESSION_EXPIRY_DAYS=30

# Database Configuration (PostgreSQL / Cloud SQL)
DATABASE_URL=postgres://user:password@localhost:5432/nobatara_db
DB_SSL=true

# Iranian SMS Gateway (Kavenegar / MelliSMS)
KAVENEGAR_API_KEY=your_kavenegar_api_key_here
KAVENEGAR_SENDER_LINE=10008585
SMS_OTP_TEMPLATE=nobatara-otp
SMS_CONFIRM_TEMPLATE=nobatara-confirmed

# B2B Iranian Payment Gateways (Zarinpal / Mellat)
ZARINPAL_MERCHANT_ID=your_zarinpal_merchant_uuid_here
ZARINPAL_SANDBOX=false
MELLAT_TERMINAL_ID=
MELLAT_USERNAME=
MELLAT_PASSWORD=
```

---

## 2. Build & Runtime Execution

### Development Runtime
```bash
# Full-stack execution with Vite middlewares mounted in Express
npm run dev
# Command executed: tsx server.ts
```

### Production Build & Launch
```bash
# 1. Clean previous build artifacts
npm run clean

# 2. Compile frontend assets into /dist
npm run build

# 3. Launch production server
npm start
# Command executed: node dist/server.js (or tsx server.ts)
```

---

## 3. Rollback & Disaster Recovery Procedures

1. **Database Rollbacks**:
   - Each migration file has a strictly matching `down()` migration.
   - Automated daily snapshots configured at 03:00 AM IRST.
2. **Graceful Degradation**:
   - If Kavenegar SMS experiences downtime, the system automatically falls back to secondary provider MelliSMS or FarazSMS without halting booking creations.
   - If the database is under maintenance, a maintenance page is served with `503 Service Unavailable` headers.
