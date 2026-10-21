import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Shield,
  Smartphone,
  Mail,
  Lock,
  Unlock,
  CheckCircle2,
  X,
  Edit2,
  UserPlus,
  LayoutGrid,
  List,
  Store,
  MoreVertical,
  Filter,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { User, UserRole } from '../../types/admin';
import { toPersianDigits, getRoleBadge, maskPhone } from '../../utils/formatters';
import { ConfirmModal } from '../common/ConfirmModal';
import { StatusReasonModal } from '../common/StatusReasonModal';
import { Pagination } from '../common/Pagination';
import { EmptyState } from '../ui/EmptyState';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { useDebounce } from '../../hooks/useDebounce';

export const UsersView: React.FC = () => {
  const { users, banUser, unbanUser, updateUserRole, toggleUser2FA, saveUser, salons, addToast } = useAdmin();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;

  // Mobile Action Sheet
  const [activeUserMenu, setActiveUserMenu] = useState<User | null>(null);

  // Role edit modal
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>('staff');

  // Mandatory Reason Modal state for User Suspension/Activation
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

  // Confirmation modal
  const [confirmData, setConfirmData] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: 'danger' | 'warning';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'warning',
    onConfirm: () => {},
  });

  // New user form state
  const [formData, setFormData] = useState<Partial<User>>({
    name: '',
    email: '',
    phone: '',
    role: 'staff',
    salonId: salons[0]?.id || '',
    twoFactorEnabled: false,
  });

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        u.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        u.phone.includes(debouncedSearch) ||
        (u.salonName && u.salonName.toLowerCase().includes(debouncedSearch.toLowerCase()));

      const matchRole = roleFilter === 'all' || u.role === roleFilter;
      const matchStatus = statusFilter === 'all' || u.status === statusFilter;

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, debouncedSearch, roleFilter, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, roleFilter, statusFilter]);

  const totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE);
  const paginatedUsers = useMemo(() => {
    return filteredUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  }, [filteredUsers, page]);

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim() || !formData.email?.trim() || !formData.phone?.trim()) {
      addToast({
        type: 'error',
        title: 'اطلاعات ناقص است',
        message: 'نام، ایمیل و شماره تماس الزامی هستند.',
      });
      return;
    }

    const assignedSalon = salons.find((s) => s.id === formData.salonId);

    const newUser: User = {
      id: `usr-${Date.now().toString().slice(-4)}`,
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      role: formData.role || 'staff',
      salonId: formData.salonId,
      salonName: assignedSalon ? assignedSalon.name : undefined,
      status: 'active',
      twoFactorEnabled: !!formData.twoFactorEnabled,
      lastLogin: 'ثبت جدید',
      lastIp: '185.120.24.12',
      createdAt: 'امروز',
    };

    saveUser(newUser);
    setIsAddModalOpen(false);
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: 'staff',
      salonId: salons[0]?.id || '',
      twoFactorEnabled: false,
    });
    addToast({
      type: 'success',
      title: 'کاربر جدید با موفقیت ایجاد شد',
    });
  };

  const openRoleModal = (user: User) => {
    setEditingUser(user);
    setSelectedRole(user.role);
    setActiveUserMenu(null);
  };

  const handleSaveRole = () => {
    if (!editingUser) return;
    updateUserRole(editingUser.id, selectedRole);
    setEditingUser(null);
  };

  const openStatusChangeModal = (user: User, targetStatus: 'active' | 'banned') => {
    setActiveUserMenu(null);
    setStatusModal({
      isOpen: true,
      user,
      targetStatus,
      title: targetStatus === 'active' ? `فعال‌سازی کاربر «${user.name}»` : `مسدودسازی حساب کاربر «${user.name}»`,
      variant: targetStatus === 'active' ? 'success' : 'danger',
    });
  };

  const handleToggle2FA = (user: User) => {
    setActiveUserMenu(null);
    setConfirmData({
      isOpen: true,
      title: user.twoFactorEnabled ? 'غیرفعال‌سازی ۲FA' : 'فعال‌سازی ۲FA',
      message: `آیا از تغییر وضعیت احراز هویت دومرحله‌ای برای «${user.name}» اطمینان دارید؟`,
      variant: 'warning',
      onConfirm: () => toggleUser2FA(user.id),
    });
  };

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header & View Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Users className="w-5 h-5 text-[var(--brand-primary)]" />
            مدیریت کاربران، مدیران و پرسنل
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            کنترل سطح دسترسی، امنیت ۲FA و وضعیت فعالیت اعضای شبکه
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* View Mode Toggle */}
          <div className="flex items-center p-1 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl shadow-xs">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-[var(--brand-subdued)] text-[var(--brand-primary)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              title="نمایش کارتی شبکه‌ای"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>کارت‌ها</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-[var(--brand-subdued)] text-[var(--brand-primary)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              title="نمایش جدول فشرده"
            >
              <List className="w-3.5 h-3.5" />
              <span>جدول</span>
            </button>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            leftIcon={<UserPlus className="w-4 h-4" />}
          >
            افزودن کاربر
          </Button>
        </div>
      </div>

      {/* Role Filter Tabs & Result Count */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-1.5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl text-xs shadow-xs">
        <div className="flex flex-wrap items-center gap-1">
          {[
            { id: 'all', label: 'همه کاربران', count: users.length },
            { id: 'super_admin', label: 'ادمین کل', count: users.filter((u) => u.role === 'super_admin').length },
            { id: 'salon_admin', label: 'مدیران سالن', count: users.filter((u) => u.role === 'salon_admin').length },
            { id: 'staff', label: 'پرسنل سالن', count: users.filter((u) => u.role === 'staff').length },
            { id: 'support_auditor', label: 'پشتیبان و بازرس', count: users.filter((u) => u.role === 'support_auditor').length },
          ].map((tab) => {
            const isSelected = roleFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setRoleFilter(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer font-medium ${
                  isSelected
                    ? 'bg-[var(--brand-primary)] text-white font-bold shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold tabular-nums ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                  }`}
                >
                  {toPersianDigits(tab.count)}
                </span>
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
                { value: 'banned', label: 'کاربران مسدود' },
              ]}
            />
          </div>

          <div className="text-[11px] font-semibold text-[var(--text-secondary)] px-2.5 py-1 rounded-lg bg-[var(--bg-elevated)] tabular-nums shrink-0">
            <span>نمایش </span>
            <strong className="text-[var(--brand-primary)]">{toPersianDigits(filteredUsers.length)}</strong>
            <span> از {toPersianDigits(users.length)}</span>
          </div>
        </div>
      </div>

      {/* Debounced Search Bar */}
      <div className="p-3 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-xs">
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
                      className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-xs hover:border-[var(--brand-border)] transition-all flex flex-col justify-between"
                    >
                      <div>
                        {/* Top: Avatar, Name & Role Badge */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center font-bold text-[var(--brand-primary)] shrink-0">
                              {user.name.slice(0, 1)}
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-bold text-[var(--text-primary)] text-sm truncate">
                                {user.name}
                              </h3>
                              <p className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5">
                                {user.salonName || 'پرسنل ستادی'}
                              </p>
                            </div>
                          </div>

                          <span className={`px-2 py-0.5 text-[10px] rounded-md font-medium border shrink-0 ${roleBadge.color}`}>
                            {roleBadge.label}
                          </span>
                        </div>

                        {/* Contact Info */}
                        <div className="space-y-1.5 py-2.5 border-y border-[var(--border-subtle)] text-xs">
                          <div className="flex items-center justify-between text-[var(--text-secondary)]">
                            <span>ایمیل:</span>
                            <span className="font-mono text-[var(--text-primary)] truncate max-w-[170px]" dir="ltr">
                              {user.email}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[var(--text-secondary)]">
                            <span>موبایل:</span>
                            <span className="font-mono text-[var(--text-primary)]" dir="ltr">
                              {maskPhone(user.phone)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[var(--text-secondary)]">
                            <span>امنیت ۲FA:</span>
                            <span className={`flex items-center gap-1 font-semibold ${user.twoFactorEnabled ? 'text-[var(--status-success)]' : 'text-[var(--text-muted)]'}`}>
                              {user.twoFactorEnabled ? <CheckCircle2 className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                              <span>{user.twoFactorEnabled ? 'فعال' : 'غیرفعال'}</span>
                            </span>
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
                            onClick={() => handleToggle2FA(user)}
                            title={user.twoFactorEnabled ? 'غیرفعال‌سازی تایید دومرحله‌ای' : 'فعال‌سازی تایید دومرحله‌ای'}
                          >
                            {user.twoFactorEnabled ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
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
                totalItems={filteredUsers.length}
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
                <table className="w-full text-right text-xs">
                  <thead className="nobat-table-header">
                    <tr>
                      <th className="py-3 px-4">نام کاربر</th>
                      <th className="py-3 px-4 hidden sm:table-cell">ایمیل و تماس</th>
                      <th className="py-3 px-4 hidden md:table-cell">سالن مربوطه</th>
                      <th className="py-3 px-4">نقش سیستمی</th>
                      <th className="py-3 px-4 hidden lg:table-cell">امنیت ۲FA</th>
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
                              <div className="w-7 h-7 rounded-lg bg-[var(--bg-elevated)] text-[var(--brand-primary)] flex items-center justify-center font-bold text-xs shrink-0">
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
                            <span className={`inline-block px-2 py-0.5 text-[10px] rounded-md font-medium border ${roleBadge.color}`}>
                              {roleBadge.label}
                            </span>
                          </td>
                          <td className="py-3 px-4 hidden lg:table-cell">
                            <Badge variant={user.twoFactorEnabled ? 'success' : 'neutral'} size="sm">
                              {user.twoFactorEnabled ? 'فعال' : 'غیرفعال'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={user.status === 'active' ? 'success' : 'error'} size="sm">
                              {user.status === 'active' ? 'فعال' : 'مسدود'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {/* Desktop row action buttons */}
                            <div className="hidden sm:flex items-center justify-center gap-1.5">
                              <Button
                                variant="outline"
                                size="xs"
                                onClick={() => openRoleModal(user)}
                              >
                                نقش
                              </Button>
                              {user.status === 'active' ? (
                                <Button
                                  variant="danger"
                                  size="xs"
                                  onClick={() => openStatusChangeModal(user, 'banned')}
                                >
                                  مسدود
                                </Button>
                              ) : (
                                <Button
                                  variant="success"
                                  size="xs"
                                  onClick={() => openStatusChangeModal(user, 'active')}
                                >
                                  رفع مسدود
                                </Button>
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
                totalItems={filteredUsers.length}
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

            <Button
              variant="outline"
              size="md"
              fullWidth
              onClick={() => handleToggle2FA(activeUserMenu)}
              leftIcon={activeUserMenu.twoFactorEnabled ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            >
              {activeUserMenu.twoFactorEnabled ? 'غیرفعال‌سازی ۲FA' : 'فعال‌سازی احراز هویت دومرحله‌ای'}
            </Button>

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
                { value: 'staff', label: 'پرسنل سالن (مشاهده نوبت‌ها و ثبت مشتری)' },
                { value: 'salon_admin', label: 'مدیر سالن (مدیریت صندوق، پرسنل و تعرفه‌ها)' },
                { value: 'support_auditor', label: 'پشتیبان و بازرس (مشاهده مدارک و پاسخگویی تیکت)' },
                { value: 'super_admin', label: 'ادمین کل (دسترسی نامحدود به تمام بخش‌های شبکه)' },
              ]}
            />
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              تغییر سطح دسترسی بلافاصله در نشست‌های فعال کاربر اعمال می‌گردد.
            </p>
          </div>
        </Modal>
      )}

      {/* Add User Modal */}
      {isAddModalOpen && (
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="افزودن کاربر جدید به شبکه نوبت‌آرا"
          description="ایجاد حساب برای مدیران، پرسنل یا ادمین‌های سامانه"
          size="md"
        >
          <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
            <Input
              label="نام و نام خانوادگی *"
              required
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="مثال: نرگس رضایی"
            />

            <Input
              label="ایمیل *"
              type="email"
              required
              dir="ltr"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="name@example.com"
              tabularNums
            />

            <Input
              label="شماره تماس *"
              type="tel"
              required
              dir="ltr"
              value={formData.phone || ''}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="09121234567"
              tabularNums
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="نقش کاربری"
                value={formData.role || 'staff'}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                options={[
                  { value: 'staff', label: 'پرسنل سالن' },
                  { value: 'salon_admin', label: 'مدیر سالن' },
                  { value: 'support_auditor', label: 'پشتیبان' },
                  { value: 'super_admin', label: 'ادمین کل' },
                ]}
              />

              <Select
                label="سالن مربوطه"
                value={formData.salonId || salons[0]?.id}
                onChange={(e) => setFormData({ ...formData, salonId: e.target.value })}
                options={salons.map((s) => ({ value: s.id, label: s.name }))}
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border-subtle)]">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsAddModalOpen(false)}
              >
                انصراف
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
              >
                افزودن کاربر
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Mandatory Reason Modal for User Status Change */}
      <StatusReasonModal
        isOpen={statusModal.isOpen}
        title={statusModal.title}
        entityName={statusModal.user?.name || 'کاربر'}
        targetStatusLabel={statusModal.targetStatus === 'active' ? 'فعال' : 'مسدود'}
        actionVariant={statusModal.variant}
        onConfirm={async (reason) => {
          if (!statusModal.user) return;
          if (statusModal.targetStatus === 'active') {
            await unbanUser(statusModal.user.id, reason);
          } else {
            await banUser(statusModal.user.id, reason);
          }
        }}
        onClose={() => setStatusModal({ ...statusModal, isOpen: false })}
      />

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmData.isOpen}
        title={confirmData.title}
        message={confirmData.message}
        variant={confirmData.variant}
        onConfirm={confirmData.onConfirm}
        onClose={() => setConfirmData({ ...confirmData, isOpen: false })}
      />
    </div>
  );
};
