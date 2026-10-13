import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { User, UserRole } from '../../types/admin';
import { toPersianDigits, getRoleBadge, maskPhone } from '../../utils/formatters';
import { ConfirmModal } from '../common/ConfirmModal';

export const UsersView: React.FC = () => {
  const { users, banUser, unbanUser, updateUserRole, toggleUser2FA, saveUser, salons, addToast } = useAdmin();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Role edit modal
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>('staff');

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
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.phone.includes(search) ||
        (u.salonName && u.salonName.toLowerCase().includes(search.toLowerCase()));

      const matchRole = roleFilter === 'all' || u.role === roleFilter;
      const matchStatus = statusFilter === 'all' || u.status === statusFilter;

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim() || !formData.email?.trim() || !formData.phone?.trim()) {
      addToast({
        type: 'error',
        title: 'خطا در ثبت کاربر',
        message: 'لطفاً نام، ایمیل و شماره تماس را وارد کنید.',
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
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            کاربران، پرسنل و دسترسی‌های سیستمی ({toPersianDigits(users.length)})
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            کنترل سطح دسترسی‌ها (RBAC)، امنیت احراز هویت دو مرحله‌ای (2FA)، پرسنل سالن‌ها و ادمین‌های نظارتی
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-lg shadow-rose-600/25 transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>افزودن کاربر جدید</span>
        </button>
      </div>

      {/* 1-Click Segmented Role Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-900/90 border border-slate-800 rounded-2xl text-xs">
        {[
          { id: 'all', label: 'تمام کاربران', count: users.length },
          { id: 'super_admin', label: 'ادمین کل', count: users.filter((u) => u.role === 'super_admin').length },
          { id: 'salon_admin', label: 'مدیران سالن', count: users.filter((u) => u.role === 'salon_admin').length },
          { id: 'staff', label: 'پرسنل سالن', count: users.filter((u) => u.role === 'staff').length },
          { id: 'support_auditor', label: 'پشتیبان و بازرس', count: users.filter((u) => u.role === 'support_auditor').length },
          { id: 'financial_manager', label: 'مدیر مالی', count: users.filter((u) => u.role === 'financial_manager').length },
        ].map((tab) => {
          const isSelected = roleFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setRoleFilter(tab.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all cursor-pointer font-medium ${
                isSelected
                  ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {toPersianDigits(tab.count)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Search Input */}
          <div className="lg:col-span-3 relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجوی سریع نام، ایمیل، شماره تماس یا نام سالن..."
              className="w-full pl-8 pr-9 py-2 bg-slate-800 border border-slate-700/70 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute left-2.5 top-2.5 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Role Filter */}
          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700/70 rounded-xl text-slate-200 focus:outline-none focus:border-rose-500 cursor-pointer"
            >
              <option value="all">تمام سطوح دسترسی</option>
              <option value="super_admin">ادمین کل سیستم</option>
              <option value="salon_admin">مدیران سالن‌ها</option>
              <option value="staff">آرایشگران و پرسنل</option>
              <option value="support_auditor">پشتیبان و بازرس</option>
              <option value="financial_manager">مدیر مالی</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700/70 rounded-xl text-slate-200 focus:outline-none focus:border-rose-500 cursor-pointer"
            >
              <option value="all">تمام وضعیت‌های امنیتی</option>
              <option value="active">فعال</option>
              <option value="banned">مسدود شده ({users.filter((u) => u.status === 'banned').length})</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
          <span>
            تعداد کاربران فیلتر شده: <span className="font-bold text-slate-200">{toPersianDigits(filteredUsers.length)}</span> نفر
          </span>
          <span className="text-emerald-400 font-medium">
            تعداد کاربران با احراز هویت دومرحله‌ای فعال: {toPersianDigits(users.filter((u) => u.twoFactorEnabled).length)}
          </span>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold">
              <tr>
                <th className="py-3.5 px-4">کاربر و اطلاعات تماس</th>
                <th className="py-3.5 px-4">نقش و سطح دسترسی</th>
                <th className="py-3.5 px-4">سالن مربوطه</th>
                <th className="py-3.5 px-4">وضعیت ۲ مرحله‌ای (2FA)</th>
                <th className="py-3.5 px-4">آخرین ورود و IP</th>
                <th className="py-3.5 px-4">وضعیت</th>
                <th className="py-3.5 px-4 text-center">عملیات مدیریتی</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {filteredUsers.map((user) => {
                const roleBadge = getRoleBadge(user.role);

                return (
                  <tr key={user.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* User Info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-indigo-400 shrink-0">
                          {user.name.slice(0, 1)}
                        </div>
                        <div>
                          <span className="font-bold text-slate-100 block">{user.name}</span>
                          <span className="text-[11px] text-slate-400 font-mono block mt-0.5" dir="ltr">
                            {user.email} · {maskPhone(user.phone)}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Role Badge */}
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => openRoleModal(user)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer hover:brightness-110 ${roleBadge.color}`}
                        title="کلیک جهت ویرایش نقش"
                      >
                        <span>{roleBadge.label}</span>
                        <Edit2 className="w-2.5 h-2.5 opacity-60" />
                      </button>
                    </td>

                    {/* Assigned Salon */}
                    <td className="py-3.5 px-4 text-slate-300">
                      {user.salonName ? (
                        <span className="font-medium text-slate-200">{user.salonName}</span>
                      ) : (
                        <span className="text-slate-500">مرکزی (تمام سالن‌ها)</span>
                      )}
                    </td>

                    {/* 2FA Status Toggle */}
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => toggleUser2FA(user.id)}
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] rounded-md font-medium border transition-colors cursor-pointer ${
                          user.twoFactorEnabled
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                        title="کلیک جهت فعال/غیرفعال‌سازی ۲ مرحله‌ای"
                      >
                        <Shield className="w-3 h-3" />
                        <span>{user.twoFactorEnabled ? 'فعال (امن)' : 'غیرفعال'}</span>
                      </button>
                    </td>

                    {/* Last Login & IP */}
                    <td className="py-3.5 px-4 text-slate-400">
                      <span>{user.lastLogin}</span>
                      <span className="block font-mono text-[10px] text-slate-500 mt-0.5" dir="ltr">
                        {user.lastIp}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 text-[10px] rounded-md font-semibold border ${
                          user.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {user.status === 'active' ? 'فعال' : 'مسدود'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Ban / Unban */}
                        {user.status === 'active' ? (
                          <button
                            onClick={() => {
                              setConfirmData({
                                isOpen: true,
                                title: `مسدودسازی کاربر ${user.name}`,
                                message: `دسترسی این کاربر به کل پنل و سالن قطع خواهد شد. آیا مطمئن هستید؟`,
                                variant: 'danger',
                                onConfirm: () => banUser(user.id),
                              });
                            }}
                            className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                            title="مسدودسازی کاربر"
                          >
                            <Lock className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => unbanUser(user.id)}
                            className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg transition-colors cursor-pointer"
                            title="رفع مسدودیت"
                          >
                            <Unlock className="w-4 h-4" />
                          </button>
                        )}

                        {/* Reset Auth SMS */}
                        <button
                          onClick={() => {
                            addToast({
                              type: 'info',
                              title: 'پیامک بازیابی رمز عبور ارسال شد',
                              message: `لینک احراز هویت به شماره ${user.phone} مخابره شد.`,
                            });
                          }}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="ارسال پیامک بازیابی رمز"
                        >
                          <Smartphone className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                    <p className="text-xs">هیچ کاربری با معیارهای جستجو یافت نشد.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="fixed inset-0" onClick={() => setEditingUser(null)}></div>

          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 z-10 text-right space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white">تغییر سطح دسترسی (RBAC)</h3>
                <p className="text-xs text-slate-400 mt-0.5">{editingUser.name} ({editingUser.email})</p>
              </div>
              <button onClick={() => setEditingUser(null)} className="p-1 text-slate-400 hover:text-white rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {[
                { role: 'super_admin' as UserRole, title: 'ادمین کل سیستم (دسترسی نامحدود)', desc: 'مدیریت تمام سالن‌ها، دیسپچ، سرور و مالی' },
                { role: 'salon_admin' as UserRole, title: 'مدیر سالن زیبایی', desc: 'دسترسی کامل به پرسنل و نوبت‌های سالن خود' },
                { role: 'staff' as UserRole, title: 'آرایشگر / پرسنل سالن', desc: 'مشاهده تقویم و نوبت‌های تخصصی خود' },
                { role: 'support_auditor' as UserRole, title: 'پشتیبان و بازرس کیفی', desc: 'پاسخگویی به تیکت‌ها و بررسی گزارش‌ها' },
                { role: 'financial_manager' as UserRole, title: 'مدیر مالی و اشتراک‌ها', desc: 'تایید فاکتورها، گزارش‌های گردش مالی' },
              ].map((item) => (
                <label
                  key={item.role}
                  onClick={() => setSelectedRole(item.role)}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    selectedRole === item.role
                      ? 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    checked={selectedRole === item.role}
                    onChange={() => setSelectedRole(item.role)}
                    className="mt-0.5 text-rose-600 focus:ring-rose-500"
                  />
                  <div>
                    <p className="font-bold">{item.title}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{item.desc}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 rounded-xl"
              >
                انصراف
              </button>
              <button
                onClick={handleSaveRole}
                className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow"
              >
                ذخیره نقش جدید
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="fixed inset-0" onClick={() => setIsAddModalOpen(false)}></div>

          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 z-10 text-right space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-rose-400" />
                تعریف کاربر یا ادمین جدید
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 text-slate-400 hover:text-white rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">نام و نام خانوادگی *</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="مثال: سهراب کریمی"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">ایمیل معتبر *</label>
                  <input
                    type="email"
                    required
                    dir="ltr"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="sohrab@salonapp.ir"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-rose-500 font-mono text-left"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">شماره تماس همراه *</label>
                  <input
                    type="tel"
                    required
                    dir="ltr"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="09121234567"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-rose-500 font-mono text-left"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">سطح دسترسی (Role)</label>
                  <select
                    value={formData.role || 'staff'}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-rose-500 cursor-pointer"
                  >
                    <option value="super_admin">ادمین کل سیستم</option>
                    <option value="salon_admin">مدیر سالن</option>
                    <option value="staff">پرسنل سالن</option>
                    <option value="support_auditor">پشتیبان / بازرس</option>
                    <option value="financial_manager">مدیر مالی</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">تخصیص به سالن</label>
                  <select
                    value={formData.salonId || ''}
                    onChange={(e) => setFormData({ ...formData, salonId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-rose-500 cursor-pointer"
                  >
                    <option value="">بدون سالن (ادمین مرکزی)</option>
                    {salons.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={!!formData.twoFactorEnabled}
                    onChange={(e) => setFormData({ ...formData, twoFactorEnabled: e.target.checked })}
                    className="rounded text-rose-500 focus:ring-rose-500"
                  />
                  <span>فعال‌سازی الزامی احراز هویت دومرحله‌ای (2FA)</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 rounded-xl"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow"
                >
                  ایجاد کاربر
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmData.isOpen}
        title={confirmData.title}
        message={confirmData.message}
        variant={confirmData.variant}
        onConfirm={confirmData.onConfirm}
        onCancel={() => setConfirmData((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
