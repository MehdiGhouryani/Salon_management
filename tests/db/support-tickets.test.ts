/**
 * Support ticket persistence integration tests against a real PostgreSQL DB.
 * The server modules are imported only after initDatabaseUnderTest assigns
 * TEST_DATABASE_URL to DATABASE_URL, preventing accidental in-memory testing.
 */
import { randomInt } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  DB_TESTS_ENABLED,
  initDatabaseUnderTest,
  type DbUnderTest,
} from './_setup.ts';

let db: DbUnderTest;
let userId = '';
let ticketId = '';
let userRepository: typeof import('../../server/repositories/userRepository.ts')['userRepository'];
let supportTicketRepository: typeof import('../../server/repositories/supportTicketRepository.ts')['supportTicketRepository'];
let withTransaction: typeof import('../../server/db/pool.ts')['withTransaction'];

describe.skipIf(!DB_TESTS_ENABLED)('PostgreSQL support ticket persistence', () => {
  beforeAll(async () => {
    db = await initDatabaseUnderTest();

    // Import after DB setup so every repository uses the isolated test pool.
    const [users, tickets, pool] = await Promise.all([
      import('../../server/repositories/userRepository.ts'),
      import('../../server/repositories/supportTicketRepository.ts'),
      import('../../server/db/pool.ts'),
    ]);
    userRepository = users.userRepository;
    supportTicketRepository = tickets.supportTicketRepository;
    withTransaction = pool.withTransaction;

    const phone = '093700' + String(randomInt(0, 100000)).padStart(5, '0');
    const user = await userRepository.create({
      phone,
      fullName: 'کاربر تست تیکت پشتیبانی',
      platformRole: 'user',
      status: 'active',
    });
    userId = user.id;
  }, 120_000);

  afterAll(async () => {
    if (db?.raw) {
      if (ticketId) {
        await db.raw.query('DELETE FROM support_tickets WHERE id = $1', [ticketId]);
      }
      if (userId) {
        await db.raw.query('DELETE FROM users WHERE id = $1', [userId]);
      }
      await db.raw.end();
    }
  });

  it('persists the ticket, conversation, lifecycle and salon tenant boundary', async () => {
    const created = await withTransaction(async (client) => {
      const ticket = await supportTicketRepository.create({
        salonId: db.fixtures.salonId,
        salonName: 'سالن تست پایگاه داده',
        creatorUserId: userId,
        creatorName: 'کاربر تست تیکت پشتیبانی',
        creatorRole: 'salon',
        subject: 'بررسی مشکل ارسال پیامک',
        category: 'sms',
        priority: 'high',
      }, client);

      await supportTicketRepository.addMessage(ticket.id, {
        senderUserId: userId,
        senderName: 'مدیر سالن تست',
        senderRole: 'salon',
        content: 'پیامک تایید نوبت برای مشتری ارسال نمی‌شود.',
      }, client);

      await supportTicketRepository.updateStatus(ticket.id, 'in_progress', client);

      await supportTicketRepository.addMessage(ticket.id, {
        senderUserId: userId,
        senderName: 'پشتیبانی نوبت‌آرا',
        senderRole: 'admin',
        content: 'درخواست دریافت شد و در حال بررسی است.',
      }, client);

      return ticket;
    });
    ticketId = created.id;

    const fetched = await supportTicketRepository.findById(ticketId, db.fixtures.salonId);
    expect(fetched).toBeTruthy();
    expect(fetched?.ticketNumber).toMatch(/^SUP-\d{7}$/);
    expect(fetched?.status).toBe('in_progress');
    expect(fetched?.messages).toHaveLength(2);
    expect(fetched?.messages[0].senderRole).toBe('salon');
    expect(fetched?.messages[1].senderRole).toBe('admin');
    expect(fetched?.messages[0].content).toContain('ارسال نمی‌شود');
    expect(await supportTicketRepository.findById(ticketId, 't3-salon-other')).toBeNull();
    expect(await supportTicketRepository.count({ salonId: db.fixtures.salonId })).toBeGreaterThan(0);

    await supportTicketRepository.updateStatus(ticketId, 'resolved');
    const resolved = await supportTicketRepository.findById(ticketId);
    expect(resolved?.status).toBe('resolved');
  });
});
