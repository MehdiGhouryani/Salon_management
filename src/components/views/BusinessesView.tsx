import React, { useState, useMemo } from 'react';
import {
  Store,
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  CheckCircle,
  AlertTriangle,
  X,
  Edit2,
  Trash2,
  Check,
  Phone,
  MapPin,
  Calendar,
  Users,
  DollarSign,
  ShieldCheck,
  EyeOff,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { Salon, SalonStatus, PlanType } from '../../types/admin';
import {
  toPersianDigits,
  formatCurrency,
  formatNumber,
  getStatusBadge,
  maskPhone,
  exportToCsv,
} from '../../utils/formatters';
import { ConfirmModal } from '../common/ConfirmModal';

export const BusinessesView: React.FC = () => {
  const {
    salons,
    approveSalon,
    suspendSalon,
    activateSalon,
    updateSalonPlan,
    saveSalon,
    deleteSalon,
    inspectedSalon,
    setInspectedSalon,
    addToast,
  } = useAdmin();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'revenue' | 'appointments' | 'date'>('revenue');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [targetSalonForPlan, setTargetSalonForPlan] = useState<Salon | null>(null);
  const [selectedPlanOption, setSelectedPlanOption] = useState<PlanType>('silver');

  const [confirmModalData, setConfirmModalData] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant: 'danger' | 'warning';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    variant: 'warning',
  });

  // Reveal phone in drawer
  const [revealPhone, setRevealPhone] = useState(false);

  // Form state for new salon
  const [formData, setFormData] = useState<Partial<Salon>>({
    name: '',
    category: 'سالن عمومی زیبایی و بانوان',
    ownerName: '',
    phone: '',
    email: '',
    province: 'تهران',
    city: 'تهران',
    address: '',
    plan: 'bronze',
    status: 'pending',
    servicesCount: 10,
    activeStaffCount: 3,
  });

  // Unique cities
  const uniqueCities = useMemo(() => {
    const list = Array.from(new Set(salons.map((s) => s.province)));
    return list;
  }, [salons]);

  // Filtered & sorted salons
  const filteredSalons = useMemo(() => {
    return salons
      .filter((s) => {
        const matchesSearch =
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.ownerName.toLowerCase().includes(search.toLowerCase()) ||
          s.city.toLowerCase().includes(search.toLowerCase()) ||
          s.phone.includes(search);

        const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
        const matchesCity = cityFilter === 'all' || s.province === cityFilter;
        const matchesPlan = planFilter === 'all' || s.plan === planFilter;

        return matchesSearch && matchesStatus && matchesCity && matchesPlan;
      })
      .sort((a, b) => {
        if (sortBy === 'revenue') return b.monthlyRevenue - a.monthlyRevenue;
        if (sortBy === 'appointments') return b.totalAppointments - a.totalAppointments;
        return b.id.localeCompare(a.id);
      });
  }, [salons, search, statusFilter, cityFilter, planFilter, sortBy]);

  const handleExport = () => {
    const exportRows = filteredSalons.map((s) => ({
      شناسه: s.id,
      نام_سالن: s.name,
      دسته‌بندی: s.category,
      مدیر: s.ownerName,
      تلفن: s.phone,
      استان: s.province,
      شهر: s.city,
      وضعیت: s.status,
      پلن: s.plan,
      درآمد_ماهانه_تومان: s.monthlyRevenue,
      تعداد_نوبت‌ها: s.totalAppointments,
      تعداد_پرسنل: s.activeStaffCount,
      تاریخ_ثبت: s.registeredAt,
    }));
    exportToCsv(`salons-export-${Date.now()}`, exportRows);
    addToast({
      type: 'success',
      title: 'فایل اکسل/CSV سالن‌ها ایجاد و دانلود شد',
    });
  };

  const handleCreateSalon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim() || !formData.ownerName?.trim() || !formData.phone?.trim()) {
      addToast({
        type: 'error',
        title: 'خطا در ثبت سالن',
        message: 'لطفاً نام سالن، نام مدیر و شماره تلفن را وارد نمایید.',
      });
      return;
    }

    const newSalon: Salon = {
      id: `sal-${Date.now().toString().slice(-4)}`,
      name: formData.name,
      category: formData.category || 'سالن زیبایی',
      ownerName: formData.ownerName,
      phone: formData.phone,
      email: formData.email || `contact@${formData.name?.replace(/\s+/g, '')}.ir`,
      province: formData.province || 'تهران',
      city: formData.city || 'تهران',
      address: formData.address || 'آدرس ثبت نشده',
      status: formData.status || 'pending',
      plan: formData.plan || 'bronze',
      planExpiry: '۱۴۰۴/۰۸/۰۱',
      monthlyRevenue: 0,
      totalAppointments: 0,
      activeStaffCount: formData.activeStaffCount || 3,
      verifiedBadge: false,
      registeredAt: 'امروز',
      servicesCount: formData.servicesCount || 8,
      notes: 'سالن توسط ادمین اصلی اضافه گردید.',
    };

    saveSalon(newSalon);
    setIsAddModalOpen(false);
    setFormData({
      name: '',
      category: 'سالن عمومی زیبایی و بانوان',
      ownerName: '',
      phone: '',
      email: '',
      province: 'تهران',
      city: 'تهران',
      address: '',
      plan: 'bronze',
      status: 'pending',
      servicesCount: 10,
      activeStaffCount: 3,
    });
  };

  const openPlanModal = (salon: Salon) => {
    setTargetSalonForPlan(salon);
    setSelectedPlanOption(salon.plan);
    setIsPlanModalOpen(true);
  };

  const handleSavePlanChange = () => {
    if (!targetSalonForPlan) return;
    updateSalonPlan(targetSalonForPlan.id, selectedPlanOption);
    setIsPlanModalOpen(false);
    setTargetSalonForPlan(null);
  };

  return (
    <div className="space-y-6">
      {/* View Header with Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Store className="w-5 h-5 text-rose-400" />
            مدیریت جامع سالن‌ها و کسب‌وکارها ({toPersianDigits(salons.length)})
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            مشاهده، ارزیابی مدارک، تایید صلاحیت، تعلیق و مدیریت تعرفه سالن‌های متصل به سیستم
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700/80 rounded-xl transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>خروجی اکسل / CSV</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-lg shadow-rose-600/25 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>افزودن سالن جدید</span>
          </button>
        </div>
      </div>

      {/* 1-Click Segmented Status Pills for Instant Access */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-900/90 border border-slate-800 rounded-2xl text-xs">
        {[
          { id: 'all', label: 'همه سالن‌ها', count: salons.length },
          { id: 'active', label: 'فعال', count: salons.filter((s) => s.status === 'active').length },
          { id: 'pending', label: 'در انتظار بررسی', count: salons.filter((s) => s.status === 'pending').length },
          { id: 'suspended', label: 'معلق شده', count: salons.filter((s) => s.status === 'suspended').length },
          { id: 'trial', label: 'دوره آزمایشی', count: salons.filter((s) => s.status === 'trial').length },
        ].map((tab) => {
          const isSelected = statusFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all cursor-pointer font-medium ${
                isSelected
                  ? 'bg-rose-500 text-white font-bold shadow-md shadow-rose-500/20'
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Search Input with Clear Button */}
          <div className="lg:col-span-3 relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجوی سریع نام سالن، مدیر، تلفن یا شهر..."
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

          {/* Province Filter */}
          <div>
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700/70 rounded-xl text-slate-200 focus:outline-none focus:border-rose-500 cursor-pointer"
            >
              <option value="all">تمام استان‌ها</option>
              {uniqueCities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Plan Filter */}
          <div>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700/70 rounded-xl text-slate-200 focus:outline-none focus:border-rose-500 cursor-pointer"
            >
              <option value="all">تمام بسته‌ها</option>
              <option value="bronze">پایه (برنزی)</option>
              <option value="silver">حرفه‌ای (نقره‌ای)</option>
              <option value="gold_vip">طلایی ویژه (VIP)</option>
            </select>
          </div>
        </div>

        {/* Sort & Quick Status Counts */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <span>مرتب‌سازی بر اساس:</span>
            <button
              onClick={() => setSortBy('revenue')}
              className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                sortBy === 'revenue' ? 'bg-slate-800 text-rose-400 font-semibold' : 'hover:text-slate-200'
              }`}
            >
              بیشترین گردش مالی
            </button>
            <button
              onClick={() => setSortBy('appointments')}
              className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                sortBy === 'appointments' ? 'bg-slate-800 text-rose-400 font-semibold' : 'hover:text-slate-200'
              }`}
            >
              تعداد نوبت‌ها
            </button>
          </div>

          <div>
            نمایش <span className="font-bold text-slate-200">{toPersianDigits(filteredSalons.length)}</span> سالن از کل{' '}
            <span className="font-bold text-slate-200">{toPersianDigits(salons.length)}</span> سالن
          </div>
        </div>
      </div>

      {/* Salons Table */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold">
              <tr>
                <th className="py-3.5 px-4">نام سالن و دسته‌بندی</th>
                <th className="py-3.5 px-4">مدیر و تماس</th>
                <th className="py-3.5 px-4">شهر / منطقه</th>
                <th className="py-3.5 px-4">بسته اشتراک</th>
                <th className="py-3.5 px-4">گردش ماهانه</th>
                <th className="py-3.5 px-4">پرسنل / نوبت‌ها</th>
                <th className="py-3.5 px-4">وضعیت</th>
                <th className="py-3.5 px-4 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {filteredSalons.map((salon) => {
                const badge = getStatusBadge(salon.status);

                return (
                  <tr key={salon.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Salon Name */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center font-bold text-rose-400 shrink-0">
                          {salon.name.slice(0, 1)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-100">{salon.name}</span>
                            {salon.verifiedBadge && (
                              <span className="text-[10px] text-sky-400 font-semibold" title="تایید رسمی ادمین">
                                ✓
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 block mt-0.5">{salon.category}</span>
                        </div>
                      </div>
                    </td>

                    {/* Owner & Phone */}
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-200 block">{salon.ownerName}</span>
                      <span className="font-mono text-[11px] text-slate-400 block mt-0.5" dir="ltr">
                        {maskPhone(salon.phone)}
                      </span>
                    </td>

                    {/* City */}
                    <td className="py-3 px-4 text-slate-300">
                      <span>{salon.city}</span>
                      <span className="block text-[10px] text-slate-400 mt-0.5 truncate max-w-[150px]">{salon.address}</span>
                    </td>

                    {/* Plan */}
                    <td className="py-3 px-4">
                      <button
                        onClick={() => openPlanModal(salon)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer hover:brightness-110 flex items-center gap-1.5"
                        style={{
                          backgroundColor:
                            salon.plan === 'gold_vip'
                              ? 'rgba(245, 158, 11, 0.15)'
                              : salon.plan === 'silver'
                              ? 'rgba(148, 163, 184, 0.15)'
                              : 'rgba(217, 119, 6, 0.1)',
                          borderColor:
                            salon.plan === 'gold_vip'
                              ? 'rgba(245, 158, 11, 0.3)'
                              : salon.plan === 'silver'
                              ? 'rgba(148, 163, 184, 0.3)'
                              : 'rgba(217, 119, 6, 0.2)',
                          color:
                            salon.plan === 'gold_vip'
                              ? '#fbbf24'
                              : salon.plan === 'silver'
                              ? '#cbd5e1'
                              : '#f59e0b',
                        }}
                      >
                        {salon.plan === 'gold_vip' ? 'طلایی VIP' : salon.plan === 'silver' ? 'نقره‌ای' : 'برنزی'}
                        <Edit2 className="w-2.5 h-2.5 text-slate-400" />
                      </button>
                    </td>

                    {/* Monthly Revenue */}
                    <td className="py-3 px-4 font-bold text-emerald-400 tabular-nums">
                      {formatCurrency(salon.monthlyRevenue, 'toman')}
                    </td>

                    {/* Staff & Appointments */}
                    <td className="py-3 px-4 tabular-nums text-slate-300">
                      <span>{toPersianDigits(salon.activeStaffCount)} آرایشگر</span>
                      <span className="block text-[11px] text-slate-400 mt-0.5">
                        {toPersianDigits(salon.totalAppointments)} نوبت ثبت شده
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 text-[10px] rounded-md font-medium border ${badge.bg} ${badge.text} ${badge.border}`}>
                        {badge.label}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* View / Inspect Drawer */}
                        <button
                          onClick={() => setInspectedSalon(salon)}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="مشاهده جزئیات کامل"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Approve Button (if pending) */}
                        {salon.status === 'pending' && (
                          <button
                            onClick={() => approveSalon(salon.id)}
                            className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg transition-colors cursor-pointer"
                            title="تایید صلاحیت و اعطای نشان"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}

                        {/* Suspend / Activate toggle */}
                        {salon.status === 'active' ? (
                          <button
                            onClick={() => {
                              setConfirmModalData({
                                isOpen: true,
                                title: `تعلیق موقت سالن ${salon.name}`,
                                message: `با تعلیق سالن، نوبت‌دهی آنلاین برای مشتریان مسدود می‌شود. آیا مطمئن هستید؟`,
                                variant: 'warning',
                                onConfirm: () => suspendSalon(salon.id),
                              });
                            }}
                            className="p-1.5 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg transition-colors cursor-pointer"
                            title="تعلیق فعالیت سالن"
                          >
                            <AlertTriangle className="w-4 h-4" />
                          </button>
                        ) : salon.status === 'suspended' ? (
                          <button
                            onClick={() => activateSalon(salon.id)}
                            className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg transition-colors cursor-pointer"
                            title="رفع تعلیق و بازگشایی"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        ) : null}

                        {/* Delete Salon */}
                        <button
                          onClick={() => {
                            setConfirmModalData({
                              isOpen: true,
                              title: `حذف دائم سالن ${salon.name}`,
                              message: `این اقدام غیرقابل بازگشت است و تمام نوبت‌ها و اطلاعات سالن حذف خواهد شد.`,
                              variant: 'danger',
                              onConfirm: () => deleteSalon(salon.id),
                            });
                          }}
                          className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                          title="حذف سالن از پایگاه داده"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredSalons.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Store className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                    <p className="text-xs">هیچ سالنی مطابق با فیلترهای انتخابی یافت نشد.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Salon Inspection Drawer */}
      {inspectedSalon && (
        <div className="fixed inset-0 z-50 flex justify-start bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="fixed inset-0" onClick={() => setInspectedSalon(null)}></div>

          <div className="relative w-full max-w-lg bg-slate-900 border-l border-slate-700 h-full overflow-y-auto shadow-2xl p-6 z-10 text-right space-y-6">
            {/* Drawer Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-indigo-600 flex items-center justify-center font-bold text-lg text-white shadow-lg">
                  {inspectedSalon.name.slice(0, 1)}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold text-white">{inspectedSalon.name}</h3>
                    {inspectedSalon.verifiedBadge && (
                      <span className="text-xs text-sky-400 font-bold" title="دارای نشان تایید">
                        ✓
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{inspectedSalon.category}</p>
                </div>
              </div>

              <button
                onClick={() => setInspectedSalon(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions in Drawer */}
            <div className="flex items-center gap-2">
              {inspectedSalon.status === 'pending' && (
                <button
                  onClick={() => {
                    approveSalon(inspectedSalon.id);
                    setInspectedSalon({ ...inspectedSalon, status: 'active', verifiedBadge: true });
                  }}
                  className="flex-1 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow"
                >
                  <Check className="w-4 h-4" />
                  <span>تایید و اعطای نشان رسمی</span>
                </button>
              )}

              {inspectedSalon.status === 'active' && (
                <button
                  onClick={() => {
                    suspendSalon(inspectedSalon.id);
                    setInspectedSalon({ ...inspectedSalon, status: 'suspended' });
                  }}
                  className="flex-1 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>تعلیق موقت فعالیت</span>
                </button>
              )}

              {inspectedSalon.status === 'suspended' && (
                <button
                  onClick={() => {
                    activateSalon(inspectedSalon.id);
                    setInspectedSalon({ ...inspectedSalon, status: 'active' });
                  }}
                  className="flex-1 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>رفع تعلیق و بازگشایی</span>
                </button>
              )}

              <button
                onClick={() => openPlanModal(inspectedSalon)}
                className="px-4 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                تغییر پلن
              </button>
            </div>

            {/* Key Salon Facts */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
                <span className="text-slate-400 flex items-center gap-1.5 mb-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> گردش مالی ماهانه
                </span>
                <span className="text-sm font-bold text-emerald-400 tabular-nums">
                  {formatCurrency(inspectedSalon.monthlyRevenue, 'toman')}
                </span>
              </div>

              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
                <span className="text-slate-400 flex items-center gap-1.5 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-sky-400" /> کل نوبت‌های رزرو
                </span>
                <span className="text-sm font-bold text-slate-200 tabular-nums">
                  {formatNumber(inspectedSalon.totalAppointments)} نوبت
                </span>
              </div>

              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
                <span className="text-slate-400 flex items-center gap-1.5 mb-1">
                  <Users className="w-3.5 h-3.5 text-indigo-400" /> تعداد کادر آرایشگر
                </span>
                <span className="text-sm font-bold text-slate-200 tabular-nums">
                  {toPersianDigits(inspectedSalon.activeStaffCount)} نفر فعال
                </span>
              </div>

              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
                <span className="text-slate-400 flex items-center gap-1.5 mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> بسته فعال
                </span>
                <span className="text-sm font-bold text-amber-300">
                  {inspectedSalon.plan === 'gold_vip' ? 'طلایی VIP' : inspectedSalon.plan === 'silver' ? 'نقره‌ای' : 'برنزی'}
                </span>
              </div>
            </div>

            {/* Contact & Location Info */}
            <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-800 space-y-3 text-xs">
              <h4 className="font-bold text-slate-200">مشخصات مدیر و آدرس</h4>
              
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400">نام مدیر سالن:</span>
                <span className="font-semibold text-slate-100">{inspectedSalon.ownerName}</span>
              </div>

              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" /> شماره تماس مستقیم:
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-slate-200" dir="ltr">
                    {revealPhone ? inspectedSalon.phone : maskPhone(inspectedSalon.phone)}
                  </span>
                  <button
                    onClick={() => setRevealPhone(!revealPhone)}
                    className="text-slate-400 hover:text-slate-200"
                    title={revealPhone ? 'پنهان‌سازی' : 'نمایش کامل'}
                  >
                    {revealPhone ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400">ایمیل ثبت‌شده:</span>
                <span className="font-mono text-slate-300" dir="ltr">{inspectedSalon.email}</span>
              </div>

              <div className="flex items-start justify-between text-slate-300 pt-2 border-t border-slate-800">
                <span className="text-slate-400 flex items-center gap-1 shrink-0">
                  <MapPin className="w-3.5 h-3.5" /> نشانی دقیق:
                </span>
                <span className="text-left leading-relaxed text-slate-200 mr-2">
                  {inspectedSalon.province}، {inspectedSalon.address}
                </span>
              </div>
            </div>

            {/* Notes & Admin Commentary */}
            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-slate-200">یادداشت نظارتی ادمین</h4>
              <textarea
                value={inspectedSalon.notes || ''}
                onChange={(e) => {
                  const updated = { ...inspectedSalon, notes: e.target.value };
                  setInspectedSalon(updated);
                  saveSalon(updated);
                }}
                rows={3}
                placeholder="یادداشت در مورد سابقه سالن، تایید مدارک یا شکایات مشتریان..."
                className="w-full p-3 bg-slate-800 border border-slate-700/80 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500 leading-relaxed"
              ></textarea>
              <p className="text-[10px] text-slate-400">تغییرات یادداشت به شکل آنی ذخیره می‌شود.</p>
            </div>
          </div>
        </div>
      )}

      {/* Add New Salon Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="fixed inset-0" onClick={() => setIsAddModalOpen(false)}></div>

          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 z-10 text-right space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-rose-400" />
                ثبت سالن جدید در شبکه
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSalon} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">نام سالن زیبایی *</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="مثال: سالن تخصصی آفتاب طلایی"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">دسته‌بندی سالن</label>
                  <select
                    value={formData.category || 'سالن عمومی بانوان'}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-rose-500 cursor-pointer"
                  >
                    <option value="سالن تخصصی عروس و زیبایی">سالن تخصصی عروس</option>
                    <option value="کلینیک پوست و مو و بیوتی">کلینیک پوست و فیشیال</option>
                    <option value="مرکز تخصصی ناخن و اسپا">مرکز تخصصی ناخن</option>
                    <option value="باربرشاپ و گریم داماد">باربرشاپ آقایان</option>
                    <option value="مرکز مژه و ابرو">مرکز مژه و ابرو</option>
                    <option value="سالن عمومی بانوان">سالن عمومی بانوان</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">بسته اشتراک</label>
                  <select
                    value={formData.plan || 'bronze'}
                    onChange={(e) => setFormData({ ...formData, plan: e.target.value as PlanType })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-rose-500 cursor-pointer"
                  >
                    <option value="bronze">پایه (برنزی)</option>
                    <option value="silver">حرفه‌ای (نقره‌ای)</option>
                    <option value="gold_vip">طلایی ویژه (VIP)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">نام و نام خانوادگی مدیر *</label>
                  <input
                    type="text"
                    required
                    value={formData.ownerName || ''}
                    onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                    placeholder="مثال: مریم کریمی"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">شماره موبایل مدیر (جهت احراز) *</label>
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
                  <label className="block text-slate-300 font-semibold mb-1">استان</label>
                  <select
                    value={formData.province || 'تهران'}
                    onChange={(e) => setFormData({ ...formData, province: e.target.value, city: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-rose-500 cursor-pointer"
                  >
                    <option value="تهران">تهران</option>
                    <option value="اصفهان">اصفهان</option>
                    <option value="فارس">فارس</option>
                    <option value="خراسان رضوی">خراسان رضوی</option>
                    <option value="آذربایجان شرقی">آذربایجان شرقی</option>
                    <option value="البرز">البرز</option>
                    <option value="گیلان">گیلان</option>
                    <option value="مازندران">مازندران</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">شهر / منطقه</label>
                  <input
                    type="text"
                    value={formData.city || ''}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="مثال: تهران (نیاوران)"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">نشانی پستی سالن</label>
                <input
                  type="text"
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="خیابان، پلاک، طبقه و واحد"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-lg shadow-rose-600/25 transition-all cursor-pointer"
                >
                  ثبت سالن
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Plan Changer Modal */}
      {isPlanModalOpen && targetSalonForPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="fixed inset-0" onClick={() => setIsPlanModalOpen(false)}></div>

          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 z-10 text-right space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white">تغییر پلن اشتراک</h3>
                <p className="text-xs text-slate-400 mt-0.5">{targetSalonForPlan.name}</p>
              </div>
              <button
                onClick={() => setIsPlanModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <label
                onClick={() => setSelectedPlanOption('bronze')}
                className={`flex items-start justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                  selectedPlanOption === 'bronze'
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div>
                  <p className="font-bold">بسته پایه (برنزی)</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">تا ۳ آرایشگر · ۳۰۰ نوبت در ماه · ۵۰۰ پیامک</p>
                </div>
                <span className="font-semibold text-slate-200">۴۹۰,۰۰۰ تومان</span>
              </label>

              <label
                onClick={() => setSelectedPlanOption('silver')}
                className={`flex items-start justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                  selectedPlanOption === 'silver'
                    ? 'bg-slate-400/10 border-slate-400/40 text-slate-200'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div>
                  <p className="font-bold">بسته حرفه‌ای (نقره‌ای)</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">تا ۱۰ آرایشگر · ۱,۲۰۰ نوبت در ماه · ۲,۰۰۰ پیامک</p>
                </div>
                <span className="font-semibold text-slate-200">۸۹۰,۰۰۰ تومان</span>
              </label>

              <label
                onClick={() => setSelectedPlanOption('gold_vip')}
                className={`flex items-start justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                  selectedPlanOption === 'gold_vip'
                    ? 'bg-amber-500/15 border-amber-500/50 text-amber-200'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div>
                  <p className="font-bold text-amber-300">بسته طلایی ویژه (VIP Enterprise)</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">تا ۵۰ آرایشگر · نوبت نامحدود · ۶,۰۰۰ پیامک · دامنه اختصاصی</p>
                </div>
                <span className="font-bold text-amber-300">۱,۵۹۰,۰۰۰ تومان</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsPlanModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 rounded-xl"
              >
                انصراف
              </button>
              <button
                onClick={handleSavePlanChange}
                className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow"
              >
                ذخیره تغییر پلن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModalData.isOpen}
        title={confirmModalData.title}
        message={confirmModalData.message}
        variant={confirmModalData.variant}
        onConfirm={confirmModalData.onConfirm}
        onCancel={() => setConfirmModalData((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
