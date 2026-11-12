/**
 * NobatAra Salon Operational API Tests (CATEGORY: integration/real-HTTP)
 *
 * Phase 10: complete operational surface for salon owner/staff, tested over
 * real HTTP against the REAL Express app with in-memory adapters.
 * Matrix per operation: authorized owner, staff role (PII/permission limits),
 * foreign salon, invalid relationship, missing data, invalid transitions.
 * Database-failure behavior is covered by the fail-closed suites (pool,
 * production posture) and the DB-backed tests.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { createApp } from '../../server/app.ts';
import { userRepository } from '../../server/repositories/userRepository.ts';
import { sessionService } from '../../server/services/auth/sessionService.ts';
import { bookingService } from '../../server/services/booking/bookingService.ts';

let server: http.Server;
let baseUrl: string;

const mockReq: any = { headers: { 'user-agent': 'SalonOpsTest/1.0' }, socket: { remoteAddress: '127.0.0.1' } };
const mockRes: any = { cookie: () => {}, clearCookie: () => {} };

let ownerToken = '';
let staffToken = '';
let foreignOwnerToken = '';
let createdClientId = '';

async function sessionFor(phone: string, role: 'owner' | 'staff', salonId: string): Promise<string> {
  let user = await userRepository.findByPhone(phone);
  if (!user) {
    user = await userRepository.create({
      phone,
      fullName: role === 'owner' ? 'مالک سالن تست' : 'پرسنل سالن تست',
      platformRole: 'user',
      status: 'active',
    });
  }
  await userRepository.addMembership(user.id, salonId, role);
  const s = await sessionService.createSession(user, mockReq, mockRes, 'web');
  return s.rawToken;
}

beforeAll(async () => {
  server = http.createServer(createApp());
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as { port: number };
  baseUrl = `http://127.0.0.1:${address.port}`;

  ownerToken = await sessionFor('09361000001', 'owner', 'sal-101');
  staffToken = await sessionFor('09361000002', 'staff', 'sal-101');
  foreignOwnerToken = await sessionFor('09361000003', 'owner', 'sal-102');

  // Seed two customers via real bookings (sal-101, Saturday, stf-101/srv-101)
  await bookingService.createBooking({
    salonId: 'sal-101', serviceId: 'srv-101', staffId: 'stf-101',
    bookingDate: '2026-11-28', bookingTime: '10:30',
    clientName: 'مشتری نمونه یک', clientPhone: '09362000001',
    ipAddress: '127.0.0.1', userAgent: 'ops-test',
  });
  await bookingService.createBooking({
    salonId: 'sal-101', serviceId: 'srv-101', staffId: 'stf-101',
    bookingDate: '2026-11-28', bookingTime: '14:00',
    clientName: 'مشتری نمونه دو', clientPhone: '09362000002',
    ipAddress: '127.0.0.1', userAgent: 'ops-test',
  });

  const list = await fetch(`${baseUrl}/api/salon/sal-101/customers?limit=50`, {
    headers: { Authorization: `Bearer ${ownerToken}`, 'X-NobatAra-Client': 'test' },
  });
  const data = await list.json();
  createdClientId = data.customers?.[0]?.id ?? '';
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

const authHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  'X-NobatAra-Client': 'test',
  'Content-Type': 'application/json',
});

describe('Customers domain (Phase 10, integration)', () => {
  it('owner lists salon customers with full PII and stable pagination', async () => {
    const res = await fetch(`${baseUrl}/api/salon/sal-101/customers?limit=1&offset=0`, {
      headers: authHeaders(ownerToken),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.customers.length).toBe(1);
    expect(data.total).toBeGreaterThanOrEqual(2);
    expect(data.customers[0].phone).not.toContain('****');
    expect(data.customers[0]).toHaveProperty('totalBookings');
  });

  it('staff role receives masked phone and restricted PII', async () => {
    const res = await fetch(`${baseUrl}/api/salon/sal-101/customers`, {
      headers: authHeaders(staffToken),
    });
    const data = await res.json();
    console.log('STAFF_KEYS', JSON.stringify({ status: res.status, keys: Object.keys(data) }));
    expect(data.piiRestricted).toBe(true);
    expect(data.customers[0].phone).toContain('****');
    expect(data.customers[0].email).toBeNull();
    expect(data.customers[0].notes).toBeNull();
  });

  it('search filters by phone fragment', async () => {
    const res = await fetch(`${baseUrl}/api/salon/sal-101/customers?search=09362000002`, {
      headers: authHeaders(ownerToken),
    });
    const data = await res.json();
    expect(data.total).toBe(1);
    expect(data.customers[0].fullName).toBe('مشتری نمونه دو');
  });

  it('foreign salon owner is rejected (tenant boundary)', async () => {
    const res = await fetch(`${baseUrl}/api/salon/sal-101/customers`, {
      headers: authHeaders(foreignOwnerToken),
    });
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe('FORBIDDEN_SALON_ACCESS');
  });

  it('customer detail: known id returns record; unknown id returns 404', async () => {
    const ok = await fetch(`${baseUrl}/api/salon/sal-101/customers/${createdClientId}`, {
      headers: authHeaders(ownerToken),
    });
    expect(ok.status).toBe(200);
    expect((await ok.json()).customer.id).toBe(createdClientId);

    const missing = await fetch(`${baseUrl}/api/salon/sal-101/customers/unknown-client-id`, {
      headers: authHeaders(ownerToken),
    });
    expect(missing.status).toBe(404);
    expect((await missing.json()).error).toBe('CUSTOMER_NOT_FOUND');
  });
});

describe('Staff schedule (Phase 10, integration)', () => {
  it('owner configures staff weekly hours; GET includes staffHours', async () => {
    const put = await fetch(`${baseUrl}/api/salon/sal-101/working-hours/staff/stf-101`, {
      method: 'PUT',
      headers: authHeaders(ownerToken),
      body: JSON.stringify({
        hours: [
          { dayOfWeek: 0, startTime: '09:00', endTime: '17:00', isClosed: false },
          { dayOfWeek: 6, startTime: '00:00', endTime: '00:00', isClosed: true },
        ],
      }),
    });
    expect(put.status).toBe(200);

    const get = await fetch(`${baseUrl}/api/salon/sal-101/working-hours`, {
      headers: authHeaders(ownerToken),
    });
    const data = await get.json();
    const stf = data.staffHours?.find((s: any) => s.staffId === 'stf-101');
    expect(stf).toBeTruthy();
    expect(stf.hours.length).toBe(2);
    expect(stf.hours[0].start_time).toBe('09:00');
  });

  it('validates hours entries: bad day, bad time format, inverted range', async () => {
    for (const body of [
      { hours: [{ dayOfWeek: 9, startTime: '09:00', endTime: '17:00', isClosed: false }] },
      { hours: [{ dayOfWeek: 0, startTime: '9:00', endTime: '17:00', isClosed: false }] },
      { hours: [{ dayOfWeek: 0, startTime: '17:00', endTime: '09:00', isClosed: false }] },
    ]) {
      const res = await fetch(`${baseUrl}/api/salon/sal-101/working-hours/staff/stf-101`, {
        method: 'PUT',
        headers: authHeaders(ownerToken),
        body: JSON.stringify(body),
      });
      expect([400, 400, 400]).toContain(res.status);
      const code = (await res.json()).error;
      expect(['INVALID_HOURS_ENTRY', 'INVALID_HOURS_RANGE']).toContain(code);
    }
  });

  it('hours for a staff member of another salon are not reachable (404)', async () => {
    const res = await fetch(`${baseUrl}/api/salon/sal-101/working-hours/staff/t3-stf-1`, {
      method: 'PUT',
      headers: authHeaders(ownerToken),
      body: JSON.stringify({ hours: [{ dayOfWeek: 0, startTime: '09:00', endTime: '17:00', isClosed: false }] }),
    });
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('STAFF_NOT_FOUND');
  });
});

describe('Service assignments (Phase 10, integration)', () => {
  it('unassigns a service from staff; remaining list reflects it', async () => {
    const del = await fetch(`${baseUrl}/api/salon/sal-101/staff/stf-102/services/srv-103`, {
      method: 'DELETE',
      headers: authHeaders(ownerToken),
    });
    expect(del.status).toBe(200);
    const data = await del.json();
    expect(data.assignedServices.some((m: any) => m.service_id === 'srv-103')).toBe(false);

    // restore for other suites
    const { staffRepository } = await import('../../server/repositories/staffRepository.ts');
    await staffRepository.assignService('stf-102', 'srv-103');
  });

  it('unassigning an unrelated service returns 404 (invalid relationship)', async () => {
    const res = await fetch(`${baseUrl}/api/salon/sal-101/staff/stf-101/services/srv-105`, {
      method: 'DELETE',
      headers: authHeaders(ownerToken),
    });
    expect(res.status).toBe(404);
  });
});

describe('Appointments pagination & overview (Phase 10, integration)', () => {
  it('appointments list is paginated with a stable envelope', async () => {
    const res = await fetch(`${baseUrl}/api/salon/sal-101/appointments?limit=1&offset=0&from=2026-11-28&to=2026-11-28`, {
      headers: authHeaders(ownerToken),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.appointments.length).toBe(1);
    expect(data.total).toBeGreaterThanOrEqual(2);
    expect(data.limit).toBe(1);
    expect(data.offset).toBe(0);
  });

  it('overview includes upcomingAppointments beyond today', async () => {
    const res = await fetch(`${baseUrl}/api/salon/sal-101/dashboard/overview`, {
      headers: authHeaders(ownerToken),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.upcomingAppointments)).toBe(true);
    expect(data.upcomingAppointments.length).toBeGreaterThan(0);
  });
});

describe('Status transitions & manual booking (Phase 10, integration)', () => {
  it('invalid transition: completed appointment cannot become cancelled (409)', async () => {
    const created = await bookingService.createBooking({
      salonId: 'sal-101', serviceId: 'srv-101', staffId: 'stf-101',
      bookingDate: '2026-11-28', bookingTime: '17:00',
      clientName: 'تست گذار وضعیت', clientPhone: '09362000003',
      ipAddress: '127.0.0.1', userAgent: 'ops-test',
    });
    const complete = await fetch(`${baseUrl}/api/salon/sal-101/appointments/${created.appointment.id}/status`, {
      method: 'PATCH',
      headers: authHeaders(ownerToken),
      body: JSON.stringify({ status: 'completed', reason: 'تسویه' }),
    });
    expect(complete.status).toBe(200);

    const invalid = await fetch(`${baseUrl}/api/salon/sal-101/appointments/${created.appointment.id}/status`, {
      method: 'PATCH',
      headers: authHeaders(ownerToken),
      body: JSON.stringify({ status: 'cancelled', reason: 'تلاش غیرمجاز' }),
    });
    expect(invalid.status).toBe(409);
    expect((await invalid.json()).error).toBe('INVALID_STATUS_TRANSITION');
  });

  it('manual booking missing fields returns 400; wrong-salon staff returns 404', async () => {
    const missing = await fetch(`${baseUrl}/api/salon/sal-101/appointments`, {
      method: 'POST',
      headers: authHeaders(ownerToken),
      body: JSON.stringify({ clientName: 'ناقص' }),
    });
    expect(missing.status).toBe(400);

    const wrongStaff = await fetch(`${baseUrl}/api/salon/sal-101/appointments`, {
      method: 'POST',
      headers: authHeaders(ownerToken),
      body: JSON.stringify({
        clientName: 'رابطه نادرست', clientPhone: '09362000004',
        serviceId: 'srv-101', staffId: 't3-stf-1',
        bookingDate: '2026-11-28', bookingTime: '10:00',
      }),
    });
    expect([404]).toContain(wrongStaff.status);
    expect((await wrongStaff.json()).error).toBe('STAFF_NOT_FOUND');
  });
});
