/**
 * Shared setup for PostgreSQL-backed test suites (CATEGORY: database/real-PostgreSQL)
 *
 * HARD RULES enforced here:
 *  1. Tests NEVER run against production: TEST_DATABASE_URL containing "prod"
 *     is refused outright; the dedicated test database is the only target.
 *  2. Tests NEVER silently fall back to in-memory adapters: a real-pool probe
 *     (SELECT 1+1) must return actual data or initialization aborts loudly.
 *  3. When TEST_DATABASE_URL is absent the suites report as SKIPPED/BLOCKED
 *     (visible in reports) — never as passed.
 *  4. Fixtures use the dedicated "t3-" prefix; cleanup deletes ONLY test-owned
 *     rows (by prefix and dedicated phone range), never seed/user data.
 */
import pg from 'pg';

export const TEST_DATABASE_URL = (process.env.TEST_DATABASE_URL || '').trim();
export const DB_TESTS_ENABLED = TEST_DATABASE_URL.length > 0;

export interface DbUnderTest {
  isDatabaseConfigured: () => boolean;
  getPool: () => any;
  withTransaction: <T>(cb: (client: any) => Promise<T>) => Promise<T>;
  migrateUp: () => Promise<string[]>;
  salonRepository: any;
  serviceRepository: any;
  staffRepository: any;
  appointmentRepository: any;
  bookingService: any;
  raw: pg.Client;
  fixtures: { salonId: string; serviceId: string; service2Id: string; staffId: string };
  cleanup: () => Promise<void>;
}

/**
 * Deletes every row this test suite could have created. Safe to run repeatedly
 * (idempotent) and only touches "t3-" prefixed fixtures + dedicated phone range.
 */
async function cleanupFixtures(raw: pg.Client, salonId: string): Promise<void> {
  await raw.query(`DELETE FROM appointment_status_history WHERE appointment_id LIKE 't3-%'`);
  await raw.query(`DELETE FROM appointments WHERE id LIKE 't3-%' OR salon_id = $1`, [salonId]);
  await raw.query(`DELETE FROM staff_services WHERE staff_id LIKE 't3-%'`);
  await raw.query(`DELETE FROM staff WHERE id LIKE 't3-%' OR salon_id = $1`, [salonId]);
  await raw.query(`DELETE FROM services WHERE id LIKE 't3-%' OR salon_id = $1`, [salonId]);
  await raw.query(`DELETE FROM working_hours WHERE salon_id = $1`, [salonId]);
  await raw.query(`DELETE FROM availability_exceptions WHERE salon_id = $1`, [salonId]);
  await raw.query(`DELETE FROM salon_clients WHERE salon_id = $1`, [salonId]);
  await raw.query(`DELETE FROM clients WHERE phone LIKE '09370%'`);
  await raw.query(`DELETE FROM audit_logs WHERE target LIKE 'Appointment:t3-%' OR details->>'salonId' = $1`, [salonId]);
  await raw.query(`DELETE FROM salons WHERE id LIKE 't3-%'`);
}

export async function initDatabaseUnderTest(): Promise<DbUnderTest> {
  if (!DB_TESTS_ENABLED) {
    throw new Error(
      'BLOCKED: TEST_DATABASE_URL is not configured. PostgreSQL-backed tests must never run against in-memory fallbacks — configure an isolated test database.'
    );
  }
  if (/prod/i.test(TEST_DATABASE_URL)) {
    throw new Error('SAFETY ABORT: TEST_DATABASE_URL appears to reference a production database. Refusing to run tests against it.');
  }

  // The server modules freeze a config singleton at import time — the test
  // database URL must be in place BEFORE any server module is imported.
  process.env.DATABASE_URL = TEST_DATABASE_URL;

  const poolMod = await import('../../server/db/pool.ts');
  const migratorMod = await import('../../server/db/migrator.ts');
  const salonMod = await import('../../server/repositories/salonRepository.ts');
  const serviceMod = await import('../../server/repositories/serviceRepository.ts');
  const staffMod = await import('../../server/repositories/staffRepository.ts');
  const apptMod = await import('../../server/repositories/appointmentRepository.ts');
  const bookingMod = await import('../../server/services/booking/bookingService.ts');

  // --- No-silent-fallback tripwires (fail loudly, never continue) ----------
  if (!poolMod.isDatabaseConfigured()) {
    throw new Error('FALLBACK GUARD: config did not mark the database as configured — refusing to run DB tests on the in-memory adapter.');
  }
  const probe = await poolMod.getPool().query('SELECT 1+1 AS two');
  if (!probe.rows || probe.rows.length === 0 || probe.rows[0].two !== 2) {
    throw new Error('FALLBACK DETECTED: the pool returned an empty/mock result — refusing to run DB tests against in-memory adapters.');
  }

  // --- Real connection + migrations -----------------------------------------
  const raw = new pg.Client({ connectionString: TEST_DATABASE_URL });
  await raw.connect(); // throws → suite fails (deliberate DB failure = test failure)

  await migratorMod.migrateUp();
  const applied = await raw.query(`SELECT name FROM schema_migrations ORDER BY name`);
  if (applied.rows.length < 3) {
    throw new Error(`Expected at least 3 applied migrations in the test database, found ${applied.rows.length}.`);
  }

  const fixtures = { salonId: 't3-salon-1', serviceId: 't3-srv-1', staffId: 't3-stf-1', service2Id: 't3-srv-2' };
  const ignoreDuplicate = (err: any): void => {
    if (err?.code !== '23505') throw err;
  };

  await cleanupFixtures(raw, fixtures.salonId);

  // --- Fixtures via real repositories (same DTOs production code uses) ------
  await salonMod.salonRepository.create({
    id: fixtures.salonId,
    slug: 't3-test-salon',
    name: 'سالن تست پایگاه داده',
    ownerName: 'مالک تست',
    phone: '09370000001',
    province: 'تهران',
    city: 'تهران',
    address: 'تهران، خیابان آزمایشی، پلاک تست',
    status: 'active',
    planExpiry: new Date('2027-01-01'),
  }).catch(ignoreDuplicate);

  await serviceMod.serviceRepository.create({
    id: fixtures.serviceId,
    salonId: fixtures.salonId,
    name: 'خدمت آزمایشی پایگاه داده',
    category: 'hair',
    categoryLabel: 'مو',
    price: 500000,
    durationMinutes: 60,
    isActive: true,
  }).catch(ignoreDuplicate);

  await staffMod.staffRepository.create({
    id: fixtures.staffId,
    salonId: fixtures.salonId,
    name: 'متخصص آزمایشی',
    phone: '09370000002',
    role: 'متخصص',
    specialty: 'تست',
    rating: 4.8,
    isActive: true,
  }).catch(ignoreDuplicate);

  // Phase 09: schedule configuration must exist or the fail-safe engine
  // rejects every booking for this fixture salon. Open every day 07:00-22:00.
  await salonMod.salonRepository.setWorkingHours(fixtures.salonId, [
    { dayOfWeek: 0, startTime: '07:00', endTime: '22:00', isClosed: false },
    { dayOfWeek: 1, startTime: '07:00', endTime: '22:00', isClosed: false },
    { dayOfWeek: 2, startTime: '07:00', endTime: '22:00', isClosed: false },
    { dayOfWeek: 3, startTime: '07:00', endTime: '22:00', isClosed: false },
    { dayOfWeek: 4, startTime: '07:00', endTime: '22:00', isClosed: false },
    { dayOfWeek: 5, startTime: '07:00', endTime: '22:00', isClosed: false },
    { dayOfWeek: 6, startTime: '07:00', endTime: '22:00', isClosed: false },
  ]);

  // Phase 09: staff-service eligibility is enforced by the engine.
  await staffMod.staffRepository.assignService(fixtures.staffId, fixtures.serviceId);

  await serviceMod.serviceRepository.create({
    id: fixtures.service2Id,
    salonId: fixtures.salonId,
    name: 'خدمت آزمایشی دوم (۹۰ دقیقه)',
    category: 'hair',
    categoryLabel: 'مو',
    price: 800000,
    durationMinutes: 90,
    isActive: true,
  }).catch(ignoreDuplicate);

  await staffMod.staffRepository.assignService(fixtures.staffId, fixtures.service2Id);

  return {
    isDatabaseConfigured: poolMod.isDatabaseConfigured,
    getPool: poolMod.getPool,
    withTransaction: poolMod.withTransaction,
    migrateUp: migratorMod.migrateUp,
    salonRepository: salonMod.salonRepository,
    serviceRepository: serviceMod.serviceRepository,
    staffRepository: staffMod.staffRepository,
    appointmentRepository: apptMod.appointmentRepository,
    bookingService: bookingMod.bookingService,
    raw,
    fixtures,
    cleanup: () => cleanupFixtures(raw, fixtures.salonId),
  };
}
