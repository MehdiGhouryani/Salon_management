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
    const matchSearch =
      log.actor.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.action.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.target.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.ipAddress.includes(logSearch);
    return matchSeverity && matchSearch;
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
        return { label: 'عادی', class: 'bg-stone-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-stone-200' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            مرکز امنیت، لاگ‌ها و نشست‌های فعال
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            پایش دسترسی‌ها، رویدادهای مشکوک، فایروال و ابطال نشست‌های همزمان
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/20 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 font-semibold">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>امنیت هسته: فعال و پایدار</span>
        </div>
      </div>

      {/* Subtab Navigation */}
      <div className="flex items-center gap-2 border-b border-stone-200 dark:border-zinc-800 pb-2 text-xs">
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
          <div className="p-3 bg-white dark:bg-[#181B24] border border-stone-200 dark:border-zinc-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-xs">
            <div className="w-full sm:w-80 relative">
              <Search className="w-4 h-4 text-zinc-400 absolute right-3 top-2.5" />
              <input
                type="text"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="جستجوی اقدام‌کننده، IP یا رویداد..."
                className="w-full pl-3 pr-9 py-1.5 bg-stone-50 dark:bg-[#12141C] border border-stone-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="px-3 py-1.5 bg-stone-50 dark:bg-[#12141C] border border-stone-200 dark:border-zinc-800 rounded-xl text-zinc-800 dark:text-zinc-200 cursor-pointer"
              >
                <option value="all">تمام سطوح</option>
                <option value="critical">بحرانی</option>
                <option value="warning">هشدار</option>
                <option value="info">عادی</option>
              </select>
            </div>
          </div>

          <div className="rounded-2xl bg-white dark:bg-[#181B24] border border-stone-200 dark:border-zinc-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-stone-50 dark:bg-[#12141C] border-b border-stone-200 dark:border-zinc-800 text-zinc-500 font-semibold">
                  <tr>
                    <th className="py-3 px-4">زمان ثبت</th>
                    <th className="py-3 px-4">کاربر / اقدام‌کننده</th>
                    <th className="py-3 px-4">عملیات</th>
                    <th className="py-3 px-4">هدف</th>
                    <th className="py-3 px-4">آدرس IP</th>
                    <th className="py-3 px-4">سطح اهمیت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300">
                  {filteredLogs.map((log) => {
                    const badge = getSeverityBadge(log.severity);
                    return (
                      <tr key={log.id} className="hover:bg-stone-50/60 dark:hover:bg-zinc-800/40 transition-colors">
                        <td className="py-3 px-4 font-mono text-[11px] text-zinc-500">{log.timestamp}</td>
                        <td className="py-3 px-4 font-semibold text-zinc-900 dark:text-zinc-100">{log.actor}</td>
                        <td className="py-3 px-4">{log.action}</td>
                        <td className="py-3 px-4 text-zinc-500">{log.target}</td>
                        <td className="py-3 px-4 font-mono text-[11px]" dir="ltr">{log.ipAddress}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 text-[10px] rounded-md font-medium border ${badge.class}`}>
                            {badge.label}
                          </span>
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
                className="p-4 rounded-2xl bg-white dark:bg-[#181B24] border border-stone-200/90 dark:border-zinc-800 shadow-xs flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-stone-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                    <Laptop className="w-5 h-5" />
                  </div>
                  <div className="text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">{sess.userName}</span>
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
          <div className="p-5 rounded-2xl bg-white dark:bg-[#181B24] border border-stone-200/90 dark:border-zinc-800 shadow-xs">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-1">
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
                className="flex-1 px-3 py-2 bg-stone-50 dark:bg-[#12141C] border border-stone-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 font-mono"
              />
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-xs cursor-pointer"
              >
                مسدودسازی
              </button>
            </form>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-[#181B24] border border-stone-200/90 dark:border-zinc-800 shadow-xs">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-3">
              آدرس‌های مسدودشده فعال ({toPersianDigits(securitySettings.ipBlacklist.length)})
            </h3>

            <div className="flex flex-wrap gap-2">
              {securitySettings.ipBlacklist.map((ip) => (
                <div
                  key={ip}
                  className="px-3 py-1.5 rounded-xl bg-stone-50 dark:bg-[#12141C] border border-stone-200 dark:border-zinc-800 text-xs font-mono flex items-center gap-2"
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
