import assert from 'assert';
import http from 'http';
import express from 'express';
import cookieParser from 'cookie-parser';
import { adminRouter } from '../server/routes/admin.ts';
import { userRepository } from '../server/repositories/userRepository.ts';
import { salonRepository } from '../server/repositories/salonRepository.ts';
import { auditLogRepository } from '../server/repositories/auditLogRepository.ts';
import { sessionService } from '../server/services/auth/sessionService.ts';
import { requirePlatformRole } from '../server/middleware/auth.ts';

async function runTestSuite() {
  console.log('====================================================');
  console.log('   NobatAra Phase 9 Super Admin Test Suite          ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void> | void) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}\n`);
      failed++;
    }
  }

  // Create Express app
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/admin', adminRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as { port: number };
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    // Standard User
    let regUser = await userRepository.findByPhone('09128887766');
    if (!regUser) {
      regUser = await userRepository.create({
        phone: '09128887766',
        fullName: 'کاربر معمولی',
        platformRole: 'user',
        status: 'active',
      });
    }

    // Super Admin User
    let superAdminUser = await userRepository.findByPhone('09120000000');
    if (!superAdminUser) {
      superAdminUser = await userRepository.create({
        phone: '09120000000',
        fullName: 'مدیر ارشد سامانه',
        platformRole: 'super_admin',
        status: 'active',
      });
    }

    // Generate Session Tokens
    const dummyReqRes: any = { headers: {}, socket: { remoteAddress: '127.0.0.1' }, cookie: () => {} };
    const regUserSession = await sessionService.createSession(regUser, dummyReqRes, dummyReqRes, 'web');
    const superAdminSession = await sessionService.createSession(superAdminUser, dummyReqRes, dummyReqRes, 'web');

    console.log('--- 1. Server Security & RBAC Enforcement ---');

    await test('Unauthenticated request to /api/admin/stats is denied with 401', async () => {
      const res = await fetch(`${baseUrl}/api/admin/stats`);
      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.error, 'AUTHENTICATION_REQUIRED');
    });

    await test('Regular user session cannot access /api/admin/stats (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${regUserSession.rawToken}` },
      });
      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.error, 'FORBIDDEN_PLATFORM_ROLE');
    });

    await test('Super Admin session can access /api/admin/stats and view platform metrics', async () => {
      const res = await fetch(`${baseUrl}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${superAdminSession.rawToken}` },
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(typeof data.platform.totalSalons === 'number');
      assert.ok(typeof data.platform.activeSalons === 'number');
      assert.ok(typeof data.platform.totalUsers === 'number');
    });

    console.log('\n--- 2. Salon Status Management & Mandatory Audit Logs ---');

    await test('Status change without compulsory reason is rejected with 400', async () => {
      const res = await fetch(`${baseUrl}/api/admin/salons/sal-101/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${superAdminSession.rawToken}`,
        },
        body: JSON.stringify({ status: 'suspended' }), // Missing reason
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.error, 'REASON_REQUIRED');
    });

    await test('Suspending salon with valid reason updates status and records audit log', async () => {
      const suspendRes = await fetch(`${baseUrl}/api/admin/salons/sal-101/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${superAdminSession.rawToken}`,
        },
        body: JSON.stringify({
          status: 'suspended',
          reason: 'عدم ارائه مدارک پروانه کسب معتبر و نقض قوانین',
        }),
      });

      assert.strictEqual(suspendRes.status, 200);
      const data = await suspendRes.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.salon.status, 'suspended');

      // Verify audit log
      const auditRes = await fetch(`${baseUrl}/api/admin/audit-logs?search=sal-101`, {
        headers: { Authorization: `Bearer ${superAdminSession.rawToken}` },
      });

      assert.strictEqual(auditRes.status, 200);
      const auditData = await auditRes.json();
      assert.ok(auditData.logs.length > 0);
      assert.strictEqual(auditData.logs[0].action, 'SALON_STATUS_CHANGE');
    });

    console.log('\n--- 3. Privilege Escalation Prevention ---');

    await test('Granting super_admin role via standard API route is strictly forbidden (403)', async () => {
      const res = await fetch(`${baseUrl}/api/admin/users/${regUser.id}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${superAdminSession.rawToken}`,
        },
        body: JSON.stringify({ role: 'super_admin' }),
      });

      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.error, 'SUPER_ADMIN_ASSIGNMENT_FORBIDDEN');
    });

    console.log('\n--- 4. Audit Log Retrieval & Multi-filtering ---');

    await test('Audit logs endpoint supports filtering by severity and category', async () => {
      const res = await fetch(`${baseUrl}/api/admin/audit-logs?severity=critical&category=business`, {
        headers: { Authorization: `Bearer ${superAdminSession.rawToken}` },
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.ok(Array.isArray(data.logs));
    });
  } finally {
    server.close();
  }

  console.log('\n====================================================');
  console.log(`Test Execution Finished: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================\n');

  if (failed > 0) process.exit(1);
}

runTestSuite().catch((err) => {
  console.error('Fatal test execution error:', err);
  process.exit(1);
});
