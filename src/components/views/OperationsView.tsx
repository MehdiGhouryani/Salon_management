import React, { useState } from 'react';
import {
  Activity,
  Server,
  Database,
  Cpu,
  HardDrive,
  RotateCcw,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Play,
  Terminal,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { toPersianDigits } from '../../utils/formatters';

export const OperationsView: React.FC = () => {
  const { metrics, flushRedisCache, runSystemDiagnostic, addToast } = useAdmin();
  const [logFilter, setLogFilter] = useState<'all' | 'error' | 'cron'>('all');

  const simulatedLogs = [
    { time: '12:51:02', level: 'info', msg: '[POSTGRES] استخر اتصال دیتابیس پایدار: ۴۸ فعال، ۱۲ آماده.' },
    { time: '12:50:45', level: 'info', msg: '[DISPATCH] ورکر پیامک دسته‌ای ۲۴ پیامک نوبت را ارسال کرد.' },
    { time: '12:49:12', level: 'warn', msg: '[GATEWAY] تاخیر خط کاوه‌نگار افزایش یافت؛ سوییچ هوشمند به خط پشتیبان.' },
    { time: '12:48:00', level: 'info', msg: '[CRON] پشتیبان‌گیری خودکار دیتابیس با موفقیت ثبت شد (۱.۴ گیگابایت).' },
    { time: '12:45:22', level: 'error', msg: '[AUTH] تلاش ناموفق ورود به ادمین از IP 5.160.89.44 مسدود شد.' },
    { time: '12:42:19', level: 'info', msg: '[WEBSOCKET] اتصال زنده سالن‌ها: ۳۴۲ سالن متصل.' },
  ];

  const filteredLogs = simulatedLogs.filter((l) => {
    if (logFilter === 'error') return l.level === 'error' || l.level === 'warn';
    if (logFilter === 'cron') return l.msg.includes('CRON') || l.msg.includes('DISPATCH');
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            سلامت سیستم و پایش زیرساخت
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            پایش بار سرور، مصرف حافظه، کش Redis و صف‌های پیامک
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={flushRedisCache}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 border border-amber-500/20 rounded-xl transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>تخلیه کش Redis</span>
          </button>

          <button
            onClick={runSystemDiagnostic}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            <span>تست سلامت سیستم</span>
          </button>
        </div>
      </div>

      {/* Hardware & Infrastructure KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#181B24] border border-stone-200/90 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span>پردازنده سرور (CPU)</span>
            <Cpu className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
            {toPersianDigits(metrics.cpuLoadPercentage)}٪
          </span>
          <div className="w-full bg-stone-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-2">
            <div
              style={{ width: `${metrics.cpuLoadPercentage}%` }}
              className="bg-rose-600 h-full rounded-full"
            />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#181B24] border border-stone-200/90 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span>حافظه RAM</span>
            <HardDrive className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
            {toPersianDigits(Math.round((metrics.memoryUsageMb / metrics.totalMemoryMb) * 100))}٪
          </span>
          <div className="w-full bg-stone-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-2">
            <div
              style={{ width: `${Math.round((metrics.memoryUsageMb / metrics.totalMemoryMb) * 100)}%` }}
              className="bg-indigo-600 h-full rounded-full"
            />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#181B24] border border-stone-200/90 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span>تاخیر پاسخگویی (Latency)</span>
            <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {toPersianDigits(metrics.avgResponseTimeMs)} میلی‌ثانیه
          </span>
          <p className="text-[11px] text-zinc-400 mt-2">عالی و در محدوده سبز</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#181B24] border border-stone-200/90 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span>کش Redis</span>
            <Database className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </div>
          <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
            {toPersianDigits(metrics.redisCacheHitRate)}٪ هیت‌ریت
          </span>
          <p className="text-[11px] text-zinc-400 mt-2">{toPersianDigits(metrics.activeWebsockets)} سالن متصل زنده</p>
        </div>
      </div>

      {/* Terminal / Live Server Log Card */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#181B24] border border-stone-200/90 dark:border-zinc-800 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-zinc-800 text-xs">
          <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-100">
            <Terminal className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <span>لاگ‌های لحظه‌ای سرور</span>
          </div>

          <div className="flex items-center gap-1.5">
            {['all', 'error', 'cron'].map((filter) => (
              <button
                key={filter}
                onClick={() => setLogFilter(filter as any)}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  logFilter === filter
                    ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                {filter === 'all' ? 'همه رویدادها' : filter === 'error' ? 'هشدار و خطا' : 'کرون جابز'}
              </button>
            ))}
          </div>
        </div>

        <div className="p-3 bg-stone-50 dark:bg-[#10121A] rounded-xl border border-stone-100 dark:border-zinc-800/80 my-3 font-mono text-xs space-y-2 max-h-72 overflow-y-auto" dir="ltr">
          {filteredLogs.map((log, i) => (
            <div key={i} className="flex items-start gap-2 text-left">
              <span className="text-zinc-400 shrink-0">[{log.time}]</span>
              <span
                className={`font-semibold shrink-0 ${
                  log.level === 'error'
                    ? 'text-rose-500'
                    : log.level === 'warn'
                    ? 'text-amber-500'
                    : 'text-emerald-500'
                }`}
              >
                [{log.level.toUpperCase()}]
              </span>
              <span className="text-zinc-700 dark:text-zinc-300 break-all">{log.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
