import React, { useState } from 'react';
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Calendar,
  Sparkles,
  Shield,
  Layers,
  ArrowUpRight,
  Filter,
  X,
  Check,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { Plan, PlanType } from '../../types/admin';
import { toPersianDigits, formatCurrency } from '../../utils/formatters';

export const SubscriptionsView: React.FC = () => {
  const { plans, salons, transactions, updateSalonPlan, addToast } = useAdmin();

  const [assignSalonId, setAssignSalonId] = useState(salons[0]?.id || '');
  const [assignPlanType, setAssignPlanType] = useState<PlanType>('gold_vip');
  const [filterGateway, setFilterGateway] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Plan editor modal state
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [editPriceMonthly, setEditPriceMonthly] = useState(0);
  const [editMaxStaff, setEditMaxStaff] = useState(0);
  const [editSmsCount, setEditSmsCount] = useState(0);

  // Compute stats
  const totalSubscribers = plans.reduce((acc, p) => acc + p.activeSubscribers, 0);
  const estimatedMRR = plans.reduce((acc, p) => acc + p.priceMonthly * p.activeSubscribers, 0);

  const filteredTransactions = transactions.filter((tx) => {
    const matchGw = filterGateway === 'all' || tx.gateway === filterGateway;
    const matchSt = filterStatus === 'all' || tx.status === filterStatus;
    return matchGw && matchSt;
  });

  const handleAssignPlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignSalonId) return;
    const targetSalon = salons.find((s) => s.id === assignSalonId);
    if (!targetSalon) return;

    updateSalonPlan(assignSalonId, assignPlanType);
    addToast({
      type: 'success',
      title: 'پلن اشتراک به‌روزرسانی شد',
      message: `سالن «${targetSalon.name}» به پلن انتخابی ارتقا یافت.`,
    });
  };

  const openPlanEditor = (p: Plan) => {
    setEditingPlan(p);
    setEditPriceMonthly(p.priceMonthly);
    setEditMaxStaff(p.maxStaff);
    setEditSmsCount(p.smsIncluded);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            مالی، تعرفه‌ها و اشتراک‌های سالن‌ها
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            تعرفه‌گذاری نرم‌افزار، تمدید اشتراک سالن‌ها و سوابق تراکنش‌ها
          </p>
        </div>
      </div>

      {/* Financial Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#181B24] border border-stone-200/90 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">درآمد ماهانه پایدار (MRR)</span>
            <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {formatCurrency(estimatedMRR, 'toman')}
          </span>
          <p className="text-[11px] text-zinc-400 mt-2 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" /> بر مبنای اشتراک فعال {toPersianDigits(totalSubscribers)} سالن
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#181B24] border border-stone-200/90 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">اشتراک‌های فعال</span>
            <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
            {toPersianDigits(totalSubscribers)}
          </span>
          <p className="text-[11px] text-zinc-400 mt-2">
            نرخ تمدید خودکار: ۹۱٪ در دوره ۳۰ روزه
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#181B24] border border-stone-200/90 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">درگاه‌های بانکی متصل</span>
            <Shield className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
            زرین‌پال و بهپرداخت
          </span>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> وضعیت سوئیچ شاپرک آنلاین
          </p>
        </div>
      </div>

      {/* 3 Decluttered Plan Tier Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-rose-500" />
            بسته‌های تعرفه و امکانات
          </h3>
          <span className="text-xs text-zinc-400">قیمت‌ها بر اساس ماهانه</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((p) => {
            const isVip = p.id === 'gold_vip';
            return (
              <div
                key={p.id}
                className={`p-5 rounded-2xl bg-white dark:bg-[#181B24] border shadow-xs flex flex-col justify-between transition-all ${
                  isVip
                    ? 'border-rose-500/50 dark:border-rose-500/40 ring-1 ring-rose-500/10'
                    : 'border-stone-200/90 dark:border-zinc-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">{p.name}</h4>
                    {isVip && (
                      <span className="px-2 py-0.5 text-[10px] rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold border border-rose-500/20">
                        محبوب‌ترین
                      </span>
                    )}
                  </div>

                  <div className="my-3">
                    <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                      {p.priceMonthly === 0 ? 'رایگان' : formatCurrency(p.priceMonthly, 'toman')}
                    </span>
                    {p.priceMonthly > 0 && <span className="text-xs text-zinc-400 mr-1">/ ماه</span>}
                  </div>

                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 pb-3 border-b border-stone-100 dark:border-zinc-800">
                    {toPersianDigits(p.activeSubscribers)} سالن فعال
                  </p>

                  <ul className="space-y-2 text-xs text-zinc-600 dark:text-zinc-300">
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>تا {toPersianDigits(p.maxStaff)} متخصص همزمان</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>{toPersianDigits(p.smsIncluded)} پیامک ماهانه</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>نوبت‌دهی آنلاین و پیامکی</span>
                    </li>
                    {isVip && (
                      <li className="flex items-center gap-2 font-medium text-rose-600 dark:text-rose-400">
                        <Check className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span>پشتیبانی تلفنی اختصاصی VIP</span>
                      </li>
                    )}
                  </ul>
                </div>

                <div className="pt-4 mt-4 border-t border-stone-100 dark:border-zinc-800">
                  <button
                    onClick={() => openPlanEditor(p)}
                    className="w-full py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 bg-stone-100 dark:bg-zinc-800 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>ویرایش تعرفه</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Salon Plan Assignment & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Assignment Box */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#181B24] border border-stone-200/90 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-1">
              تخصیص یا ارتقای پلن سالن
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
              اعمال دستی بسته اشتراک برای سالن‌های دارای قرارداد سازمانی
            </p>

            <form onSubmit={handleAssignPlan} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-medium">انتخاب سالن</label>
                <select
                  value={assignSalonId}
                  onChange={(e) => setAssignSalonId(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-[#12141C] border border-stone-200 dark:border-zinc-800 rounded-xl text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-rose-500"
                >
                  {salons.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.city})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-medium">بسته اشتراک</label>
                <select
                  value={assignPlanType}
                  onChange={(e) => setAssignPlanType(e.target.value as PlanType)}
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-[#12141C] border border-stone-200 dark:border-zinc-800 rounded-xl text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-rose-500"
                >
                  <option value="bronze">پایه (برنزی)</option>
                  <option value="silver">حرفه‌ای (نقره‌ای)</option>
                  <option value="gold_vip">ویژه (VIP)</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-xs transition-all cursor-pointer mt-2"
              >
                اعمال ارتقای پلن
              </button>
            </form>
          </div>
        </div>

        {/* Transactions Card */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-[#181B24] border border-stone-200/90 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-zinc-800">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                تراکنش‌های اخیر اشتراک نرم‌افزار
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">درگاه شاپرک (فقط شارژ پنل و اشتراک SaaS)</p>
            </div>

            <span className="text-xs text-zinc-400">
              {toPersianDigits(filteredTransactions.length)} تراکنش
            </span>
          </div>

          <div className="divide-y divide-stone-100 dark:divide-zinc-800 my-2 text-xs">
            {filteredTransactions.slice(0, 5).map((tx) => (
              <div key={tx.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100 block">{tx.salonName}</span>
                  <span className="text-[11px] text-zinc-500">
                    {tx.type === 'subscription' ? 'تمدید اشتراک سالن' : 'شارژ پیامک'}
                  </span>
                </div>

                <div className="text-left">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 block tabular-nums">
                    {formatCurrency(tx.amount, 'toman')}
                  </span>
                  <span className="text-[10px] text-zinc-400 block">{tx.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Plan Editor Modal */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="fixed inset-0" onClick={() => setEditingPlan(null)}></div>

          <div className="relative w-full max-w-sm bg-white dark:bg-[#181B24] border border-stone-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-5 z-10 text-right space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">ویرایش تعرفه «{editingPlan.name}»</h3>
              <button onClick={() => setEditingPlan(null)} className="p-1 text-zinc-400 hover:text-zinc-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 mb-1">مبلغ ماهانه (تومان)</label>
                <input
                  type="number"
                  value={editPriceMonthly}
                  onChange={(e) => setEditPriceMonthly(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-[#12141C] border border-stone-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 mb-1">حداکثر پرسنل همزمان</label>
                <input
                  type="number"
                  value={editMaxStaff}
                  onChange={(e) => setEditMaxStaff(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-[#12141C] border border-stone-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 mb-1">پیامک پیش‌فرض ماهانه</label>
                <input
                  type="number"
                  value={editSmsCount}
                  onChange={(e) => setEditSmsCount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-[#12141C] border border-stone-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200 dark:border-zinc-800">
              <button
                onClick={() => setEditingPlan(null)}
                className="px-3.5 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 bg-stone-100 dark:bg-zinc-800 rounded-xl"
              >
                انصراف
              </button>
              <button
                onClick={() => {
                  editingPlan.priceMonthly = editPriceMonthly;
                  editingPlan.maxStaff = editMaxStaff;
                  editingPlan.smsIncluded = editSmsCount;
                  setEditingPlan(null);
                  addToast({ type: 'success', title: 'تعرفه با موفقیت ویرایش شد' });
                }}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl"
              >
                ذخیره
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
