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

# 2. Compile frontend assets into dist/
npm run build

# 3. Launch production server
npm start
# Command executed: node server.ts (respects PORT and serves dist/)
```

---

## 3. API Health Endpoints & Probes

| Endpoint | Method | Success Response | Status | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `/api/health/live` | GET | `{"status":"ok","service":"nobatara-server","environment":"...","uptimeSeconds":...}` | 200 | Liveness probe confirming HTTP process is alive |
| `/api/health/ready` | GET | `{"status":"ready","subsystems":{"database":"not_configured (Phase 4)",...}}` | 200 | Readiness probe with honest dependency status |
| `/api/nonexistent` | ANY | `{"success":false,"error":{"code":"API_ENDPOINT_NOT_FOUND",...}}` | 404 | Strict JSON 404 for unknown API paths |

---

## 4. Rollback & Disaster Recovery Procedures

1. **Static Build Rollback**: Revert `dist/` to prior tested artifact.
2. **Server Runtime Rollback**: Restore previous Git commit tag.
3. **Graceful Degradation**:
   - If external services are unavailable, endpoints report precise subsystem status.
   - If the database is under maintenance (Phase 4), a maintenance page is served with `503 Service Unavailable`.
