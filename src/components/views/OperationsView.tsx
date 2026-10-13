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
  Radio,
  Play,
  Terminal,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { toPersianDigits } from '../../utils/formatters';

export const OperationsView: React.FC = () => {
  const { metrics, flushRedisCache, runSystemDiagnostic, addToast } = useAdmin();
  const [logFilter, setLogFilter] = useState<'all' | 'error' | 'cron'>('all');

  const simulatedLogs = [
    { time: '12:51:02', level: 'info', msg: '[POSTGRES] Connection pool healthy: 48 active, 12 idle.' },
    { time: '12:50:45', level: 'info', msg: '[DISPATCH] Background SMS worker processed batch of 24 messages.' },
    { time: '12:49:12', level: 'warn', msg: '[GATEWAY] MelliSMS latency spike detected (840ms). Switched fallback to Kavenegar.' },
    { time: '12:48:00', level: 'info', msg: '[CRON] Nightly database snapshot created successfully: backup_14030811.sql.gz (1.4 GB).' },
    { time: '12:45:22', level: 'error', msg: '[AUTH] Blocked brute force attempt on /admin/sign-in from IP 5.160.89.44.' },
    { time: '12:42:19', level: 'info', msg: '[WEBSOCKET] Active salon dashboard connections: 342.' },
    { time: '12:38:05', level: 'info', msg: '[REDIS] Memory fragmentation nominal (1.12), eviction policy: volatile-lru.' },
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
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-rose-400" />
            عملیات زیرساخت، سلامت سرورها و لاگ‌های سیستمی
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            پایش لحظه‌ای سخت‌افزار، کش حافظه Redis، پایگاه داده، صف‌های پس‌زمینه و سرویس‌های خارجی
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={flushRedisCache}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>تخلیه کش Redis</span>
          </button>

          <button
            onClick={runSystemDiagnostic}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
          >
            <Zap className="w-4 h-4" />
            <span>اجرای تست سلامت خودکار</span>
          </button>
        </div>
      </div>

      {/* Real-time Hardware Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        {/* CPU Load */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-semibold text-slate-300">بار پردازنده (CPU Load)</span>
            <Cpu className="w-4 h-4 text-rose-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-white tabular-nums">
              {toPersianDigits(metrics.cpuLoadPercentage)}٪
            </span>
            <span className="text-[11px] text-emerald-400">وضعیت بهینه</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              style={{ width: `${metrics.cpuLoadPercentage}%` }}
              className="bg-gradient-to-r from-emerald-500 to-rose-500 h-full rounded-full transition-all"
            ></div>
          </div>
          <p className="text-[10px] text-slate-400">سرور لودبالانسر کلاستر ابری تهران</p>
        </div>

        {/* RAM Usage */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-semibold text-slate-300">مصرف حافظه RAM</span>
            <HardDrive className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-white tabular-nums">
              {toPersianDigits(metrics.memoryUsageMb)} <span className="text-xs text-slate-400">MB</span>
            </span>
            <span className="text-[11px] text-slate-400 font-mono">از {toPersianDigits(metrics.totalMemoryMb)} MB</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              style={{ width: `${Math.round((metrics.memoryUsageMb / metrics.totalMemoryMb) * 100)}%` }}
              className="bg-indigo-500 h-full rounded-full transition-all"
            ></div>
          </div>
          <p className="text-[10px] text-slate-400">کش لایه اول و سشن‌های فعال کاربر</p>
        </div>

        {/* Redis Cache Hit */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-semibold text-slate-300">نرخ برخورد کش Redis</span>
            <Server className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-300 tabular-nums">
              {toPersianDigits(metrics.redisCacheHitRate)}٪
            </span>
            <span className="text-[11px] text-emerald-400">بسیار عالی</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              style={{ width: `${metrics.redisCacheHitRate}%` }}
              className="bg-emerald-500 h-full rounded-full transition-all"
            ></div>
          </div>
          <p className="text-[10px] text-slate-400">جلوگیری از کوئری‌های تکراری دیتابیس</p>
        </div>

        {/* Database Throughput */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-semibold text-slate-300">پرس‌وجوی دیتابیس (QPS)</span>
            <Database className="w-4 h-4 text-sky-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-white tabular-nums">
              {toPersianDigits(metrics.dbQueriesPerSec)}
            </span>
            <span className="text-[11px] text-slate-400">کوئری / ثانیه</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div style={{ width: '45%' }} className="bg-sky-500 h-full rounded-full"></div>
          </div>
          <p className="text-[10px] text-slate-400">پایگاه داده PostgreSQL بهینه‌شده</p>
        </div>
      </div>

      {/* Services Health Grid */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          وضعیت میکرو‌سرویس‌ها و یکپارچه‌سازی‌های خارجی
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          {[
            { name: 'پایگاه داده اصلی (PostgreSQL)', status: 'پایدار', latency: '4ms', nominal: true },
            { name: 'کلاستر حافظه کش (Redis Cluster)', status: 'پایدار', latency: '1ms', nominal: true },
            { name: 'وب‌سرویس پیامک کاوه‌نگار', status: 'پایدار', latency: '210ms', nominal: true },
            { name: 'وب‌سرویس پشتیبان پیامک (ملی‌پیامک)', status: 'آماده‌باش', latency: '190ms', nominal: true },
            { name: 'درگاه‌های بانکی شاپرک (زرین‌پال / سامان)', status: 'پایدار', latency: '140ms', nominal: true },
            { name: 'سرویس پوش و سوکت نوبت‌دهی سالن‌ها', status: 'پایدار (۳۴۲ اتصال)', latency: '8ms', nominal: true },
          ].map((srv, i) => (
            <div key={i} className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span className="font-semibold text-slate-200">{srv.name}</span>
              </div>
              <div className="text-left font-mono text-slate-400 text-[11px]" dir="ltr">
                {srv.latency}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live Server Log Stream Console */}
      <div className="rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden font-mono text-xs">
        <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-slate-400 font-sans">
          <div className="flex items-center gap-2 text-xs">
            <Terminal className="w-4 h-4 text-rose-400" />
            <span className="font-bold text-slate-200">کنسول جریان لاگ‌های سرور (Server Runtime Log Stream)</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={() => setLogFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                logFilter === 'all' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              تمام لاگ‌ها
            </button>
            <button
              onClick={() => setLogFilter('error')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                logFilter === 'error' ? 'bg-rose-500/20 text-rose-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              خطاها و هشدارها
            </button>
            <button
              onClick={() => setLogFilter('cron')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                logFilter === 'cron' ? 'bg-sky-500/20 text-sky-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              کران‌جاب‌ها
            </button>
          </div>
        </div>

        <div className="p-4 space-y-2 max-h-64 overflow-y-auto leading-relaxed select-text text-[11px]">
          {filteredLogs.map((log, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <span className="text-slate-500 shrink-0 font-mono">{log.time}</span>
              <span
                className={`font-bold px-1.5 py-0.2 rounded text-[10px] shrink-0 ${
                  log.level === 'error'
                    ? 'bg-rose-500/20 text-rose-400'
                    : log.level === 'warn'
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-emerald-500/20 text-emerald-400'
                }`}
              >
                {log.level.toUpperCase()}
              </span>
              <span className="text-slate-300 font-mono" dir="ltr">{log.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
