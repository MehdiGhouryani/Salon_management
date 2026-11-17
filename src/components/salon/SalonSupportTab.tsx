import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2, MessageSquare, Plus, RefreshCw, Send } from 'lucide-react';
import { api, ApiError } from '../../api/client';
import type { SupportTicket, TicketPriority, TicketStatus } from '../../types/admin';

type TicketCategory = SupportTicket['category'];
const CATEGORIES: Record<TicketCategory, string> = {
  technical: 'مشکل فنی',
  financial: 'مالی و پرداخت',
  sms: 'پیامک و اطلاع‌رسانی',
  account: 'حساب کاربری',
};
const STATUSES: Record<TicketStatus, string> = {
  open: 'باز',
  in_progress: 'در حال بررسی',
  resolved: 'حل‌شده',
  closed: 'بسته‌شده',
};
const PRIORITIES: Record<TicketPriority, string> = {
  low: 'کم',
  medium: 'معمولی',
  high: 'زیاد',
  critical: 'بحرانی',
};
const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'زمان نامشخص' :
    date.toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' });
};
const messageFor = (error: unknown) => error instanceof ApiError
  ? error.message
  : 'ارتباط با سرویس پشتیبانی برقرار نشد. دوباره تلاش کنید.';

export const SalonSupportTab: React.FC<{ salonId: string }> = ({ salonId }) => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [firstMessage, setFirstMessage] = useState('');
  const [category, setCategory] = useState<TicketCategory>('technical');
  const [priority, setPriority] = useState<Exclude<TicketPriority, 'critical'>>('medium');
  const [reply, setReply] = useState('');
  const basePath = '/api/salon/' + encodeURIComponent(salonId) + '/support/tickets';

  const loadTickets = useCallback(async () => {
    if (!salonId) {
      setTickets([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await api.get<{ tickets: SupportTicket[]; total: number }>(basePath);
      const list = data.tickets || [];
      setTickets(list);
      setSelectedId((current) => current && list.some((ticket) => ticket.id === current)
        ? current
        : list[0]?.id || '');
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setLoading(false);
    }
  }, [basePath, salonId]);

  useEffect(() => { void loadTickets(); }, [loadTickets]);

  const selected = useMemo(
    () => tickets.find((ticket) => ticket.id === selectedId) || null,
    [tickets, selectedId]
  );

  const createTicket = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanSubject = subject.trim();
    const cleanMessage = firstMessage.trim();
    if (cleanSubject.length < 5 || cleanMessage.length < 3 || saving) return;
    setSaving(true);
    setError('');
    try {
      const result = await api.post<{ ticket: SupportTicket }>(basePath, {
        subject: cleanSubject,
        message: cleanMessage,
        category,
        priority,
      });
      setSubject('');
      setFirstMessage('');
      setShowForm(false);
      await loadTickets();
      if (result.ticket?.id) setSelectedId(result.ticket.id);
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setSaving(false);
    }
  };

  const sendReply = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = reply.trim();
    if (!text || !selected || saving) return;
    setSaving(true);
    setError('');
    try {
      await api.post(basePath + '/' + encodeURIComponent(selected.id) + '/messages', { content: text });
      setReply('');
      await loadTickets();
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-5" aria-labelledby="salon-support-heading">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 id="salon-support-heading" className="flex items-center gap-2 text-base font-bold">
            <MessageSquare className="h-5 w-5 text-[var(--text-secondary)]" />
            پشتیبانی و درخواست‌ها
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            درخواست خود را ثبت کنید و پاسخ تیم پشتیبانی را همین‌جا دنبال کنید.
          </p>
        </div>
        <button type="button" onClick={() => setShowForm((open) => !open)}
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-3 text-xs font-semibold text-white hover:opacity-90">
          <Plus className="h-4 w-4" /> درخواست جدید
        </button>
      </header>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-500/25 bg-rose-500/5 p-3 text-xs text-rose-700 dark:text-rose-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span>
        </div>
      )}

      {showForm && (
        <form onSubmit={createTicket} className="space-y-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
          <h3 className="text-sm font-bold">ثبت درخواست پشتیبانی</h3>
          <label className="block space-y-1.5 text-xs">
            <span>موضوع درخواست</span>
            <input required minLength={5} maxLength={160} value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="مثلاً مشکل در ارسال پیامک"
              className="h-11 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-canvas)] px-3 text-sm outline-none focus:border-[var(--brand-primary)]" />
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5 text-xs">
              <span>دسته‌بندی</span>
              <select value={category} onChange={(event) => setCategory(event.target.value as TicketCategory)}
                className="h-11 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-canvas)] px-3 text-sm">
                {Object.entries(CATEGORIES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="block space-y-1.5 text-xs">
              <span>اولویت</span>
              <select value={priority} onChange={(event) => setPriority(event.target.value as typeof priority)}
                className="h-11 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-canvas)] px-3 text-sm">
                <option value="low">کم</option><option value="medium">معمولی</option><option value="high">زیاد</option>
              </select>
            </label>
          </div>
          <label className="block space-y-1.5 text-xs">
            <span>توضیحات</span>
            <textarea required minLength={3} maxLength={5000} rows={4} value={firstMessage}
              onChange={(event) => setFirstMessage(event.target.value)}
              placeholder="مشکل یا درخواست خود را با جزئیات توضیح دهید..."
              className="w-full resize-y rounded-xl border border-[var(--border-default)] bg-[var(--bg-canvas)] p-3 text-sm outline-none focus:border-[var(--brand-primary)]" />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} disabled={saving}
              className="h-10 rounded-xl px-4 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]">انصراف</button>
            <button type="submit" disabled={saving || subject.trim().length < 5 || firstMessage.trim().length < 3}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 text-xs font-semibold text-white disabled:opacity-50">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} ثبت درخواست
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <aside className="space-y-2 lg:col-span-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold">درخواست‌های من</h3>
            <button type="button" onClick={() => void loadTickets()} disabled={loading}
              aria-label="به‌روزرسانی درخواست‌ها"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] disabled:opacity-50">
              <RefreshCw className={'h-4 w-4 ' + (loading ? 'animate-spin' : '')} />
            </button>
          </div>
          <div className="max-h-[560px] space-y-2 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center rounded-xl border border-[var(--border-default)] p-8 text-[var(--text-muted)]"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : tickets.length ? tickets.map((ticket) => (
              <button key={ticket.id} type="button" onClick={() => setSelectedId(ticket.id)}
                aria-pressed={selected?.id === ticket.id}
                className={'w-full rounded-xl border p-3 text-right transition-colors ' +
                  (selected?.id === ticket.id
                    ? 'border-[var(--brand-primary)] bg-[var(--bg-elevated)]'
                    : 'border-[var(--border-default)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)]')}>
                <div className="flex items-start justify-between gap-2">
                  <span className="line-clamp-2 text-xs font-semibold">{ticket.subject}</span>
                  <span className="shrink-0 rounded-lg bg-[var(--bg-elevated)] px-2 py-1 text-[10px] text-[var(--text-secondary)]">{STATUSES[ticket.status]}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-[var(--text-muted)]">
                  <span>{ticket.ticketNumber}</span><span>{formatDate(ticket.updatedAt)}</span>
                </div>
              </button>
            )) : (
              <div className="rounded-xl border border-dashed border-[var(--border-default)] p-6 text-center text-xs text-[var(--text-muted)]">
                هنوز درخواستی ثبت نکرده‌اید.
              </div>
            )}
          </div>
        </aside>

        <div className="min-h-[360px] rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] lg:col-span-3">
          {selected ? (
            <div className="flex h-full min-h-[360px] flex-col">
              <header className="flex items-start justify-between gap-3 border-b border-[var(--border-default)] p-4">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold">{selected.subject}</h3>
                  <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                    {selected.ticketNumber} · {CATEGORIES[selected.category]} · اولویت {PRIORITIES[selected.priority]}
                  </p>
                </div>
                <span className="shrink-0 rounded-lg bg-[var(--bg-elevated)] px-2.5 py-1 text-[11px]">{STATUSES[selected.status]}</span>
              </header>
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {selected.messages.map((message) => (
                  <div key={message.id}
                    className={'max-w-[88%] rounded-2xl p-3 text-xs leading-6 ' +
                      (message.senderRole === 'salon'
                        ? 'ms-auto bg-[var(--bg-elevated)]'
                        : 'me-auto border border-[var(--border-default)] bg-[var(--bg-canvas)]')}>
                    <div className="mb-1 flex items-center justify-between gap-3 text-[10px] text-[var(--text-muted)]">
                      <span className="font-semibold">{message.senderRole === 'admin' ? 'پشتیبانی نوبت‌آرا' : message.senderName}</span>
                      <time dateTime={message.timestamp}>{formatDate(message.timestamp)}</time>
                    </div>
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  </div>
                ))}
              </div>
              <form onSubmit={sendReply} className="flex gap-2 border-t border-[var(--border-default)] p-3">
                <input value={reply} onChange={(event) => setReply(event.target.value)} maxLength={5000}
                  placeholder="پیام خود را بنویسید..." aria-label="پیام جدید"
                  className="h-11 min-w-0 flex-1 rounded-xl border border-[var(--border-default)] bg-[var(--bg-canvas)] px-3 text-xs outline-none focus:border-[var(--brand-primary)]" />
                <button type="submit" disabled={saving || !reply.trim()} aria-label="ارسال پیام"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-primary)] text-white disabled:opacity-50">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </form>
            </div>
          ) : (
            <div className="flex min-h-[360px] flex-col items-center justify-center gap-2 p-6 text-center text-xs text-[var(--text-muted)]">
              <MessageSquare className="h-7 w-7 opacity-50" />
              {loading ? 'در حال دریافت درخواست‌ها...' : 'برای مشاهده گفت‌وگو، یک درخواست را انتخاب کنید.'}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
