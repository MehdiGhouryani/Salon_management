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
  Key,
  Users,
  Search,
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
  const [inspectedLog, setInspectedLog] = useState<any | null>(null);
  const [newBlacklistIp, setNewBlacklistIp] = useState('');

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
    const matchCategory = categoryFilter === 'all' || log.category === categoryFilter;
    const matchSearch =
      log.actor.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.action.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.target.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.ipAddress.includes(logSearch);
    return matchSeverity && matchCategory && matchSearch;
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
        return { label: 'بحرانی', class: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-500/20' };
      case 'warning':
        return { label: 'هشدار', class: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-500/20' };
      case 'info':
        return { label: 'عادی', class: 'bg-stone-100 dark:bg-zinc-800 text-zinc-600 dark:text-[#9AAAC2] border-stone-200' };
    }
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'auth':
        return { label: 'احراز هویت', class: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300' };
      case 'privilege':
        return { label: 'دسترسی و نقش', class: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300' };
      case 'business':
        return { label: 'عملیات کسب‌وکار', class: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' };
      case 'financial':
        return { label: 'تراکنش مالی', class: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300' };
      default:
        return { label: 'سیستم', class: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-[#E7ECF5] flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            مرکز امنیت، لاگ‌ها و نشست‌های فعال
          </h2>
          <p className="text-xs text-zinc-500 dark:text-[#9AAAC2] mt-0.5">
            پایش دسترسی‌ها، رویدادهای مشکوک، فایروال و ابطال نشست‌های همزمان
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/20 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 font-semibold">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>امنیت هسته: فعال و پایدار</span>
        </div>
      </div>

      {/* Subtab Navigation */}
      <div className="flex items-center gap-2 border-b border-stone-200 dark:border-[#344258] pb-2 text-xs">
        <button
          onClick={() => setActiveSubTab('audit')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
            activeSubTab === 'audit'
              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-500/20'
              : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>لاگ‌های امنیتی ({toPersianDigits(auditLogs.length)})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('sessions')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
            activeSubTab === 'sessions'
              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-500/20'
              : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <Laptop className="w-3.5 h-3.5" />
          <span>نشست‌های فعال ({toPersianDigits(sessions.length)})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('firewall')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
            activeSubTab === 'firewall'
              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-500/20'
              : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>فایروال و مسدودی IP</span>
        </button>
      </div>

      {/* Tab 1: Audit Logs */}
      {activeSubTab === 'audit' && (
        <div className="space-y-4">
          <div className="p-3 bg-white dark:bg-[#18243A] border border-stone-200 dark:border-[#344258] rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-xs">
            <div className="w-full sm:w-80 relative">
              <Search className="w-4 h-4 text-zinc-400 absolute right-3 top-2.5" />
              <input
                type="text"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="جستجوی اقدام‌کننده، IP یا رویداد..."
                className="w-full pl-3 pr-9 py-1.5 bg-stone-50 dark:bg-[#111B2E] border border-stone-200 dark:border-[#344258] rounded-xl text-zinc-900 dark:text-[#E7ECF5] placeholder-zinc-400 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-1.5 bg-stone-50 dark:bg-[#111B2E] border border-stone-200 dark:border-[#344258] rounded-xl text-zinc-800 dark:text-zinc-200 cursor-pointer"
              >
                <option value="all">تمام دسته‌ها</option>
                <option value="business">عملیات کسب‌وکار</option>
                <option value="privilege">دسترسی و نقش</option>
                <option value="auth">احراز هویت</option>
                <option value="financial">تراکنش مالی</option>
                <option value="system">سیستم</option>
              </select>

              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="px-3 py-1.5 bg-stone-50 dark:bg-[#111B2E] border border-stone-200 dark:border-[#344258] rounded-xl text-zinc-800 dark:text-zinc-200 cursor-pointer"
              >
                <option value="all">تمام سطوح اهمیت</option>
                <option value="critical">بحرانی</option>
                <option value="warning">هشدار</option>
                <option value="info">عادی</option>
              </select>
            </div>
          </div>

          <div className="rounded-2xl bg-white dark:bg-[#18243A] border border-stone-200 dark:border-[#344258] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-stone-50 dark:bg-[#111B2E] border-b border-stone-200 dark:border-[#344258] text-zinc-500 font-semibold">
                  <tr>
                    <th className="py-3 px-4">زمان ثبت</th>
                    <th className="py-3 px-4">اقدام‌کننده</th>
                    <th className="py-3 px-4">عملیات</th>
                    <th className="py-3 px-4">دسته‌بندی</th>
                    <th className="py-3 px-4">هدف</th>
                    <th className="py-3 px-4">آدرس IP</th>
                    <th className="py-3 px-4">شدت</th>
                    <th className="py-3 px-4 text-center">جزئیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-zinc-800 text-zinc-700 dark:text-[#9AAAC2]">
                  {filteredLogs.map((log) => {
                    const badge = getSeverityBadge(log.severity);
                    const catBadge = getCategoryBadge(log.category);
                    return (
                      <tr key={log.id} className="hover:bg-stone-50/60 dark:hover:bg-[#18243A]/40 transition-colors">
                        <td className="py-3 px-4 font-mono text-[11px] text-zinc-500">{log.timestamp}</td>
                        <td className="py-3 px-4 font-semibold text-zinc-900 dark:text-[#E7ECF5]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{log.actor}</span>
                            {log.isDemo && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold">
                                داده آزمایشی
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-medium">{log.action}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 text-[10px] rounded-md font-semibold ${catBadge.class}`}>
                            {catBadge.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-zinc-500">{log.target}</td>
                        <td className="py-3 px-4 font-mono text-[11px]" dir="ltr">{log.ipAddress}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 text-[10px] rounded-md font-medium border ${badge.class}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setInspectedLog(log)}
                            className="px-2 py-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                          >
                            مشاهده
                          </button>
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

      {/* Tab 2: Sessions */}
      {activeSubTab === 'sessions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">
              {toPersianDigits(sessions.length)} نشست فعال در سامانه
            </span>

            {sessions.length > 1 && (
              <button
                onClick={terminateAllOtherSessions}
                className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors cursor-pointer"
              >
                خروج از تمام نشست‌های دیگر
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sessions.map((sess) => (
              <div
                key={sess.id}
                className="p-4 rounded-2xl bg-white dark:bg-[#18243A] border border-stone-200/90 dark:border-[#344258] shadow-xs flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-stone-100 dark:bg-zinc-800 text-zinc-600 dark:text-[#9AAAC2]">
                    <Laptop className="w-5 h-5" />
                  </div>
                  <div className="text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-zinc-900 dark:text-[#E7ECF5]">{sess.userName}</span>
                      {sess.isCurrent && (
                        <span className="px-1.5 py-0.2 text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-md font-bold">
                          نشست فعلی شما
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-zinc-500 block mt-0.5">
                      {sess.device} · IP: {sess.ipAddress}
                    </span>
                  </div>
                </div>

                {!sess.isCurrent && (
                  <button
                    onClick={() => terminateSession(sess.id)}
                    className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl cursor-pointer"
                    title="پایان دادن به این نشست"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Firewall */}
      {activeSubTab === 'firewall' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-[#18243A] border border-stone-200/90 dark:border-[#344258] shadow-xs">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-[#E7ECF5] mb-1">
              افزودن IP به لیست سیاه فایروال
            </h3>
            <p className="text-xs text-zinc-500 mb-4">
              مسدودسازی آدرس‌های IP مشکوک با تلاش‌های مکرر ناموفق ورود
            </p>

            <form onSubmit={handleAddIp} className="flex gap-2 max-w-md">
              <input
                type="text"
                dir="ltr"
                value={newBlacklistIp}
                onChange={(e) => setNewBlacklistIp(e.target.value)}
                placeholder="192.168.1.100"
                className="flex-1 px-3 py-2 bg-stone-50 dark:bg-[#111B2E] border border-stone-200 dark:border-[#344258] rounded-xl text-xs text-zinc-900 dark:text-[#E7ECF5] font-mono"
              />
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-xs cursor-pointer"
              >
                مسدودسازی
              </button>
            </form>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-[#18243A] border border-stone-200/90 dark:border-[#344258] shadow-xs">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-[#E7ECF5] mb-3">
              آدرس‌های مسدودشده فعال ({toPersianDigits(securitySettings.ipBlacklist.length)})
            </h3>

            <div className="flex flex-wrap gap-2">
              {securitySettings.ipBlacklist.map((ip) => (
                <div
                  key={ip}
                  className="px-3 py-1.5 rounded-xl bg-stone-50 dark:bg-[#111B2E] border border-stone-200 dark:border-[#344258] text-xs font-mono flex items-center gap-2"
                >
                  <span className="text-zinc-800 dark:text-zinc-200" dir="ltr">{ip}</span>
                  <button
                    onClick={() => removeIpFromBlacklist(ip)}
                    className="text-zinc-400 hover:text-rose-600"
                    title="حذف از لیست سیاه"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Audit Log Detail Modal */}
      {inspectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="fixed inset-0" onClick={() => setInspectedLog(null)} />

          <div className="relative w-full max-w-lg bg-white dark:bg-[#111B2E] border border-stone-200 dark:border-[#344258] rounded-2xl shadow-2xl p-6 z-10 text-right space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-[#344258]">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-[#E7ECF5]">جزئیات لاگ ممیزی (Audit Entry)</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">شناسه: {inspectedLog.id}</p>
              </div>
              <button
                onClick={() => setInspectedLog(null)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-[#0D1527] rounded-xl border border-slate-200/60 dark:border-[#344258]">
                <span className="text-slate-500">اقدام‌کننده:</span>
                <span className="font-bold text-slate-900 dark:text-[#E7ECF5]">{inspectedLog.actor} ({inspectedLog.actorRole || 'نقش نامشخص'})</span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-[#0D1527] rounded-xl border border-slate-200/60 dark:border-[#344258]">
                <span className="text-slate-500">عنوان عملیات:</span>
                <span className="font-bold text-slate-900 dark:text-[#E7ECF5]">{inspectedLog.action}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-[#0D1527] rounded-xl border border-slate-200/60 dark:border-[#344258]">
                <span className="text-slate-500">موجودیت هدف:</span>
                <span className="font-medium text-slate-800 dark:text-[#E7ECF5]">{inspectedLog.target}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-[#0D1527] rounded-xl border border-slate-200/60 dark:border-[#344258]">
                <span className="text-slate-500">آدرس IP:</span>
                <span className="font-mono text-slate-800 dark:text-[#E7ECF5]" dir="ltr">{inspectedLog.ipAddress}</span>
              </div>

              {inspectedLog.details && (
                <div>
                  <label className="block text-slate-700 dark:text-[#E7ECF5] font-bold mb-1">جزئیات و توضیحات (Details):</label>
                  <pre className="p-3 bg-slate-900 text-slate-100 dark:bg-[#0D1527] dark:text-[#38BDF8] rounded-xl overflow-x-auto font-mono text-[11px] dir-ltr text-left leading-relaxed">
                    {typeof inspectedLog.details === 'object'
                      ? JSON.stringify(inspectedLog.details, null, 2)
                      : inspectedLog.details}
                  </pre>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-[#344258] text-left">
              <button
                onClick={() => setInspectedLog(null)}
                className="px-4 py-1.5 bg-slate-100 dark:bg-[#18243A] text-slate-700 dark:text-[#E7ECF5] font-semibold rounded-xl"
              >
                بستن
              </button>
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
        onClose={() => setConfirmData({ ...confirmData, isOpen: false })}
      />
    </div>
  );
};
