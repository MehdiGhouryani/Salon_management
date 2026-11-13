/**
 * NobatAra Super-Admin Data Hook (Phase 13).
 *
 * Server-backed platform governance for the Super Admin console:
 *  - GET /api/admin/stats (platform KPIs)
 *  - GET /api/admin/salons (filters/search/pagination)
 *  - GET /api/admin/users, GET /api/admin/audit-logs
 *  - mutations: salon approve/reject/suspend/activate with mandatory reason,
 *    user status/role changes — every toast fires only after server confirm
 *
 * The server enforces super_admin RBAC on all routes; client role switching
 * cannot grant access (server returns 401/403 which surfaces as an error).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../api/client';

export interface AdminSalon {
  id: string;
  name: string;
  slug: string;
  status: string;
  city: string;
  province: string;
  plan: string;
  ownerName: string;
  phone: string;
  /** Server rows carry no financial aggregates yet — zero-filled so the
   *  console's sorting/filtering never crashes on missing fields. */
  monthlyRevenue: number;
  totalAppointments: number;
  activeStaffCount: number;
  createdAt?: string;
}

export interface AdminUser {
  id: string;
  phone: string;
  fullName: string;
  platformRole: string;
  status: string;
}

export interface AdminAuditLog {
  id: string;
  actor: string;
  actorRole: string;
  action: string;
  target: string;
  severity: string;
  category: string;
  createdAt: string;
  details?: unknown;
}

export interface PlatformStats {
  totalSalons: number;
  activeSalons: number;
  pendingSalons: number;
  suspendedSalons: number;
  totalUsers: number;
  totalAppointments: number;
}

export function useAdminOps(enabled: boolean) {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [salons, setSalons] = useState<AdminSalon[]>([]);
  const [salonsTotal, setSalonsTotal] = useState(0);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const safe = (err: unknown, fallback: string) => (err instanceof ApiError ? err.message : fallback);

  const loadStats = useCallback(async () => {
    if (!enabled) return;
    try {
      const data = await api.get<{ platform: PlatformStats }>('/api/admin/stats');
      if (mounted.current) setStats(data.platform);
    } catch (err) {
      if (mounted.current) setError(safe(err, 'خطا در بارگذاری آمار پلتفرم.'));
    }
  }, [enabled]);

  const loadSalons = useCallback(
    async (opts: { search?: string; status?: string; limit?: number; offset?: number } = {}) => {
      if (!enabled) return { items: [], total: 0 };
      const qs = new URLSearchParams();
      if (opts.search) qs.set('search', opts.search);
      if (opts.status) qs.set('status', opts.status);
      qs.set('limit', String(opts.limit ?? 50));
      qs.set('offset', String(opts.offset ?? 0));
      try {
        const data = await api.get<{ salons: Record<string, any>[]; total?: number }>(
          `/api/admin/salons?${qs.toString()}`
        );
        // Normalize server rows to the console's Salon shape: the API returns
        // snake-ish fields and NO financial aggregates — zero-fill them so
        // filters/sorting never crash on undefined.
        const normalized: AdminSalon[] = (data.salons || []).map((sv) => ({
          id: sv.id,
          name: sv.name || '',
          slug: sv.slug || '',
          status: sv.status || 'pending',
          city: sv.city || '',
          province: sv.province || '',
          plan: sv.plan || 'bronze',
          ownerName: sv.owner_name || sv.ownerName || '',
          phone: sv.phone || '',
          monthlyRevenue: 0,
          totalAppointments: 0,
          activeStaffCount: 0,
          createdAt: sv.created_at,
        }));
        if (mounted.current) {
          setSalons(normalized);
          setSalonsTotal(data.total ?? normalized.length);
        }
        return { items: normalized, total: data.total ?? 0 };
      } catch (err) {
        if (mounted.current) setError(safe(err, 'خطا در بارگذاری سالن‌ها.'));
        return { items: [], total: 0 };
      }
    },
    [enabled]
  );

  const loadUsers = useCallback(
    async (opts: { search?: string; role?: string; status?: string; limit?: number; offset?: number } = {}) => {
      if (!enabled) return { items: [], total: 0 };
      const qs = new URLSearchParams();
      if (opts.search) qs.set('search', opts.search);
      if (opts.role) qs.set('role', opts.role);
      if (opts.status) qs.set('status', opts.status);
      qs.set('limit', String(opts.limit ?? 50));
      qs.set('offset', String(opts.offset ?? 0));
      try {
        const data = await api.get<{ users: AdminUser[]; total?: number }>(`/api/admin/users?${qs.toString()}`);
        if (mounted.current) {
          setUsers(data.users || []);
        }
        return { items: data.users || [], total: data.total ?? 0 };
      } catch (err) {
        if (mounted.current) setError(safe(err, 'خطا در بارگذاری کاربران.'));
        return { items: [], total: 0 };
      }
    },
    [enabled]
  );

  const loadAuditLogs = useCallback(
    async (opts: { severity?: string; category?: string; search?: string; limit?: number; offset?: number } = {}) => {
      if (!enabled) return { items: [], total: 0 };
      const qs = new URLSearchParams();
      if (opts.severity) qs.set('severity', opts.severity);
      if (opts.category) qs.set('category', opts.category);
      if (opts.search) qs.set('search', opts.search);
      qs.set('limit', String(opts.limit ?? 50));
      qs.set('offset', String(opts.offset ?? 0));
      try {
        const data = await api.get<{ logs: AdminAuditLog[]; total?: number }>(`/api/admin/audit-logs?${qs.toString()}`);
        if (mounted.current) setAuditLogs(data.logs || []);
        return { items: data.logs || [], total: data.total ?? 0 };
      } catch (err) {
        if (mounted.current) setError(safe(err, 'خطا در بارگذاری گزارش‌های ممیزی.'));
        return { items: [], total: 0 };
      }
    },
    [enabled]
  );

  useEffect(() => {
    if (enabled) {
      loadStats();
      loadSalons();
      loadUsers();
      loadAuditLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  /** Salon status change: approve/reject/suspend/activate — reason mandatory (server-enforced). */
  const changeSalonStatus = useCallback(
    async (salonId: string, status: 'active' | 'pending' | 'suspended' | 'rejected' | 'trial', reason: string): Promise<boolean> => {
      try {
        await api.put(`/api/admin/salons/${salonId}/status`, { status, reason });
        await Promise.all([loadSalons(), loadStats(), loadAuditLogs()]);
        return true;
      } catch (err) {
        setError(safe(err, 'خطا در تغییر وضعیت سالن.'));
        return false;
      }
    },
    [loadSalons, loadStats, loadAuditLogs]
  );

  const changeUserStatus = useCallback(
    async (userId: string, status: 'active' | 'suspended' | 'pending', reason: string): Promise<boolean> => {
      try {
        await api.put(`/api/admin/users/${userId}/status`, { status, reason });
        await Promise.all([loadUsers(), loadAuditLogs()]);
        return true;
      } catch (err) {
        setError(safe(err, 'خطا در تغییر وضعیت کاربر.'));
        return false;
      }
    },
    [loadUsers, loadAuditLogs]
  );

  const changeUserRole = useCallback(
    async (userId: string, role: string): Promise<boolean> => {
      try {
        await api.put(`/api/admin/users/${userId}/role`, { role });
        await Promise.all([loadUsers(), loadAuditLogs()]);
        return true;
      } catch (err) {
        setError(safe(err, 'خطا در تغییر نقش کاربر.'));
        return false;
      }
    },
    [loadUsers, loadAuditLogs]
  );

  const clearError = useCallback(() => setError(''), []);

  return {
    stats,
    salons,
    salonsTotal,
    users,
    auditLogs,
    loading,
    error,
    clearError,
    loadStats,
    loadSalons,
    loadUsers,
    loadAuditLogs,
    changeSalonStatus,
    changeUserStatus,
    changeUserRole,
  };
}
