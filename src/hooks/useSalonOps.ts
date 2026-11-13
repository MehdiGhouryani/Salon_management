/**
 * NobatAra Salon Operational Data Hook (Phase 12).
 *
 * ONE server-backed data layer for the entire Salon panel: profile,
 * appointments, services, staff, working hours/exceptions, customers and
 * dashboard stats — all through the centralized API client with loading,
 * error and reload semantics. Every mutation refreshes the affected lists
 * from the server (no local-only success), and toasts fire only after the
 * server confirms.
 *
 * The salon scope comes from the authenticated identity: the UI passes the
 * slug/id it is VIEWING, but the server enforces membership on /api/salon/*
 * (403 FORBIDDEN_SALON_ACCESS for non-members) — client state is never trusted.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../api/client';
import type { CustomerBooking } from '../types/admin';
import type { SalonServiceItem, SalonStaffItem } from '../mock/salonDirectoryData';

export interface SalonProfile {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  bannerImage: string | null;
  galleryImages: string[] | null;
  features: string[] | null;
  status: string;
  plan: string;
  verifiedBadge: boolean;
  rating: number | null;
  reviewsCount: number | null;
}

export interface SalonAppointment extends CustomerBooking {
  endTime?: string | null;
  clientId?: string | null;
  paymentStatus?: string;
}

export interface SalonWorkingHour {
  id: string;
  staff_id: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_closed: boolean;
}

export interface SalonException {
  id: string;
  staff_id: string | null;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  reason: string;
  exception_type: string;
  is_available: boolean;
}

export interface SalonCustomer {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  notes: string | null;
  totalBookings: number;
  totalSpent: number;
  lastVisitAt: string | null;
}

export interface DashboardStats {
  todayAppointments: SalonAppointment[];
  completedCount: number;
  confirmedCount: number;
  pendingCount: number;
  cancelledCount: number;
  noShowCount: number;
  collectedRevenue: number;
  capacityUsagePercent: number;
  urgentActions: SalonAppointment[];
  upcomingAppointments: SalonAppointment[];
}

interface ListEnvelope<T> {
  success?: boolean;
  total?: number;
  limit?: number;
  offset?: number;
}

interface ErrorEnvelope {
  error?: string | { code: string; message: string };
  message?: string;
}

export function useSalonOps(salonId: string, enabled: boolean) {
  const [profile, setProfile] = useState<SalonProfile | null>(null);
  const [appointments, setAppointments] = useState<SalonAppointment[]>([]);
  const [appointmentsTotal, setAppointmentsTotal] = useState(0);
  const [services, setServices] = useState<SalonServiceItem[]>([]);
  const [staff, setStaff] = useState<SalonStaffItem[]>([]);
  const [workingHours, setWorkingHours] = useState<SalonWorkingHour[]>([]);
  const [staffHours, setStaffHours] = useState<Array<{ staffId: string; staffName: string; hours: SalonWorkingHour[] }>>([]);
  const [exceptions, setExceptions] = useState<SalonException[]>([]);
  const [customers, setCustomers] = useState<SalonCustomer[]>([]);
  const [customersTotal, setCustomersTotal] = useState(0);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const safeError = (err: unknown, fallback: string): string =>
    err instanceof ApiError ? err.message : fallback;

  /** Loads the salon profile + services + staff + schedule in parallel. */
  const loadCore = useCallback(async () => {
    if (!salonId || !enabled) return;
    setLoading(true);
    setError('');
    try {
      const [profileRes, servicesRes, staffRes, hoursRes] = await Promise.all([
        api.get<{ success: boolean; salon: Record<string, any> }>(`/api/salon/${salonId}/profile`),
        api.get<{ success: boolean; services: Record<string, any>[] }>(`/api/salon/${salonId}/services?includeInactive=true`),
        api.get<{ success: boolean; staff: Record<string, any>[] }>(`/api/salon/${salonId}/staff`),
        api.get<{ success: boolean; workingHours: SalonWorkingHour[]; staffHours: Array<{ staffId: string; staffName: string; hours: SalonWorkingHour[] }>; exceptions: SalonException[] }>(
          `/api/salon/${salonId}/working-hours`
        ),
      ]);

      if (!mounted.current) return;
      const p = profileRes.salon;
      setProfile({
        id: p.id,
        name: p.name,
        slug: p.slug,
        tagline: p.tagline,
        phone: p.phone,
        email: p.email,
        address: p.address,
        city: p.city,
        province: p.province,
        bannerImage: p.bannerImage,
        galleryImages: p.galleryImages,
        features: p.features,
        status: p.status,
        plan: p.plan,
        verifiedBadge: p.verifiedBadge,
        rating: p.rating,
        reviewsCount: p.reviewsCount,
      });
      setServices(
        (servicesRes.services || []).map((sv) => ({
          id: sv.id,
          name: sv.name,
          category: (sv.category || 'hair') as SalonServiceItem['category'],
          categoryLabel: sv.categoryLabel || sv.category || '',
          duration: `${sv.durationMinutes ?? sv.duration_minutes ?? 60} دقیقه`,
          price: typeof sv.price === 'string' ? parseInt(sv.price, 10) : sv.price ?? 0,
          description: sv.description || '',
        }))
      );
      setStaff(
        (staffRes.staff || []).map((st) => ({
          id: st.id,
          name: st.name,
          role: st.role || 'متخصص',
          specialty: st.specialty || '',
          rating: typeof st.rating === 'string' ? parseFloat(st.rating) : st.rating ?? 5,
          avatar: st.avatar_url || '',
        }))
      );
      setWorkingHours(hoursRes.workingHours || []);
      setStaffHours(hoursRes.staffHours || []);
      setExceptions(hoursRes.exceptions || []);
    } catch (err) {
      if (mounted.current) setError(safeError(err, 'خطا در بارگذاری اطلاعات سالن.'));
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [salonId, enabled]);

  /** Appointments list (today + near future by default; range via args). */
  const loadAppointments = useCallback(
    async (opts: { from?: string; to?: string; status?: string; limit?: number; offset?: number } = {}) => {
      if (!salonId || !enabled) return { items: [], total: 0 };
      const qs = new URLSearchParams();
      if (opts.from) qs.set('from', opts.from);
      if (opts.to) qs.set('to', opts.to);
      if (opts.status) qs.set('status', opts.status);
      qs.set('limit', String(opts.limit ?? 100));
      qs.set('offset', String(opts.offset ?? 0));
      try {
        const data = await api.get<ListEnvelope<unknown> & { appointments: Record<string, any>[] }>(
          `/api/salon/${salonId}/appointments?${qs.toString()}`
        );
        const mapped: SalonAppointment[] = (data.appointments || []).map((a) => ({
          id: a.id,
          trackingCode: a.tracking_code,
          salonId: a.salon_id,
          salonName: '',
          serviceName: a.service_id,
          serviceCategory: '',
          staffName: a.staff_id,
          clientName: a.client_name,
          clientPhone: a.client_phone,
          date: a.booking_date,
          time: a.booking_time,
          price: typeof a.price === 'string' ? parseInt(a.price, 10) : a.price,
          paymentMethod: a.payment_method || 'in_person',
          createdAt: a.created_at,
          status: a.status,
          endTime: a.end_time,
          notes: a.notes,
        }));
        if (mounted.current) {
          setAppointments(mapped);
          setAppointmentsTotal(data.total ?? mapped.length);
        }
        return { items: mapped, total: data.total ?? mapped.length };
      } catch (err) {
        if (mounted.current) setError(safeError(err, 'خطا در بارگذاری نوبت‌ها.'));
        return { items: [], total: 0 };
      }
    },
    [salonId, enabled]
  );

  /** Dashboard overview — server-derived statistics only. */
  const loadStats = useCallback(async () => {
    if (!salonId || !enabled) return;
    try {
      const data = await api.get<Record<string, any>>(`/api/salon/${salonId}/dashboard/overview`);
      if (!mounted.current) return;
      const mapAppt = (a: Record<string, any>): SalonAppointment => ({
        id: a.id,
        trackingCode: a.tracking_code,
        salonId: a.salon_id,
        salonName: '',
        serviceName: a.service_id,
        serviceCategory: '',
        staffName: a.staff_id,
        clientName: a.client_name,
        clientPhone: a.client_phone,
        date: a.booking_date,
        time: a.booking_time,
        price: typeof a.price === 'string' ? parseInt(a.price, 10) : a.price,
        paymentMethod: 'in_person',
        createdAt: a.created_at,
        status: a.status,
      });
      setStats({
        todayAppointments: (data.todayAppointments || []).map(mapAppt),
        completedCount: data.completedCount ?? 0,
        confirmedCount: data.confirmedCount ?? 0,
        pendingCount: data.pendingCount ?? 0,
        cancelledCount: data.cancelledCount ?? 0,
        noShowCount: data.noShowCount ?? 0,
        collectedRevenue: data.collectedRevenue ?? data.totalCollectedRevenue ?? 0,
        capacityUsagePercent: data.capacityUsagePercent ?? 0,
        urgentActions: (data.urgentActions || []).map(mapAppt),
        upcomingAppointments: (data.upcomingAppointments || []).map(mapAppt),
      });
    } catch (err) {
      if (mounted.current) setError(safeError(err, 'خطا در بارگذاری آمار عملیاتی.'));
    }
  }, [salonId, enabled]);

  /** Customers (owner/manager see full PII; staff masked by the server). */
  const loadCustomers = useCallback(
    async (opts: { search?: string; limit?: number; offset?: number } = {}) => {
      if (!salonId || !enabled) return { items: [], total: 0 };
      const qs = new URLSearchParams();
      if (opts.search) qs.set('search', opts.search);
      qs.set('limit', String(opts.limit ?? 50));
      qs.set('offset', String(opts.offset ?? 0));
      try {
        const data = await api.get<ListEnvelope<unknown> & { customers: SalonCustomer[]; piiRestricted?: boolean }>(
          `/api/salon/${salonId}/customers?${qs.toString()}`
        );
        if (mounted.current) {
          setCustomers(data.customers || []);
          setCustomersTotal(data.total ?? (data.customers || []).length);
        }
        return { items: data.customers || [], total: data.total ?? 0 };
      } catch (err) {
        if (mounted.current) setError(safeError(err, 'خطا در بارگذاری مشتریان.'));
        return { items: [], total: 0 };
      }
    },
    [salonId, enabled]
  );

  /** Initial + salon-change load. */
  useEffect(() => {
    if (enabled && salonId) {
      loadCore();
      loadAppointments();
      loadStats();
      loadCustomers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, salonId]);

  // ---------------- Mutations (server-confirmed only) ----------------

  const updateAppointmentStatus = useCallback(
    async (appointmentId: string, status: string, reason?: string): Promise<boolean> => {
      try {
        await api.patch(`/api/salon/${salonId}/appointments/${appointmentId}/status`, {
          status,
          reason: reason || (status === 'cancelled' ? 'لغو توسط پرسنل سالن' : 'بروزرسانی توسط پرسنل سالن'),
        });
        await Promise.all([loadAppointments(), loadStats()]);
        return true;
      } catch (err) {
        setError(safeError(err, 'خطا در تغییر وضعیت نوبت.'));
        return false;
      }
    },
    [salonId, loadAppointments, loadStats]
  );

  const rescheduleAppointment = useCallback(
    async (appointmentId: string, newDate: string, newTime: string, newStaffId?: string): Promise<boolean> => {
      try {
        await api.patch(`/api/salon/${salonId}/appointments/${appointmentId}/reschedule`, {
          bookingDate: newDate,
          bookingTime: newTime,
          staffId: newStaffId,
        });
        await Promise.all([loadAppointments(), loadStats()]);
        return true;
      } catch (err) {
        setError(safeError(err, 'خطا در جابجایی نوبت.'));
        return false;
      }
    },
    [salonId, loadAppointments, loadStats]
  );

  const createManualBooking = useCallback(
    async (v: {
      clientName: string;
      clientPhone: string;
      serviceId: string;
      staffId: string;
      bookingDate: string;
      bookingTime: string;
      notes?: string;
    }): Promise<{ ok: boolean; trackingCode?: string; code?: string; message?: string }> => {
      try {
        const data = await api.post<{ trackingCode: string }>(`/api/salon/${salonId}/appointments`, v);
        await Promise.all([loadAppointments(), loadStats(), loadCustomers()]);
        return { ok: true, trackingCode: data.trackingCode };
      } catch (err) {
        if (err instanceof ApiError) {
          return { ok: false, code: err.code, message: err.message };
        }
        return { ok: false, message: 'خطای ارتباط با سرور.' };
      }
    },
    [salonId, loadAppointments, loadStats, loadCustomers]
  );

  const saveService = useCallback(
    async (payload: Record<string, unknown>, serviceId?: string): Promise<boolean> => {
      try {
        if (serviceId) {
          await api.patch(`/api/salon/${salonId}/services/${serviceId}`, payload);
        } else {
          await api.post(`/api/salon/${salonId}/services`, payload);
        }
        await loadCore();
        return true;
      } catch (err) {
        setError(safeError(err, 'خطا در ذخیره خدمت.'));
        return false;
      }
    },
    [salonId, loadCore]
  );

  const saveStaff = useCallback(
    async (payload: Record<string, unknown>, staffId?: string): Promise<boolean> => {
      try {
        if (staffId) {
          await api.patch(`/api/salon/${salonId}/staff/${staffId}`, payload);
        } else {
          await api.post(`/api/salon/${salonId}/staff`, payload);
        }
        await loadCore();
        return true;
      } catch (err) {
        setError(safeError(err, 'خطا در ذخیره پرسنل.'));
        return false;
      }
    },
    [salonId, loadCore]
  );

  const assignService = useCallback(
    async (staffId: string, serviceId: string, customPrice?: number): Promise<boolean> => {
      try {
        await api.post(`/api/salon/${salonId}/staff/${staffId}/services`, {
          serviceId,
          customPrice,
          isActive: true,
        });
        await loadCore();
        return true;
      } catch (err) {
        setError(safeError(err, 'خطا در اتصال خدمت به پرسنل.'));
        return false;
      }
    },
    [salonId, loadCore]
  );

  const saveSalonHours = useCallback(
    async (hours: Array<{ dayOfWeek: number; startTime: string; endTime: string; isClosed: boolean }>): Promise<boolean> => {
      try {
        await api.put(`/api/salon/${salonId}/working-hours`, { hours });
        await loadCore();
        return true;
      } catch (err) {
        setError(safeError(err, 'خطا در ذخیره ساعات کاری.'));
        return false;
      }
    },
    [salonId, loadCore]
  );

  const saveStaffHours = useCallback(
    async (
      staffId: string,
      hours: Array<{ dayOfWeek: number; startTime: string; endTime: string; isClosed: boolean }>
    ): Promise<boolean> => {
      try {
        await api.put(`/api/salon/${salonId}/working-hours/staff/${staffId}`, { hours });
        await loadCore();
        return true;
      } catch (err) {
        setError(safeError(err, 'خطا در ذخیره ساعات کاری متخصص.'));
        return false;
      }
    },
    [salonId, loadCore]
  );

  const addException = useCallback(
    async (payload: {
      startDate: string;
      endDate: string;
      reason: string;
      exceptionType: string;
      isAvailable: boolean;
    }): Promise<boolean> => {
      try {
        await api.post(`/api/salon/${salonId}/exceptions`, payload);
        await loadCore();
        return true;
      } catch (err) {
        setError(safeError(err, 'خطا در ثبت تعطیلی.'));
        return false;
      }
    },
    [salonId, loadCore]
  );

  const deleteException = useCallback(
    async (exceptionId: string): Promise<boolean> => {
      try {
        await api.delete(`/api/salon/${salonId}/exceptions/${exceptionId}`);
        await loadCore();
        return true;
      } catch (err) {
        setError(safeError(err, 'خطا در حذف تعطیلی.'));
        return false;
      }
    },
    [salonId, loadCore]
  );

  const saveProfile = useCallback(
    async (payload: Record<string, unknown>): Promise<boolean> => {
      try {
        await api.patch(`/api/salon/${salonId}/profile`, payload);
        await loadCore();
        return true;
      } catch (err) {
        setError(safeError(err, 'خطا در ذخیره مشخصات سالن.'));
        return false;
      }
    },
    [salonId, loadCore]
  );

  const clearError = useCallback(() => setError(''), []);

  return {
    // data
    profile,
    appointments,
    appointmentsTotal,
    services,
    staff,
    workingHours,
    staffHours,
    exceptions,
    customers,
    customersTotal,
    stats,
    // state
    loading,
    error,
    clearError,
    // loaders
    reload: loadCore,
    loadAppointments,
    loadStats,
    loadCustomers,
    // mutations
    updateAppointmentStatus,
    rescheduleAppointment,
    createManualBooking,
    saveService,
    saveStaff,
    assignService,
    saveSalonHours,
    saveStaffHours,
    addException,
    deleteException,
    saveProfile,
  };
}
