import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  UserCheck,
  ShieldAlert,
  Search,
  Filter,
  Plus,
  Shield,
  Smartphone,
  Mail,
  KeyRound,
  Lock,
  Unlock,
  CheckCircle2,
  X,
  Edit2,
  UserPlus,
  LayoutGrid,
  List,
  Store,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { User, UserRole } from '../../types/admin';
import { toPersianDigits, getRoleBadge, maskPhone } from '../../utils/formatters';
import { ConfirmModal } from '../common/ConfirmModal';
import { StatusReasonModal } from '../common/StatusReasonModal';
import { Pagination } from '../common/Pagination';
import { EmptyState } from '../ui/EmptyState';
import { Select } from '../ui/Select';
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
  };

  const openRoleModal = (user: User) => {
    setEditingUser(user);
    setSelectedRole(user.role);
  };

  const handleSaveRole = () => {
    if (!editingUser) return;
    updateUserRole(editingUser.id, selectedRole);
    setEditingUser(null);
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-[#E7ECF5] flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            کاربران و پرسنل پلتفرم ({toPersianDigits(users.length)})
          </h2>
          <p className="text-xs text-zinc-500 dark:text-[#9AAAC2] mt-0.5">
            سطوح دسترسی، امنیت احراز هویت دومرحله‌ای و پرسنل متصل به سالن‌ها
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle: Cards vs Table */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-[#111B2E] border border-slate-200 dark:border-[#344258] rounded-lg text-xs">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-[#18243A] text-slate-900 dark:text-[#E7ECF5] font-bold shadow-xs'
                  : 'text-slate-500 dark:text-[#9AAAC2] hover:text-slate-700'
              }`}
              title="نمایش کارت‌های خلوت"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>کارت‌ها</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-[#18243A] text-slate-900 dark:text-[#E7ECF5] font-bold shadow-xs'
                  : 'text-slate-500 dark:text-[#9AAAC2] hover:text-slate-700'
              }`}
              title="نمایش جدول فشرده"
            >
              <List className="w-3.5 h-3.5" />
              <span>جدول</span>
            </button>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-xs transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>افزودن کاربر</span>
          </button>
        </div>
      </div>

      {/* Role Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-white dark:bg-[#111B2E] border border-slate-200 dark:border-[#344258] rounded-xl text-xs shadow-xs">
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
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all cursor-pointer font-medium ${
                isSelected
                  ? 'bg-rose-600 text-white font-bold shadow-xs'
                  : 'text-slate-600 dark:text-[#9AAAC2] hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-[#18243A]/60'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-[#18243A] text-slate-500 dark:text-[#9AAAC2]'
                }`}
              >
                {toPersianDigits(tab.count)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search Bar */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-[#18243A] border border-stone-200 dark:border-[#344258] shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجوی نام، ایمیل، شماره تماس یا نام سالن..."
            className="w-full pl-8 pr-9 py-2 bg-stone-50 dark:bg-[#111B2E] border border-stone-200 dark:border-[#344258] rounded-xl text-xs text-zinc-900 dark:text-[#E7ECF5] placeholder-zinc-400 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute left-2.5 top-2.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
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
                      className="p-5 rounded-2xl bg-white dark:bg-[#18243A] border border-stone-200/90 dark:border-[#344258] shadow-xs hover:border-indigo-400/50 dark:hover:border-indigo-500/30 transition-all flex flex-col justify-between"
                    >
                      <div>
                        {/* Top: Avatar, Name & Role Badge */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-zinc-800 border border-stone-200 dark:border-[#344258]/80 flex items-center justify-center font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                              {user.name.slice(0, 1)}
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-bold text-zinc-900 dark:text-[#E7ECF5] text-sm truncate">
                                {user.name}
                              </h3>
                              <p className="text-[11px] text-zinc-500 dark:text-[#9AAAC2] truncate mt-0.5">
                                {user.salonName || 'پرسنل ستادی'}
                              </p>
                            </div>
                          </div>

                          <span className={`px-2 py-0.5 text-[10px] rounded-md font-medium border shrink-0 ${roleBadge.color}`}>
                            {roleBadge.label}
                          </span>
                        </div>

                        {/* Contact Info */}
                        <div className="space-y-1.5 py-2.5 border-y border-stone-100 dark:border-[#344258]/80 text-xs">
                          <div className="flex items-center justify-between text-zinc-600 dark:text-[#9AAAC2]">
                            <span>ایمیل:</span>
                            <span className="font-mono text-zinc-700 dark:text-[#9AAAC2] truncate max-w-[170px]" dir="ltr">
                              {user.email}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-zinc-600 dark:text-[#9AAAC2]">
                            <span>موبایل:</span>
                            <span className="font-mono text-zinc-700 dark:text-[#9AAAC2]" dir="ltr">
                              {maskPhone(user.phone)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-zinc-600 dark:text-[#9AAAC2]">
                            <span>تایید دو مرحله‌ای:</span>
                            <button
                              onClick={() => toggleUser2FA(user.id)}
                              className={`text-[11px] font-medium flex items-center gap-1 cursor-pointer ${
                                user.twoFactorEnabled
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-zinc-400 hover:text-zinc-600'
                              }`}
                            >
                              <Shield className="w-3.5 h-3.5" />
                              <span>{user.twoFactorEnabled ? 'فعال' : 'غیرفعال'}</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Footer: Role Change & Status Action */}
                      <div className="flex items-center justify-between pt-3 border-t border-stone-100 dark:border-[#344258] mt-2">
                        <button
                          onClick={() => openRoleModal(user)}
                          className="px-2.5 py-1 text-xs text-zinc-600 dark:text-[#9AAAC2] hover:text-zinc-900 bg-stone-100 dark:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <Edit2 className="w-3 h-3 text-zinc-400" />
                          <span>تغییر نقش</span>
                        </button>

                        <div className="flex items-center gap-2">
                          {isBanned ? (
                            <button
                              onClick={() =>
                                setStatusModal({
                                  isOpen: true,
                                  user,
                                  targetStatus: 'active',
                                  title: `رفع مسدودیت و فعال‌سازی حساب «${user.name}»`,
                                  variant: 'success',
                                })
                              }
                              className="px-2.5 py-1 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg cursor-pointer"
                            >
                              رفع مسدودیت
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                setStatusModal({
                                  isOpen: true,
                                  user,
                                  targetStatus: 'banned',
                                  title: `مسدودسازی دسترسی و تعلیق حساب «${user.name}»`,
                                  variant: 'danger',
                                })
                              }
                              className="px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg cursor-pointer"
                            >
                              مسدودسازی
                            </button>
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
              icon={<Users className="w-8 h-8" />}
              title="کاربری با این مشخصات یافت نشد"
              description="لطفاً عبارت جستجو را ویرایش کرده یا فیلترهای نقش کاربری را تغییر دهید."
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
        <div className="rounded-2xl bg-white dark:bg-[#18243A] border border-stone-200 dark:border-[#344258] overflow-hidden shadow-xs">
          {filteredUsers.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-stone-50 dark:bg-[#111B2E] border-b border-stone-200 dark:border-[#344258] text-zinc-500 font-semibold">
                    <tr>
                      <th className="py-3 px-4">نام کاربر</th>
                      <th className="py-3 px-4 hidden sm:table-cell">ایمیل و تماس</th>
                      <th className="py-3 px-4 hidden md:table-cell">سالن مربوطه</th>
                      <th className="py-3 px-4">نقش سیستمی</th>
                      <th className="py-3 px-4">وضعیت</th>
                      <th className="py-3 px-4 text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-zinc-800 text-zinc-700 dark:text-[#9AAAC2]">
                    {paginatedUsers.map((user) => {
                      const roleBadge = getRoleBadge(user.role);
                      return (
                        <tr key={user.id} className="hover:bg-stone-50/60 dark:hover:bg-[#18243A]/40 transition-colors">
                          <td className="py-3 px-4 font-bold text-zinc-900 dark:text-[#E7ECF5]">{user.name}</td>
                          <td className="py-3 px-4 hidden sm:table-cell">
                            <span className="font-mono text-zinc-600 dark:text-[#9AAAC2] block" dir="ltr">{user.email}</span>
                            <span className="font-mono text-[11px] text-zinc-500" dir="ltr">{maskPhone(user.phone)}</span>
                          </td>
                          <td className="py-3 px-4 text-zinc-600 dark:text-[#9AAAC2] hidden md:table-cell">{user.salonName || 'دفتر مرکزی'}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-block px-2 py-0.5 text-[10px] rounded-md font-medium border ${roleBadge.color}`}>
                              {roleBadge.label}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`text-[11px] font-medium ${user.status === 'active' ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {user.status === 'active' ? 'فعال' : 'مسدود'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => openRoleModal(user)}
                              className="px-2.5 py-1 text-xs text-zinc-600 dark:text-[#9AAAC2] hover:text-zinc-900 bg-stone-100 dark:bg-zinc-800 rounded-lg cursor-pointer"
                            >
                              ویرایش
                            </button>
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
            <EmptyState
              icon={<Users className="w-8 h-8" />}
              title="کاربری با این مشخصات یافت نشد"
              description="لطفاً عبارت جستجو را ویرایش کرده یا فیلترهای نقش کاربری را تغییر دهید."
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

      {/* Role Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="fixed inset-0" onClick={() => setEditingUser(null)}></div>

          <div className="relative w-full max-w-sm bg-white dark:bg-[#18243A] border border-stone-200 dark:border-[#344258] rounded-2xl shadow-2xl p-5 z-10 text-right space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-[#344258]">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-[#E7ECF5]">تغییر سطح دسترسی</h3>
              <button onClick={() => setEditingUser(null)} className="p-1 text-zinc-400 hover:text-zinc-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {[
                { id: 'super_admin' as UserRole, title: 'ادمین کل سامانه' },
                { id: 'salon_admin' as UserRole, title: 'مدیر سالن' },
                { id: 'staff' as UserRole, title: 'پرسنل / متخصص سالن' },
                { id: 'support_auditor' as UserRole, title: 'پشتیبان و بازرس' },
                { id: 'financial_manager' as UserRole, title: 'مدیر مالی' },
              ].map((r) => (
                <div
                  key={r.id}
                  onClick={() => setSelectedRole(r.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedRole === r.id
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 font-bold text-indigo-700 dark:text-indigo-300'
                      : 'border-stone-200 dark:border-[#344258] text-zinc-700 dark:text-[#9AAAC2] hover:border-stone-300'
                  }`}
                >
                  {r.title}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200 dark:border-[#344258]">
              <button
                onClick={() => setEditingUser(null)}
                className="px-3.5 py-1.5 text-xs text-zinc-600 dark:text-[#9AAAC2] bg-stone-100 dark:bg-zinc-800 rounded-xl"
              >
                انصراف
              </button>
              <button
                onClick={handleSaveRole}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl"
              >
                ذخیره نقش
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="fixed inset-0" onClick={() => setIsAddModalOpen(false)}></div>

          <div className="relative w-full max-w-md bg-white dark:bg-[#18243A] border border-stone-200 dark:border-[#344258] rounded-2xl shadow-2xl p-6 z-10 text-right space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-[#344258]">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-[#E7ECF5]">افزودن کاربر جدید</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 text-zinc-400 hover:text-zinc-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-zinc-700 dark:text-[#9AAAC2] font-semibold mb-1">نام و نام خانوادگی *</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="مثال: نرگس رضایی"
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-[#111B2E] border border-stone-200 dark:border-[#344258] rounded-xl text-zinc-900 dark:text-[#E7ECF5] focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-zinc-700 dark:text-[#9AAAC2] font-semibold mb-1">ایمیل *</label>
                <input
                  type="email"
                  required
                  dir="ltr"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="name@example.com"
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-[#111B2E] border border-stone-200 dark:border-[#344258] rounded-xl text-zinc-900 dark:text-[#E7ECF5] focus:outline-none focus:border-indigo-500 text-left font-mono"
                />
              </div>

              <div>
                <label className="block text-zinc-700 dark:text-[#9AAAC2] font-semibold mb-1">شماره تماس *</label>
                <input
                  type="tel"
                  required
                  dir="ltr"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="09121234567"
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-[#111B2E] border border-stone-200 dark:border-[#344258] rounded-xl text-zinc-900 dark:text-[#E7ECF5] focus:outline-none focus:border-indigo-500 text-left font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-700 dark:text-[#9AAAC2] font-semibold mb-1">نقش کاربری</label>
                  <select
                    value={formData.role || 'staff'}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-[#111B2E] border border-stone-200 dark:border-[#344258] rounded-xl text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="staff">پرسنل سالن</option>
                    <option value="salon_admin">مدیر سالن</option>
                    <option value="support_auditor">پشتیبان</option>
                    <option value="super_admin">ادمین کل</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-700 dark:text-[#9AAAC2] font-semibold mb-1">سالن مربوطه</label>
                  <select
                    value={formData.salonId || salons[0]?.id}
                    onChange={(e) => setFormData({ ...formData, salonId: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-[#111B2E] border border-stone-200 dark:border-[#344258] rounded-xl text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
                  >
                    {salons.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-200 dark:border-[#344258]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs text-zinc-600 dark:text-[#9AAAC2] bg-stone-100 dark:bg-zinc-800 rounded-xl"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-xs"
                >
                  افزودن کاربر
                </button>
              </div>
            </form>
          </div>
        </div>
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
