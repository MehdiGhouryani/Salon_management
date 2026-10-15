import React, { useState } from 'react';
import {
  Smartphone,
  Calendar,
  Clock,
  User,
  Plus,
  CheckCircle2,
  DollarSign,
  Scissors,
  Check,
  X,
  Phone,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Filter,
  Star,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { toPersianDigits, formatCurrency } from '../../utils/formatters';

interface SimulatorAppointment {
  id: string;
  clientName: string;
  clientPhone: string;
  serviceName: string;
  staffName: string;
  time: string;
  price: number;
  status: 'completed' | 'in_progress' | 'scheduled' | 'cancelled';
}

export const SalonSimulatorView: React.FC = () => {
  const { salons, simulatorSalonId, setSimulatorSalonId, addToast } = useAdmin();

  const currentSalon = salons.find((s) => s.id === simulatorSalonId) || salons[0];
  const [mobileTab, setMobileTab] = useState<'calendar' | 'clients' | 'services'>('calendar');

  // Local simulated appointments for the selected salon
  const [appointments, setAppointments] = useState<SimulatorAppointment[]>([
    {
      id: 'apt-1',
      clientName: 'سارا تهرانی',
      clientPhone: '09121112233',
      serviceName: 'رنگ و هایلایت تخصصی مو',
      staffName: 'ندا سلطانی',
      time: '۱۰:۳۰',
      price: 2400000,
      status: 'completed',
    },
    {
      id: 'apt-2',
      clientName: 'مهناز شریفی',
      clientPhone: '09354445566',
      serviceName: 'کاشت و ژلیش ناخن',
      staffName: 'مریم اکبری',
      time: '۱۲:۰۰',
      price: 650000,
      status: 'in_progress',
    },
    {
      id: 'apt-3',
      clientName: 'المیرا صادقی',
      clientPhone: '09197778899',
      serviceName: 'میکاپ و شینیون مجلسی',
      staffName: 'مهتاب کیانی',
      time: '۱۵:۳۰',
      price: 3200000,
      status: 'scheduled',
    },
    {
      id: 'apt-4',
      clientName: 'شیوا بهرامی',
      clientPhone: '09126667788',
      serviceName: 'کوپ و براشینگ حرفه‌ای',
      staffName: 'پریسا رضایی',
      time: '۱۷:۰۰',
      price: 550000,
      status: 'scheduled',
    },
  ]);

  // Simulated clients for this salon
  const clients = [
    { name: 'سارا تهرانی', phone: '09121112233', visits: 12, vip: true, lastService: 'رنگ و هایلایت مو' },
    { name: 'مهناز شریفی', phone: '09354445566', visits: 6, vip: false, lastService: 'کاشت ناخن' },
    { name: 'المیرا صادقی', phone: '09197778899', visits: 18, vip: true, lastService: 'میکاپ عروس' },
    { name: 'شیوا بهرامی', phone: '09126667788', visits: 3, vip: false, lastService: 'کوپ مو' },
    { name: 'نیلوفر رضایی', phone: '09123334455', visits: 9, vip: true, lastService: 'فیشیال VIP' },
  ];

  // Simulated services menu
  const services = [
    { name: 'رنگ و لایت تخصصی مو', duration: '۱۸۰ دقیقه', price: 2400000, category: 'مو' },
    { name: 'کراتین و احیا مو', duration: '۲۴۰ دقیقه', price: 3800000, category: 'مو' },
    { name: 'کاشت و ژلیش ناخن', duration: '۹۰ دقیقه', price: 650000, category: 'ناخن' },
    { name: 'پدیکور و کفسابی اسپا', duration: '۶۰ دقیقه', price: 500000, category: 'اسپا' },
    { name: 'میکاپ و گریم VIP', duration: '۱۲۰ دقیقه', price: 3200000, category: 'میکاپ' },
    { name: 'فیشیال و پاکسازی عمیق پوست', duration: '۷۵ دقیقه', price: 950000, category: 'پوست' },
  ];

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newService, setNewService] = useState('رنگ و لایت تخصصی مو');
  const [newTime, setNewTime] = useState('۱۸:۳۰');
  const [newPrice, setNewPrice] = useState(1200000);

  // Compute salon day totals
  const completedCount = appointments.filter((a) => a.status === 'completed').length;
  const todayRevenue = appointments
    .filter((a) => a.status === 'completed' || a.status === 'in_progress')
    .reduce((acc, a) => acc + a.price, 0);

  const handleCompleteVisit = (id: string) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'completed' } : a))
    );
    const apt = appointments.find((a) => a.id === id);
    addToast({
      type: 'success',
      title: 'خدمت تکمیل و تسویه حضوری تایید شد',
      message: `نوبت ${apt?.clientName} به مبلغ ${formatCurrency(apt?.price || 0, 'toman')} به‌صورت حضوری در سالن (نقد/کارتخوان) تسویه شد.`,
    });
  };

  const handleCreateAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;

    const newApt: SimulatorAppointment = {
      id: `apt-${Date.now()}`,
      clientName: newClientName,
      clientPhone: newClientPhone || '09120000000',
      serviceName: newService,
      staffName: 'پرسنل سالن',
      time: newTime,
      price: Number(newPrice),
      status: 'scheduled',
    };

    setAppointments((prev) => [...prev, newApt]);
    setIsAddModalOpen(false);
    setNewClientName('');
    setNewClientPhone('');
    addToast({
      type: 'success',
      title: 'نوبت جدید در تقویم سالن ثبت شد',
      message: `${newClientName} برای ساعت ${newTime}`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Salon Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-rose-400" />
            شبیه‌ساز زنده اپلیکیشن سالن‌دستیار (Companion Salon App)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            مشاهده و تست عملکرد دستیار سالن و نوبت‌دهی آنلاین از نگاه مدیر و مشتریان هر سالن در شبکه
          </p>
        </div>

        {/* Salon Selector */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium">مشاهده عملکرد سالن:</span>
          <select
            value={currentSalon?.id}
            onChange={(e) => setSimulatorSalonId(e.target.value)}
            className="px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 font-bold focus:outline-none focus:border-rose-500 cursor-pointer shadow"
          >
            {salons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.city})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Policy Notice: In-person Payment for Appointments */}
      <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 flex items-start gap-3">
        <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-bold text-indigo-200">
            مدل تسویه نوبت‌ها: منحصراً حضوری در سالن (نقد و کارتخوان سالن)
          </p>
          <p className="text-[11px] text-indigo-300/80 leading-relaxed">
            مشتریان نوبت‌ها به درگاه پرداخت اینترنتی متصل نمی‌شوند؛ برنامه فقط قیمت مصوب را نمایش داده و رزرو را ثبت می‌کند. پرداخت نهایی در محل سالن انجام می‌شود. درگاه‌های بانکی سیستم صرفاً برای خرید اشتراک سالن‌ها است.
          </p>
        </div>
      </div>

      {/* Simulator Presentation Container */}
      <div className="flex justify-center py-2">
        {/* Mobile Device Frame */}
        <div className="w-full max-w-md bg-[#0B1120] border-4 border-[#344258] rounded-[38px] shadow-2xl overflow-hidden text-xs flex flex-col min-h-[640px] relative text-[#E7ECF5]">
          {/* Mobile Speaker & Camera Notch */}
          <div className="h-6 bg-[#0B1120] flex items-center justify-center relative">
            <div className="w-20 h-3.5 bg-[#111B2E] rounded-full flex items-center justify-center border border-[#344258]">
              <div className="w-2 h-2 rounded-full bg-[#18243A] mr-2"></div>
            </div>
          </div>

          {/* Salon App Header */}
          <div className="p-4 bg-[#111B2E] border-b border-[#344258] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white font-bold text-sm shadow">
                {currentSalon?.name.slice(0, 1)}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-[#E7ECF5]">{currentSalon?.name}</h3>
                  {currentSalon?.verifiedBadge && (
                    <span className="text-sky-400 font-bold text-[10px]" title="تایید شده">
                      ✓
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-[#9AAAC2] mt-0.5">
                  {currentSalon?.city} · مدیر: {currentSalon?.ownerName}
                </p>
              </div>
            </div>

            {mobileTab === 'calendar' && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="p-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold transition-colors cursor-pointer shadow"
                title="ثبت نوبت جدید"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Today Summary Strip */}
          <div className="p-3 bg-[#111B2E]/90 border-b border-[#344258] grid grid-cols-3 gap-2 text-center text-[11px]">
            <div className="p-2 bg-[#18243A] border border-[#344258] rounded-xl">
              <span className="text-[#9AAAC2] block text-[10px]">نوبت‌های امروز</span>
              <span className="font-bold text-[#E7ECF5] text-xs mt-0.5 block tabular-nums">
                {toPersianDigits(appointments.length)} نوبت
              </span>
            </div>

            <div className="p-2 bg-[#18243A] border border-[#344258] rounded-xl">
              <span className="text-[#9AAAC2] block text-[10px]">تکمیل شده</span>
              <span className="font-bold text-emerald-400 text-xs mt-0.5 block tabular-nums">
                {toPersianDigits(completedCount)} نوبت
              </span>
            </div>

            <div className="p-2 bg-[#18243A] border border-[#344258] rounded-xl">
              <span className="text-[#9AAAC2] block text-[10px]">فروش امروز</span>
              <span className="font-bold text-amber-300 text-xs mt-0.5 block tabular-nums">
                {formatCurrency(todayRevenue, 'toman')}
              </span>
            </div>
          </div>

          {/* View Container based on mobile tab */}
          <div className="flex-1 p-3.5 space-y-2.5 overflow-y-auto">
            {/* TAB 1: Calendar & Appointments */}
            {mobileTab === 'calendar' && (
              <>
                <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 mb-1">
                  <span className="font-bold text-slate-300">تقویم نوبت‌های رزرو شده</span>
                  <span>امروز</span>
                </div>

                {appointments.map((apt) => {
                  const isCompleted = apt.status === 'completed';
                  const isInProgress = apt.status === 'in_progress';

                  return (
                    <div
                      key={apt.id}
                      className={`p-3 rounded-2xl border transition-all text-right space-y-2 ${
                        isCompleted
                          ? 'bg-[#18243A]/40 border-[#344258]/80 opacity-75'
                          : isInProgress
                          ? 'bg-rose-500/10 border-rose-500/30'
                          : 'bg-[#18243A] border-[#344258]'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#E7ECF5]">{apt.clientName}</span>
                            <span className="text-[10px] text-[#9AAAC2] font-mono" dir="ltr">
                              {apt.clientPhone}
                            </span>
                          </div>
                          <span className="text-[11px] text-rose-400 mt-0.5 block font-medium">
                            {apt.serviceName}
                          </span>
                        </div>

                        <div className="text-left">
                          <span className="flex items-center gap-1 font-mono text-[#E7ECF5] font-bold text-xs" dir="ltr">
                            <Clock className="w-3 h-3 text-[#9AAAC2]" /> {toPersianDigits(apt.time)}
                          </span>
                          <span className="text-[11px] text-emerald-400 font-semibold block mt-0.5 tabular-nums">
                            {formatCurrency(apt.price, 'toman')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-[#344258]/60 text-[11px]">
                        <div className="flex items-center gap-1.5 text-[#9AAAC2]">
                          <span>آرایشگر: {apt.staffName}</span>
                          <span>·</span>
                          <span className="text-amber-300 font-medium bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">تسویه حضوری</span>
                        </div>

                        {isCompleted ? (
                          <span className="text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> انجام و تسویه حضوری شد
                          </span>
                        ) : (
                          <button
                            onClick={() => handleCompleteVisit(apt.id)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>تکمیل خدمت و ثبت تسویه</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {/* TAB 2: Clients Directory */}
            {mobileTab === 'clients' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-[#9AAAC2] px-1 mb-1">
                  <span className="font-bold text-[#E7ECF5]">مشتریان دائم سالن</span>
                  <span>{toPersianDigits(clients.length)} مشتری فعال</span>
                </div>

                {clients.map((c, i) => (
                  <div key={i} className="p-3 rounded-2xl bg-[#18243A] border border-[#344258] flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[#E7ECF5]">{c.name}</span>
                        {c.vip && (
                          <span className="flex items-center gap-0.5 text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-bold border border-amber-500/30">
                            <Star className="w-2.5 h-2.5 fill-amber-300" /> VIP
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[#9AAAC2] font-mono block mt-0.5" dir="ltr">
                        {c.phone}
                      </span>
                      <span className="text-[10px] text-rose-400 block mt-0.5">
                        آخرین مراجعه: {c.lastService}
                      </span>
                    </div>

                    <div className="text-left">
                      <span className="text-[11px] text-[#E7ECF5] font-semibold block">
                        {toPersianDigits(c.visits)} مراجعه
                      </span>
                      <button
                        onClick={() => {
                          addToast({
                            type: 'info',
                            title: 'پیامک ارتباط با مشتری ارسال شد',
                            message: `ارسال پیام به ${c.name} (${c.phone})`,
                          });
                        }}
                        className="mt-1 px-2 py-0.5 rounded bg-[#111B2E] text-[#9AAAC2] hover:text-[#E7ECF5] border border-[#344258] text-[10px] transition-colors cursor-pointer"
                      >
                        ارسال پیامک
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 3: Services & Pricing Menu */}
            {mobileTab === 'services' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-[#9AAAC2] px-1 mb-1">
                  <span className="font-bold text-[#E7ECF5]">منوی خدمات و تعرفه‌ها</span>
                  <span>{toPersianDigits(services.length)} نوع خدمات</span>
                </div>

                {services.map((srv, i) => (
                  <div key={i} className="p-3 rounded-2xl bg-[#18243A] border border-[#344258] flex items-center justify-between">
                    <div>
                      <span className="font-bold text-[#E7ECF5] block">{srv.name}</span>
                      <span className="text-[10px] text-[#9AAAC2] mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#9AAAC2]" /> مدت زمان: {srv.duration}
                      </span>
                    </div>

                    <div className="text-left">
                      <span className="font-bold text-emerald-400 text-xs tabular-nums block">
                        {formatCurrency(srv.price, 'toman')}
                      </span>
                      <span className="text-[10px] text-[#9AAAC2] font-medium">{srv.category}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mobile Bottom Navigation Bar (Interactive) */}
          <div className="p-2.5 bg-[#111B2E] border-t border-[#344258] flex items-center justify-around text-[10px]">
            <button
              onClick={() => setMobileTab('calendar')}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-colors cursor-pointer ${
                mobileTab === 'calendar' ? 'text-rose-400 font-bold bg-rose-500/10 border border-rose-500/20' : 'text-[#9AAAC2] hover:text-[#E7ECF5]'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>تقویم نوبت‌ها</span>
            </button>

            <button
              onClick={() => setMobileTab('clients')}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-colors cursor-pointer ${
                mobileTab === 'clients' ? 'text-rose-400 font-bold bg-rose-500/10 border border-rose-500/20' : 'text-[#9AAAC2] hover:text-[#E7ECF5]'
              }`}
            >
              <User className="w-4 h-4" />
              <span>مشتریان سالن</span>
            </button>

            <button
              onClick={() => setMobileTab('services')}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-colors cursor-pointer ${
                mobileTab === 'services' ? 'text-rose-400 font-bold bg-rose-500/10 border border-rose-500/20' : 'text-[#9AAAC2] hover:text-[#E7ECF5]'
              }`}
            >
              <Scissors className="w-4 h-4" />
              <span>خدمات و قیمت</span>
            </button>
          </div>
        </div>
      </div>

      {/* Add Appointment Simulator Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="fixed inset-0" onClick={() => setIsAddModalOpen(false)}></div>

          <div className="relative w-full max-w-sm bg-[#111B2E] border border-[#344258] rounded-2xl shadow-2xl p-5 z-10 text-right space-y-4 text-xs text-[#E7ECF5]">
            <div className="flex items-center justify-between pb-3 border-b border-[#344258]">
              <h3 className="font-bold text-[#E7ECF5] flex items-center gap-2">
                <Plus className="w-4 h-4 text-rose-500 dark:text-[#F43F7A]" />
                ثبت رزرو جدید برای {currentSalon?.name}
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 text-[#9AAAC2] hover:text-[#E7ECF5] cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAppointment} className="space-y-3">
              <div>
                <label className="block text-[#9AAAC2] font-semibold mb-1">نام مشتری *</label>
                <input
                  type="text"
                  required
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="مثال: پریناز یزدانی"
                  className="w-full px-3 py-2 bg-[#18243A] border border-[#344258] rounded-xl text-[#E7ECF5] placeholder-[#9AAAC2]/60 focus:outline-none focus:border-[#F43F7A]"
                />
              </div>

              <div>
                <label className="block text-[#9AAAC2] font-semibold mb-1">شماره تماس مشتری</label>
                <input
                  type="tel"
                  dir="ltr"
                  value={newClientPhone}
                  onChange={(e) => setNewClientPhone(e.target.value)}
                  placeholder="09121234567"
                  className="w-full px-3 py-2 bg-[#18243A] border border-[#344258] rounded-xl text-[#E7ECF5] placeholder-[#9AAAC2]/60 focus:outline-none focus:border-[#F43F7A] font-mono text-left"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#9AAAC2] font-semibold mb-1">ساعت نوبت</label>
                  <input
                    type="text"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full px-3 py-2 bg-[#18243A] border border-[#344258] rounded-xl text-[#E7ECF5] focus:outline-none focus:border-[#F43F7A] text-center font-mono tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-[#9AAAC2] font-semibold mb-1">هزینه خدمات (تومان)</label>
                  <input
                    type="number"
                    value={newPrice}
                    onChange={(e) => setNewPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#18243A] border border-[#344258] rounded-xl text-[#E7ECF5] focus:outline-none focus:border-[#F43F7A] text-center tabular-nums font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#9AAAC2] font-semibold mb-1">نوع خدمت</label>
                <select
                  value={newService}
                  onChange={(e) => setNewService(e.target.value)}
                  className="w-full px-3 py-2 bg-[#18243A] border border-[#344258] rounded-xl text-[#E7ECF5] focus:outline-none focus:border-[#F43F7A] cursor-pointer"
                >
                  <option value="رنگ و هایلایت تخصصی مو">رنگ و هایلایت تخصصی مو</option>
                  <option value="کاشت و ژلیش ناخن">کاشت و ژلیش ناخن</option>
                  <option value="فیشیال و پاکسازی VIP">فیشیال و پاکسازی VIP</option>
                  <option value="کوپ و براشینگ">کوپ و براشینگ</option>
                  <option value="میکاپ و گریم">میکاپ و گریم</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#344258]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-[#9AAAC2] hover:text-[#E7ECF5] bg-[#18243A] border border-[#344258] rounded-xl cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-white font-semibold bg-[#F43F7A] hover:bg-[#F43F7A]/90 rounded-xl shadow-xs cursor-pointer"
                >
                  افزودن به تقویم
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
