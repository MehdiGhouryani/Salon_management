import express from 'express';
import type { Request, Response } from 'express';
import { requireAuth, csrfProtection } from '../middleware/auth.ts';
import { rateLimit } from '../middleware/rateLimit.ts';
import { salonRepository } from '../repositories/salonRepository.ts';
import { serviceRepository } from '../repositories/serviceRepository.ts';
import { staffRepository } from '../repositories/staffRepository.ts';
import { bookingService, BookingError } from '../services/booking/bookingService.ts';
import { bookingGrantService, BookingGrantError } from '../services/auth/bookingGrantService.ts';
import { BookingRuleError } from '../services/booking/bookingRules.ts';
import { extractClientIp } from '../services/auth/sessionService.ts';
import { normalizeIranianPhone } from '../utils/phone.ts';

export const publicRouter = express.Router();

/**
 * GET /api/public/salons
 * Lists active salons with public directory metadata
 */
publicRouter.get('/salons', async (_req: Request, res: Response): Promise<void> => {
  try {
    const salons = await salonRepository.findAll({ status: 'active' });
    const sanitized = salons.map((s) => ({
      id: s.id,
      slug: s.slug,
      name: s.name,
      category: s.category,
      tagline: s.tagline,
      city: s.city,
      province: s.province,
      address: s.address,
      phone: s.phone,
      rating: s.rating,
      reviewsCount: s.reviews_count,
      bannerImage: s.banner_image,
      verifiedBadge: s.verified_badge,
      features: s.features,
    }));

    res.status(200).json({
      success: true,
      count: sanitized.length,
      salons: sanitized,
    });
  } catch (err: any) {
    res.status(500).json({
      error: 'SALONS_FETCH_ERROR',
      message: err.message || 'خطا در بارگذاری فهرست سالن‌ها.',
    });
  }
});

/**
 * GET /api/public/salons/:slugOrId
 * Retrieves comprehensive public profile for salon website (Gisara, etc.)
 */
publicRouter.get('/salons/:slugOrId', async (req: Request, res: Response): Promise<void> => {
  const { slugOrId } = req.params;

  try {
    // Attempt lookup by slug first, then by id
    let salon = await salonRepository.findBySlug(slugOrId);
    if (!salon) {
      salon = await salonRepository.findById(slugOrId);
    }

    if (!salon || salon.status !== 'active') {
      res.status(404).json({
        error: 'SALON_NOT_FOUND',
        message: 'سالن مورد نظر یافت نشد یا در وضعیت فعال نمی‌باشد.',
      });
      return;
    }

    // Retrieve active services, staff, and working hours concurrently
    const [services, staff, workingHours] = await Promise.all([
      serviceRepository.findBySalonId(salon.id, true),
      staffRepository.findBySalonId(salon.id, true),
      salonRepository.getWorkingHours(salon.id),
    ]);

    res.status(200).json({
      success: true,
      salon: {
        id: salon.id,
        slug: salon.slug,
        name: salon.name,
        category: salon.category,
        tagline: salon.tagline,
        ownerName: salon.owner_name,
        phone: salon.phone,
        email: salon.email,
        province: salon.province,
        city: salon.city,
        address: salon.address,
        rating: salon.rating,
        reviewsCount: salon.reviews_count,
        bannerImage: salon.banner_image,
        galleryImages: salon.gallery_images,
        features: salon.features,
        workingHours: Array.isArray(workingHours) && workingHours.length > 0
          ? (() => {
              const openDay = workingHours.find((w) => !w.is_closed);
              return openDay ? `همه روزه ${openDay.start_time} الی ${openDay.end_time}` : 'تعطیل';
            })()
          : 'همه روزه ۰۹:۳۰ الی ۲۰:۰۰',
        workingHoursList: workingHours,
        services: services.map((s) => ({
          id: s.id,
          name: s.name,
          category: s.category,
          categoryLabel: s.category_label,
          price: typeof s.price === 'string' ? parseInt(s.price, 10) : s.price,
          durationMinutes: s.duration_minutes,
          duration: `${s.duration_minutes} دقیقه`,
          description: s.description || '',
        })),
        staff: staff.map((st) => ({
          id: st.id,
          name: st.name,
          role: st.role,
          specialty: st.specialty || st.role,
          avatar: st.avatar_url || '',
          rating: st.rating,
        })),
      },
    });
  } catch (err: any) {
    res.status(500).json({
      error: 'SALON_PROFILE_ERROR',
      message: err.message || 'خطا در دریافت پروفایل عمومی سالن.',
    });
  }
});

/**
 * GET /api/public/salons/:salonId/availability
 * Computes live, non-overlapping available slots for a service, date, and optional staff
 */
publicRouter.get('/salons/:salonId/availability', async (req: Request, res: Response): Promise<void> => {
  const { salonId } = req.params;
  const serviceId = String(req.query.serviceId || '');
  const dateStr = String(req.query.date || '');
  const staffId = req.query.staffId ? String(req.query.staffId) : undefined;

  if (!serviceId || !dateStr) {
    res.status(400).json({
      error: 'MISSING_PARAMETERS',
      message: 'شناسه خدمت (serviceId) و تاریخ (date) الزامی هستند.',
    });
    return;
  }

  try {
    const availability = await bookingService.calculateAvailability(
      salonId,
      serviceId,
      dateStr,
      staffId
    );

    res.status(200).json({
      success: true,
      ...availability,
    });
  } catch (err: any) {
    if (err instanceof BookingError) {
      res.status(err.statusCode).json({
        error: err.code,
        message: err.message,
      });
      return;
    }

    res.status(500).json({
      error: 'AVAILABILITY_CALCULATION_ERROR',
      message: err.message || 'خطا در محاسبه زمان‌های آزاد.',
    });
  }
});

/**
 * POST /api/public/bookings
 * Creates an authoritative customer booking with server validation and atomic concurrency locking
 */
publicRouter.post(
  '/bookings',
  csrfProtection,
  rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 8,
    keyFor: (req) => `${req.ip || 'unknown'}:${req.body?.clientPhone || 'nophone'}`,
  }),
  async (req: Request, res: Response): Promise<void> => {
    // Phase 08 — authorization is satisfied by EITHER:
    //  (a) an ordinary authenticated customer session whose phone matches the
    //      booking phone, OR
    //  (b) a valid, unused, unexpired, phone-bound booking grant issued by a
    //      successful booking_verification OTP (guest flow).
    const grantToken = String(
      req.headers['x-nobatara-booking-grant'] || req.body?.bookingGrant || ''
    ).trim();

    if ((!req.isAuthenticated || !req.user) && !grantToken) {
      res.status(401).json({
        error: 'AUTHENTICATION_REQUIRED',
        message: 'ثبت قطعی نوبت نیازمند تایید شماره موبایل با رمز یکبار مصرف است.',
      });
      return;
    }

    // Early grant validation (read-only): precise error contract before any
    // booking work. Final ATOMIC consumption happens inside the booking
    // transaction, so a failed booking never burns the grant.
    if (grantToken && (!req.isAuthenticated || !req.user)) {
      try {
        await bookingGrantService.validateGrant(grantToken, String(req.body?.clientPhone || ''));
      } catch (err) {
        if (err instanceof BookingGrantError) {
          res.status(err.statusCode).json({
            error: err.code,
            message: err.message,
          });
          return;
        }
        throw err;
      }
    }

    const {
      salonId,
      serviceId,
      staffId,
      bookingDate,
      bookingTime,
      clientName,
      clientPhone,
      notes,
    } = req.body || {};

    if (!salonId || !serviceId || !bookingDate || !bookingTime || !clientName || !clientPhone) {
      res.status(400).json({
        error: 'MISSING_BOOKING_FIELDS',
        message: 'اطلاعات سالن، خدمت، تاریخ، ساعت، نام و شماره موبایل الزامی هستند.',
      });
      return;
    }

    // 2. Ownership check — session path only: the verified session phone must
    // match the booking phone. The grant path enforces phone binding inside
    // the grant service (validate + atomic consume).
    if (req.isAuthenticated && req.user) {
      const userNorm = normalizeIranianPhone(req.user.phone);
      const bodyNorm = normalizeIranianPhone(clientPhone);

      if (!userNorm.isValid || !bodyNorm.isValid || userNorm.national !== bodyNorm.national) {
        res.status(403).json({
          error: 'PHONE_MISMATCH',
          message: 'شماره موبایل وارد شده با حساب احراز هویت شده تطابق ندارد.',
        });
        return;
      }
    }

    try {
      const result = await bookingService.createBooking({
        bookingGrant: grantToken || undefined,
        salonId: String(salonId),
        serviceId: String(serviceId),
        staffId: staffId ? String(staffId) : undefined,
        bookingDate: String(bookingDate),
        bookingTime: String(bookingTime),
        clientName: String(clientName),
        clientPhone: String(clientPhone),
        notes: notes ? String(notes) : undefined,
        user: req.user,
        ipAddress: extractClientIp(req),
        userAgent: String(req.headers['user-agent'] || 'Unknown'),
      });

      res.status(201).json({
        success: true,
        message: 'نوبت شما با موفقیت در سیستم ثبت گردید.',
        trackingCode: result.trackingCode,
        appointment: result.appointment,
      });
    } catch (err: any) {
      if (err instanceof BookingError) {
        res.status(err.statusCode).json({
          error: err.code,
          message: err.message,
        });
        return;
      }
      if (err instanceof BookingGrantError) {
        // Consumed/raced/expired grants surface with the precise contract.
        res.status(err.statusCode).json({
          error: err.code,
          message: err.message,
        });
        return;
      }
      if (err instanceof BookingRuleError) {
        // Phase 09: schedule-rule violations (eligibility, hours, past dates)
        // carry their own status and structured code.
        res.status(err.statusCode).json({
          error: err.code,
          message: err.message,
        });
        return;
      }

      res.status(500).json({
        error: 'BOOKING_CREATION_FAILED',
        message: err.message || 'خطا در ثبت نوبت در سرور.',
      });
    }
  }
);

/**
 * GET /api/public/bookings/my
 * Lists appointments for the authenticated customer
 */
publicRouter.get(
  '/bookings/my',
  requireAuth,
  rateLimit({ windowMs: 10 * 60 * 1000, max: 30, keyFor: (req) => String(req.ip || 'unknown') }),
  async (req: Request, res: Response): Promise<void> => {
  try {
    const userPhone = req.user!.phone;
    const bookings = await bookingService.getMyBookings(userPhone);

    // Phase 11: display enrichment — the frontend should never have to resolve
    // names from ids. Names come from the authoritative tables only.
    const salonIds = [...new Set(bookings.map((b) => b.salon_id))];
    const serviceIds = [...new Set(bookings.map((b) => b.service_id))];
    const [salonNames, serviceNames, staffNames] = await Promise.all([
      Promise.all(salonIds.map(async (id) => [id, (await salonRepository.findById(id))?.name] as const)),
      Promise.all(serviceIds.map(async (id) => [id, (await serviceRepository.findById(id))?.name] as const)),
      Promise.all(
        [...new Set(bookings.map((b) => b.staff_id).filter(Boolean))].map(
          async (id) => [id, (await staffRepository.findById(id))?.name] as const
        )
      ),
    ]);
    const salonMap = Object.fromEntries(salonNames);
    const serviceMap = Object.fromEntries(serviceNames);
    const staffMap = Object.fromEntries(staffNames);

    res.status(200).json({
      success: true,
      count: bookings.length,
      bookings: bookings.map((b) => ({
        id: b.id,
        trackingCode: b.tracking_code,
        salonId: b.salon_id,
        serviceId: b.service_id,
        staffId: b.staff_id,
        clientName: b.client_name,
        clientPhone: b.client_phone,
        salonName: salonMap[b.salon_id] || null,
        serviceName: serviceMap[b.service_id] || null,
        staffName: b.staff_id ? staffMap[b.staff_id] || null : null,
        bookingDate: b.booking_date,
        bookingTime: b.booking_time,
        endTime: b.end_time,
        price: typeof b.price === 'string' ? parseInt(b.price, 10) : b.price,
        paymentMethod: b.payment_method,
        paymentStatus: b.payment_status,
        status: b.status,
        cancellationReason: b.cancellation_reason,
        notes: b.notes,
        isDemo: b.is_demo,
        createdAt: b.created_at,
      })),
    });
  } catch (err: any) {
    res.status(500).json({
      error: 'MY_BOOKINGS_ERROR',
      message: err.message || 'خطا در دریافت لیست نوبت‌ها.',
    });
  }
});

/**
 * GET /api/public/bookings/track/:trackingCode
 * Tracks a specific appointment with phone verification.
 * Phase 07 (R1): customer PII (name, phone, notes) is returned ONLY to a
 * verified owner — an authenticated session whose phone matches the booking,
 * or a supplied matching phone. Anonymous code-only lookups receive a
 * PII-free operational subset (tracking codes alone are not sufficient proof
 * of identity, and high-entropy codes still allow a status check).
 */
publicRouter.get(
  '/bookings/track/:trackingCode',
  rateLimit({ windowMs: 10 * 60 * 1000, max: 30, keyFor: (req) => String(req.ip || 'unknown') }),
  async (req: Request, res: Response): Promise<void> => {
  const { trackingCode } = req.params;
  const queryPhone = req.query.phone ? String(req.query.phone) : undefined;

  try {
    const appointment = await bookingService.trackBooking(trackingCode, queryPhone);
    if (!appointment) {
      res.status(404).json({
        error: 'APPOINTMENT_NOT_FOUND',
        message: 'نوبتی با این کد پیگیری یافت نشد.',
      });
      return;
    }

    // Identity resolution: session phone (server-verified) or the query phone
    // (matched inside trackBooking). Code alone never unlocks PII.
    let verifiedOwner = false;
    if (req.isAuthenticated && req.user) {
      const sessionNorm = normalizeIranianPhone(req.user.phone);
      verifiedOwner = sessionNorm.isValid && sessionNorm.national === appointment.client_phone;
    } else if (queryPhone) {
      const queryNorm = normalizeIranianPhone(queryPhone);
      verifiedOwner = queryNorm.isValid && queryNorm.national === appointment.client_phone;
    }

    const baseAppointment = {
      id: appointment.id,
      trackingCode: appointment.tracking_code,
      salonId: appointment.salon_id,
      serviceId: appointment.service_id,
      staffId: appointment.staff_id,
      bookingDate: appointment.booking_date,
      bookingTime: appointment.booking_time,
      endTime: appointment.end_time,
      price: typeof appointment.price === 'string' ? parseInt(appointment.price, 10) : appointment.price,
      status: appointment.status,
      paymentStatus: appointment.payment_status,
      paymentMethod: appointment.payment_method,
    };

    res.status(200).json({
      success: true,
      appointment: verifiedOwner
        ? {
            ...baseAppointment,
            clientName: appointment.client_name,
            clientPhone: appointment.client_phone,
            notes: appointment.notes,
          }
        : baseAppointment,
    });
  } catch (err: any) {
    if (err instanceof BookingError) {
      res.status(err.statusCode).json({
        error: err.code,
        message: err.message,
      });
      return;
    }

    res.status(500).json({
      error: 'TRACKING_ERROR',
      message: err.message || 'خطا در رهگیری نوبت.',
    });
  }
});

/**
 * POST /api/public/bookings/:trackingCode/cancel
 * Allows authenticated customer to cancel their own appointment
 */
publicRouter.post(
  '/bookings/:trackingCode/cancel',
  csrfProtection,
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const { trackingCode } = req.params;
    const reason = req.body?.reason ? String(req.body.reason) : 'لغو توسط مشتری در پنل کاربری';

    try {
      const updated = await bookingService.cancelBooking(trackingCode, req.user!.phone, reason);

      res.status(200).json({
        success: true,
        message: 'نوبت شما با موفقیت لغو گردید.',
        appointment: updated,
      });
    } catch (err: any) {
      if (err instanceof BookingError) {
        res.status(err.statusCode).json({
          error: err.code,
          message: err.message,
        });
        return;
      }

      res.status(500).json({
        error: 'CANCELLATION_FAILED',
        message: err.message || 'خطا در لغو نوبت.',
      });
    }
  }
);
