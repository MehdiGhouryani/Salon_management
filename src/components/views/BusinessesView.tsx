import React, { useState, useMemo, useEffect } from 'react';
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
  LayoutGrid,
  List,
  Sparkles,
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
import { StatusReasonModal } from '../common/StatusReasonModal';
import { Pagination } from '../common/Pagination';
import { EmptyState } from '../ui/EmptyState';
import { Select } from '../ui/Select';
import { useDebounce } from '../../hooks/useDebounce';

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
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'revenue' | 'appointments' | 'date'>('revenue');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [targetSalonForPlan, setTargetSalonForPlan] = useState<Salon | null>(null);
  const [selectedPlanOption, setSelectedPlanOption] = useState<PlanType>('silver');

  // Mandatory Reason Modal state for Status Changes
  const [statusModal, setStatusModal] = useState<{
    isOpen: boolean;
    salon: Salon | null;
    targetStatus: SalonStatus;
    title: string;
    variant: 'success' | 'warning' | 'danger';
  }>({
    isOpen: false,
    salon: null,
    targetStatus: 'active',
    title: '',
    variant: 'warning',
  });

  const openStatusChangeModal = (salon: Salon, targetStatus: SalonStatus) => {
    let title = `تغییر وضعیت سالن «${salon.name}»`;
    let variant: 'success' | 'warning' | 'danger' = 'warning';

    if (targetStatus === 'active') {
      title = `تأیید و فعال‌سازی سالن «${salon.name}»`;
      variant = 'success';
    } else if (targetStatus === 'suspended') {
      title = `تعلیق موقت فعالیت سالن «${salon.name}»`;
      variant = 'danger';
    } else if (targetStatus === 'rejected') {
      title = `رد درخواست ثبت سالن «${salon.name}»`;
      variant = 'danger';
    }

    setStatusModal({
      isOpen: true,
      salon,
      targetStatus,
      title,
      variant,
    });
  };

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
    return Array.from(new Set(salons.map((s) => s.province)));
  }, [salons]);

  // Filtered & sorted salons
  const filteredSalons = useMemo(() => {
    return salons
      .filter((s) => {
        const matchesSearch =
          s.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          s.ownerName.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          s.city.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          s.phone.includes(debouncedSearch);

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
  }, [salons, debouncedSearch, statusFilter, cityFilter, planFilter, sortBy]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, cityFilter, planFilter]);

  const totalPages = Math.ceil(filteredSalons.length / PAGE_SIZE);
  const paginatedSalons = useMemo(() => {
    return filteredSalons.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  }, [filteredSalons, page]);

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
      title: 'فایل اکسل سالن‌ها ذخیره شد',
    });
  };

  const handleCreateSalon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim() || !formData.ownerName?.trim() || !formData.phone?.trim()) {
      addToast({
        type: 'error',
        title: 'اطلاعات ناقص است',
        message: 'نام سالن، نام مدیر و شماره تلفن الزامی هستند.',
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
      notes: 'سالن جدید افزوده شد.',
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
      {/* View Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-[#E7ECF5] flex items-center gap-2">
            <Store className="w-5 h-5 text-[#E11D48] dark:text-[#F43F7A]" />
            <span className="tabular-nums">سالن‌ها و مراکز زیبایی ({toPersianDigits(salons.length)})</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#9AAAC2] mt-0.5">
            تایید صلاحیت مدارک، وضعیت فعالیت و مدیریت بسته‌های اشتراک
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle: Cards vs Table */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-[#18243A] border border-slate-200 dark:border-[#344258] rounded-xl text-xs">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-[#111B2E] text-slate-900 dark:text-[#E7ECF5] font-bold shadow-xs border border-slate-200 dark:border-[#344258]'
                  : 'text-slate-500 dark:text-[#9AAAC2] hover:text-slate-700 dark:hover:text-[#E7ECF5]'
              }`}
              title="نمایش کارت‌های خلوت"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>کارت‌ها</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-[#111B2E] text-slate-900 dark:text-[#E7ECF5] font-bold shadow-xs border border-slate-200 dark:border-[#344258]'
                  : 'text-slate-500 dark:text-[#9AAAC2] hover:text-slate-700 dark:hover:text-[#E7ECF5]'
              }`}
              title="نمایش جدول فشرده"
            >
              <List className="w-3.5 h-3.5" />
              <span>جدول</span>
            </button>
          </div>

          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-[#E7ECF5] hover:text-slate-900 bg-white dark:bg-[#18243A] border border-slate-200 dark:border-[#344258] rounded-xl transition-colors cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">اکسل</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#E11D48] hover:bg-[#BE123C] dark:bg-[#F43F7A] dark:hover:bg-[#E11D48] rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>افزودن سالن</span>
          </button>
        </div>
      </div>

      {/* Segmented Status Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-white dark:bg-[#111B2E] border border-slate-200 dark:border-[#344258] rounded-xl text-xs shadow-xs">
        {[
          { id: 'all', label: 'همه سالن‌ها', count: salons.length },
          { id: 'active', label: 'فعال', count: salons.filter((s) => s.status === 'active').length },
          { id: 'pending', label: 'در انتظار تایید', count: salons.filter((s) => s.status === 'pending').length },
          { id: 'suspended', label: 'معلق', count: salons.filter((s) => s.status === 'suspended').length },
          { id: 'trial', label: 'آزمایشی', count: salons.filter((s) => s.status === 'trial').length },
        ].map((tab) => {
          const isSelected = statusFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all cursor-pointer font-medium ${
                isSelected
                  ? 'bg-rose-50 dark:bg-[#F43F7A]/15 text-[#E11D48] dark:text-[#FB7185] font-bold border border-rose-300 dark:border-[#F43F7A]/30 shadow-xs'
                  : 'text-slate-600 dark:text-[#9AAAC2] hover:text-slate-900 dark:hover:text-[#E7ECF5] hover:bg-slate-100 dark:hover:bg-[#18243A] border border-transparent'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold tabular-nums ${
                  isSelected ? 'bg-rose-500/20 text-[#E11D48] dark:text-[#FB7185]' : 'bg-slate-100 dark:bg-[#18243A] text-slate-500 dark:text-[#9AAAC2]'
                }`}
              >
                {toPersianDigits(tab.count)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Quick Filter Bar */}
      <div className="p-3.5 rounded-xl bg-white dark:bg-[#111B2E] border border-slate-200 dark:border-[#344258] space-y-3 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Search Input */}
          <div className="lg:col-span-3 relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجوی نام سالن، مدیر، شهر یا شماره تماس..."
              className="w-full pl-8 pr-9 py-2 bg-slate-50 dark:bg-[#0D1527] border border-slate-200 dark:border-[#344258] rounded-lg text-slate-900 dark:text-[#E7ECF5] placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#F43F7A] transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-700 dark:hover:text-[#E7ECF5]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Province Filter */}
          <div>
            <Select
              size="sm"
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              options={[
                { value: 'all', label: 'تمام استان‌ها' },
                ...uniqueCities.map((c) => ({ value: c, label: c })),
              ]}
            />
          </div>

          {/* Plan Filter */}
          <div>
            <Select
              size="sm"
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              options={[
                { value: 'all', label: 'تمام بسته‌ها' },
                { value: 'bronze', label: 'پایه (برنزی)' },
                { value: 'silver', label: 'حرفه‌ای (نقره‌ای)' },
                { value: 'gold_vip', label: 'ویژه (VIP)' },
              ]}
            />
          </div>
        </div>

        {/* Sort & Result Count */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-[#344258] text-[11px] text-slate-500 dark:text-[#9AAAC2]">
          <div className="flex items-center gap-2">
            <span>مرتب‌سازی:</span>
            <button
              onClick={() => setSortBy('revenue')}
              className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                sortBy === 'revenue' ? 'bg-rose-50 dark:bg-[#F43F7A]/15 text-[#E11D48] dark:text-[#FB7185] font-semibold border border-rose-200 dark:border-[#F43F7A]/30' : 'hover:text-slate-800 dark:hover:text-[#E7ECF5]'
              }`}
            >
              بیشترین درآمد
            </button>
            <button
              onClick={() => setSortBy('appointments')}
              className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                sortBy === 'appointments' ? 'bg-rose-50 dark:bg-[#F43F7A]/15 text-[#E11D48] dark:text-[#FB7185] font-semibold border border-rose-200 dark:border-[#F43F7A]/30' : 'hover:text-slate-800 dark:hover:text-[#E7ECF5]'
              }`}
            >
              بیشترین نوبت
            </button>
          </div>

          <div className="tabular-nums">
            نمایش <span className="font-bold text-slate-800 dark:text-[#E7ECF5]">{toPersianDigits(filteredSalons.length)}</span> از{' '}
            <span className="font-bold text-slate-800 dark:text-[#E7ECF5]">{toPersianDigits(salons.length)}</span> سالن
          </div>
        </div>
      </div>

      {/* VIEW 1: UNCLUTTERED MODERN CARD GRID (PRIMARY) */}
      {viewMode === 'grid' && (
        <div className="space-y-4">
          {filteredSalons.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedSalons.map((salon) => {
                  const badge = getStatusBadge(salon.status);

                  return (
                    <div
                      key={salon.id}
                      className="p-5 rounded-2xl bg-white dark:bg-[#111B2E] border border-slate-200/90 dark:border-[#344258] shadow-xs hover:border-slate-300 dark:hover:border-slate-500 transition-all flex flex-col justify-between group"
                    >
                      <div>
                        {/* Card Header: Icon, Name, Category & Status Badge */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-[#18243A] border border-slate-200 dark:border-[#344258] flex items-center justify-center font-bold text-[#E11D48] dark:text-[#F43F7A] shrink-0">
                              {salon.name.slice(0, 1)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <h3 className="font-bold text-slate-900 dark:text-[#E7ECF5] text-sm truncate">
                                  {salon.name}
                                </h3>
                                {salon.verifiedBadge && (
                                  <span className="text-[#38BDF8] text-xs font-bold" title="دارای تاییدیه رسمی">✓</span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-[#9AAAC2] truncate mt-0.5">
                                {salon.category}
                              </p>
                            </div>
                          </div>

                          <span className={`px-2 py-0.5 text-[10px] rounded-md font-medium border shrink-0 ${badge.bg} ${badge.text} ${badge.border}`}>
                            {badge.label}
                          </span>
                        </div>

                        {/* Owner, City & Contact */}
                        <div className="space-y-1.5 py-2.5 border-y border-slate-100 dark:border-[#344258] text-xs">
                          <div className="flex items-center justify-between text-slate-600 dark:text-[#9AAAC2]">
                            <span>مدیر سالن:</span>
                            <span className="font-semibold text-slate-800 dark:text-[#E7ECF5]">{salon.ownerName}</span>
                          </div>

                          <div className="flex items-center justify-between text-slate-600 dark:text-[#9AAAC2]">
                            <span>موقعیت:</span>
                            <span className="text-slate-700 dark:text-[#E7ECF5]">{salon.city} ({salon.province})</span>
                          </div>

                          <div className="flex items-center justify-between text-slate-600 dark:text-[#9AAAC2]">
                            <span>شماره تماس:</span>
                            <span className="font-mono text-slate-700 dark:text-[#E7ECF5]" dir="ltr">
                              {maskPhone(salon.phone)}
                            </span>
                          </div>
                        </div>

                        {/* Clean Metrics Row */}
                        <div className="grid grid-cols-3 gap-2 my-3 text-center">
                          <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#0D1527] border border-slate-100 dark:border-[#344258]/60">
                            <span className="text-[10px] text-slate-500 dark:text-[#9AAAC2] block mb-0.5">گردش ماه</span>
                            <span className="text-xs font-bold text-emerald-600 dark:text-[#34D399] tabular-nums">
                              {formatCurrency(salon.monthlyRevenue, 'toman')}
                            </span>
                          </div>

                          <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#0D1527] border border-slate-100 dark:border-[#344258]/60">
                            <span className="text-[10px] text-slate-500 dark:text-[#9AAAC2] block mb-0.5">نوبت‌ها</span>
                            <span className="text-xs font-bold text-slate-800 dark:text-[#E7ECF5] tabular-nums">
                              {toPersianDigits(salon.totalAppointments)}
                            </span>
                          </div>

                          <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#0D1527] border border-slate-100 dark:border-[#344258]/60">
                            <span className="text-[10px] text-slate-500 dark:text-[#9AAAC2] block mb-0.5">پرسنل</span>
                            <span className="text-xs font-bold text-slate-800 dark:text-[#E7ECF5] tabular-nums">
                              {toPersianDigits(salon.activeStaffCount)} نفر
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Footer: Plan Badge & Action Buttons */}
                      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-[#344258]">
                        <button
                          onClick={() => openPlanModal(salon)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer flex items-center gap-1.5 bg-slate-100 dark:bg-[#18243A] border-slate-200 dark:border-[#344258] text-slate-700 dark:text-[#E7ECF5]"
                        >
                          <span>{salon.plan === 'gold_vip' ? 'بسته VIP' : salon.plan === 'silver' ? 'نقره‌ای' : 'برنزی'}</span>
                          <Edit2 className="w-2.5 h-2.5 opacity-60" />
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setInspectedSalon(salon)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-[#9AAAC2] dark:hover:text-[#E7ECF5] hover:bg-slate-100 dark:hover:bg-[#18243A] rounded-lg transition-colors cursor-pointer"
                            title="مشاهده جزئیات کامل"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {salon.status === 'pending' && (
                            <button
                              onClick={() => openStatusChangeModal(salon, 'active')}
                              className="px-2.5 py-1 text-xs font-semibold bg-[#059669] hover:bg-[#047857] dark:bg-[#34D399] dark:hover:bg-[#10B981] text-white dark:text-[#0B1120] rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                              title="تایید سالن"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>تایید</span>
                            </button>
                          )}

                          {salon.status === 'active' && (
                            <button
                              onClick={() => openStatusChangeModal(salon, 'suspended')}
                              className="p-1.5 text-amber-600 dark:text-[#FBBF24] hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-lg transition-colors cursor-pointer"
                              title="تعلیق فعالیت"
                            >
                              <AlertTriangle className="w-4 h-4" />
                            </button>
                          )}

                          {salon.status === 'suspended' && (
                            <button
                              onClick={() => openStatusChangeModal(salon, 'active')}
                              className="p-1.5 text-emerald-600 dark:text-[#34D399] hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-colors cursor-pointer"
                              title="فعال‌سازی مجدد"
                            >
                              <CheckCircle className="w-4 h-4" />
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
                totalItems={filteredSalons.length}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
                onLoadMore={page < totalPages ? () => setPage((p) => p + 1) : undefined}
                hasMore={page < totalPages}
                itemLabel="سالن"
              />
            </>
          ) : (
            <EmptyState
              icon={<Store className="w-8 h-8" />}
              title="هیچ سالنی با این مشخصات یافت نشد"
              description="لطفاً عبارت جستجو را تغییر دهید یا فیلترهای وضعیت، استان و بسته را بازنشانی فرمایید."
              action={{
                label: 'پاک کردن فیلترها',
                onClick: () => {
                  setSearch('');
                  setStatusFilter('all');
                  setCityFilter('all');
                  setPlanFilter('all');
                },
              }}
            />
          )}
        </div>
      )}

      {/* VIEW 2: COMPACT CLEAN TABLE (ALTERNATIVE) */}
      {viewMode === 'table' && (
        <div className="rounded-2xl bg-white dark:bg-[#111B2E] border border-slate-200 dark:border-[#344258] overflow-hidden shadow-xs">
          {filteredSalons.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 dark:bg-[#0D1527] border-b border-slate-200 dark:border-[#344258] text-slate-500 dark:text-[#9AAAC2] font-semibold">
                    <tr>
                      <th className="py-3 px-4">نام سالن و دسته‌بندی</th>
                      <th className="py-3 px-4">مدیر و تماس</th>
                      <th className="py-3 px-4 hidden md:table-cell">شهر</th>
                      <th className="py-3 px-4 hidden sm:table-cell">پلن</th>
                      <th className="py-3 px-4 hidden lg:table-cell">گردش ماه</th>
                      <th className="py-3 px-4 hidden xl:table-cell">پرسنل</th>
                      <th className="py-3 px-4">وضعیت</th>
                      <th className="py-3 px-4 text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#344258] text-slate-700 dark:text-[#E7ECF5]">
                    {paginatedSalons.map((salon) => {
                      const badge = getStatusBadge(salon.status);

                      return (
                        <tr key={salon.id} className="hover:bg-slate-50/60 dark:hover:bg-[#18243A]/50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#18243A] flex items-center justify-center font-bold text-[#E11D48] dark:text-[#F43F7A] shrink-0 border border-slate-200 dark:border-[#344258]">
                                {salon.name.slice(0, 1)}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 dark:text-[#E7ECF5] block">{salon.name}</span>
                                <span className="text-[11px] text-slate-500 dark:text-[#9AAAC2]">{salon.category}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="block font-medium">{salon.ownerName}</span>
                            <span className="font-mono text-[11px] text-slate-500 dark:text-[#9AAAC2]" dir="ltr">{maskPhone(salon.phone)}</span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-[#9AAAC2] hidden md:table-cell">{salon.city}</td>
                          <td className="py-3 px-4 hidden sm:table-cell">
                            <span className="text-[11px] font-semibold text-slate-700 dark:text-[#E7ECF5]">
                              {salon.plan === 'gold_vip' ? 'VIP' : salon.plan === 'silver' ? 'نقره‌ای' : 'برنزی'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-emerald-600 dark:text-[#34D399] tabular-nums hidden lg:table-cell">
                            {formatCurrency(salon.monthlyRevenue, 'toman')}
                          </td>
                          <td className="py-3 px-4 tabular-nums text-slate-600 dark:text-[#9AAAC2] hidden xl:table-cell">
                            {toPersianDigits(salon.activeStaffCount)} نفر
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-block px-2 py-0.5 text-[10px] rounded-md font-medium border ${badge.bg} ${badge.text} ${badge.border}`}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => setInspectedSalon(salon)}
                                className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-[#E7ECF5] rounded-lg"
                                title="جزئیات"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {salon.status === 'pending' && (
                                <button
                                  onClick={() => openStatusChangeModal(salon, 'active')}
                                  className="p-1.5 text-emerald-600 dark:text-[#34D399] rounded-lg hover:bg-emerald-50 dark:hover:bg-[#34D399]/15"
                                  title="تایید"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              )}
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
                totalItems={filteredSalons.length}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
                onLoadMore={page < totalPages ? () => setPage((p) => p + 1) : undefined}
                hasMore={page < totalPages}
                itemLabel="سالن"
              />
            </>
          ) : (
            <EmptyState
              icon={<Store className="w-8 h-8" />}
              title="هیچ سالنی با این مشخصات یافت نشد"
              description="لطفاً عبارت جستجو را تغییر دهید یا فیلترهای وضعیت، استان و بسته را بازنشانی فرمایید."
              action={{
                label: 'پاک کردن فیلترها',
                onClick: () => {
                  setSearch('');
                  setStatusFilter('all');
                  setCityFilter('all');
                  setPlanFilter('all');
                },
              }}
            />
          )}
        </div>
      )}

      {/* Inspected Salon Side Drawer */}
      {inspectedSalon && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="fixed inset-0" onClick={() => setInspectedSalon(null)}></div>

          <div className="relative w-full max-w-md h-full bg-white dark:bg-[#18243A] border-r border-stone-200 dark:border-[#344258] shadow-2xl p-6 overflow-y-auto space-y-5 text-right z-10 text-zinc-900 dark:text-[#E7ECF5]">
            {/* Drawer Header */}
            <div className="flex items-start justify-between pb-4 border-b border-stone-200 dark:border-[#344258]">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold">{inspectedSalon.name}</h3>
                  <span className={`px-2 py-0.5 text-[10px] rounded-md font-medium border ${getStatusBadge(inspectedSalon.status).bg} ${getStatusBadge(inspectedSalon.status).text} ${getStatusBadge(inspectedSalon.status).border}`}>
                    {getStatusBadge(inspectedSalon.status).label}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">{inspectedSalon.category}</p>
              </div>

              <button
                onClick={() => setInspectedSalon(null)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              {inspectedSalon.status === 'pending' && (
                <button
                  onClick={() => openStatusChangeModal(inspectedSalon, 'active')}
                  className="flex-1 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Check className="w-4 h-4" />
                  <span>تایید سالن</span>
                </button>
              )}

              {inspectedSalon.status === 'active' && (
                <button
                  onClick={() => openStatusChangeModal(inspectedSalon, 'suspended')}
                  className="flex-1 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>تعلیق موقت</span>
                </button>
              )}

              {inspectedSalon.status === 'suspended' && (
                <button
                  onClick={() => openStatusChangeModal(inspectedSalon, 'active')}
                  className="flex-1 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>رفع تعلیق</span>
                </button>
              )}

              <button
                onClick={() => openPlanModal(inspectedSalon)}
                className="px-3 py-2 text-xs font-medium bg-stone-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-xl transition-colors cursor-pointer"
              >
                تغییر پلن
              </button>
            </div>

            {/* Key Facts Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-stone-50 dark:bg-[#111B2E] rounded-xl border border-stone-200/80 dark:border-[#344258]">
                <span className="text-zinc-500 block mb-1">گردش مالی ماه</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {formatCurrency(inspectedSalon.monthlyRevenue, 'toman')}
                </span>
              </div>

              <div className="p-3 bg-stone-50 dark:bg-[#111B2E] rounded-xl border border-stone-200/80 dark:border-[#344258]">
                <span className="text-zinc-500 block mb-1">کل نوبت‌ها</span>
                <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200 tabular-nums">
                  {formatNumber(inspectedSalon.totalAppointments)}
                </span>
              </div>

              <div className="p-3 bg-stone-50 dark:bg-[#111B2E] rounded-xl border border-stone-200/80 dark:border-[#344258]">
                <span className="text-zinc-500 block mb-1">تعداد پرسنل</span>
                <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200 tabular-nums">
                  {toPersianDigits(inspectedSalon.activeStaffCount)} نفر
                </span>
              </div>

              <div className="p-3 bg-stone-50 dark:bg-[#111B2E] rounded-xl border border-stone-200/80 dark:border-[#344258]">
                <span className="text-zinc-500 block mb-1">پلن اشتراک</span>
                <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                  {inspectedSalon.plan === 'gold_vip' ? 'ویژه VIP' : inspectedSalon.plan === 'silver' ? 'نقره‌ای' : 'برنزی'}
                </span>
              </div>
            </div>

            {/* Manager Contact & Location */}
            <div className="p-4 bg-stone-50 dark:bg-[#111B2E] rounded-xl border border-stone-200/80 dark:border-[#344258] space-y-2.5 text-xs">
              <h4 className="font-bold text-zinc-900 dark:text-[#E7ECF5]">مشخصات تماس و نشانی</h4>
              
              <div className="flex items-center justify-between text-zinc-600 dark:text-[#9AAAC2]">
                <span>مدیر:</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">{inspectedSalon.ownerName}</span>
              </div>

              <div className="flex items-center justify-between text-zinc-600 dark:text-[#9AAAC2]">
                <span>شماره تماس:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-zinc-800 dark:text-zinc-200" dir="ltr">
                    {revealPhone ? inspectedSalon.phone : maskPhone(inspectedSalon.phone)}
                  </span>
                  <button
                    onClick={() => setRevealPhone(!revealPhone)}
                    className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                  >
                    {revealPhone ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-zinc-600 dark:text-[#9AAAC2]">
                <span>ایمیل:</span>
                <span className="font-mono text-zinc-700 dark:text-[#9AAAC2]" dir="ltr">{inspectedSalon.email}</span>
              </div>

              <div className="pt-2 border-t border-stone-200 dark:border-[#344258] text-zinc-600 dark:text-[#9AAAC2]">
                <span className="block text-zinc-500 mb-0.5">نشانی دقیق:</span>
                <p className="leading-relaxed text-zinc-800 dark:text-zinc-200">
                  {inspectedSalon.province}، {inspectedSalon.address}
                </p>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5 text-xs">
              <h4 className="font-bold text-zinc-900 dark:text-[#E7ECF5]">یادداشت نظارتی</h4>
              <textarea
                value={inspectedSalon.notes || ''}
                onChange={(e) => {
                  const updated = { ...inspectedSalon, notes: e.target.value };
                  setInspectedSalon(updated);
                  saveSalon(updated);
                }}
                rows={3}
                placeholder="یادداشت در مورد سالن، مدارک و سوابق..."
                className="w-full p-2.5 bg-stone-50 dark:bg-[#111B2E] border border-stone-200 dark:border-[#344258] rounded-xl text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Add New Salon Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="fixed inset-0" onClick={() => setIsAddModalOpen(false)}></div>

          <div className="relative w-full max-w-lg bg-white dark:bg-[#18243A] border border-stone-200 dark:border-[#344258] rounded-2xl shadow-2xl p-6 z-10 text-right space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-[#344258]">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-[#E7ECF5] flex items-center gap-2">
                <Plus className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                ثبت سالن جدید
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSalon} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-700 dark:text-[#9AAAC2] font-semibold mb-1">نام سالن *</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="مثال: سالن تخصصی مهسا"
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-[#111B2E] border border-stone-200 dark:border-[#344258] rounded-xl text-zinc-900 dark:text-[#E7ECF5] focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-700 dark:text-[#9AAAC2] font-semibold mb-1">دسته‌بندی</label>
                  <select
                    value={formData.category || 'سالن عمومی بانوان'}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-[#111B2E] border border-stone-200 dark:border-[#344258] rounded-xl text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-rose-500 cursor-pointer"
                  >
                    <option value="سالن تخصصی عروس و زیبایی">سالن عروس و زیبایی</option>
                    <option value="کلینیک پوست و فیشیال">کلینیک پوست و فیشیال</option>
                    <option value="مرکز تخصصی ناخن و اسپا">مرکز ناخن و اسپا</option>
                    <option value="باربرشاپ آقایان">باربرشاپ آقایان</option>
                    <option value="سالن عمومی بانوان">سالن عمومی بانوان</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-700 dark:text-[#9AAAC2] font-semibold mb-1">پلن اشتراک</label>
                  <select
                    value={formData.plan || 'bronze'}
                    onChange={(e) => setFormData({ ...formData, plan: e.target.value as PlanType })}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-[#111B2E] border border-stone-200 dark:border-[#344258] rounded-xl text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-rose-500 cursor-pointer"
                  >
                    <option value="bronze">پایه (برنزی)</option>
                    <option value="silver">حرفه‌ای (نقره‌ای)</option>
                    <option value="gold_vip">ویژه (VIP)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-700 dark:text-[#9AAAC2] font-semibold mb-1">نام مدیر *</label>
                  <input
                    type="text"
                    required
                    value={formData.ownerName || ''}
                    onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                    placeholder="مثال: سارا محمدی"
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-[#111B2E] border border-stone-200 dark:border-[#344258] rounded-xl text-zinc-900 dark:text-[#E7ECF5] focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-700 dark:text-[#9AAAC2] font-semibold mb-1">شماره تماس مدیر *</label>
                  <input
                    type="tel"
                    required
                    dir="ltr"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="09121234567"
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-[#111B2E] border border-stone-200 dark:border-[#344258] rounded-xl text-zinc-900 dark:text-[#E7ECF5] focus:outline-none focus:border-rose-500 font-mono text-left"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-700 dark:text-[#9AAAC2] font-semibold mb-1">استان</label>
                  <select
                    value={formData.province || 'تهران'}
                    onChange={(e) => setFormData({ ...formData, province: e.target.value, city: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-[#111B2E] border border-stone-200 dark:border-[#344258] rounded-xl text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-rose-500 cursor-pointer"
                  >
                    <option value="تهران">تهران</option>
                    <option value="اصفهان">اصفهان</option>
                    <option value="فارس">فارس</option>
                    <option value="خراسان رضوی">خراسان رضوی</option>
                    <option value="آذربایجان شرقی">آذربایجان شرقی</option>
                    <option value="البرز">البرز</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-700 dark:text-[#9AAAC2] font-semibold mb-1">شهر / محله</label>
                  <input
                    type="text"
                    value={formData.city || ''}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="مثال: تهران (سعادت‌آباد)"
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-[#111B2E] border border-stone-200 dark:border-[#344258] rounded-xl text-zinc-900 dark:text-[#E7ECF5] focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-700 dark:text-[#9AAAC2] font-semibold mb-1">نشانی سالن</label>
                <input
                  type="text"
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="خیابان، پلاک، طبقه و واحد"
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-[#111B2E] border border-stone-200 dark:border-[#344258] rounded-xl text-zinc-900 dark:text-[#E7ECF5] focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200 dark:border-[#344258]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-zinc-600 dark:text-[#9AAAC2] hover:text-zinc-900 bg-stone-100 dark:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-xs transition-all cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="fixed inset-0" onClick={() => setIsPlanModalOpen(false)}></div>

          <div className="relative w-full max-w-md bg-white dark:bg-[#18243A] border border-stone-200 dark:border-[#344258] rounded-2xl shadow-2xl p-6 z-10 text-right space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-[#344258]">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-[#E7ECF5]">تغییر پلن اشتراک</h3>
                <p className="text-xs text-zinc-500 mt-0.5">{targetSalonForPlan.name}</p>
              </div>
              <button
                onClick={() => setIsPlanModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {[
                { id: 'bronze' as PlanType, title: 'پایه (برنزی)', price: 'رایگان / آزمایشی', desc: 'تا ۵ پرسنل و پیامک محدود' },
                { id: 'silver' as PlanType, title: 'حرفه‌ای (نقره‌ای)', price: '۷۵۰,۰۰۰ تومان/ماه', desc: 'تا ۱۵ پرسنل و پیامک خدماتی' },
                { id: 'gold_vip' as PlanType, title: 'ویژه (VIP)', price: '۱,۴۵۰,۰۰۰ تومان/ماه', desc: 'نامحدود و پشتیبانی اختصاصی' },
              ].map((p) => (
                <div
                  key={p.id}
                  onClick={() => setSelectedPlanOption(p.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedPlanOption === p.id
                      ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 shadow-xs'
                      : 'border-stone-200 dark:border-[#344258] hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-zinc-900 dark:text-[#E7ECF5]">
                    <span>{p.title}</span>
                    <span className="text-rose-600 dark:text-rose-400 text-[11px]">{p.price}</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">{p.desc}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200 dark:border-[#344258]">
              <button
                onClick={() => setIsPlanModalOpen(false)}
                className="px-4 py-2 text-xs text-zinc-600 dark:text-[#9AAAC2] hover:text-zinc-900 bg-stone-100 dark:bg-zinc-800 rounded-xl"
              >
                انصراف
              </button>
              <button
                onClick={handleSavePlanChange}
                className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl"
              >
                ذخیره تغییرات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mandatory Reason Modal for Salon Status Change */}
      <StatusReasonModal
        isOpen={statusModal.isOpen}
        title={statusModal.title}
        entityName={statusModal.salon?.name || 'سالن'}
        targetStatusLabel={
          statusModal.targetStatus === 'active'
            ? 'فعال'
            : statusModal.targetStatus === 'suspended'
            ? 'معلق'
            : 'رد شده'
        }
        actionVariant={statusModal.variant}
        onConfirm={async (reason) => {
          if (!statusModal.salon) return;
          if (statusModal.targetStatus === 'active') {
            await approveSalon(statusModal.salon.id, reason);
          } else if (statusModal.targetStatus === 'suspended') {
            await suspendSalon(statusModal.salon.id, reason);
          }
          if (inspectedSalon && inspectedSalon.id === statusModal.salon.id) {
            setInspectedSalon({ ...inspectedSalon, status: statusModal.targetStatus });
          }
        }}
        onClose={() => setStatusModal({ ...statusModal, isOpen: false })}
      />

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModalData.isOpen}
        title={confirmModalData.title}
        message={confirmModalData.message}
        variant={confirmModalData.variant}
        onConfirm={confirmModalData.onConfirm}
        onClose={() => setConfirmModalData({ ...confirmModalData, isOpen: false })}
      />
    </div>
  );
};
