import React, { useState, useMemo, useEffect } from 'react';
import {
  MessageSquare,
  RotateCcw,
  Send,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  FileText,
  Search,
  Check,
  X,
  Radio,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { DispatchMessage, MessageTemplate } from '../../types/admin';
import { toPersianDigits, getStatusBadge, maskPhone } from '../../utils/formatters';
import { Pagination } from '../common/Pagination';
import { EmptyState } from '../ui/EmptyState';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { useDebounce } from '../../hooks/useDebounce';

export const MessagesView: React.FC = () => {
  const {
    messages,
    templates,
    retryFailedMessage,
    retryAllFailedMessages,
    sendBroadcastMessage,
    updateTemplate,
    addToast,
  } = useAdmin();

  const [activeSubTab, setActiveSubTab] = useState<'queue' | 'templates'>('queue');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;

  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [broadcastSalonName, setBroadcastSalonName] = useState('مدیریت کل نوبت‌آرا');
  const [broadcastText, setBroadcastText] = useState('');

  // Template editing modal
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [templatePattern, setTemplatePattern] = useState('');
  const [templateEnabled, setTemplateEnabled] = useState(true);

  const deliveredCount = messages.filter((m) => m.status === 'delivered').length;
  const failedCount = messages.filter((m) => m.status === 'failed' || m.status === 'retrying').length;
  const queuedCount = messages.filter((m) => m.status === 'queued').length;

  const filteredMessages = useMemo(() => {
    return messages.filter((m) => {
      const matchStatus = filterStatus === 'all' || m.status === filterStatus;
      const matchSearch =
        m.recipientPhone.includes(debouncedSearch) ||
        m.salonName.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        m.text.toLowerCase().includes(debouncedSearch.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [messages, filterStatus, debouncedSearch]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filterStatus]);

  const totalPages = Math.ceil(filteredMessages.length / PAGE_SIZE);
  const paginatedMessages = useMemo(() => {
    return filteredMessages.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  }, [filteredMessages, page]);

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastText.trim()) return;
    sendBroadcastMessage(broadcastSalonName, broadcastText);
    setIsBroadcastModalOpen(false);
    setBroadcastText('');
  };

  const openTemplateEdit = (tpl: MessageTemplate) => {
    setEditingTemplate(tpl);
    setTemplatePattern(tpl.pattern);
    setTemplateEnabled(tpl.enabled);
  };

  const handleSaveTemplate = () => {
    if (!editingTemplate) return;
    updateTemplate(editingTemplate.id, templatePattern, templateEnabled);
    setEditingTemplate(null);
  };

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[var(--brand-primary)]" />
            مرکز پیامک و دیسپچ نوبت‌ها
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            پایش لحظه‌ای پیامک‌های نوبت‌دهی، الگوهای خدماتی و رفع خطای ارسال
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsBroadcastModalOpen(true)}
            leftIcon={<Send className="w-3.5 h-3.5" />}
          >
            پیامک همگانی
          </Button>

          {failedCount > 0 && (
            <Button
              variant="danger"
              size="sm"
              onClick={retryAllFailedMessages}
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              تلاش مجدد ناموفق‌ها ({toPersianDigits(failedCount)})
            </Button>
          )}
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-xs">
          <span className="text-[var(--text-secondary)] block mb-1">پیامک‌های تحویل‌شده</span>
          <span className="text-xl font-bold text-[var(--status-success)] tabular-nums">
            {toPersianDigits(deliveredCount)} عدد
          </span>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">نرخ تحویل ۹۸.۷٪ در شبکه</p>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-xs">
          <span className="text-[var(--text-secondary)] block mb-1">ناموفق / بلک‌لیست</span>
          <span className={`text-xl font-bold tabular-nums ${failedCount > 0 ? 'text-[var(--status-error)]' : 'text-[var(--text-muted)]'}`}>
            {toPersianDigits(failedCount)} عدد
          </span>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">آماده تلاش مجدد</p>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-xs">
          <span className="text-[var(--text-secondary)] block mb-1">در صف دیسپچ</span>
          <span className="text-xl font-bold text-[var(--status-info)] tabular-nums">
            {toPersianDigits(queuedCount)} عدد
          </span>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">سرعت: ۵۰ پیام در ثانیه</p>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-xs">
          <span className="text-[var(--text-secondary)] block mb-1">درگاه ارتباطی</span>
          <span className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
            کاوه‌نگار خدماتی
          </span>
          <p className="text-[11px] text-[var(--status-success)] mt-1 font-medium">سرویس فعال و پایدار</p>
        </div>
      </div>

      {/* Subtab Toggle (Queue vs Templates) */}
      <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-2 text-xs">
        <button
          onClick={() => setActiveSubTab('queue')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
            activeSubTab === 'queue'
              ? 'bg-[var(--brand-subdued)] text-[var(--brand-primary)] border border-[var(--brand-border)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>صف ارسال پیامک ({toPersianDigits(messages.length)})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('templates')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
            activeSubTab === 'templates'
              ? 'bg-[var(--brand-subdued)] text-[var(--brand-primary)] border border-[var(--brand-border)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>الگوهای خودکار پیامک ({toPersianDigits(templates.length)})</span>
        </button>
      </div>

      {activeSubTab === 'queue' ? (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl shadow-xs text-xs">
            <div className="w-full md:w-80">
              <Input
                size="sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="جستجوی شماره، متن یا سالن (با ۳۰۰ms debounce)..."
                leadingIcon={<Search className="w-4 h-4 text-[var(--text-muted)]" />}
                trailingIcon={
                  search ? (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
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
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  options={[
                    { value: 'all', label: 'همه وضعیت‌ها' },
                    { value: 'delivered', label: 'تحویل‌شده' },
                    { value: 'failed', label: 'ناموفق' },
                    { value: 'queued', label: 'در صف ارسال' },
                  ]}
                />
              </div>

              <div className="text-[11px] font-semibold text-[var(--text-secondary)] px-2.5 py-1.5 rounded-lg bg-[var(--bg-elevated)] tabular-nums shrink-0">
                <span>نمایش </span>
                <strong className="text-[var(--brand-primary)]">{toPersianDigits(filteredMessages.length)}</strong>
                <span> از {toPersianDigits(messages.length)}</span>
              </div>
            </div>
          </div>

          {/* Messages List / Table */}
          <div className="nobat-table-container">
            {filteredMessages.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="nobat-table-header">
                      <tr>
                        <th className="py-3 px-4">گیرنده و سالن</th>
                        <th className="py-3 px-4">متن پیامک</th>
                        <th className="py-3 px-4">وضعیت</th>
                        <th className="py-3 px-4 hidden sm:table-cell">زمان ثبت</th>
                        <th className="py-3 px-4 text-center">عملیات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-primary)]">
                      {paginatedMessages.map((msg) => {
                        const badgeVariant =
                          msg.status === 'delivered' ? 'success' : msg.status === 'failed' ? 'error' : 'info';
                        const badgeLabel =
                          msg.status === 'delivered' ? 'تحویل شده' : msg.status === 'failed' ? 'ناموفق' : 'در صف';

                        return (
                          <tr key={msg.id} className="nobat-table-row">
                            <td className="py-3 px-4">
                              <span className="font-mono block font-semibold text-[var(--text-primary)]" dir="ltr">
                                {maskPhone(msg.recipientPhone)}
                              </span>
                              <span className="text-[11px] text-[var(--text-secondary)] block mt-0.5">{msg.salonName}</span>
                            </td>
                            <td className="py-3 px-4 max-w-md">
                              <p className="leading-relaxed text-[var(--text-secondary)] line-clamp-2">{msg.text}</p>
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant={badgeVariant} size="sm">
                                {badgeLabel}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-[var(--text-muted)] text-[11px] hidden sm:table-cell">{msg.sentAt}</td>
                            <td className="py-3 px-4 text-center">
                              {msg.status === 'failed' ? (
                                <Button
                                  variant="danger"
                                  size="xs"
                                  onClick={() => retryFailedMessage(msg.id)}
                                >
                                  ارسال مجدد
                                </Button>
                              ) : (
                                <span className="text-[11px] text-[var(--text-muted)]">—</span>
                              )}
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
                  totalItems={filteredMessages.length}
                  pageSize={PAGE_SIZE}
                  onPageChange={setPage}
                  onLoadMore={page < totalPages ? () => setPage((p) => p + 1) : undefined}
                  hasMore={page < totalPages}
                  itemLabel="پیامک"
                />
              </>
            ) : (
              <div className="p-6">
                <EmptyState
                  icon={<MessageSquare className="w-8 h-8 text-[var(--text-muted)]" />}
                  title="هیچ پیامکی با این مشخصات یافت نشد"
                  description="عبارت جستجو یا فیلتر وضعیت پیامک‌ها را پاک نمایید تا همه پیامک‌ها نمایش یابند."
                  action={{
                    label: 'پاک کردن فیلترها',
                    onClick: () => {
                      setSearch('');
                      setFilterStatus('all');
                    },
                  }}
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Templates Sub-tab */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-[var(--text-primary)] text-sm">{tpl.title}</h4>
                  <Badge variant={tpl.enabled ? 'success' : 'neutral'} size="sm">
                    {tpl.enabled ? 'فعال' : 'غیرفعال'}
                  </Badge>
                </div>

                <div className="p-3 bg-[var(--bg-subsurface)] rounded-xl border border-[var(--border-subtle)] my-3 text-xs font-mono text-[var(--text-secondary)] leading-relaxed" dir="rtl">
                  {tpl.pattern}
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--border-subtle)] flex justify-end">
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={() => openTemplateEdit(tpl)}
                >
                  ویرایش الگو
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Broadcast Modal */}
      {isBroadcastModalOpen && (
        <Modal
          isOpen={isBroadcastModalOpen}
          onClose={() => setIsBroadcastModalOpen(false)}
          title="ارسال پیامک همگانی به شبکه"
          description="ارسال پیامک اطلاع‌رسانی به تمامی سالن‌ها یا مدیران"
          size="md"
        >
          <form onSubmit={handleSendBroadcast} className="space-y-3.5 text-xs">
            <Input
              label="فرستنده پیامک"
              value={broadcastSalonName}
              onChange={(e) => setBroadcastSalonName(e.target.value)}
            />

            <div>
              <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                متن پیامک *
              </label>
              <textarea
                required
                rows={4}
                value={broadcastText}
                onChange={(e) => setBroadcastText(e.target.value)}
                placeholder="متن اطلاع‌رسانی به سالن‌ها و مشتریان..."
                className="w-full p-3 bg-[var(--bg-subsurface)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/15 leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsBroadcastModalOpen(false)}
              >
                انصراف
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
              >
                ارسال به همه
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Template Modal */}
      {editingTemplate && (
        <Modal
          isOpen={!!editingTemplate}
          onClose={() => setEditingTemplate(null)}
          title="ویرایش الگوی پیامک خودکار"
          description={`تنظیم الگوی پیامک: ${editingTemplate.title}`}
          size="md"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button variant="secondary" size="sm" onClick={() => setEditingTemplate(null)}>
                انصراف
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveTemplate}>
                ذخیره الگو
              </Button>
            </div>
          }
        >
          <div className="space-y-3.5 text-xs">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                متن الگو و متغیرها
              </label>
              <textarea
                rows={4}
                value={templatePattern}
                onChange={(e) => setTemplatePattern(e.target.value)}
                className="w-full p-3 bg-[var(--bg-subsurface)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] font-mono leading-relaxed"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={templateEnabled}
                onChange={(e) => setTemplateEnabled(e.target.checked)}
                className="rounded accent-[var(--brand-primary)]"
              />
              <span className="text-[var(--text-primary)] font-medium">
                فعال بودن ارسال خودکار این الگو در سامانه
              </span>
            </label>
          </div>
        </Modal>
      )}
    </div>
  );
};
