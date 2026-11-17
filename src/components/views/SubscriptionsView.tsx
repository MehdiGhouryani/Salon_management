import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Edit3,
  Filter,
  Layers,
  Loader2,
  RefreshCw,
  Shield,
  Sparkles,
  X,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { Plan, PlanType } from '../../types/admin';
import { api, ApiError } from '../../api/client';
import { toPersianDigits, formatCurrency } from '../../utils/formatters';

interface LivePlan {
  code: PlanType;
  title: string;
  offer: string;
  priceToman: number;
  durationMonths: number;
  monthlyPriceToman: number;
  maxStaff: number;
  smsIncluded: number;
  features: string;
  activeSubscribers: number;
  mrrToman: number;
}
interface LiveTransaction {
  id: string;
  salonId: string;
  salonName: string;
  planCode: PlanType;
  planName: string;
  amountToman: number;
  gateway: string;
  status: 'creating' | 'pending' | 'paid' | 'failed' | 'cancelled';
  reference: string | null;
  createdAt: string;
  verifiedAt: string | null;
}
interface LiveOverview {
  plans: LivePlan[];
  summary: {
    activeSubscriptions: number;
    pendingPayments: number;
    failedPayments: number;
    totalAttempts: number;
    revenueMtdToman: number;
    mrrToman: number;
  };
  transactions: LiveTransaction[];
  totalPayments: number;
  paymentEnabled: boolean;
  paymentSandbox: boolean;
  availableGateway: 'zarinpal';
}
interface DisplayTransaction {
  id: string;
  salonName: string;
  amount: number;
  date: string;
  gateway: string;
  status: string;
  type: string;
}
const STATUS_LABELS: Record<LiveTransaction['status'], string> = {
  creating: 'در حال ایجاد',
  pending: 'در انتظار پرداخت',
  paid: 'موفق و تأییدشده',
  failed: 'ناموفق',
  cancelled: 'لغوشده',
};

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return 'دریافت اطلاعات مالی از سرور ناموفق بود.';
}

export const SubscriptionsView: React.FC = () => {
  const {
    plans: demoPlans,
    salons,
    transactions: demoTransactions,
    updateSalonPlan,
    addToast,
    isDemoMode,
    serverAuth,
  } = useAdmin();

  const liveEnabled = serverAuth.authenticated && !isDemoMode;
  const [overview, setOverview] = useState<LiveOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [assignSalonId, setAssignSalonId] = useState(salons[0]?.id || '');
  const [assignPlanType, setAssignPlanType] = useState<PlanType>('gold_vip');
  const [filterGateway, setFilterGateway] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [editPriceMonthly, setEditPriceMonthly] = useState(0);
  const [editMaxStaff, setEditMaxStaff] = useState(0);
  const [editSmsCount, setEditSmsCount] = useState(0);

  const loadOverview = useCallback(async () => {
    if (!liveEnabled) return;
    setLoading(true);
    setLoadError('');
    try {
      const data = await api.get<LiveOverview>('/api/admin/subscriptions/overview?limit=50&offset=0');
      setOverview(data);
    } catch (error) {
      setOverview(null);
      setLoadError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [liveEnabled]);

  useEffect(() => { void loadOverview(); }, [loadOverview]);

  const displayPlans: Plan[] = useMemo(() => {
    if (!liveEnabled) return demoPlans;
    return (overview?.plans || []).map((plan) => ({
      id: plan.code,
      name: plan.title,
      priceMonthly: plan.monthlyPriceToman,
      priceYearly: plan.monthlyPriceToman * 12,
      maxStaff: plan.maxStaff,
      maxAppointmentsPerMonth: 0,
      smsIncluded: plan.smsIncluded,
      customDomain: false,
      vipSupport: plan.code === 'gold_vip',
      activeSubscribers: plan.activeSubscribers,
    }));
  }, [demoPlans, liveEnabled, overview]);

  const totalSubscribers = liveEnabled
    ? overview?.summary.activeSubscriptions || 0
    : displayPlans.reduce((acc, plan) => acc + plan.activeSubscribers, 0);
  const estimatedMRR = liveEnabled
    ? overview?.summary.mrrToman || 0
    : displayPlans.reduce((acc, plan) => acc + plan.priceMonthly * plan.activeSubscribers, 0);
  const monthlyCollected = liveEnabled ? overview?.summary.revenueMtdToman || 0 : 0;

  const displayTransactions: DisplayTransaction[] = useMemo(() => {
    if (!liveEnabled) {
      return demoTransactions.map((tx) => ({
        id: tx.id,
        salonName: tx.salonName,
        amount: tx.amount,
        date: tx.date,
        gateway: tx.gateway,
        status: tx.status === 'successful' ? 'موفق' : tx.status === 'failed' ? 'ناموفق' : 'بازپرداخت',
        type: tx.type === 'subscription' ? 'تمدید اشتراک سالن' : 'شارژ پیامک',
      }));
    }
    return (overview?.transactions || []).map((tx) => ({
      id: tx.id,
      salonName: tx.salonName,
      amount: tx.amountToman,
      date: tx.verifiedAt || tx.createdAt,
      gateway: tx.gateway,
      status: STATUS_LABELS[tx.status],
      type: tx.planName,
    }));
  }, [demoTransactions, liveEnabled, overview]);

  const filteredTransactions = displayTransactions.filter((tx) => {
    const gatewayMatches = filterGateway === 'all' || tx.gateway.toLowerCase() === filterGateway.toLowerCase();
    const statusMatches = filterStatus === 'all' ||
      (filterStatus === 'success' ? ['موفق', 'موفق و تأییدشده'].includes(tx.status) : tx.status.toLowerCase().includes(filterStatus));
    return gatewayMatches && statusMatches;
  });

  const handleAssignPlan = (event: React.FormEvent) => {
    event.preventDefault();
    if (!isDemoMode) {
      addToast({ type: 'warning', title: 'تخصیص دستی پلن هنوز به API متصل نیست', message: 'هیچ تغییری در حساب سالن اعمال نشد.' });
      return;
    }
    if (!assignSalonId) return;
    const target = salons.find((salon) => salon.id === assignSalonId);
    if (!target) return;
    updateSalonPlan(assignSalonId, assignPlanType);
    addToast({
      type: 'success',
      title: 'پلن نمایشی به‌روزرسانی شد',
      message: `سالن «${target.name}» در داده‌های دمو تغییر کرد.`,
    });
  };

  const openPlanEditor = (plan: Plan) => {
    if (!isDemoMode) return;
    setEditingPlan(plan);
    setEditPriceMonthly(plan.priceMonthly);
    setEditMaxStaff(plan.maxStaff);
    setEditSmsCount(plan.smsIncluded);
  };

  const gatewayConfigured = isDemoMode ? false : Boolean(overview?.paymentEnabled);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-text-main flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            مالی، تعرفه‌ها و اشتراک‌های سالن‌ها
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            درآمد ثبت‌شده، وضعیت اشتراک‌ها و سوابق پرداخت سالن‌ها
          </p>
        </div>
        {liveEnabled && (
          <button type="button" onClick={() => void loadOverview()} disabled={loading}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-stone-200 dark:border-border-default px-3 text-xs text-zinc-700 dark:text-text-muted disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            به‌روزرسانی
          </button>
        )}
      </div>

      {isDemoMode ? (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-[11px] text-[var(--text-secondary)]">
          حالت دمو فعال است؛ اعداد و تراکنش‌ها نمونه‌اند و پرداخت واقعی انجام نمی‌شود.
        </div>
      ) : liveEnabled ? (
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-[11px] text-[var(--text-secondary)]">
          شاخص‌ها و تراکنش‌ها از PostgreSQL خوانده می‌شوند. فقط پرداخت‌های تأییدشده توسط درگاه در درآمد ثبت‌شده لحاظ می‌شوند.
        </div>
      ) : (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-[11px] text-[var(--text-secondary)]">
          برای مشاهده‌ی گزارش مالی واقعی، با حساب مدیر ارشد وارد شوید.
        </div>
      )}

      {loadError && (
        <div role="alert" className="rounded-xl border border-rose-500/25 bg-rose-500/5 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
          {loadError}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 text-xs">
        <div className="p-4 rounded-2xl bg-white dark:bg-elevated border border-stone-200/90 dark:border-border-default">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="font-semibold text-zinc-700 dark:text-text-muted">درآمد ماهانه پایدار (MRR)</span>
            <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {liveEnabled && loading ? '—' : formatCurrency(estimatedMRR, 'toman')}
          </span>
          <p className="text-[11px] text-text-subtle mt-2">بر اساس اشتراک‌های فعال و تاریخ انقضا</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-elevated border border-stone-200/90 dark:border-border-default">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="font-semibold text-zinc-700 dark:text-text-muted">اشتراک‌های فعال</span>
            <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <span className="text-2xl font-bold text-zinc-900 dark:text-text-main tabular-nums">
            {liveEnabled && loading ? '—' : toPersianDigits(totalSubscribers)}
          </span>
          <p className="text-[11px] text-text-subtle mt-2">اشتراک فعال با تاریخ انقضای معتبر</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-elevated border border-stone-200/90 dark:border-border-default">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="font-semibold text-zinc-700 dark:text-text-muted">دریافتی تأییدشده این ماه</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <span className="text-2xl font-bold text-zinc-900 dark:text-text-main tabular-nums">
            {liveEnabled ? formatCurrency(monthlyCollected, 'toman') : '—'}
          </span>
          <p className="text-[11px] text-text-subtle mt-2">مبالغ پرداخت تأییدشده توسط درگاه</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-elevated border border-stone-200/90 dark:border-border-default">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="font-semibold text-zinc-700 dark:text-text-muted">وضعیت درگاه زرین‌پال</span>
            <Shield className="w-4 h-4 text-zinc-500" />
          </div>
          <span className="text-base font-bold text-zinc-900 dark:text-text-main">
            {isDemoMode ? 'دمو' : loading ? 'در حال بررسی' : gatewayConfigured ? 'پیکربندی‌شده' : 'فعال نیست'}
          </span>
          <p className="text-[11px] text-text-subtle mt-2">
            {isDemoMode ? 'تراکنش واقعی انجام نمی‌شود' : gatewayConfigured ? (overview?.paymentSandbox ? 'محیط آزمایشی' : 'محیط عملیاتی') : 'کلید پذیرنده یا آدرس بازگشت تنظیم نشده است'}
          </p>
        </div>
      </div>

      {liveEnabled && overview && (
        <div className="flex flex-wrap gap-3 text-[11px] text-[var(--text-secondary)]">
          <span className="rounded-lg border border-[var(--border-default)] px-3 py-2">پرداخت‌های در انتظار: {toPersianDigits(overview.summary.pendingPayments)}</span>
          <span className="rounded-lg border border-[var(--border-default)] px-3 py-2">پرداخت‌های ناموفق: {toPersianDigits(overview.summary.failedPayments)}</span>
          <span className="rounded-lg border border-[var(--border-default)] px-3 py-2">کل تلاش‌های پرداخت: {toPersianDigits(overview.summary.totalAttempts)}</span>
        </div>
      )}

      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-text-main flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-rose-500" /> بسته‌های تعرفه و امکانات
          </h3>
          <span className="text-xs text-text-subtle">قیمت ماهانه معادل</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {displayPlans.map((plan) => {
            const livePlan = liveEnabled ? overview?.plans.find((item) => item.code === plan.id) : undefined;
            const isVip = plan.id === 'gold_vip';
            return (
              <div key={plan.id} className={'p-5 rounded-2xl bg-white dark:bg-elevated border flex flex-col justify-between ' +
                (isVip ? 'border-rose-500/50 dark:border-rose-500/40 ring-1 ring-rose-500/10' : 'border-stone-200/90 dark:border-border-default')}>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-zinc-900 dark:text-text-main text-sm">{plan.name}</h4>
                    {isVip && <span className="px-2 py-0.5 text-[11px] rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 font-bold border border-rose-500/20">VIP</span>}
                  </div>
                  <div className="my-3">
                    <span className="text-xl font-bold text-zinc-900 dark:text-text-main tabular-nums">{formatCurrency(plan.priceMonthly, 'toman')}</span>
                    <span className="text-xs text-text-subtle mr-1">/ ماه</span>
                  </div>
                  <p className="text-xs text-text-muted mb-4 pb-3 border-b border-stone-100 dark:border-border-default">
                    {toPersianDigits(plan.activeSubscribers)} سالن فعال
                    {livePlan ? ' · ' + toPersianDigits(livePlan.durationMonths) + ' ماه در هر خرید' : ''}
                  </p>
                  <ul className="space-y-2 text-xs text-zinc-600 dark:text-text-muted">
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /><span>تا {toPersianDigits(plan.maxStaff)} متخصص</span></li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /><span>{toPersianDigits(plan.smsIncluded)} پیامک در پلن</span></li>
                    {livePlan?.features && <li className="text-[11px] text-text-subtle">{livePlan.features}</li>}
                  </ul>
                </div>
                {isDemoMode ? (
                  <button type="button" onClick={() => openPlanEditor(plan)}
                    className="w-full mt-4 py-2 text-xs font-semibold text-zinc-700 dark:text-text-muted bg-stone-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5" /> ویرایش نمایشی تعرفه
                  </button>
                ) : (
                  <p className="mt-4 border-t border-stone-100 dark:border-border-default pt-3 text-[11px] text-text-subtle">
                    ویرایش قیمت و امکانات از این صفحه هنوز فعال نشده است.
                  </p>
                )}
              </div>
            );
          })}
          {liveEnabled && loading && !overview && <div className="text-xs text-text-muted">در حال دریافت پلن‌ها از سرور...</div>}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="p-5 rounded-2xl bg-white dark:bg-elevated border border-stone-200/90 dark:border-border-default">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-text-main mb-1">تخصیص دستی پلن</h3>
          <p className="text-xs text-text-muted mb-4">
            {isDemoMode ? 'این عمل فقط داده‌های پیش‌نمایش را تغییر می‌دهد.' : 'تخصیص دستی یا قرارداد سازمانی هنوز به endpoint مدیریتی متصل نشده است.'}
          </p>
          <form onSubmit={handleAssignPlan} className="space-y-3.5 text-xs">
            <label className="block">
              <span className="block text-zinc-600 dark:text-text-muted mb-1 font-medium">انتخاب سالن</span>
              <select value={assignSalonId} onChange={(event) => setAssignSalonId(event.target.value)} disabled={!isDemoMode}
                className="w-full px-3 py-2 bg-stone-50 dark:bg-surface border border-stone-200 dark:border-border-default rounded-xl text-zinc-800 dark:text-zinc-200 disabled:opacity-50">
                {salons.map((salon) => <option key={salon.id} value={salon.id}>{salon.name} ({salon.city})</option>)}
              </select>
            </label>
            <label className="block">
              <span className="block text-zinc-600 dark:text-text-muted mb-1 font-medium">بسته اشتراک</span>
              <select value={assignPlanType} onChange={(event) => setAssignPlanType(event.target.value as PlanType)} disabled={!isDemoMode}
                className="w-full px-3 py-2 bg-stone-50 dark:bg-surface border border-stone-200 dark:border-border-default rounded-xl text-zinc-800 dark:text-zinc-200 disabled:opacity-50">
                <option value="bronze">پایه (برنزی)</option><option value="silver">حرفه‌ای (نقره‌ای)</option><option value="gold_vip">ویژه (VIP)</option>
              </select>
            </label>
            <button type="submit" disabled={!isDemoMode}
              className="w-full py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl disabled:opacity-50">
              اعمال در داده‌های دمو
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-elevated border border-stone-200/90 dark:border-border-default">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100 dark:border-border-default">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-text-main">سوابق پرداخت اشتراک</h3>
              <p className="text-xs text-text-muted mt-0.5">وضعیت هر پرداخت بر اساس پاسخ سرور و تأیید درگاه</p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <select value={filterGateway} onChange={(event) => setFilterGateway(event.target.value)}
                className="px-2 py-1.5 bg-stone-50 dark:bg-surface border border-stone-200 dark:border-border-default rounded-lg">
                <option value="all">همه درگاه‌ها</option><option value="zarinpal">زرین‌پال</option>
              </select>
              <select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)}
                className="px-2 py-1.5 bg-stone-50 dark:bg-surface border border-stone-200 dark:border-border-default rounded-lg">
                <option value="all">همه وضعیت‌ها</option><option value="success">موفق</option><option value="pending">در انتظار</option><option value="failed">ناموفق</option><option value="cancelled">لغوشده</option>
              </select>
            </div>
          </div>

          <div className="divide-y divide-stone-100 dark:divide-zinc-800 my-2 text-xs">
            {filteredTransactions.slice(0, 10).map((transaction) => (
              <div key={transaction.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="font-bold text-zinc-900 dark:text-text-main block truncate">{transaction.salonName}</span>
                  <span className="text-[11px] text-text-muted">{transaction.type} · {transaction.gateway}</span>
                  <span className="block text-[11px] text-text-subtle">{transaction.status}</span>
                </div>
                <div className="text-left shrink-0">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 block tabular-nums">{formatCurrency(transaction.amount, 'toman')}</span>
                  <span className="text-[11px] text-text-subtle block">{new Date(transaction.date).toLocaleString('fa-IR')}</span>
                </div>
              </div>
            ))}
            {!filteredTransactions.length && (
              <div className="py-7 text-center text-xs text-text-subtle">تراکنشی با فیلتر انتخاب‌شده وجود ندارد.</div>
            )}
          </div>
        </div>
      </div>

      {editingPlan && isDemoMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <button type="button" aria-label="بستن ویرایش تعرفه" className="fixed inset-0" onClick={() => setEditingPlan(null)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-elevated border border-stone-200 dark:border-border-default rounded-2xl shadow-2xl p-5 z-10 text-right space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-border-default">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-text-main">ویرایش نمایشی «{editingPlan.name}»</h3>
              <button type="button" onClick={() => setEditingPlan(null)} className="p-1 text-text-subtle hover:text-zinc-700"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3 text-xs">
              <label className="block"><span className="block mb-1">مبلغ ماهانه (تومان)</span><input type="number" value={editPriceMonthly} onChange={(event) => setEditPriceMonthly(Number(event.target.value))} className="w-full px-3 py-2 bg-stone-50 dark:bg-surface border border-stone-200 dark:border-border-default rounded-xl" /></label>
              <label className="block"><span className="block mb-1">حداکثر پرسنل</span><input type="number" value={editMaxStaff} onChange={(event) => setEditMaxStaff(Number(event.target.value))} className="w-full px-3 py-2 bg-stone-50 dark:bg-surface border border-stone-200 dark:border-border-default rounded-xl" /></label>
              <label className="block"><span className="block mb-1">پیامک ماهانه</span><input type="number" value={editSmsCount} onChange={(event) => setEditSmsCount(Number(event.target.value))} className="w-full px-3 py-2 bg-stone-50 dark:bg-surface border border-stone-200 dark:border-border-default rounded-xl" /></label>
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200 dark:border-border-default">
              <button type="button" onClick={() => setEditingPlan(null)} className="px-3.5 py-1.5 text-xs text-zinc-600 dark:text-text-muted bg-stone-100 dark:bg-zinc-800 rounded-xl">انصراف</button>
              <button type="button" onClick={() => {
                const current = demoPlans.find((item) => item.id === editingPlan.id);
                if (current) {
                  current.priceMonthly = editPriceMonthly;
                  current.maxStaff = editMaxStaff;
                  current.smsIncluded = editSmsCount;
                }
                setEditingPlan(null);
                addToast({ type: 'info', title: '[دمو] تعرفه فقط در داده‌های پیش‌نمایش تغییر کرد.' });
              }} className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl">ذخیره نمایشی</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
