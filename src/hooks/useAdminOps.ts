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
  /** REAL aggregates computed server-side from appointments/staff (Phase 18). */
  monthlyRevenue: number;
  totalAppointments: number;
  activeStaffCount: number;
  createdAt?: string;
}

export interface AdminUser {
  id: string;
  phone: string;
  email?: string | null;
  full_name?: string;
  fullName?: string;
  platform_role?: string;
  platformRole?: string;
  status: string;
  two_factor_enabled?: boolean;
  created_at?: string;
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
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersLoading, setUsersLoading] = useState(false);
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
        // Normalize server rows to the console's Salon shape. Phase 18: the
        // server computes REAL operational aggregates per salon (current-month
        // revenue from confirmed/completed appointments, total appointments,
        // active staff) — zero is only used when the server genuinely reports
        // no activity for that salon or omits the field.
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
          monthlyRevenue: typeof sv.monthlyRevenue === 'number' ? sv.monthlyRevenue : 0,
          totalAppointments: typeof sv.totalAppointments === 'number' ? sv.totalAppointments : 0,
          activeStaffCount: typeof sv.activeStaffCount === 'number' ? sv.activeStaffCount : 0,
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
      if (mounted.current) setUsersLoading(true);
      try {
        const data = await api.get<{ users: AdminUser[]; total?: number }>(`/api/admin/users?${qs.toString()}`);
        const items = data.users || [];
        const total = data.total ?? items.length;
        if (mounted.current) {
          setUsers(items);
          setUsersTotal(total);
          setError('');
        }
        return { items, total };
      } catch (err) {
        if (mounted.current) {
          setError(safe(err, 'خطا در بارگذاری کاربران.'));
          setUsers([]);
          setUsersTotal(0);
        }
        return { items: [], total: 0 };
      } finally {
        if (mounted.current) setUsersLoading(false);
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
    usersTotal,
    usersLoading,
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
