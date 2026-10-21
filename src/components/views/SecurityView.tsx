import React, { useState, useMemo, useEffect } from 'react';
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
import { Pagination } from '../common/Pagination';
import { EmptyState } from '../ui/EmptyState';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { useDebounce } from '../../hooks/useDebounce';

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
  const debouncedSearch = useDebounce(logSearch, 300);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [inspectedLog, setInspectedLog] = useState<any | null>(null);
  const [newBlacklistIp, setNewBlacklistIp] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;

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

  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const matchSeverity = severityFilter === 'all' || log.severity === severityFilter;
      const matchCategory = categoryFilter === 'all' || log.category === categoryFilter;
      const matchSearch =
        log.actor.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        log.action.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        log.target.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        log.ipAddress.includes(debouncedSearch);
      return matchSeverity && matchCategory && matchSearch;
    });
  }, [auditLogs, debouncedSearch, severityFilter, categoryFilter]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, severityFilter, categoryFilter]);

  const totalPages = Math.ceil(filteredLogs.length / PAGE_SIZE);
  const paginatedLogs = useMemo(() => {
    return filteredLogs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  }, [filteredLogs, page]);

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
        return { label: 'بحرانی', variant: 'error' as const };
      case 'warning':
        return { label: 'هشدار', variant: 'warning' as const };
      case 'info':
        return { label: 'عادی', variant: 'neutral' as const };
    }
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'auth':
        return { label: 'احراز هویت', variant: 'info' as const };
      case 'privilege':
        return { label: 'دسترسی و نقش', variant: 'purple' as const };
      case 'business':
        return { label: 'عملیات کسب‌وکار', variant: 'success' as const };
      case 'financial':
        return { label: 'تراکنش مالی', variant: 'brand' as const };
      default:
        return { label: 'سیستم', variant: 'neutral' as const };
    }
  };

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[var(--brand-primary)]" />
            مرکز امنیت، لاگ‌ها و نشست‌های فعال
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            پایش دسترسی‌ها، رویدادهای مشکوک، فایروال و ابطال نشست‌های همزمان
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--status-success-bg)] border border-[var(--status-success-border)] rounded-xl text-xs text-[var(--status-success)] font-semibold">
          <ShieldCheck className="w-4 h-4 text-[var(--status-success)]" />
          <span>امنیت هسته: فعال و پایدار</span>
        </div>
      </div>

      {/* Subtab Navigation */}
      <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-2 text-xs">
        <button
          onClick={() => setActiveSubTab('audit')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
            activeSubTab === 'audit'
              ? 'bg-[var(--brand-subdued)] text-[var(--brand-primary)] border border-[var(--brand-border)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>لاگ‌های امنیتی ({toPersianDigits(auditLogs.length)})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('sessions')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
            activeSubTab === 'sessions'
              ? 'bg-[var(--brand-subdued)] text-[var(--brand-primary)] border border-[var(--brand-border)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
          }`}
        >
          <Laptop className="w-3.5 h-3.5" />
          <span>نشست‌های فعال ({toPersianDigits(sessions.length)})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('firewall')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
            activeSubTab === 'firewall'
              ? 'bg-[var(--brand-subdued)] text-[var(--brand-primary)] border border-[var(--brand-border)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>فایروال و لیست سیاه IP</span>
        </button>
      </div>

      {/* Tab 1: Audit Logs */}
      {activeSubTab === 'audit' && (
        <div className="space-y-4">
          {/* Advanced Filter Bar with Debounce & Select Components */}
          <div className="p-3 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs shadow-xs">
            <div className="w-full md:w-80">
              <Input
                size="sm"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="جستجوی اقدام‌کننده، IP یا رویداد..."
                leadingIcon={<Search className="w-4 h-4 text-[var(--text-muted)]" />}
                trailingIcon={
                  logSearch ? (
                    <button
                      type="button"
                      onClick={() => setLogSearch('')}
                      className="pointer-events-auto p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  ) : undefined
                }
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 justify-between md:justify-end">
              <div className="w-36">
                <Select
                  size="sm"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'تمام دسته‌ها' },
                    { value: 'business', label: 'عملیات کسب‌وکار' },
                    { value: 'privilege', label: 'دسترسی و نقش' },
                    { value: 'auth', label: 'احراز هویت' },
                    { value: 'financial', label: 'تراکنش مالی' },
                    { value: 'system', label: 'سیستم' },
                  ]}
                />
              </div>

              <div className="w-36">
                <Select
                  size="sm"
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'تمام سطوح اهمیت' },
                    { value: 'critical', label: 'بحرانی' },
                    { value: 'warning', label: 'هشدار' },
                    { value: 'info', label: 'عادی' },
                  ]}
                />
              </div>

              <div className="text-[11px] font-semibold text-[var(--text-secondary)] px-2.5 py-1.5 rounded-lg bg-[var(--bg-elevated)] tabular-nums shrink-0">
                <span>نمایش </span>
                <strong className="text-[var(--brand-primary)]">{toPersianDigits(filteredLogs.length)}</strong>
                <span> از {toPersianDigits(auditLogs.length)}</span>
              </div>
            </div>
          </div>

          <div className="nobat-table-container">
            {filteredLogs.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="nobat-table-header">
                      <tr>
                        <th className="py-3 px-4">زمان ثبت</th>
                        <th className="py-3 px-4">اقدام‌کننده</th>
                        <th className="py-3 px-4">عملیات</th>
                        <th className="py-3 px-4 hidden md:table-cell">دسته‌بندی</th>
                        <th className="py-3 px-4 hidden lg:table-cell">هدف</th>
                        <th className="py-3 px-4 hidden sm:table-cell">آدرس IP</th>
                        <th className="py-3 px-4">شدت</th>
                        <th className="py-3 px-4 text-center">جزئیات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-primary)]">
                      {paginatedLogs.map((log) => {
                        const badge = getSeverityBadge(log.severity);
                        const catBadge = getCategoryBadge(log.category);
                        return (
                          <tr key={log.id} className="nobat-table-row">
                            <td className="py-3 px-4 font-mono text-[11px] text-[var(--text-muted)]">{log.timestamp}</td>
                            <td className="py-3 px-4 font-semibold text-[var(--text-primary)]">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span>{log.actor}</span>
                                {log.isDemo && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-[var(--status-warning-bg)] text-[var(--status-warning)] border border-[var(--status-warning-border)] font-bold">
                                    داده آزمایشی
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 font-medium">{log.action}</td>
                            <td className="py-3 px-4 hidden md:table-cell">
                              <Badge variant={catBadge.variant} size="sm">
                                {catBadge.label}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-[var(--text-secondary)] hidden lg:table-cell">{log.target}</td>
                            <td className="py-3 px-4 font-mono text-[11px] text-[var(--text-muted)] hidden sm:table-cell" dir="ltr">{log.ipAddress}</td>
                            <td className="py-3 px-4">
                              <Badge variant={badge.variant} size="sm">
                                {badge.label}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <Button
                                variant="ghost"
                                size="xs"
                                onClick={() => setInspectedLog(log)}
                              >
                                مشاهده
                              </Button>
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
                  totalItems={filteredLogs.length}
                  pageSize={PAGE_SIZE}
                  onPageChange={setPage}
                  onLoadMore={page < totalPages ? () => setPage((p) => p + 1) : undefined}
                  hasMore={page < totalPages}
                  itemLabel="لاگ"
                />
              </>
            ) : (
              <div className="p-6">
                <EmptyState
                  icon={<Lock className="w-8 h-8 text-[var(--text-muted)]" />}
                  title="هیچ لاگ امنیتی با این مشخصات یافت نشد"
                  description="لطفاً عبارت جستجو را ویرایش کرده یا فیلترهای اهمیت و دسته‌بندی را پاک فرمایید."
                  action={{
                    label: 'پاک کردن فیلترها',
                    onClick: () => {
                      setLogSearch('');
                      setSeverityFilter('all');
                      setCategoryFilter('all');
                    },
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Sessions */}
      {activeSubTab === 'sessions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl text-xs">
            <span className="font-semibold text-[var(--text-secondary)]">
              {toPersianDigits(sessions.length)} نشست فعال در سامانه
            </span>

            {sessions.length > 1 && (
              <Button
                variant="danger"
                size="sm"
                onClick={terminateAllOtherSessions}
              >
                خروج از تمام نشست‌های دیگر
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sessions.map((sess) => (
              <div
                key={sess.id}
                className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-xs flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-[var(--bg-elevated)] text-[var(--text-secondary)]">
                    <Laptop className="w-5 h-5" />
                  </div>
                  <div className="text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[var(--text-primary)]">{sess.userName}</span>
                      {sess.isCurrent && (
                        <Badge variant="success" size="sm">
                          نشست فعلی شما
                        </Badge>
                      )}
                    </div>
                    <span className="text-[11px] text-[var(--text-secondary)] block mt-0.5">
                      {sess.device} · IP: <span className="font-mono">{sess.ipAddress}</span>
                    </span>
                  </div>
                </div>

                {!sess.isCurrent && (
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => terminateSession(sess.id)}
                    title="پایان دادن به این نشست"
                    className="text-[var(--status-error)] hover:bg-[var(--status-error-bg)]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Firewall */}
      {activeSubTab === 'firewall' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-xs">
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1">
              افزودن IP به لیست سیاه فایروال
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mb-4">
              مسدودسازی آدرس‌های IP مشکوک با تلاش‌های مکرر ناموفق ورود
            </p>

            <form onSubmit={handleAddIp} className="flex gap-2 max-w-md">
              <Input
                size="sm"
                dir="ltr"
                value={newBlacklistIp}
                onChange={(e) => setNewBlacklistIp(e.target.value)}
                placeholder="192.168.1.100"
                tabularNums
              />
              <Button
                type="submit"
                variant="danger"
                size="sm"
                className="shrink-0"
              >
                مسدودسازی
              </Button>
            </form>
          </div>

          <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-[var(--text-primary)]">
              IPهای مسدود شده در سامانه ({toPersianDigits(securitySettings.ipBlacklist.length)})
            </h4>

            {securitySettings.ipBlacklist.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] py-4 text-center">
                هیچ IP در لیست سیاه قرار ندارد.
              </p>
            ) : (
              <div className="divide-y divide-[var(--border-subtle)] text-xs">
                {securitySettings.ipBlacklist.map((ip) => (
                  <div key={ip} className="py-2.5 flex items-center justify-between">
                    <span className="font-mono text-[var(--text-primary)] font-semibold" dir="ltr">{ip}</span>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => removeIpFromBlacklist(ip)}
                      className="text-[var(--status-error)] hover:bg-[var(--status-error-bg)]"
                    >
                      رفع مسدودی
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Log Details Modal */}
      {inspectedLog && (
        <Modal
          isOpen={!!inspectedLog}
          onClose={() => setInspectedLog(null)}
          title="جزئیات رویداد امنیتی"
          description={`شناسه لاگ: ${inspectedLog.id} · زمان: ${inspectedLog.timestamp}`}
          size="md"
          footer={
            <Button variant="secondary" size="sm" onClick={() => setInspectedLog(null)}>
              بستن پنجره
            </Button>
          }
        >
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-[var(--bg-elevated)]">
              <div>
                <span className="text-[var(--text-muted)] block mb-0.5">اقدام‌کننده:</span>
                <span className="font-bold text-[var(--text-primary)]">{inspectedLog.actor}</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block mb-0.5">آدرس IP:</span>
                <span className="font-mono font-bold text-[var(--text-primary)]" dir="ltr">{inspectedLog.ipAddress}</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block mb-0.5">دسته‌بندی:</span>
                <span className="font-bold text-[var(--text-primary)]">{inspectedLog.category}</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block mb-0.5">سطح اهمیت:</span>
                <span className="font-bold text-[var(--text-primary)]">{inspectedLog.severity}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subsurface)]">
              <span className="text-[var(--text-muted)] block mb-1">شرح اقدام:</span>
              <p className="font-semibold text-[var(--text-primary)] leading-relaxed">{inspectedLog.action}</p>
              <p className="text-[11px] text-[var(--text-secondary)] mt-1">هدف: {inspectedLog.target}</p>
            </div>
          </div>
        </Modal>
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
