import express from 'express';
import { safeInternalErrorMessage } from '../middleware/errorHandler.ts';
import type { Request, Response } from 'express';
import { requireSalonMembership, requireSalonPermission, csrfProtection } from '../middleware/auth.ts';
import { salonRepository } from '../repositories/salonRepository.ts';
import { appointmentRepository, type AppointmentStatus } from '../repositories/appointmentRepository.ts';
import { serviceRepository } from '../repositories/serviceRepository.ts';
import { staffRepository } from '../repositories/staffRepository.ts';
import { clientRepository } from '../repositories/clientRepository.ts';
import { auditLogRepository } from '../repositories/auditLogRepository.ts';
import { withTransaction } from '../db/pool.ts';
import { bookingService } from '../services/booking/bookingService.ts';
import { extractClientIp } from '../services/auth/sessionService.ts';
import { normalizeIranianPhone } from '../utils/phone.ts';
import { parseBookingDateInput } from '../utils/jalali.ts';
import {
  addMinutesToTimeString,
  formatIranianDate,
  getIranianDayOfWeek,
  parseBookingDate,
} from '../utils/bookingTime.ts';

/** Canonical "today" in the Asia/Tehran business timezone (Gregorian YYYY-MM-DD). */
function tehranTodayIso(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran' }).format(new Date());
}

export const salonRouter = express.Router({ mergeParams: true });

// Apply anti-CSRF protection to all state-changing salon operations
salonRouter.use(csrfProtection);

// Strict salon tenant membership gate: user must be verified owner, manager, or staff of this salon
salonRouter.use(requireSalonMembership('owner', 'manager', 'staff'));

/**
 * GET /api/salon/:salonId/profile
 * Accesses tenant profile verifying tenant boundary
 */
salonRouter.get('/profile', async (req: Request, res: Response): Promise<void> => {
  const salonId = String(req.params.salonId);

  try {
    const salon = await salonRepository.findById(salonId);
    if (!salon) {
      res.status(404).json({
        error: 'SALON_NOT_FOUND',
        message: 'سالن مورد نظر یافت نشد.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      salon,
    });
  } catch (err: any) {
    res.status(500).json({
      error: 'SALON_FETCH_ERROR',
      message: safeInternalErrorMessage(err),
    });
  }
});

/**
 * PATCH /api/salon/:salonId/profile (or showcase)
 * Updates public showcase and profile details
 */
salonRouter.patch(
  '/profile',
  requireSalonPermission('manage_settings'),
  async (req: Request, res: Response): Promise<void> => {
    const salonId = String(req.params.salonId);
    const { tagline, phone, address, city, bannerImage, galleryImages, features } = req.body || {};

    try {
      const updated = await salonRepository.update(salonId, {
        tagline,
        phone,
        address,
        city,
        bannerImage,
        galleryImages,
        features,
      });

      if (!updated) {
        res.status(404).json({
          error: 'SALON_NOT_FOUND',
          message: 'سالن یافت نشد.',
        });
        return;
      }

      await auditLogRepository.create({
        actor: req.user?.full_name || 'مدیر سالن',
        actorRole: req.user?.platform_role || 'salon_manager',
        action: 'ویرایش مشخصات ویترین و پروفایل سالن',
        target: `Salon:${salonId}`,
        ipAddress: extractClientIp(req),
        userAgent: String(req.headers['user-agent'] || 'Unknown'),
        severity: 'info',
        category: 'business',
        details: { salonId, updatedFields: Object.keys(req.body || {}) },
      }).catch(() => {});

      res.status(200).json({
        success: true,
        message: 'اطلاعات سالن با موفقیت بروزرسانی شد.',
        salon: updated,
      });
    } catch (err: any) {
      res.status(500).json({
        error: 'SALON_UPDATE_ERROR',
        message: safeInternalErrorMessage(err),
      });
    }
  }
);

/**
 * GET /api/salon/:salonId/dashboard/overview
 * Real server-side operational dashboard metrics:
 * Today's appointments, capacity, cashflow settlement, and urgent pending actions
 */
salonRouter.get('/dashboard/overview', async (req: Request, res: Response): Promise<void> => {
  const salonId = String(req.params.salonId);
  // Canonical target date: Asia/Tehran "today" (Gregorian YYYY-MM-DD) unless a
  // valid explicit date is supplied. Jalali/ISO input is validated once here.
  const requestedDate = req.query.date ? parseBookingDateInput(String(req.query.date)) : null;
  const targetDateStr = requestedDate
    ? requestedDate.canonical
    : tehranTodayIso();

  try {
    const [allSalonAppointments, workingHours, staffList] = await Promise.all([
      appointmentRepository.findBySalonId(salonId),
      salonRepository.getWorkingHours(salonId),
      staffRepository.findBySalonId(salonId, true),
    ]);

    // Saturday-first weekday of the canonical target date (TZ-independent)
    const dayOfWeek = requestedDate
      ? requestedDate.weekday
      : parseBookingDateInput(targetDateStr)!.weekday;
    const todayWorkingHour = workingHours.find((w) => w.day_of_week === dayOfWeek);

    // Filter appointments for target date — canonical Gregorian comparison
    // (in-memory rows store canonical strings since Phase 06; legacy Jalali
    // strings from older dev sessions no longer alias the same day).
    const todayAppointments = allSalonAppointments.filter(
      (a) => (a.booking_date_greg || a.booking_date) === targetDateStr
    );

    const completedAppts = todayAppointments.filter((a) => a.status === 'completed');
    const confirmedAppts = todayAppointments.filter((a) => a.status === 'confirmed');
    const pendingAppts = todayAppointments.filter((a) => a.status === 'pending');
    const cancelledAppts = todayAppointments.filter((a) => a.status === 'cancelled');
    const noShowAppts = todayAppointments.filter((a) => a.status === 'no_show');

    const totalCollectedRevenue = completedAppts.reduce((sum, a) => sum + Number(a.price || 0), 0);
    const pendingCollectionRevenue = confirmedAppts.reduce((sum, a) => sum + Number(a.price || 0), 0);

    // Calculate theoretical day capacity
    let totalOperatingMinutes = 0;
    if (todayWorkingHour && !todayWorkingHour.is_closed) {
      const [startH, startM] = todayWorkingHour.start_time.split(':').map(Number);
      const [endH, endM] = todayWorkingHour.end_time.split(':').map(Number);
      totalOperatingMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    }
    const activeStaffCount = staffList.length || 1;
    // Average 60 min slots per specialist
    const maxCapacitySlots = Math.max(0, Math.floor((totalOperatingMinutes / 60) * activeStaffCount));
    const activeBookingsCount = completedAppts.length + confirmedAppts.length;
    const capacityUsagePercent = maxCapacitySlots > 0 ? Math.min(100, Math.round((activeBookingsCount / maxCapacitySlots) * 100)) : 0;

    // Urgent actions: pending appointments awaiting review
    const urgentActions = pendingAppts.map((a) => ({
      appointmentId: a.id,
      trackingCode: a.tracking_code,
      clientName: a.client_name,
      clientPhone: a.client_phone,
      bookingTime: a.booking_time,
      price: a.price,
      action: 'نیازمند تایید مدیر سالن',
    }));

    res.status(200).json({
      success: true,
      date: targetDateStr,
      metrics: {
        todayAppointmentsCount: todayAppointments.length,
        activeBookingsCount,
        completedCount: completedAppts.length,
        confirmedCount: confirmedAppts.length,
        pendingCount: pendingAppts.length,
        cancelledCount: cancelledAppts.length,
        noShowCount: noShowAppts.length,
        totalCollectedRevenue,
        pendingCollectionRevenue,
        totalEstimatedRevenue: totalCollectedRevenue + pendingCollectionRevenue,
        maxCapacitySlots,
        capacityUsagePercent,
        isClosedToday: !todayWorkingHour || todayWorkingHour.is_closed,
        workingHours: todayWorkingHour
          ? `${todayWorkingHour.start_time} الی ${todayWorkingHour.end_time}`
          : 'تعطیل',
      },
      urgentActions,
      // Phase 10: next confirmed/pending appointments from Tehran-now onward
      upcomingAppointments: allSalonAppointments
        .filter(
          (a) =>
            ['pending', 'confirmed'].includes(a.status) &&
            ((a.booking_date_greg || a.booking_date) > targetDateStr ||
              ((a.booking_date_greg || a.booking_date) === targetDateStr &&
                (a.booking_time || '') >= String(
                  new Intl.DateTimeFormat('en-GB', {
                    timeZone: 'Asia/Tehran',
                    hour: '2-digit',
                    minute: '2-digit',
                    hourCycle: 'h23',
                  }).format(new Date())
                )))
        )
        .sort((a, b) =>
          `${(a.booking_date_greg || a.booking_date)} ${a.booking_time}`.localeCompare(
            `${(b.booking_date_greg || b.booking_date)} ${b.booking_time}`
          )
        )
        .slice(0, 10),
      todayAppointments: todayAppointments.map((a) => ({
        id: a.id,
        trackingCode: a.tracking_code,
        clientName: a.client_name,
        clientPhone: a.client_phone,
        bookingTime: a.booking_time,
        endTime: a.end_time,
        price: a.price,
        status: a.status,
        serviceId: a.service_id,
        staffId: a.staff_id,
        notes: a.notes,
      })),
    });
  } catch (err: any) {
    res.status(500).json({
      error: 'DASHBOARD_OVERVIEW_ERROR',
      message: safeInternalErrorMessage(err),
    });
  }
});

/**
 * GET /api/salon/:salonId/appointments
 * Lists appointments strictly scoped to the tenant with optional filters
 */
salonRouter.get('/appointments', async (req: Request, res: Response) => {
  const salonId = String(req.params.salonId);
  const { status, date, staffId, search, from, to } = req.query as Record<string, string | undefined>;
  const limit = Math.min(Math.max(parseInt(String(req.query.limit || '50'), 10) || 50, 1), 200);
  const offset = Math.max(parseInt(String(req.query.offset || '0'), 10) || 0, 0);

  try {
    const filter = {
      status: status as any,
      date,
      staffId,
      // Canonical Gregorian range filters (Phase 10)
      startDate: from,
      endDate: to,
    };
    const [allAppointments, total] = await Promise.all([
      appointmentRepository.findBySalonId(salonId, { ...filter, limit, offset }),
      appointmentRepository.countBySalonId(salonId, filter),
    ]);

    let appointments = allAppointments;
    const q = (search || '').trim().toLowerCase();
    if (q) {
      appointments = appointments.filter(
        (a) =>
          a.client_name.toLowerCase().includes(q) ||
          a.client_phone.includes(q) ||
          a.tracking_code.toLowerCase().includes(q)
      );
    }

    // Phase 12: display enrichment — names from the authoritative tables.
    const serviceMap: Record<string, string> = {};
    const staffMap: Record<string, string> = {};
    try {
      const services = await serviceRepository.findBySalonId(salonId, false);
      for (const sv of services) serviceMap[sv.id] = sv.name;
      const staffList = await staffRepository.findBySalonId(salonId, false);
      for (const st of staffList) staffMap[st.id] = st.name;
    } catch {
      // names are best-effort enrichment only
    }

    res.status(200).json({
      success: true,
      appointments: appointments.map((a) => ({
        ...a,
        serviceName: serviceMap[a.service_id] || a.service_id,
        staffName: staffMap[a.staff_id] || a.staff_id,
      })),
      total,
      limit,
      offset,
    });
  } catch (err: any) {
    const statusCode = typeof err?.statusCode === 'number' ? err.statusCode : 500;
    res.status(statusCode).json({
      error: err?.code || 'APPOINTMENTS_FETCH_ERROR',
      message: err.message || 'خطا در بارگذاری نوبت‌ها.',
    });
  }
});

/**
 * GET /api/salon/:salonId/appointments/:appointmentId
 * Retrieves detailed appointment by ID
 */
salonRouter.get('/appointments/:appointmentId', async (req: Request, res: Response): Promise<void> => {
  const salonId = String(req.params.salonId);
  const appointmentId = String(req.params.appointmentId);

  try {
    const appt = await appointmentRepository.findById(appointmentId);
    if (!appt || appt.salon_id !== salonId) {
      res.status(404).json({
        error: 'APPOINTMENT_NOT_FOUND',
        message: 'نوبت مورد نظر یافت نشد.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      appointment: appt,
    });
  } catch (err: any) {
    res.status(500).json({
      error: 'APPOINTMENT_FETCH_ERROR',
      message: safeInternalErrorMessage(err),
    });
  }
});

/**
 * POST /api/salon/:salonId/appointments
 * Manual walk-in / receptionist booking creation with overlap and pricing checks
 */
salonRouter.post(
  '/appointments',
  requireSalonPermission('manage_calendar'),
  async (req: Request, res: Response): Promise<void> => {
    const salonId = String(req.params.salonId);
    const {
      clientName,
      clientPhone,
      serviceId,
      staffId,
      bookingDate,
      bookingTime,
      notes,
    } = req.body || {};

    if (!clientName || !clientPhone || !serviceId || !staffId || !bookingDate || !bookingTime) {
      res.status(400).json({
        error: 'MISSING_REQUIRED_FIELDS',
        message: 'نام، شماره همراه، خدمت، متخصص، تاریخ و ساعت نوبت الزامی هستند.',
      });
      return;
    }

    // Phase 09: the manual path uses the SAME booking engine as the public
    // path — schedule rules, eligibility, past-date policy, concurrency and
    // transactionality are identical; only the authorization differs
    // (staff session instead of customer grant/session).
    try {
      const created = await bookingService.createBooking({
        source: 'manual',
        salonId,
        serviceId: String(serviceId),
        staffId: String(staffId),
        bookingDate: String(bookingDate),
        bookingTime: String(bookingTime),
        clientName: String(clientName),
        clientPhone: String(clientPhone),
        notes: notes ? `${String(notes).trim()} (ثبت توسط پرسنل سالن)` : undefined,
        ipAddress: extractClientIp(req),
        userAgent: String(req.headers['user-agent'] || 'Unknown'),
      });

      res.status(201).json({
        success: true,
        message: 'نوبت حضوری با موفقیت در سیستم ثبت گردید.',
        appointment: created.appointment,
        trackingCode: created.trackingCode,
      });
    } catch (err: any) {
      const statusCode = typeof err?.statusCode === 'number' ? err.statusCode : 500;
      const code = err?.code || 'MANUAL_BOOKING_ERROR';
      res.status(statusCode).json({
        error: code,
        message: err.message || 'خطا در ثبت نوبت.',
      });
    }
  }
);

/**
 * PATCH /api/salon/:salonId/appointments/:appointmentId/status
 * Updates appointment status strictly guarded by salon permissions with transition validation
 */
salonRouter.patch(
  '/appointments/:appointmentId/status',
  requireSalonPermission('manage_calendar'),
  async (req: Request, res: Response): Promise<void> => {
    const salonId = String(req.params.salonId);
    const appointmentId = String(req.params.appointmentId);
    const { status, reason } = req.body || {};

    const allowedStatuses: AppointmentStatus[] = ['confirmed', 'completed', 'cancelled', 'no_show'];
    if (!status || !allowedStatuses.includes(status)) {
      res.status(400).json({
        error: 'INVALID_STATUS',
        message: 'وضعیت ارسالی معتبر نیست.',
      });
      return;
    }

    try {
      const appt = await appointmentRepository.findById(appointmentId);
      if (!appt || appt.salon_id !== salonId) {
        res.status(404).json({
          error: 'APPOINTMENT_NOT_FOUND',
          message: 'نوبت مورد نظر در این سالن یافت نشد.',
        });
        return;
      }

      // State transition rules:
      // A completed appointment cannot be cancelled directly without justification
      if (appt.status === 'completed' && status === 'cancelled' && !reason) {
        res.status(400).json({
          error: 'TRANSITION_FORBIDDEN',
          message: 'لغو نوبتی که قبلاً تسویه و تکمیل شده، نیازمند درج دلیل موجه است.',
        });
        return;
      }

      const updated = await appointmentRepository.updateStatus(
        appointmentId,
        status,
        req.user?.full_name || 'پرسنل سالن',
        reason,
        req.user?.id
      );

      await auditLogRepository.create({
        actor: req.user?.full_name || 'Staff',
        actorRole: req.user?.platform_role || 'staff',
        action: `تغییر وضعیت نوبت به ${status}`,
        target: `Appointment:${appointmentId}`,
        ipAddress: extractClientIp(req),
        userAgent: String(req.headers['user-agent'] || 'Unknown'),
        severity: status === 'cancelled' ? 'warning' : 'info',
        category: 'business',
        details: { salonId, oldStatus: appt.status, newStatus: status, reason },
      }).catch(() => {});

      res.status(200).json({
        success: true,
        message: 'وضعیت نوبت با موفقیت بروزرسانی شد.',
        appointment: updated,
      });
    } catch (err: any) {
      const statusCode = typeof err?.statusCode === 'number' ? err.statusCode : 500;
      res.status(statusCode).json({
        error: err?.code || 'APPOINTMENT_UPDATE_ERROR',
        message: err.message || 'خطا در تغییر وضعیت نوبت.',
      });
    }
  }
);

/**
 * PATCH /api/salon/:salonId/appointments/:appointmentId/reschedule
 * Reschedules appointment date/time with conflict validation
 */
salonRouter.patch(
  '/appointments/:appointmentId/reschedule',
  requireSalonPermission('manage_calendar'),
  async (req: Request, res: Response): Promise<void> => {
    const salonId = String(req.params.salonId);
    const appointmentId = String(req.params.appointmentId);
    const { bookingDate, bookingTime, staffId } = req.body || {};

    if (!bookingDate || !bookingTime) {
      res.status(400).json({
        error: 'MISSING_DATE_TIME',
        message: 'تاریخ و ساعت جدید الزامی است.',
      });
      return;
    }

    // Phase 09: single reschedule engine — schedule rules, staff ownership and
    // eligibility, past-date policy, the (salon, date) advisory lock and the
    // overlap check all run INSIDE the move transaction (closing the old
    // check-then-move TOCTOU).
    try {
      const updated = await bookingService.rescheduleAppointment({
        salonId,
        appointmentId,
        newDate: String(bookingDate),
        newTime: String(bookingTime),
        newStaffId: staffId ? String(staffId) : undefined,
        actorName: req.user?.full_name,
        actorUserId: req.user?.id,
        ipAddress: extractClientIp(req),
        userAgent: String(req.headers['user-agent'] || 'Unknown'),
      });

      res.status(200).json({
        success: true,
        message: 'زمان نوبت با موفقیت تغییر یافت.',
        appointment: updated,
      });
    } catch (err: any) {
      const statusCode = typeof err?.statusCode === 'number' ? err.statusCode : 500;
      const code = err?.code || 'RESCHEDULE_ERROR';
      res.status(statusCode).json({
        error: code,
        message: err.message || 'خطا در جابجایی نوبت.',
      });
    }
  }
);

/**
 * GET /api/salon/:salonId/customers
 * Customers of THIS salon only (salon_clients join), search + stable
 * pagination. PII restriction (Phase 10): staff/receptionist roles see the
 * name and a masked phone; owners/managers see full contact data.
 */
salonRouter.get('/customers', async (req: Request, res: Response): Promise<void> => {
  const salonId = String(req.params.salonId);
  const limit = Math.min(Math.max(parseInt(String(req.query.limit || '50'), 10) || 50, 1), 200);
  const offset = Math.max(parseInt(String(req.query.offset || '0'), 10) || 0, 0);
  const search = req.query.search ? String(req.query.search) : undefined;

  const membership = (req.salonMemberships || []).find((m) => m.salon_id === salonId);
  const isPrivileged = membership?.role === 'owner' || membership?.role === 'manager' ||
    req.user?.platform_role === 'super_admin';

  try {
    const [customers, total] = await Promise.all([
      clientRepository.findBySalonId(salonId, limit, offset, undefined, search),
      clientRepository.countBySalonId(salonId, undefined, search),
    ]);

    const mapped = customers.map((c) => ({
      id: c.id,
      fullName: c.full_name,
      phone: isPrivileged ? c.phone : `${c.phone.slice(0, 4)}****${c.phone.slice(-2)}`,
      email: isPrivileged ? c.email : null,
      notes: isPrivileged ? c.notes : null,
      totalBookings: c.total_bookings,
      totalSpent: typeof c.total_spent === 'string' ? parseInt(c.total_spent, 10) : c.total_spent,
      lastVisitAt: c.last_visit_at,
    }));

    res.status(200).json({
      success: true,
      customers: mapped,
      total,
      limit,
      offset,
      piiRestricted: !isPrivileged,
    });
  } catch (err: any) {
    const statusCode = typeof err?.statusCode === 'number' ? err.statusCode : 500;
    res.status(statusCode).json({
      error: err?.code || 'CUSTOMERS_FETCH_ERROR',
      message: err.message || 'خطا در بارگذاری مشتریان.',
    });
  }
});

/**
 * GET /api/salon/:salonId/customers/:clientId
 * Single customer record — must belong to THIS salon (salon_clients link).
 */
salonRouter.get('/customers/:clientId', async (req: Request, res: Response): Promise<void> => {
  const salonId = String(req.params.salonId);
  const clientId = String(req.params.clientId);

  const membership = (req.salonMemberships || []).find((m) => m.salon_id === salonId);
  const isPrivileged = membership?.role === 'owner' || membership?.role === 'manager' ||
    req.user?.platform_role === 'super_admin';

  try {
    const link = await clientRepository.getSalonClient(salonId, clientId);
    if (!link) {
      res.status(404).json({
        error: 'CUSTOMER_NOT_FOUND',
        message: 'مشتری برای این سالن یافت نشد.',
      });
      return;
    }
    const customer = await clientRepository.findById(clientId);
    if (!customer) {
      res.status(404).json({
        error: 'CUSTOMER_NOT_FOUND',
        message: 'مشتری یافت نشد.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      customer: {
        id: customer.id,
        fullName: customer.full_name,
        phone: isPrivileged ? customer.phone : `${customer.phone.slice(0, 4)}****${customer.phone.slice(-2)}`,
        email: isPrivileged ? customer.email : null,
        notes: isPrivileged ? customer.notes : null,
        totalBookings: link.total_bookings,
        totalSpent: typeof link.total_spent === 'string' ? parseInt(link.total_spent, 10) : link.total_spent,
        lastVisitAt: link.last_visit_at,
      },
      piiRestricted: !isPrivileged,
    });
  } catch (err: any) {
    const statusCode = typeof err?.statusCode === 'number' ? err.statusCode : 500;
    res.status(statusCode).json({
      error: err?.code || 'CUSTOMER_FETCH_ERROR',
      message: err.message || 'خطا در دریافت مشتری.',
    });
  }
});

/**
 * PUT /api/salon/:salonId/working-hours/staff/:staffId
 * Replaces a staff member's weekly hours transactionally. The staff member
 * must belong to this salon; times are validated (HH:MM, 0<=day<=6).
 */
salonRouter.put(
  '/working-hours/staff/:staffId',
  requireSalonPermission('manage_settings'),
  async (req: Request, res: Response): Promise<void> => {
    const salonId = String(req.params.salonId);
    const staffId = String(req.params.staffId);
    const { hours } = req.body || {};

    if (!Array.isArray(hours)) {
      res.status(400).json({
        error: 'INVALID_HOURS_FORMAT',
        message: 'ساعات کاری باید به صورت آرایه‌ای از روزها ارسال گردد.',
      });
      return;
    }
    for (const h of hours) {
      if (
        !Number.isInteger(h.dayOfWeek) || h.dayOfWeek < 0 || h.dayOfWeek > 6 ||
        !/^([01]\d|2[0-3]):([0-5]\d)$/.test(String(h.startTime)) ||
        !/^([01]\d|2[0-3]):([0-5]\d)$/.test(String(h.endTime))
      ) {
        res.status(400).json({
          error: 'INVALID_HOURS_ENTRY',
          message: 'روز هفته (۰ تا ۶) و قالب ساعت (HH:MM) معتبر نیستند.',
        });
        return;
      }
      if (!h.isClosed && h.startTime >= h.endTime) {
        res.status(400).json({
          error: 'INVALID_HOURS_RANGE',
          message: 'ساعت شروع باید قبل از ساعت پایان باشد.',
        });
        return;
      }
    }

    try {
      const staff = await staffRepository.findById(staffId);
      if (!staff || staff.salon_id !== salonId) {
        res.status(404).json({
          error: 'STAFF_NOT_FOUND',
          message: 'متخصص برای این سالن یافت نشد.',
        });
        return;
      }

      await salonRepository.setStaffWorkingHours(
        salonId,
        staffId,
        hours.map((h: any) => ({
          dayOfWeek: h.dayOfWeek,
          startTime: String(h.startTime),
          endTime: String(h.endTime),
          isClosed: Boolean(h.isClosed),
        }))
      );

      const saved = await salonRepository.getStaffWorkingHours(salonId, staffId);

      await auditLogRepository.create({
        actor: req.user?.full_name || 'مدیر سالن',
        actorRole: req.user?.platform_role || 'salon_manager',
        action: 'تنظیم ساعات کاری هفتگی متخصص',
        target: `Staff:${staffId}`,
        ipAddress: extractClientIp(req),
        userAgent: String(req.headers['user-agent'] || 'Unknown'),
        severity: 'info',
        category: 'business',
        details: { salonId, staffId, days: hours.length },
      }).catch(() => {});

      res.status(200).json({
        success: true,
        message: 'ساعات کاری متخصص بروزرسانی شد.',
        workingHours: saved,
      });
    } catch (err: any) {
      const statusCode = typeof err?.statusCode === 'number' ? err.statusCode : 500;
      res.status(statusCode).json({
        error: err?.code || 'STAFF_HOURS_UPDATE_ERROR',
        message: err.message || 'خطا در ذخیره ساعات کاری متخصص.',
      });
    }
  }
);

/**
 * DELETE /api/salon/:salonId/staff/:staffId/services/:serviceId
 * Removes a staff-service assignment (manage_staff).
 */
salonRouter.delete(
  '/staff/:staffId/services/:serviceId',
  requireSalonPermission('manage_staff'),
  async (req: Request, res: Response): Promise<void> => {
    const salonId = String(req.params.salonId);
    const staffId = String(req.params.staffId);
    const serviceId = String(req.params.serviceId);

    try {
      const staff = await staffRepository.findById(staffId);
      if (!staff || staff.salon_id !== salonId) {
        res.status(404).json({
          error: 'STAFF_NOT_FOUND',
          message: 'متخصص برای این سالن یافت نشد.',
        });
        return;
      }
      const service = await serviceRepository.findById(serviceId);
      if (!service || service.salon_id !== salonId) {
        res.status(404).json({
          error: 'SERVICE_NOT_FOUND',
          message: 'خدمت برای این سالن یافت نشد.',
        });
        return;
      }

      const removed = await staffRepository.removeServiceAssignment(staffId, serviceId);
      if (!removed) {
        res.status(404).json({
          error: 'ASSIGNMENT_NOT_FOUND',
          message: 'این خدمت به این متخصص اختصاص نیافته است.',
        });
        return;
      }
      const remaining = await staffRepository.getAssignedServices(staffId);

      await auditLogRepository.create({
        actor: req.user?.full_name || 'مدیر سالن',
        actorRole: req.user?.platform_role || 'salon_manager',
        action: 'حذف اتصال خدمت از متخصص',
        target: `Staff:${staffId}:Service:${serviceId}`,
        ipAddress: extractClientIp(req),
        userAgent: String(req.headers['user-agent'] || 'Unknown'),
        severity: 'info',
        category: 'business',
        details: { salonId, staffId, serviceId },
      }).catch(() => {});

      res.status(200).json({
        success: true,
        message: 'اتصال خدمت حذف شد.',
        assignedServices: remaining,
      });
    } catch (err: any) {
      const statusCode = typeof err?.statusCode === 'number' ? err.statusCode : 500;
      res.status(statusCode).json({
        error: err?.code || 'ASSIGNMENT_DELETE_ERROR',
        message: err.message || 'خطا در حذف اتصال خدمت.',
      });
    }
  }
);

/**
 * GET /api/salon/:salonId/services
 * Lists salon services (active and inactive)
 */
salonRouter.get('/services', async (req: Request, res: Response): Promise<void> => {
  const salonId = String(req.params.salonId);
  const includeInactive = req.query.includeInactive === 'true';

  try {
    const services = await serviceRepository.findBySalonId(salonId, !includeInactive);
    res.status(200).json({
      success: true,
      count: services.length,
      services,
    });
  } catch (err: any) {
    res.status(500).json({
      error: 'SERVICES_FETCH_ERROR',
      message: safeInternalErrorMessage(err),
    });
  }
});

/**
 * POST /api/salon/:salonId/services
 * Creates new service in the salon catalog
 */
salonRouter.post(
  '/services',
  requireSalonPermission('manage_services'),
  async (req: Request, res: Response): Promise<void> => {
    const salonId = String(req.params.salonId);
    const { name, category, categoryLabel, price, durationMinutes, description, isActive } = req.body || {};

    if (!name || price === undefined || !category) {
      res.status(400).json({
        error: 'INVALID_SERVICE_DATA',
        message: 'نام خدمت، دسته‌بندی و قیمت الزامی هستند.',
      });
      return;
    }

    if (Number(price) < 0 || (durationMinutes && Number(durationMinutes) <= 0)) {
      res.status(400).json({
        error: 'INVALID_SERVICE_CONSTRAINTS',
        message: 'قیمت و مدت زمان خدمت باید مقادیر مثبت باشند.',
      });
      return;
    }

    try {
      const serviceId = `srv-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
      const created = await serviceRepository.create({
        id: serviceId,
        salonId,
        name: String(name).trim(),
        category: String(category).trim(),
        categoryLabel: categoryLabel ? String(categoryLabel).trim() : String(name).trim(),
        price: Number(price),
        durationMinutes: durationMinutes ? Number(durationMinutes) : 60,
        description: description ? String(description).trim() : null,
        isActive: isActive !== false,
      });

      await auditLogRepository.create({
        actor: req.user?.full_name || 'مدیر سالن',
        actorRole: req.user?.platform_role || 'salon_manager',
        action: `افزودن خدمت جدید: ${name}`,
        target: `Service:${serviceId}`,
        ipAddress: extractClientIp(req),
        userAgent: String(req.headers['user-agent'] || 'Unknown'),
        severity: 'info',
        category: 'business',
        details: { salonId, serviceId, name, price },
      }).catch(() => {});

      res.status(201).json({
        success: true,
        message: 'خدمت جدید با موفقیت ثبت شد.',
        service: created,
      });
    } catch (err: any) {
      res.status(500).json({
        error: 'SERVICE_CREATE_ERROR',
        message: safeInternalErrorMessage(err),
      });
    }
  }
);

/**
 * PATCH /api/salon/:salonId/services/:serviceId
 * Edits existing service
 */
salonRouter.patch(
  '/services/:serviceId',
  requireSalonPermission('manage_services'),
  async (req: Request, res: Response): Promise<void> => {
    const salonId = String(req.params.salonId);
    const serviceId = String(req.params.serviceId);
    const { name, category, categoryLabel, price, durationMinutes, description, isActive } = req.body || {};

    try {
      const existing = await serviceRepository.findById(serviceId);
      if (!existing || existing.salon_id !== salonId) {
        res.status(404).json({
          error: 'SERVICE_NOT_FOUND',
          message: 'خدمت مورد نظر در این سالن یافت نشد.',
        });
        return;
      }

      const updated = await serviceRepository.update(serviceId, {
        name,
        category,
        categoryLabel,
        price: price !== undefined ? Number(price) : undefined,
        durationMinutes: durationMinutes !== undefined ? Number(durationMinutes) : undefined,
        description,
        isActive,
      });

      await auditLogRepository.create({
        actor: req.user?.full_name || 'مدیر سالن',
        actorRole: req.user?.platform_role || 'salon_manager',
        action: `ویرایش خدمت: ${existing.name}`,
        target: `Service:${serviceId}`,
        ipAddress: extractClientIp(req),
        userAgent: String(req.headers['user-agent'] || 'Unknown'),
        severity: 'info',
        category: 'business',
        details: { salonId, serviceId, updatedFields: Object.keys(req.body || {}) },
      }).catch(() => {});

      res.status(200).json({
        success: true,
        message: 'خدمت با موفقیت ویرایش شد.',
        service: updated,
      });
    } catch (err: any) {
      res.status(500).json({
        error: 'SERVICE_UPDATE_ERROR',
        message: safeInternalErrorMessage(err),
      });
    }
  }
);

/**
 * DELETE /api/salon/:salonId/services/:serviceId
 * Deactivates or removes a service
 */
salonRouter.delete(
  '/services/:serviceId',
  requireSalonPermission('manage_services'),
  async (req: Request, res: Response): Promise<void> => {
    const salonId = String(req.params.salonId);
    const serviceId = String(req.params.serviceId);

    try {
      const existing = await serviceRepository.findById(serviceId);
      if (!existing || existing.salon_id !== salonId) {
        res.status(404).json({
          error: 'SERVICE_NOT_FOUND',
          message: 'خدمت مورد نظر یافت نشد.',
        });
        return;
      }

      await serviceRepository.delete(serviceId);

      await auditLogRepository.create({
        actor: req.user?.full_name || 'مدیر سالن',
        actorRole: req.user?.platform_role || 'salon_manager',
        action: `غیرفعال‌سازی خدمت: ${existing.name}`,
        target: `Service:${serviceId}`,
        ipAddress: extractClientIp(req),
        userAgent: String(req.headers['user-agent'] || 'Unknown'),
        severity: 'warning',
        category: 'business',
        details: { salonId, serviceId, name: existing.name },
      }).catch(() => {});

      res.status(200).json({
        success: true,
        message: 'خدمت با موفقیت غیرفعال شد.',
      });
    } catch (err: any) {
      res.status(500).json({
        error: 'SERVICE_DELETE_ERROR',
        message: safeInternalErrorMessage(err),
      });
    }
  }
);

/**
 * GET /api/salon/:salonId/staff
 * Lists salon staff members and assigned services
 */
salonRouter.get('/staff', async (req: Request, res: Response): Promise<void> => {
  const salonId = String(req.params.salonId);
  const includeInactive = req.query.includeInactive === 'true';

  try {
    const staff = await staffRepository.findBySalonId(salonId, !includeInactive);
    
    // Attach assigned services count
    const staffWithServices = await Promise.all(
      staff.map(async (st) => {
        const assigned = await staffRepository.getAssignedServices(st.id);
        return {
          ...st,
          assignedServicesCount: assigned.length,
          assignedServiceIds: assigned.map((a) => a.service_id),
        };
      })
    );

    res.status(200).json({
      success: true,
      count: staffWithServices.length,
      staff: staffWithServices,
    });
  } catch (err: any) {
    res.status(500).json({
      error: 'STAFF_FETCH_ERROR',
      message: safeInternalErrorMessage(err),
    });
  }
});

/**
 * POST /api/salon/:salonId/staff
 * Adds new specialist to the salon
 */
salonRouter.post(
  '/staff',
  requireSalonPermission('manage_staff'),
  async (req: Request, res: Response): Promise<void> => {
    const salonId = String(req.params.salonId);
    const { name, phone, role, specialty, avatarUrl, rating, isActive } = req.body || {};

    if (!name || !role) {
      res.status(400).json({
        error: 'INVALID_STAFF_DATA',
        message: 'نام و عنوان شغلی متخصص الزامی هستند.',
      });
      return;
    }

    try {
      const staffId = `stf-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
      const created = await staffRepository.create({
        id: staffId,
        salonId,
        name: String(name).trim(),
        phone: phone ? normalizeIranianPhone(String(phone)).national : null,
        role: String(role).trim(),
        specialty: specialty ? String(specialty).trim() : null,
        avatarUrl: avatarUrl ? String(avatarUrl).trim() : null,
        rating: rating ? Number(rating) : 5.0,
        isActive: isActive !== false,
      });

      await auditLogRepository.create({
        actor: req.user?.full_name || 'مدیر سالن',
        actorRole: req.user?.platform_role || 'salon_manager',
        action: `افزودن پرسنل جدید: ${name}`,
        target: `Staff:${staffId}`,
        ipAddress: extractClientIp(req),
        userAgent: String(req.headers['user-agent'] || 'Unknown'),
        severity: 'info',
        category: 'business',
        details: { salonId, staffId, name, role },
      }).catch(() => {});

      res.status(201).json({
        success: true,
        message: 'پرسنل جدید با موفقیت اضافه شد.',
        staff: created,
      });
    } catch (err: any) {
      res.status(500).json({
        error: 'STAFF_CREATE_ERROR',
        message: safeInternalErrorMessage(err),
      });
    }
  }
);

/**
 * PATCH /api/salon/:salonId/staff/:staffId
 * Updates staff member details
 */
salonRouter.patch(
  '/staff/:staffId',
  requireSalonPermission('manage_staff'),
  async (req: Request, res: Response): Promise<void> => {
    const salonId = String(req.params.salonId);
    const staffId = String(req.params.staffId);
    const { name, phone, role, specialty, avatarUrl, rating, isActive } = req.body || {};

    try {
      const existing = await staffRepository.findById(staffId);
      if (!existing || existing.salon_id !== salonId) {
        res.status(404).json({
          error: 'STAFF_NOT_FOUND',
          message: 'پرسنل مورد نظر در این سالن یافت نشد.',
        });
        return;
      }

      const updated = await staffRepository.update(staffId, {
        name,
        phone: phone ? normalizeIranianPhone(String(phone)).national : undefined,
        role,
        specialty,
        avatarUrl,
        rating,
        isActive,
      });

      await auditLogRepository.create({
        actor: req.user?.full_name || 'مدیر سالن',
        actorRole: req.user?.platform_role || 'salon_manager',
        action: `ویرایش پرسنل: ${existing.name}`,
        target: `Staff:${staffId}`,
        ipAddress: extractClientIp(req),
        userAgent: String(req.headers['user-agent'] || 'Unknown'),
        severity: 'info',
        category: 'business',
        details: { salonId, staffId, updatedFields: Object.keys(req.body || {}) },
      }).catch(() => {});

      res.status(200).json({
        success: true,
        message: 'مشخصات پرسنل با موفقیت بروزرسانی شد.',
        staff: updated,
      });
    } catch (err: any) {
      res.status(500).json({
        error: 'STAFF_UPDATE_ERROR',
        message: safeInternalErrorMessage(err),
      });
    }
  }
);

/**
 * POST /api/salon/:salonId/staff/:staffId/services
 * Maps services offered by this specialist
 */
salonRouter.post(
  '/staff/:staffId/services',
  requireSalonPermission('manage_staff'),
  async (req: Request, res: Response): Promise<void> => {
    const salonId = String(req.params.salonId);
    const staffId = String(req.params.staffId);
    const { serviceIds, serviceId, customPrice, customDuration, isPrimary } = req.body || {};

    try {
      const staff = await staffRepository.findById(staffId);
      if (!staff || staff.salon_id !== salonId) {
        res.status(404).json({
          error: 'STAFF_NOT_FOUND',
          message: 'پرسنل مورد نظر یافت نشد.',
        });
        return;
      }

      if (Array.isArray(serviceIds)) {
        for (const sId of serviceIds) {
          await staffRepository.assignService(staffId, sId);
        }
      } else if (serviceId) {
        await staffRepository.assignService(
          staffId,
          serviceId,
          customPrice,
          customDuration,
          isPrimary
        );
      }

      res.status(200).json({
        success: true,
        message: 'خدمات پرسنل با موفقیت اختصاص داده شد.',
      });
    } catch (err: any) {
      res.status(500).json({
        error: 'STAFF_SERVICES_ASSIGN_ERROR',
        message: safeInternalErrorMessage(err),
      });
    }
  }
);

/**
 * GET /api/salon/:salonId/working-hours
 * Gets weekly working hours and scheduled exceptions
 */
salonRouter.get('/working-hours', async (req: Request, res: Response): Promise<void> => {
  const salonId = String(req.params.salonId);

  try {
    const [hours, exceptions, staffList] = await Promise.all([
      salonRepository.getWorkingHours(salonId),
      salonRepository.getAllAvailabilityExceptions(salonId),
      staffRepository.findBySalonId(salonId, true),
    ]);

    // Phase 10: staff-level hours included so the panel can edit them
    const staffHours = await Promise.all(
      staffList.map(async (st) => ({
        staffId: st.id,
        staffName: st.name,
        hours: await salonRepository.getStaffWorkingHours(salonId, st.id),
      }))
    );

    res.status(200).json({
      success: true,
      workingHours: hours,
      staffHours,
      exceptions,
    });
  } catch (err: any) {
    res.status(500).json({
      error: 'WORKING_HOURS_FETCH_ERROR',
      message: safeInternalErrorMessage(err),
    });
  }
});

/**
 * PUT /api/salon/:salonId/working-hours
 * Configures weekly operating schedule
 */
salonRouter.put(
  '/working-hours',
  requireSalonPermission('manage_settings'),
  async (req: Request, res: Response): Promise<void> => {
    const salonId = String(req.params.salonId);
    const { hours } = req.body || {};

    if (!Array.isArray(hours)) {
      res.status(400).json({
        error: 'INVALID_HOURS_FORMAT',
        message: 'ساعات کاری باید به صورت آرایه‌ای از روزها ارسال گردد.',
      });
      return;
    }

    // Validate day of week and times
    for (const h of hours) {
      if (h.dayOfWeek < 0 || h.dayOfWeek > 6) {
        res.status(400).json({
          error: 'INVALID_DAY_OF_WEEK',
          message: 'شماره روز هفته باید بین ۰ (شنبه) تا ۶ (جمعه) باشد.',
        });
        return;
      }
      if (!h.isClosed && h.startTime >= h.endTime) {
        res.status(400).json({
          error: 'INVALID_TIME_RANGE',
          message: 'ساعت شروع کاری باید قبل از ساعت پایان باشد.',
        });
        return;
      }
    }

    try {
      await salonRepository.setWorkingHours(salonId, hours);

      await auditLogRepository.create({
        actor: req.user?.full_name || 'مدیر سالن',
        actorRole: req.user?.platform_role || 'salon_manager',
        action: 'بروزرسانی ساعات کاری هفتگی سالن',
        target: `Salon:${salonId}`,
        ipAddress: extractClientIp(req),
        userAgent: String(req.headers['user-agent'] || 'Unknown'),
        severity: 'info',
        category: 'business',
        details: { salonId, updatedDaysCount: hours.length },
      }).catch(() => {});

      res.status(200).json({
        success: true,
        message: 'ساعات کاری سالن با موفقیت ذخیره شد.',
      });
    } catch (err: any) {
      res.status(500).json({
        error: 'WORKING_HOURS_UPDATE_ERROR',
        message: safeInternalErrorMessage(err),
      });
    }
  }
);

/**
 * POST /api/salon/:salonId/exceptions
 * Adds schedule exception (holiday, leave, special operating hours)
 */
salonRouter.post(
  '/exceptions',
  requireSalonPermission('manage_settings'),
  async (req: Request, res: Response): Promise<void> => {
    const salonId = String(req.params.salonId);
    const { staffId, startDate, endDate, startTime, endTime, reason, exceptionType, isAvailable } = req.body || {};

    if (!startDate || !endDate || !reason) {
      res.status(400).json({
        error: 'MISSING_EXCEPTION_FIELDS',
        message: 'تاریخ شروع، تاریخ پایان و دلیل تعطیلی یا استثنا الزامی هستند.',
      });
      return;
    }

    if (startDate > endDate) {
      res.status(400).json({
        error: 'INVALID_DATE_RANGE',
        message: 'تاریخ شروع نمی‌تواند پس از تاریخ پایان باشد.',
      });
      return;
    }

    try {
      const created = await salonRepository.addAvailabilityException({
        salonId,
        staffId,
        startDate,
        endDate,
        startTime,
        endTime,
        reason: String(reason).trim(),
        exceptionType,
        isAvailable,
      });

      await auditLogRepository.create({
        actor: req.user?.full_name || 'مدیر سالن',
        actorRole: req.user?.platform_role || 'salon_manager',
        action: `افزودن استثنا/تعطیلی: ${reason}`,
        target: `Exception:${created.id}`,
        ipAddress: extractClientIp(req),
        userAgent: String(req.headers['user-agent'] || 'Unknown'),
        severity: 'info',
        category: 'business',
        details: { salonId, startDate, endDate, reason },
      }).catch(() => {});

      res.status(201).json({
        success: true,
        message: 'استثنای تقویم با موفقیت ثبت شد.',
        exception: created,
      });
    } catch (err: any) {
      res.status(500).json({
        error: 'EXCEPTION_CREATE_ERROR',
        message: safeInternalErrorMessage(err),
      });
    }
  }
);

/**
 * DELETE /api/salon/:salonId/exceptions/:exceptionId
 * Deletes schedule exception
 */
salonRouter.delete(
  '/exceptions/:exceptionId',
  requireSalonPermission('manage_settings'),
  async (req: Request, res: Response): Promise<void> => {
    const salonId = String(req.params.salonId);
    const exceptionId = String(req.params.exceptionId);

    try {
      const deleted = await salonRepository.deleteAvailabilityException(salonId, exceptionId);
      if (!deleted) {
        res.status(404).json({
          error: 'EXCEPTION_NOT_FOUND',
          message: 'استثنای مورد نظر یافت نشد.',
        });
        return;
      }

      await auditLogRepository.create({
        actor: req.user?.full_name || 'مدیر سالن',
        actorRole: req.user?.platform_role || 'salon_manager',
        action: `حذف استثنای تقویم (${exceptionId})`,
        target: `Exception:${exceptionId}`,
        ipAddress: extractClientIp(req),
        userAgent: String(req.headers['user-agent'] || 'Unknown'),
        severity: 'info',
        category: 'business',
        details: { salonId, exceptionId },
      }).catch(() => {});

      res.status(200).json({
        success: true,
        message: 'استثنای تقویم با موفقیت حذف گردید.',
      });
    } catch (err: any) {
      res.status(500).json({
        error: 'EXCEPTION_DELETE_ERROR',
        message: safeInternalErrorMessage(err),
      });
    }
  }
);
