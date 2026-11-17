import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Search,
  X,
  Edit2,
  LayoutGrid,
  List,
  MoreVertical,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { User, UserRole } from '../../types/admin';
import { toPersianDigits, getRoleBadge, maskPhone } from '../../utils/formatters';
import { StatusReasonModal } from '../common/StatusReasonModal';
import { Pagination } from '../common/Pagination';
import { EmptyState } from '../ui/EmptyState';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { useDebounce } from '../../hooks/useDebounce';
import { useAdminOps } from '../../hooks/useAdminOps';

export const UsersView: React.FC = () => {
  const { serverAuth, addToast } = useAdmin();
  const isPlatformAdmin =
    serverAuth.authenticated && serverAuth.user?.platformRole === 'super_admin';
  const {
    users: serverUsers,
    usersTotal,
    usersLoading,
    error,
    loadUsers,
    changeUserStatus,
    changeUserRole,
  } = useAdminOps(isPlatformAdmin);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;

  // Mobile Action Sheet
  const [activeUserMenu, setActiveUserMenu] = useState<User | null>(null);

  // Role edit modal
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>('user');

  // Mandatory Reason Modal state for user suspension/activation
  const [statusModal, setStatusModal] = useState<{
    isOpen: boolean;
    user: User | null;
    targetStatus: 'active' | 'banned';
    title: string;
    variant: 'success' | 'warning' | 'danger';
  }>({
    isOpen: false,
    user: null,
    targetStatus: 'banned',
    title: '',
    variant: 'danger',
  });

  const users = useMemo<User[]>(() => serverUsers.map((row) => {
    const rawRole = row.platform_role || row.platformRole || 'user';
    const rawStatus = row.status || 'pending';
    const createdAt = row.created_at ? new Date(row.created_at) : null;
    return {
      id: row.id,
      name: row.full_name || row.fullName || 'بدون نام',
      email: row.email || '—',
      phone: row.phone,
      role: rawRole as UserRole,
      status: rawStatus === 'suspended' ? 'banned' : rawStatus === 'active' ? 'active' : 'inactive',
      twoFactorEnabled: Boolean(row.two_factor_enabled),
      lastLogin: 'در داده‌های فعلی ثبت نمی‌شود',
      lastIp: 'در داده‌های فعلی ثبت نمی‌شود',
      createdAt: createdAt && !Number.isNaN(createdAt.getTime())
        ? createdAt.toLocaleDateString('fa-IR')
        : '—',
    };
  }), [serverUsers]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, roleFilter, statusFilter]);

  const apiStatusFilter =
    statusFilter === 'banned' ? 'suspended' :
    statusFilter === 'inactive' ? 'pending' : undefined;

  useEffect(() => {
    void loadUsers({
      search: debouncedSearch.trim() || undefined,
      role: roleFilter === 'all' ? undefined : roleFilter,
      status: apiStatusFilter,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    });
  }, [loadUsers, debouncedSearch, roleFilter, apiStatusFilter, page]);

  // Filtering and pagination are authoritative on the server.
  const filteredUsers = users;
  const paginatedUsers = users;
  const totalPages = Math.ceil(usersTotal / PAGE_SIZE);

  const openRoleModal = (user: User) => {
    if (user.role === 'super_admin') return;
    setEditingUser(user);
    setSelectedRole(user.role);
    setActiveUserMenu(null);
  };

  const handleSaveRole = async () => {
    if (!editingUser) return;
    const success = await changeUserRole(editingUser.id, selectedRole);
    if (!success) {
      addToast({ type: 'error', title: 'تغییر نقش انجام نشد', message: 'سرور تغییر نقش را تأیید نکرد. سطح دسترسی تغییر نکرد.' });
      return;
    }
    await loadUsers({
      search: debouncedSearch.trim() || undefined,
      role: roleFilter === 'all' ? undefined : roleFilter,
      status: apiStatusFilter,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    });
    setEditingUser(null);
  };

  const openStatusChangeModal = (user: User, targetStatus: 'active' | 'banned') => {
    setActiveUserMenu(null);
    if (user.id === serverAuth.user?.id) {
      addToast({ type: 'warning', title: 'تغییر وضعیت حساب خودتان مجاز نیست' });
      return;
    }
    setStatusModal({
      isOpen: true,
      user,
      targetStatus,
      title: targetStatus === 'active' ? `فعال‌سازی کاربر «${user.name}»` : `تعلیق حساب کاربر «${user.name}»`,
      variant: targetStatus === 'active' ? 'success' : 'danger',
    });
  };

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header & View Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Users className="w-5 h-5 text-[var(--brand-accent)]" />
            مدیریت کاربران، مدیران و پرسنل
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            کنترل سطح دسترسی، امنیت ۲FA و وضعیت فعالیت اعضای شبکه
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* View Mode Toggle */}
          <div className="flex items-center p-1 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-[var(--brand-subdued)] text-[var(--brand-accent)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              title="نمایش کارتی شبکه‌ای"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>کارت‌ها</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-[var(--brand-subdued)] text-[var(--brand-accent)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              title="نمایش جدول فشرده"
            >
              <List className="w-3.5 h-3.5" />
              <span>جدول</span>
            </button>
          </div>

          <Button
            variant="secondary"
            size="sm"
            disabled
            title="ایجاد و دعوت کاربر از پنل هنوز در API پیاده‌سازی نشده است."
          >
            ایجاد کاربر (غیرفعال)
          </Button>
        </div>
      </div>

      {!isPlatformAdmin && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
          برای مشاهده و مدیریت کاربران، ورود با حساب Super Admin لازم است. دادهٔ نمونه جایگزین اطلاعات سرور نمی‌شود.
        </div>
      )}
      {error && (
        <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] text-[var(--text-secondary)]">
        ایجاد دستی کاربر و الزام واقعی ۲FA هنوز در API و فرایند احراز هویت پیاده‌سازی نشده‌اند؛ این کنترل‌ها عمداً غیرفعال‌اند.
      </div>
      {usersLoading && (
        <p className="text-xs text-[var(--text-muted)]" aria-live="polite">در حال دریافت اطلاعات کاربران از سرور…</p>
      )}

      {/* Role Filter Tabs & Result Count */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-1.5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl text-xs">
        <div className="flex flex-wrap items-center gap-1">
          {[
            { id: 'all', label: 'همه کاربران' },
            { id: 'super_admin', label: 'ادمین کل' },
            { id: 'user', label: 'کاربران' },
            { id: 'platform_support', label: 'پشتیبانی' },
            { id: 'platform_auditor', label: 'بازرسان' },
            { id: 'financial_manager', label: 'مالی' },
          ].map((tab) => {
            const isSelected = roleFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setRoleFilter(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-colors cursor-pointer font-medium ${
                  isSelected
                    ? 'bg-[var(--brand-primary)] text-white font-bold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                }`}
              >
                <span>{tab.label}</span>

              </button>
            );
          })}
        </div>

        {/* Status Filter & Counter */}
        <div className="flex items-center gap-2 pr-1 w-full sm:w-auto justify-between sm:justify-end">
          <div className="w-36">
            <Select
              size="sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'همه وضعیت‌ها' },
                { value: 'active', label: 'کاربران فعال' },
                { value: 'banned', label: 'حساب‌های تعلیق‌شده' },
                { value: 'inactive', label: 'در انتظار فعال‌سازی' },
              ]}
            />
          </div>

          <div className="text-[11px] font-semibold text-[var(--text-secondary)] px-2.5 py-1 rounded-lg bg-[var(--bg-elevated)] tabular-nums shrink-0">
            <span>نمایش </span>
            <strong className="text-[var(--brand-accent)]">{toPersianDigits(filteredUsers.length)}</strong>
            <span> از {toPersianDigits(usersTotal)}</span>
          </div>
        </div>
      </div>

      {/* Debounced Search Bar */}
      <div className="p-3 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
        <Input
          size="sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="جستجوی نام، ایمیل، شماره تماس یا نام سالن (با اعمال خودکار ۳۰۰ms)..."
          leadingIcon={<Search className="w-4 h-4 text-[var(--text-muted)]" />}
          trailingIcon={
            search ? (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="pointer-events-auto p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                aria-label="پاک کردن جستجو"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : undefined
          }
        />
      </div>

      {/* VIEW 1: UNCLUTTERED MODERN CARD GRID (PRIMARY) */}
      {viewMode === 'grid' && (
        <div className="space-y-4">
          {filteredUsers.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedUsers.map((user) => {
                  const roleBadge = getRoleBadge(user.role);
                  const isBanned = user.status === 'banned';

                  return (
                    <div
                      key={user.id}
                      className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--brand-border)] transition-colors flex flex-col justify-between"
                    >
                      <div>
                        {/* Top: Avatar, Name & Role Badge */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center font-bold text-[var(--brand-accent)] shrink-0">
                              {user.name.slice(0, 1)}
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-bold text-[var(--text-primary)] text-sm truncate">
                                {user.name}
                              </h3>
                              <p className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5">
                                {user.salonName || 'اطلاعات عضویت سالن موجود نیست'}
                              </p>
                            </div>
                          </div>

                          <span className={`px-2 py-0.5 text-[11px] rounded-md font-medium border shrink-0 ${roleBadge.color}`}>
                            {roleBadge.label}
                          </span>
                        </div>

                        {/* Contact Info */}
                        <div className="space-y-1.5 py-2.5 border-y border-[var(--border-subtle)] text-xs">
                          <div className="flex items-center justify-between text-[var(--text-secondary)]">
                            <span>ایمیل:</span>
                            <span className="font-mono text-[var(--text-primary)] truncate max-w-[170px]" dir="ltr">
                              <span dir="ltr">{user.email}</span>
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[var(--text-secondary)]">
                            <span>موبایل:</span>
                            <span className="font-mono text-[var(--text-primary)]" dir="ltr">
                              {maskPhone(user.phone)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[var(--text-secondary)]">
                            <span>احراز هویت دومرحله‌ای:</span>
                            <span className="font-semibold text-[var(--text-muted)]">در ورود enforce نشده</span>
                          </div>
                        </div>

                        {/* Metadata */}
                        <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] pt-2.5">
                          <span>آخرین ورود: {user.lastLogin}</span>
                          <span className="font-mono" dir="ltr">{user.lastIp}</span>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="flex items-center justify-between pt-3 mt-3 border-t border-[var(--border-subtle)]">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => openRoleModal(user)}
                          leftIcon={<Edit2 className="w-3 h-3" />}
                        >
                          تغییر نقش
                        </Button>

                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="secondary"
                            size="xs"
                            disabled
                            title="تنظیم ۲FA به‌تنهایی کافی نیست؛ الزام آن در جریان ورود هنوز پیاده‌سازی نشده است."
                          >
                            ۲FA غیرفعال
                          </Button>

                          {isBanned ? (
                            <Button
                              variant="success"
                              size="xs"
                              onClick={() => openStatusChangeModal(user, 'active')}
                            >
                              رفع مسدودی
                            </Button>
                          ) : (
                            <Button
                              variant="danger"
                              size="xs"
                              onClick={() => openStatusChangeModal(user, 'banned')}
                            >
                              مسدودسازی
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={usersTotal}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
                onLoadMore={page < totalPages ? () => setPage((p) => p + 1) : undefined}
                hasMore={page < totalPages}
                itemLabel="کاربر"
              />
            </>
          ) : (
            <EmptyState
              icon={<Users className="w-8 h-8 text-[var(--text-muted)]" />}
              title="کاربری با این مشخصات یافت نشد"
              description="لطفاً عبارت جستجو را ویرایش کرده یا فیلترهای نقش کاربری و وضعیت را پاک نمایید."
              action={{
                label: 'پاک کردن فیلترها',
                onClick: () => {
                  setSearch('');
                  setRoleFilter('all');
                  setStatusFilter('all');
                },
              }}
            />
          )}
        </div>
      )}

      {/* VIEW 2: COMPACT CLEAN TABLE */}
      {viewMode === 'table' && (
        <div className="nobat-table-container">
          {filteredUsers.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead className="nobat-table-header">
                    <tr>
                      <th className="py-3 px-4">نام کاربر</th>
                      <th className="py-3 px-4 hidden sm:table-cell">ایمیل و تماس</th>
                      <th className="py-3 px-4 hidden md:table-cell">سالن مربوطه</th>
                      <th className="py-3 px-4">نقش سیستمی</th>
                      <th className="py-3 px-4 hidden lg:table-cell">احراز هویت دومرحله‌ای</th>
                      <th className="py-3 px-4">وضعیت</th>
                      <th className="py-3 px-4 text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-primary)]">
                    {paginatedUsers.map((user) => {
                      const roleBadge = getRoleBadge(user.role);
                      return (
                        <tr key={user.id} className="nobat-table-row">
                          <td className="py-3 px-4 font-bold text-[var(--text-primary)]">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-[var(--bg-elevated)] text-[var(--brand-accent)] flex items-center justify-center font-bold text-xs shrink-0">
                                {user.name.slice(0, 1)}
                              </div>
                              <span>{user.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 hidden sm:table-cell">
                            <span className="font-mono text-[var(--text-secondary)] block text-[11px]" dir="ltr">{user.email}</span>
                            <span className="font-mono text-[11px] text-[var(--text-muted)]" dir="ltr">{maskPhone(user.phone)}</span>
                          </td>
                          <td className="py-3 px-4 text-[var(--text-secondary)] hidden md:table-cell">{user.salonName || 'دفتر مرکزی'}</td>
                          <td className="py-3 px-4">
                            <span className="text-xs text-[var(--text-secondary)]">
                              {roleBadge.label}
                            </span>
                          </td>
                          <td className="py-3 px-4 hidden lg:table-cell">
                            <span className="text-xs text-[var(--text-muted)]">در ورود enforce نشده</span>
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant={user.status === 'active' ? 'success' : user.status === 'banned' ? 'error' : 'warning'}
                              size="sm"
                            >
                              {user.status === 'active' ? 'فعال' : user.status === 'banned' ? 'تعلیق‌شده' : 'در انتظار'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {/* Desktop row action buttons */}
                            <div className="hidden sm:flex items-center justify-center gap-1.5">
                              <button type="button" onClick={() => openRoleModal(user)} className="px-2 py-1 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline cursor-pointer">نقش</button>
                              {user.status === 'active' ? (
                                <button type="button" onClick={() => openStatusChangeModal(user, 'banned')} className="px-2 py-1 text-xs font-semibold text-[var(--status-error)] hover:underline cursor-pointer">مسدود</button>
                              ) : (
                                <button type="button" onClick={() => openStatusChangeModal(user, 'active')} className="px-2 py-1 text-xs font-semibold text-[var(--status-success)] hover:underline cursor-pointer">رفع مسدود</button>
                              )}
                            </div>

                            {/* Mobile action button (opens action sheet) */}
                            <div className="sm:hidden flex justify-center">
                              <Button
                                variant="ghost"
                                size="xs"
                                onClick={() => setActiveUserMenu(user)}
                                aria-label="عملیات کاربر"
                              >
                                <MoreVertical className="w-4 h-4 text-[var(--text-secondary)]" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={usersTotal}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
                onLoadMore={page < totalPages ? () => setPage((p) => p + 1) : undefined}
                hasMore={page < totalPages}
                itemLabel="کاربر"
              />
            </>
          ) : (
            <div className="p-6">
              <EmptyState
                icon={<Users className="w-8 h-8 text-[var(--text-muted)]" />}
                title="کاربری با این مشخصات یافت نشد"
                description="لطفاً فیلترهای اعمال‌شده را بازنشانی کرده یا عبارت جستجو را تغییر دهید."
                action={{
                  label: 'پاک کردن فیلترها',
                  onClick: () => {
                    setSearch('');
                    setRoleFilter('all');
                    setStatusFilter('all');
                  },
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Mobile Row Action Sheet Modal */}
      {activeUserMenu && (
        <Modal
          isOpen={!!activeUserMenu}
          onClose={() => setActiveUserMenu(null)}
          title={`مدیریت دسترسی «${activeUserMenu.name}»`}
          description={`${activeUserMenu.email} · ${maskPhone(activeUserMenu.phone)}`}
          size="sm"
        >
          <div className="space-y-2 py-1 text-xs">
            <Button
              variant="outline"
              size="md"
              fullWidth
              onClick={() => openRoleModal(activeUserMenu)}
              leftIcon={<Edit2 className="w-4 h-4" />}
            >
              تغییر نقش کاربری ({getRoleBadge(activeUserMenu.role).label})
            </Button>

            <p className="text-[11px] text-[var(--text-muted)] px-2 py-1">
              الزام واقعی ۲FA در جریان ورود هنوز پیاده‌سازی نشده است.
            </p>

            {activeUserMenu.status === 'active' ? (
              <Button
                variant="danger"
                size="md"
                fullWidth
                onClick={() => openStatusChangeModal(activeUserMenu, 'banned')}
              >
                مسدودسازی حساب کاربر
              </Button>
            ) : (
              <Button
                variant="success"
                size="md"
                fullWidth
                onClick={() => openStatusChangeModal(activeUserMenu, 'active')}
              >
                رفع مسدودسازی و فعال‌سازی مجدد
              </Button>
            )}
          </div>
        </Modal>
      )}

      {/* Role Editing Modal */}
      {editingUser && (
        <Modal
          isOpen={!!editingUser}
          onClose={() => setEditingUser(null)}
          title="تغییر نقش و سطح دسترسی کاربر"
          description={`تغییر سطح دسترسی کاربر «${editingUser.name}» در پلتفرم نوبت‌آرا`}
          size="sm"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button variant="secondary" size="sm" onClick={() => setEditingUser(null)}>
                انصراف
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveRole}>
                ذخیره تغییرات
              </Button>
            </div>
          }
        >
          <div className="space-y-3 py-1 text-xs">
            <Select
              label="سطح دسترسی جدید"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as UserRole)}
              options={[
                { value: 'user', label: 'کاربر عادی' },
                { value: 'platform_support', label: 'پشتیبان پلتفرم' },
                { value: 'platform_auditor', label: 'بازرس پلتفرم' },
                { value: 'financial_manager', label: 'مدیر مالی' },
              ]}
            />
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              نقش‌های قابل انتخاب از نقش‌های واقعی API گرفته می‌شوند؛ انتساب Super Admin فقط از مسیر بوت‌استرپ امن مجاز است.
            </p>
          </div>
        </Modal>
      )}

      {/* Mandatory Reason Modal for User Status Change */}
      <StatusReasonModal
        isOpen={statusModal.isOpen}
        title={statusModal.title}
        entityName={statusModal.user?.name || 'کاربر'}
        targetStatusLabel={statusModal.targetStatus === 'active' ? 'فعال' : 'تعلیق‌شده'}
        actionVariant={statusModal.variant}
        onConfirm={async (reason) => {
          if (!statusModal.user) return;
          const updated = await changeUserStatus(
            statusModal.user.id,
            statusModal.targetStatus === 'active' ? 'active' : 'suspended',
            reason
          );
          if (!updated) {
            throw new Error('سرور تغییر وضعیت را تأیید نکرد؛ وضعیت حساب تغییر نکرد.');
          }
          await loadUsers({
            search: debouncedSearch.trim() || undefined,
            role: roleFilter === 'all' ? undefined : roleFilter,
            status: apiStatusFilter,
            limit: PAGE_SIZE,
            offset: (page - 1) * PAGE_SIZE,
          });
        }}
        onClose={() => setStatusModal({ ...statusModal, isOpen: false })}
      />
    </div>
  );
};
