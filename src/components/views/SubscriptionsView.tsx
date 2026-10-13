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

  // Plan editor state
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
      title: 'پلن اشتراک تخصیص داده شد',
      message: `سالن «${targetSalon.name}» به پلن ${assignPlanType} ارتقا یافت.`,
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
      <div>
        <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-emerald-400" />
          مدیریت اشتراک‌های پلتفرم و درگاه‌های بانکی سالن‌ها (B2B SaaS)
        </h2>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
          تنظیم پلن‌های درآمدی سالن‌ها، مشاهده فاکتورهای اشتراک نرم‌افزار و سوابق تراکنش‌های درگاه شاپرک.
          <span className="text-amber-300 mr-1.5 font-medium block sm:inline mt-1 sm:mt-0">
            (توجه: پرداخت نوبت‌ها توسط مشتریان تماماً حضوری در سالن انجام می‌گیرد و به درگاه متصل نیست.)
          </span>
        </p>
      </div>

      {/* Financial Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span>درآمد ماهانه پایدار سامانه (MRR)</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-xl font-bold text-emerald-400 tabular-nums">
            {formatCurrency(estimatedMRR, 'toman')}
          </span>
          <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" /> بر مبنای اشتراک فعال ۵۲۵ سالن
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span>کل اشتراک‌های فعال شبکه</span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <span className="text-xl font-bold text-white tabular-nums">
            {toPersianDigits(totalSubscribers)} سالن
          </span>
          <p className="text-[11px] text-slate-500 mt-2">
            نرخ تمدید خودکار اشتراک‌ها: ۸۹.۴٪
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span>میانگین درآمد از هر سالن (ARPU)</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-xl font-bold text-amber-300 tabular-nums">
            {formatCurrency(Math.round(estimatedMRR / totalSubscribers), 'toman')}
          </span>
          <p className="text-[11px] text-slate-500 mt-2">
            رشد مستمر با استقبال از پلن طلایی
          </p>
        </div>
      </div>

      {/* Plans Pricing & Limits Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200">بسته‌های اشتراک نرم‌افزار</h3>
          <span className="text-xs text-slate-400">۳ بسته فعال با تعرفه ماهانه و سالانه</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((p) => {
            const isGold = p.id === 'gold_vip';
            const isSilver = p.id === 'silver';

            return (
              <div
                key={p.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                  isGold
                    ? 'bg-gradient-to-b from-amber-500/10 via-slate-900 to-slate-900 border-amber-500/40 shadow-xl shadow-amber-500/5'
                    : isSilver
                    ? 'bg-slate-900/90 border-slate-700/80'
                    : 'bg-slate-900/60 border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                        isGold
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : isSilver
                          ? 'bg-slate-700 text-slate-200'
                          : 'bg-amber-900/20 text-amber-400'
                      }`}
                    >
                      {p.name}
                    </span>
                    <button
                      onClick={() => openPlanEditor(p)}
                      className="text-xs text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 cursor-pointer"
                      title="ویرایش قیمت و سهمیه‌ها"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="my-4">
                    <div className="text-2xl font-bold text-white tabular-nums">
                      {formatCurrency(p.priceMonthly, 'toman')}
                    </div>
                    <span className="text-xs text-slate-400 block mt-1">
                      یا {formatCurrency(p.priceYearly, 'toman')} سالانه (۲ ماه رایگان)
                    </span>
                  </div>

                  <ul className="space-y-2.5 text-xs text-slate-300 py-4 border-t border-slate-800">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>ظرفیت پرسنل: {p.maxStaff > 20 ? 'تا ۵۰ آرایشگر' : `تا ${toPersianDigits(p.maxStaff)} آرایشگر`}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>نوبت‌های ماهانه: {p.maxAppointmentsPerMonth > 10000 ? 'نامحدود' : toPersianDigits(p.maxAppointmentsPerMonth)}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>پیامک هدیه: {toPersianDigits(p.smsIncluded)} عدد در ماه</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className={`w-4 h-4 ${p.customDomain ? 'text-emerald-400' : 'text-slate-600'} shrink-0`} />
                      <span className={p.customDomain ? 'text-slate-200' : 'text-slate-500 line-through'}>
                        دامنه اختصاصی سالن
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className={`w-4 h-4 ${p.vipSupport ? 'text-emerald-400' : 'text-slate-600'} shrink-0`} />
                      <span className={p.vipSupport ? 'text-slate-200' : 'text-slate-500 line-through'}>
                        پشتیبانی اختصاصی VIP
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>تعداد مشترکین فعال:</span>
                  <span className="font-bold text-white tabular-nums">{toPersianDigits(p.activeSubscribers)} سالن</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Manual Plan Assignment Card */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
        <h3 className="text-sm font-bold text-slate-200 mb-1">تخصیص دستی یا ارتقای پلن برای سالن</h3>
        <p className="text-xs text-slate-400 mb-4">
          ادمین می‌تواند به عنوان هدیه یا پشتیبانی تلفنی، پلن هر سالن را بدون درگاه تغییر دهد.
        </p>

        <form onSubmit={handleAssignPlan} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block text-slate-400 font-medium mb-1">انتخاب سالن هدف</label>
            <select
              value={assignSalonId}
              onChange={(e) => setAssignSalonId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-rose-500 cursor-pointer"
            >
              {salons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} (پلن فعلی: {s.plan})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">پلن جدید</label>
            <select
              value={assignPlanType}
              onChange={(e) => setAssignPlanType(e.target.value as PlanType)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-rose-500 cursor-pointer"
            >
              <option value="bronze">پایه (برنزی)</option>
              <option value="silver">حرفه‌ای (نقره‌ای)</option>
              <option value="gold_vip">طلایی ویژه (VIP)</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow transition-colors cursor-pointer"
            >
              ثبت و اعمال فوری تغییر پلن
            </button>
          </div>
        </form>
      </div>

      {/* Transactions Ledger */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div>
            <h3 className="font-bold text-slate-200">دفتر کل تراکنش‌های مالی درگاه‌ها</h3>
            <p className="text-slate-400 mt-0.5">سوابق پرداخت اشتراک سالن‌ها از طریق زرین‌پال، سامان و ملت</p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterGateway}
              onChange={(e) => setFilterGateway(e.target.value)}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="all">تمام درگاه‌ها</option>
              <option value="Zarinpal">زرین‌پال</option>
              <option value="Saman">سامان</option>
              <option value="Mellat">ملت</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="all">تمام وضعیت‌ها</option>
              <option value="successful">موفق</option>
              <option value="failed">ناموفق</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold">
              <tr>
                <th className="py-3 px-4">شناسه و سالن</th>
                <th className="py-3 px-4">مبلغ پرداختی</th>
                <th className="py-3 px-4">نوع تراکنش</th>
                <th className="py-3 px-4">درگاه بانکی</th>
                <th className="py-3 px-4">کد پیگیری شاپرک</th>
                <th className="py-3 px-4">تاریخ و ساعت</th>
                <th className="py-3 px-4 text-center">وضعیت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {filteredTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-100 block">{tx.salonName}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{tx.id}</span>
                  </td>

                  <td className="py-3 px-4 font-bold text-emerald-400 tabular-nums">
                    {formatCurrency(tx.amount, 'toman')}
                  </td>

                  <td className="py-3 px-4 text-slate-300">
                    {tx.type === 'subscription' ? 'خرید / تمدید اشتراک سالن' : 'شارژ سهمیه پیامک سالن'}
                  </td>

                  <td className="py-3 px-4 font-medium text-slate-200">
                    {tx.gateway}
                  </td>

                  <td className="py-3 px-4 font-mono text-[11px] text-slate-400" dir="ltr">
                    {tx.trackingCode}
                  </td>

                  <td className="py-3 px-4 text-slate-400">
                    {tx.date}
                  </td>

                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-block px-2.5 py-0.5 text-[10px] rounded-md font-semibold ${
                        tx.status === 'successful'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {tx.status === 'successful' ? 'موفق' : 'ناموفق'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
