import express from 'express';
import type { Request, Response } from 'express';
import { requireAuth, csrfProtection } from '../middleware/auth.ts';
import { salonRepository } from '../repositories/salonRepository.ts';
import { serviceRepository } from '../repositories/serviceRepository.ts';
import { staffRepository } from '../repositories/staffRepository.ts';
import { bookingService, BookingError } from '../services/booking/bookingService.ts';
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
  async (req: Request, res: Response): Promise<void> => {
    // 1. Session Authentication Check
    if (!req.isAuthenticated || !req.user) {
      res.status(401).json({
        error: 'AUTHENTICATION_REQUIRED',
        message: 'ثبت قطعی نوبت نیازمند تایید هویت با رمز یکبار مصرف است. لطفاً ابتدا وارد شوید.',
      });
      return;
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

    // 2. Ownership check: Verified user phone must match clientPhone
    const userNorm = normalizeIranianPhone(req.user.phone);
    const bodyNorm = normalizeIranianPhone(clientPhone);

    if (!userNorm.isValid || !bodyNorm.isValid || userNorm.national !== bodyNorm.national) {
      res.status(403).json({
        error: 'PHONE_MISMATCH',
        message: 'شماره موبایل وارد شده با حساب احراز هویت شده تطابق ندارد.',
      });
      return;
    }

    try {
      const result = await bookingService.createBooking({
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
publicRouter.get('/bookings/my', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userPhone = req.user!.phone;
    const bookings = await bookingService.getMyBookings(userPhone);

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
 * Tracks a specific appointment with phone verification
 */
publicRouter.get('/bookings/track/:trackingCode', async (req: Request, res: Response): Promise<void> => {
  const { trackingCode } = req.params;
  const phone = req.query.phone ? String(req.query.phone) : (req.user?.phone || undefined);

  try {
    const appointment = await bookingService.trackBooking(trackingCode, phone);
    if (!appointment) {
      res.status(404).json({
        error: 'APPOINTMENT_NOT_FOUND',
        message: 'نوبتی با این کد پیگیری یافت نشد.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      appointment: {
        id: appointment.id,
        trackingCode: appointment.tracking_code,
        salonId: appointment.salon_id,
        serviceId: appointment.service_id,
        staffId: appointment.staff_id,
        clientName: appointment.client_name,
        clientPhone: appointment.client_phone,
        bookingDate: appointment.booking_date,
        bookingTime: appointment.booking_time,
        endTime: appointment.end_time,
        price: typeof appointment.price === 'string' ? parseInt(appointment.price, 10) : appointment.price,
        status: appointment.status,
        paymentStatus: appointment.payment_status,
        paymentMethod: appointment.payment_method,
        notes: appointment.notes,
      },
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
