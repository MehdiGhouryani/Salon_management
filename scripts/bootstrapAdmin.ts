import { userRepository } from '../server/repositories/userRepository.ts';
import { auditLogRepository } from '../server/repositories/auditLogRepository.ts';
import { isDatabaseConfigured, closePool } from '../server/db/pool.ts';
import { normalizeIranianPhone } from '../server/utils/phone.ts';

/**
 * CLI Operator-Only Bootstrap Tool for Initial Platform Super-Admin Provisioning.
 * Usage:
 *   npx tsx scripts/bootstrapAdmin.ts --phone 09120000001 --name "مدیر کل سامانه" --confirm
 *
 * Operational Safeguards:
 * 1. Never exposed as an HTTP endpoint.
 * 2. Requires explicit --confirm flag.
 * 3. Requires valid Iranian phone format.
 * 4. Logs tamper-evident audit record.
 */
async function main() {
  console.log('=== NobatAra Operator Super-Admin Provisioning ===');

  if (!isDatabaseConfigured()) {
    console.error('❌ Error: Database is not configured. Cannot bootstrap admin.');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const phoneIdx = args.indexOf('--phone');
  const nameIdx = args.indexOf('--name');
  const hasConfirm = args.includes('--confirm');

  if (phoneIdx === -1 || !args[phoneIdx + 1]) {
    console.error('❌ Error: Missing required argument --phone <09xxxxxxxxx>');
    console.log('Usage: npx tsx scripts/bootstrapAdmin.ts --phone 09120000001 --name "مدیر ارشد" --confirm');
    process.exit(1);
  }

  const rawPhone = args[phoneIdx + 1];
  const fullName = nameIdx !== -1 && args[nameIdx + 1] ? args[nameIdx + 1] : 'مدیر کل سامانه';

  const phoneNorm = normalizeIranianPhone(rawPhone);
  if (!phoneNorm.isValid) {
    console.error(`❌ Error: ${phoneNorm.error}`);
    process.exit(1);
  }

  if (!hasConfirm) {
    console.warn(`⚠️ SAFETY CHECK: You are about to grant platform super_admin privileges to phone: ${phoneNorm.national}`);
    console.warn('   To proceed, re-run command with --confirm flag.');
    process.exit(1);
  }

  try {
    let user = await userRepository.findByPhone(phoneNorm.national);
    if (!user) {
      user = await userRepository.findByPhone(phoneNorm.e164);
    }

    if (user) {
      console.log(`Found existing user (ID: ${user.id}). Updating platform_role to 'super_admin'...`);
      await userRepository.update(user.id, {
        platformRole: 'super_admin',
        status: 'active',
        twoFactorEnabled: true,
      });
      console.log(`✅ User ${user.phone} successfully promoted to super_admin.`);
    } else {
      console.log(`Creating new super_admin account for ${phoneNorm.national}...`);
      user = await userRepository.create({
        phone: phoneNorm.national,
        fullName,
        platformRole: 'super_admin',
        status: 'active',
        twoFactorEnabled: true,
      });
      console.log(`✅ Super-admin user created with ID: ${user.id}`);
    }

    // Record audit event
    await auditLogRepository.create({
      actor: 'CLI Operator',
      actorRole: 'system_bootstrap',
      action: 'ارتقای حساب به مدیر کل پلتفرم (Operator Bootstrap)',
      target: `User:${user.id}`,
      ipAddress: '127.0.0.1',
      userAgent: 'NobatAra-CLI-Bootstrap/1.0',
      severity: 'critical',
      category: 'privilege',
      details: { phone: phoneNorm.national, fullName },
    });

    console.log('✅ Audit log recorded.');
  } catch (err: any) {
    console.error('❌ Bootstrap failed:', err.message);
    process.exit(1);
  } finally {
    await closePool();
  }
}

main();
