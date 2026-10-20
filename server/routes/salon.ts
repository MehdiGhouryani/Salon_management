import express from 'express';
import type { Request, Response } from 'express';
import { requireSalonMembership, requireSalonPermission, csrfProtection } from '../middleware/auth.ts';
import { salonRepository } from '../repositories/salonRepository.ts';
import { appointmentRepository, type AppointmentStatus } from '../repositories/appointmentRepository.ts';
import { serviceRepository } from '../repositories/serviceRepository.ts';
import { staffRepository } from '../repositories/staffRepository.ts';
import { clientRepository } from '../repositories/clientRepository.ts';
import { auditLogRepository } from '../repositories/auditLogRepository.ts';
import { extractClientIp } from '../services/auth/sessionService.ts';
import { normalizeIranianPhone } from '../utils/phone.ts';
import {
  addMinutesToTimeString,
  formatIranianDate,
  getIranianDayOfWeek,
  parseBookingDate,
} from '../utils/bookingTime.ts';

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
      message: err.message,
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
        message: err.message,
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
  const targetDateStr = String(req.query.date || formatIranianDate(new Date())).trim();

  try {
    const [allSalonAppointments, workingHours, staffList] = await Promise.all([
      appointmentRepository.findBySalonId(salonId),
      salonRepository.getWorkingHours(salonId),
      staffRepository.findBySalonId(salonId, true),
    ]);

    // Parse target date to calculate day of week
    const parsedDate = parseBookingDate(targetDateStr);
    const dayOfWeek = getIranianDayOfWeek(parsedDate);
    const todayWorkingHour = workingHours.find((w) => w.day_of_week === dayOfWeek);

    // Filter appointments for target date
    const todayAppointments = allSalonAppointments.filter(
      (a) => a.booking_date === targetDateStr || a.booking_date === 'امروز'
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
      message: err.message,
    });
  }
});

/**
 * GET /api/salon/:salonId/appointments
 * Lists appointments strictly scoped to the tenant with optional filters
 */
salonRouter.get('/appointments', async (req: Request, res: Response) => {
  const salonId = String(req.params.salonId);
  const { status, date, staffId, search } = req.query as Record<string, string | undefined>;

  try {
    let appointments = await appointmentRepository.findBySalonId(salonId, {
      status: status as any,
      date,
      staffId,
    });

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      appointments = appointments.filter(
        (a) =>
          a.client_name.toLowerCase().includes(q) ||
          a.client_phone.includes(q) ||
          a.tracking_code.toLowerCase().includes(q)
      );
    }

    res.status(200).json({
      success: true,
      count: appointments.length,
      appointments,
    });
  } catch (err: any) {
    res.status(500).json({
      error: 'APPOINTMENTS_FETCH_ERROR',
      message: err.message,
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
      message: err.message,
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

    const phoneRes = normalizeIranianPhone(String(clientPhone));
    if (!phoneRes.isValid) {
      res.status(400).json({
        error: 'INVALID_PHONE_NUMBER',
        message: 'شماره موبایل وارد شده معتبر نیست.',
      });
      return;
    }
    const normalizedPhone = phoneRes.national;

    try {
      // 1. Verify service belongs to salon
      const service = await serviceRepository.findById(serviceId);
      if (!service || service.salon_id !== salonId || !service.is_active) {
        res.status(404).json({
          error: 'SERVICE_NOT_FOUND',
          message: 'خدمت انتخابی در این سالن یافت نشد یا غیرفعال است.',
        });
        return;
      }

      // 2. Verify staff belongs to salon
      const staff = await staffRepository.findById(staffId);
      if (!staff || staff.salon_id !== salonId || !staff.is_active) {
        res.status(404).json({
          error: 'STAFF_NOT_FOUND',
          message: 'متخصص انتخابی در این سالن یافت نشد یا غیرفعال است.',
        });
        return;
      }

      // 3. Compute duration and end_time
      const duration = service.duration_minutes || 60;
      const endTime = addMinutesToTimeString(bookingTime, duration);

      // 4. Check slot overlap
      const isSlotFree = await appointmentRepository.checkSlotOverlap(
        salonId,
        staffId,
        bookingDate,
        bookingTime,
        endTime
      );

      if (!isSlotFree) {
        res.status(409).json({
          error: 'SLOT_ALREADY_TAKEN',
          message: 'این بازه زمانی برای متخصص انتخابی قبلاً رزرو شده است. لطفاً زمان دیگری انتخاب فرمایید.',
        });
        return;
      }

      // 5. Create or find client record
      const client = await clientRepository.createOrUpdate({
        phone: normalizedPhone,
        fullName: String(clientName).trim(),
      });
      await clientRepository.recordBookingVisit(salonId, client.id, Number(service.price));

      // 6. Generate tracking code
      const trackingSuffix = Math.floor(1000 + Math.random() * 9000);
      const trackingCode = `MAN-${trackingSuffix}`;
      const appointmentId = `apt-${Date.now()}-${trackingSuffix}`;

      // 7. Create appointment
      const created = await appointmentRepository.create({
        id: appointmentId,
        trackingCode,
        salonId,
        serviceId: service.id,
        staffId: staff.id,
        clientId: client.id,
        clientName: String(clientName).trim(),
        clientPhone: normalizedPhone,
        bookingDate,
        bookingTime,
        endTime,
        price: Number(service.price),
        status: 'confirmed',
        paymentMethod: 'in_person',
        paymentStatus: 'pending',
        notes: notes ? String(notes).trim() : 'ثبت مستقیم توسط پرسنل سالن',
      });

      // 8. Record audit log
      await auditLogRepository.create({
        actor: req.user?.full_name || 'مدیر سالن',
        actorRole: req.user?.platform_role || 'staff',
        action: `ثبت نوبت حضوری جدید (کد: ${trackingCode})`,
        target: `Appointment:${appointmentId}`,
        ipAddress: extractClientIp(req),
        userAgent: String(req.headers['user-agent'] || 'Unknown'),
        severity: 'info',
        category: 'business',
        details: { salonId, appointmentId, trackingCode, price: service.price, staffId },
      }).catch(() => {});

      res.status(201).json({
        success: true,
        message: 'نوبت حضوری با موفقیت در سیستم ثبت گردید.',
        appointment: created,
      });
    } catch (err: any) {
      res.status(500).json({
        error: 'MANUAL_BOOKING_ERROR',
        message: err.message,
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
      res.status(500).json({
        error: 'APPOINTMENT_STATUS_UPDATE_ERROR',
        message: err.message,
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

    try {
      const appt = await appointmentRepository.findById(appointmentId);
      if (!appt || appt.salon_id !== salonId) {
        res.status(404).json({
          error: 'APPOINTMENT_NOT_FOUND',
          message: 'نوبت مورد نظر یافت نشد.',
        });
        return;
      }

      if (appt.status === 'cancelled' || appt.status === 'completed') {
        res.status(400).json({
          error: 'RESCHEDULE_NOT_ALLOWED',
          message: 'امکان جابجایی نوبت‌های تکمیل‌شده یا لغو‌شده وجود ندارد.',
        });
        return;
      }

      const targetStaffId = staffId || appt.staff_id;

      // Determine duration
      const service = await serviceRepository.findById(appt.service_id);
      const duration = service?.duration_minutes || 60;
      const endTime = addMinutesToTimeString(bookingTime, duration);

      // Verify no conflict at new time
      const isSlotFree = await appointmentRepository.checkSlotOverlap(
        salonId,
        targetStaffId,
        bookingDate,
        bookingTime,
        endTime,
        appointmentId // Exclude current appointment
      );

      if (!isSlotFree) {
        res.status(409).json({
          error: 'SLOT_ALREADY_TAKEN',
          message: 'زمان جدید انتخابی با نوبت دیگری تداخل دارد.',
        });
        return;
      }

      const updated = await appointmentRepository.reschedule(
        appointmentId,
        bookingDate,
        bookingTime,
        endTime,
        targetStaffId,
        req.user?.full_name,
        req.user?.id
      );

      await auditLogRepository.create({
        actor: req.user?.full_name || 'مدیر سالن',
        actorRole: req.user?.platform_role || 'staff',
        action: `جابجایی زمان نوبت به ${bookingDate} ${bookingTime}`,
        target: `Appointment:${appointmentId}`,
        ipAddress: extractClientIp(req),
        userAgent: String(req.headers['user-agent'] || 'Unknown'),
        severity: 'info',
        category: 'business',
        details: { salonId, oldDate: appt.booking_date, oldTime: appt.booking_time, newDate: bookingDate, newTime: bookingTime },
      }).catch(() => {});

      res.status(200).json({
        success: true,
        message: 'زمان نوبت با موفقیت تغییر یافت.',
        appointment: updated,
      });
    } catch (err: any) {
      res.status(500).json({
        error: 'RESCHEDULE_ERROR',
        message: err.message,
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
      message: err.message,
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
        message: err.message,
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
        message: err.message,
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
        message: err.message,
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
      message: err.message,
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
        message: err.message,
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
        message: err.message,
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
        message: err.message,
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
    const [hours, exceptions] = await Promise.all([
      salonRepository.getWorkingHours(salonId),
      salonRepository.getAllAvailabilityExceptions(salonId),
    ]);

    res.status(200).json({
      success: true,
      workingHours: hours,
      exceptions,
    });
  } catch (err: any) {
    res.status(500).json({
      error: 'WORKING_HOURS_FETCH_ERROR',
      message: err.message,
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
        message: err.message,
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
        message: err.message,
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
        message: err.message,
      });
    }
  }
);
