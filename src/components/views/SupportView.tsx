import React, { useEffect, useMemo, useState } from 'react';
import { HelpCircle, Send, AlertTriangle, Inbox, Loader2 } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import type { TicketPriority, TicketStatus } from '../../types/admin';
import { toPersianDigits } from '../../utils/formatters';
import { useSupportOps } from '../../hooks/useSupportOps';

const CANNED_RESPONSES = [
  'سلام و احترام، درخواست شما دریافت شد و در حال بررسی توسط تیم پشتیبانی است.',
  'درود، برای بررسی دقیق‌تر لطفاً جزئیات بیشتری از مشکل و زمان رخداد ارسال فرمایید.',
  'سلام، نتیجه بررسی انجام شد. در صورت باقی‌ماندن مشکل، همین تیکت را دوباره پاسخ دهید.',
  'درخواست شما به واحد فنی ارجاع شد و نتیجه از طریق همین تیکت اطلاع‌رسانی می‌شود.',
];

export const SupportView: React.FC = () => {
  const {
    tickets: demoTickets,
    replyToTicket: replyToDemoTicket,
    resolveTicket: resolveDemoTicket,
    closeTicket: closeDemoTicket,
    addToast,
    isDemoMode,
    serverAuth,
  } = useAdmin();

  const liveEnabled = serverAuth.authenticated && !isDemoMode;
  const [selectedTicketId, setSelectedTicketId] = useState('');
  const [replyText, setReplyText] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const filters = useMemo(() => ({ priority: priorityFilter, status: statusFilter }), [priorityFilter, statusFilter]);
  const support = useSupportOps(liveEnabled);

  useEffect(() => {
    if (liveEnabled) void support.loadTickets(filters);
  }, [liveEnabled, filters, support.loadTickets]);

  const localFiltered = useMemo(() => demoTickets.filter((ticket) =>
    (priorityFilter === 'all' || ticket.priority === priorityFilter) &&
    (statusFilter === 'all' || ticket.status === statusFilter)
  ), [demoTickets, priorityFilter, statusFilter]);

  const visibleTickets = liveEnabled ? support.tickets : isDemoMode ? localFiltered : [];
  const selectedTicket = visibleTickets.find((ticket) => ticket.id === selectedTicketId) || visibleTickets[0] || null;

  useEffect(() => {
    if (selectedTicket && selectedTicket.id !== selectedTicketId) setSelectedTicketId(selectedTicket.id);
    if (!selectedTicket) setSelectedTicketId('');
  }, [selectedTicket, selectedTicketId]);

  const canOperate = liveEnabled || isDemoMode;
  const getPriorityBadge = (priority: TicketPriority) => {
    switch (priority) {
      case 'critical': return { label: 'بحرانی', color: 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border-rose-500/20' };
      case 'high': return { label: 'بالا', color: 'text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-500/20' };
      case 'medium': return { label: 'معمولی', color: 'text-sky-600 bg-sky-50 dark:bg-sky-950/40 border-sky-500/20' };
      case 'low': return { label: 'کم', color: 'text-text-muted bg-stone-100 dark:bg-zinc-800 border-stone-200' };
    }
  };

  const handleReply = async (event: React.FormEvent) => {
    event.preventDefault();
    const content = replyText.trim();
    if (!content || !selectedTicket || !canOperate) return;
    const success = liveEnabled
      ? await support.replyToTicket(selectedTicket.id, content, filters)
      : (replyToDemoTicket(selectedTicket.id, content), true);
    if (success) {
      setReplyText('');
      addToast({ type: 'success', title: 'پاسخ ثبت شد' });
    }
  };

  const handleStatus = async (status: TicketStatus) => {
    if (!selectedTicket || !canOperate) return;
    let success = false;
    if (liveEnabled) {
      success = await support.changeTicketStatus(selectedTicket.id, status, filters);
    } else {
      if (status === 'resolved') resolveDemoTicket(selectedTicket.id);
      else if (status === 'closed') closeDemoTicket(selectedTicket.id);
      success = status === 'resolved' || status === 'closed';
    }
    if (success) addToast({ type: 'success', title: 'وضعیت تیکت به‌روزرسانی شد' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-text-main flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            مرکز پشتیبانی و تیکت‌های سالن‌ها
          </h2>
          <p className="text-xs text-text-muted dark:text-text-muted mt-0.5">
            رسیدگی به درخواست‌های فنی، مالی و راهنمایی مدیران سالن‌ها
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as TicketStatus | 'all')}
            className="px-3 py-1.5 bg-white dark:bg-elevated border border-stone-200 dark:border-border-default rounded-xl text-zinc-800 dark:text-zinc-200 focus:outline-none cursor-pointer">
            <option value="all">تمام وضعیت‌ها</option>
            <option value="open">تیکت‌های باز</option>
            <option value="in_progress">در حال بررسی</option>
            <option value="resolved">حل شده</option>
            <option value="closed">بسته شده</option>
          </select>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as TicketPriority | 'all')}
            className="px-3 py-1.5 bg-white dark:bg-elevated border border-stone-200 dark:border-border-default rounded-xl text-zinc-800 dark:text-zinc-200 focus:outline-none cursor-pointer">
            <option value="all">تمام اولویت‌ها</option>
            <option value="critical">بحرانی</option>
            <option value="high">بالا</option>
            <option value="medium">معمولی</option>
            <option value="low">کم</option>
          </select>
        </div>
      </div>

      {isDemoMode ? (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-[11px] text-[var(--text-secondary)]">
          حالت نمایشی فعال است؛ پاسخ‌ها و تغییر وضعیت‌ها فقط در داده‌های آزمایشی همین اجرا اعمال می‌شوند.
        </div>
      ) : liveEnabled ? (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-[11px] text-[var(--text-secondary)]">
          تیکت‌ها از پایگاه داده دریافت می‌شوند و پاسخ‌ها همراه با گزارش ممیزی ذخیره خواهند شد.
        </div>
      ) : (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-[11px] text-[var(--text-secondary)]">
          برای مشاهده و مدیریت تیکت‌های واقعی، ابتدا با حساب مدیر ارشد وارد شوید.
        </div>
      )}

      {support.error && liveEnabled && (
        <div className="rounded-xl border border-rose-500/25 bg-rose-500/5 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
          {support.error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="p-4 rounded-2xl bg-white dark:bg-elevated border border-stone-200/90 dark:border-border-default space-y-3">
          <h3 className="font-bold text-xs text-zinc-700 dark:text-text-muted px-1">
            لیست تیکت‌ها ({toPersianDigits(liveEnabled ? support.total : visibleTickets.length)})
          </h3>
          {support.loading && liveEnabled ? (
            <div className="py-8 flex justify-center text-text-muted"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {visibleTickets.map((ticket) => {
                const badge = getPriorityBadge(ticket.priority);
                const isSelected = selectedTicket?.id === ticket.id;
                const ticketClass = 'w-full text-right p-3.5 rounded-xl border transition-colors text-xs ' +
                  (isSelected ? 'border-rose-500 bg-rose-50/40 dark:bg-rose-950/20' : 'border-stone-100 dark:border-border-default hover:border-stone-200 dark:hover:border-zinc-700');
                return (
                  <button key={ticket.id} type="button" onClick={() => setSelectedTicketId(ticket.id)}
                    className={ticketClass}>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="font-bold text-zinc-900 dark:text-text-main truncate">{ticket.subject}</span>
                      <span className={'px-1.5 py-0.5 text-[11px] rounded-md font-semibold border shrink-0 ' + badge.color}>{badge.label}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-text-muted">
                      <span>{ticket.salonName}</span><span>{new Date(ticket.updatedAt).toLocaleDateString('fa-IR')}</span>
                    </div>
                    <div className="text-[10px] text-text-subtle mt-1">{ticket.ticketNumber}</div>
                  </button>
                );
              })}
              {!visibleTickets.length && (
                <div className="py-8 text-center text-text-subtle flex flex-col items-center gap-2">
                  <Inbox className="w-6 h-6 opacity-60" />
                  هیچ تیکتی با این فیلتر پیدا نشد.
                </div>
              )}
            </div>
          )}
        </div>

        {selectedTicket ? (
          <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-elevated border border-stone-200/90 dark:border-border-default flex flex-col justify-between min-h-[420px]">
            <div>
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-stone-100 dark:border-border-default">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-text-main">{selectedTicket.subject}</h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    سالن: {selectedTicket.salonName} · ثبت توسط: {selectedTicket.creatorName} · شماره: {selectedTicket.ticketNumber}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {selectedTicket.status !== 'resolved' && (
                    <button onClick={() => void handleStatus('resolved')} disabled={!canOperate || support.mutating}
                      className="px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg disabled:opacity-50">
                      حل تیکت
                    </button>
                  )}
                  {selectedTicket.status !== 'closed' && (
                    <button onClick={() => void handleStatus('closed')} disabled={!canOperate || support.mutating}
                      className="px-3 py-1 text-xs text-text-muted hover:text-zinc-800 rounded-lg disabled:opacity-50">
                      بستن
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-3 py-4 max-h-[380px] overflow-y-auto">
                {selectedTicket.messages.map((message) => (
                  <div key={message.id} className={'p-3.5 rounded-2xl text-xs max-w-[85%] leading-relaxed ' +
                    (message.senderRole === 'admin'
                      ? 'bg-rose-50 dark:bg-rose-950/30 border border-rose-500/20 text-zinc-800 dark:text-zinc-200 mr-auto'
                      : 'bg-stone-50 dark:bg-surface border border-stone-200/80 dark:border-border-default text-zinc-800 dark:text-zinc-200 ml-auto')}>
                    <div className="flex items-center justify-between text-[11px] text-text-subtle mb-1 gap-3">
                      <span className="font-bold">{message.senderName} ({message.senderRole === 'admin' ? 'پشتیبان نوبت‌آرا' : 'سالن'})</span>
                      <span>{new Date(message.timestamp).toLocaleString('fa-IR')}</span>
                    </div>
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-stone-100 dark:border-border-default space-y-2.5">
              <div className="flex flex-wrap gap-1.5">
                {CANNED_RESPONSES.map((response, index) => (
                  <button key={index} type="button" onClick={() => setReplyText(response)} disabled={!canOperate}
                    className="px-2 py-0.5 text-[11px] bg-stone-100 dark:bg-zinc-800 text-zinc-600 dark:text-text-muted rounded-lg hover:bg-stone-200 disabled:opacity-50">
                    {response.slice(0, 34)}...
                  </button>
                ))}
              </div>
              <form onSubmit={handleReply} className="flex gap-2">
                <input type="text" value={replyText} onChange={(e) => setReplyText(e.target.value)}
                  placeholder="پاسخ به تیکت سالن..." maxLength={5000} disabled={!canOperate || support.mutating}
                  className="flex-1 px-3 py-2 bg-stone-50 dark:bg-surface border border-stone-200 dark:border-border-default rounded-xl text-xs text-zinc-900 dark:text-text-main focus:outline-none focus:border-rose-500 disabled:opacity-60" />
                <button type="submit" disabled={!canOperate || support.mutating || !replyText.trim()}
                  className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl disabled:opacity-50 flex items-center gap-1.5">
                  {support.mutating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>ارسال</span>
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 p-12 text-center text-text-subtle bg-white dark:bg-elevated rounded-2xl border border-stone-200 dark:border-border-default flex flex-col items-center gap-2">
            <AlertTriangle className="w-6 h-6 opacity-60" />
            {liveEnabled && support.loading ? 'در حال دریافت تیکت‌ها...' : 'لطفاً یک تیکت را از لیست انتخاب کنید.'}
          </div>
        )}
      </div>
    </div>
  );
};
