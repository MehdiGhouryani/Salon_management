import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Globe,
  Smartphone,
  Trash2,
  Plus,
  AlertTriangle,
  Eye,
  Key,
  Users,
  Search,
  Filter,
  CheckCircle2,
  X,
  Laptop,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { AuditSeverity } from '../../types/admin';
import { toPersianDigits } from '../../utils/formatters';
import { ConfirmModal } from '../common/ConfirmModal';

export const SecurityView: React.FC = () => {
  const {
    auditLogs,
    sessions,
    securitySettings,
    updateSecuritySettings,
    terminateSession,
    terminateAllOtherSessions,
    addIpToBlacklist,
    removeIpFromBlacklist,
    addToast,
  } = useAdmin();

  const [activeSubTab, setActiveSubTab] = useState<'audit' | 'sessions' | 'firewall'>('audit');
  const [logSearch, setLogSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // New IP to block
  const [newBlacklistIp, setNewBlacklistIp] = useState('');

  // Confirmation modal state
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

  const filteredLogs = auditLogs.filter((log) => {
    const matchSeverity = severityFilter === 'all' || log.severity === severityFilter;
    const matchCat = categoryFilter === 'all' || log.category === categoryFilter;
    const matchSearch =
      log.actor.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.action.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.target.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.ipAddress.includes(logSearch);
    return matchSeverity && matchCat && matchSearch;
  });

  const handleAddIp = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanIp = newBlacklistIp.trim();
    if (!cleanIp) return;
    addIpToBlacklist(cleanIp);
    setNewBlacklistIp('');
  };

  const getSeverityBadge = (sev: AuditSeverity) => {
    switch (sev) {
      case 'critical':
        return { label: 'بحرانی / مشکوک', class: 'bg-rose-500/15 text-rose-400 border-rose-500/30' };
      case 'warning':
        return { label: 'هشدار امنیتی', class: 'bg-amber-500/15 text-amber-400 border-amber-500/30' };
      case 'info':
        return { label: 'رویداد عادی', class: 'bg-slate-800 text-slate-300 border-slate-700' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            مرکز امنیت، لاگ‌های سیستمی و مدیریت نشست‌ها
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            لاگ‌های دسترسی غیرمجاز، مانیتورینگ نشست‌های همزمان، لیست سیاه فایروال و سیاست‌های ۲ مرحله‌ای
          </p>
        </div>

        {/* Security Score Badge */}
        <div className="flex items-center gap-2.5 px-3.5 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 font-semibold">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>امتیاز امنیت هسته: ۹۸ / ۱۰۰ (سطح حفاظتی A+)</span>
        </div>
      </div>

      {/* Subtab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs">
        <button
          onClick={() => setActiveSubTab('audit')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
            activeSubTab === 'audit'
              ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>لاگ‌های امنیتی و ردگیری اقدامات ({toPersianDigits(auditLogs.length)})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('sessions')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
            activeSubTab === 'sessions'
              ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Laptop className="w-3.5 h-3.5" />
          <span>نشست‌های فعال کاربران ({toPersianDigits(sessions.length)})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('firewall')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
            activeSubTab === 'firewall'
              ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>فایروال و لیست سیاه IP</span>
        </button>
      </div>

      {/* TAB 1: Audit Logs */}
      {activeSubTab === 'audit' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="w-full sm:w-72 relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="جستجوی اقدام‌کننده، آدرس IP یا عمل..."
                className="w-full pl-3 pr-9 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="all">تمام سطوح اهمیت</option>
                <option value="critical">بحرانی / مشکوک</option>
                <option value="warning">هشدار</option>
                <option value="info">عادی</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="all">تمام دسته‌ها</option>
                <option value="auth">ورود و احراز هویت</option>
                <option value="privilege">تغییر سطح دسترسی</option>
                <option value="business">کسب‌وکار</option>
                <option value="financial">مالی</option>
                <option value="system">سیستم</option>
              </select>
            </div>
          </div>

          {/* Logs Table */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold">
                  <tr>
                    <th className="py-3 px-4">زمان ثبت</th>
                    <th className="py-3 px-4">اقدام‌کننده</th>
                    <th className="py-3 px-4">عملیات امنیتی</th>
                    <th className="py-3 px-4">هدف عملیات</th>
                    <th className="py-3 px-4">آدرس IP و کلاینت</th>
                    <th className="py-3 px-4">سطح ریسک</th>
                    <th className="py-3 px-4">توضیحات تکمیلی</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-300">
                  {filteredLogs.map((log) => {
                    const badge = getSeverityBadge(log.severity);

                    return (
                      <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                          {log.timestamp}
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-100 block">{log.actor}</span>
                          <span className="text-[10px] text-slate-400">{log.actorRole}</span>
                        </td>

                        <td className="py-3 px-4 font-medium text-slate-200">
                          {log.action}
                        </td>

                        <td className="py-3 px-4 text-slate-300">
                          {log.target}
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-mono text-[11px] text-slate-300 block" dir="ltr">{log.ipAddress}</span>
                          <span className="text-[10px] text-slate-500 block truncate max-w-[140px]">{log.userAgent}</span>
                        </td>

                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-0.5 text-[10px] rounded border font-semibold ${badge.class}`}>
                            {badge.label}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-slate-400 text-[11px] max-w-xs leading-relaxed">
                          {log.details}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Active Sessions */}
      {activeSubTab === 'sessions' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div>
              <h3 className="font-bold text-slate-200">نشست‌های آنلاین و دستگاه‌های متصل</h3>
              <p className="text-slate-400 mt-0.5">در صورت مشاهده دستگاه ناشناس، نشست مربوطه را بلافاصله مسدود کنید.</p>
            </div>

            <button
              onClick={() => {
                setConfirmData({
                  isOpen: true,
                  title: 'خروج از تمام دستگاه‌های دیگر',
                  message: 'تمامی نشست‌های فعال به جز نشست فعلی مسدود و لغو خواهند شد.',
                  variant: 'warning',
                  onConfirm: terminateAllOtherSessions,
                });
              }}
              className="px-3 py-1.5 text-xs font-semibold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl transition-colors cursor-pointer"
            >
              لغو و خروج از تمام نشست‌های دیگر
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sessions.map((ses) => (
              <div
                key={ses.id}
                className={`p-4 rounded-2xl border text-xs space-y-3 ${
                  ses.isCurrent
                    ? 'bg-slate-900 border-emerald-500/30'
                    : 'bg-slate-900/70 border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-slate-800 rounded-xl text-slate-300">
                      <Laptop className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-100">{ses.userName}</span>
                        {ses.isCurrent && (
                          <span className="px-1.5 py-0.2 text-[10px] rounded bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
                            دستگاه جاری شما
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400">{ses.device} · {ses.browser}</span>
                    </div>
                  </div>

                  {!ses.isCurrent && (
                    <button
                      onClick={() => {
                        setConfirmData({
                          isOpen: true,
                          title: `خروج نشست ${ses.userName}`,
                          message: `آیا مایل به بستن این نشست هستید؟ کاربر باید مجدداً لاگین کند.`,
                          variant: 'warning',
                          onConfirm: () => terminateSession(ses.id),
                        });
                      }}
                      className="text-xs text-rose-400 hover:text-rose-300 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                      title="قطع نشست"
                    >
                      خروج اجباری
                    </button>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                  <div>
                    <span>موقعیت و IP:</span>
                    <span className="block text-slate-300 font-mono mt-0.5" dir="ltr">{ses.ipAddress} ({ses.location})</span>
                  </div>
                  <div>
                    <span>آخرین فعالیت:</span>
                    <span className="block text-slate-300 mt-0.5">{ses.lastActive}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Firewall & Defense */}
      {activeSubTab === 'firewall' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
          {/* IP Blacklist Manager */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div>
              <h3 className="font-bold text-slate-100 text-sm">لیست سیاه فایروال (IP Blacklist)</h3>
              <p className="text-slate-400 text-xs mt-0.5">آدرس‌های IP مسدود شده که دسترسی آن‌ها به پنل و API کاملاً قطع است.</p>
            </div>

            {/* Add IP Form */}
            <form onSubmit={handleAddIp} className="flex items-center gap-2">
              <input
                type="text"
                dir="ltr"
                value={newBlacklistIp}
                onChange={(e) => setNewBlacklistIp(e.target.value)}
                placeholder="مثال: 198.51.100.4"
                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-rose-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl transition-colors cursor-pointer shrink-0"
              >
                مسدودسازی IP
              </button>
            </form>

            {/* List */}
            <div className="divide-y divide-slate-800/80 max-h-60 overflow-y-auto">
              {securitySettings.ipBlacklist.map((ip) => (
                <div key={ip} className="py-2.5 flex items-center justify-between">
                  <span className="font-mono text-slate-200" dir="ltr">{ip}</span>
                  <button
                    onClick={() => removeIpFromBlacklist(ip)}
                    className="text-xs text-slate-400 hover:text-emerald-400 px-2 py-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    رفع مسدودیت
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Hardening Policies */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div>
              <h3 className="font-bold text-slate-100 text-sm">سیاست‌های حفاظت دسترسی و احراز هویت</h3>
              <p className="text-slate-400 text-xs mt-0.5">قوانین لایه امنیتی جهت مقابله با حملات Brute-Force و نشت داده</p>
            </div>

            <div className="space-y-4">
              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 cursor-pointer">
                <div>
                  <span className="font-bold text-slate-200 block">الزام احراز هویت ۲ مرحله‌ای (2FA) برای تمام ادمین‌ها</span>
                  <span className="text-[11px] text-slate-400">بدون پیامک/کد تایید، دسترسی به پنل مسدود خواهد بود.</span>
                </div>
                <input
                  type="checkbox"
                  checked={securitySettings.twoFactorEnforcedForAdmins}
                  onChange={(e) => updateSecuritySettings({ twoFactorEnforcedForAdmins: e.target.checked })}
                  className="rounded text-rose-500 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 cursor-pointer">
                <div>
                  <span className="font-bold text-slate-200 block">پنهان‌سازی ارقام حساس (Data Masking)</span>
                  <span className="text-[11px] text-slate-400">پنهان‌سازی شماره موبایل مشتریان و کلیدهای محرمانه API</span>
                </div>
                <input
                  type="checkbox"
                  checked={securitySettings.dataMaskingEnabled}
                  onChange={(e) => updateSecuritySettings({ dataMaskingEnabled: e.target.checked })}
                  className="rounded text-rose-500 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                />
              </label>

              <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">سقف تلاش ناموفق قبل از قفل موقت</span>
                  <span className="font-bold text-rose-400 font-mono">{toPersianDigits(securitySettings.maxFailedLoginsBeforeLock)} مرتبه</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="10"
                  value={securitySettings.maxFailedLoginsBeforeLock}
                  onChange={(e) => updateSecuritySettings({ maxFailedLoginsBeforeLock: Number(e.target.value) })}
                  className="w-full accent-rose-500 cursor-pointer"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">انقضای خودکار نشست غیرفعال (Timeout)</span>
                  <span className="font-bold text-indigo-400 font-mono">{toPersianDigits(securitySettings.sessionTimeoutMinutes)} دقیقه</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="180"
                  step="15"
                  value={securitySettings.sessionTimeoutMinutes}
                  onChange={(e) => updateSecuritySettings({ sessionTimeoutMinutes: Number(e.target.value) })}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>
            </div>
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
