import React, { useState } from 'react';
import {
  HelpCircle,
  MessageSquare,
  Send,
  CheckCircle2,
  Clock,
  AlertTriangle,
  User,
  Store,
  ChevronRight,
  Sparkles,
  Inbox,
  Check,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { SupportTicket, TicketPriority, TicketStatus } from '../../types/admin';
import { toPersianDigits, getStatusBadge } from '../../utils/formatters';

const CANNED_RESPONSES = [
  'سلام و احترام، مدارک پروانه کسب و اطلاعات حساب سالن شما بررسی و نشان تایید رسمی برای شما فعال گردید.',
  'درود، خط خدماتی اختصاصی برای سالن شما متصل شد و اکنون به تمام شماره‌ها (حتی مسدود تبلیغاتی) پیامک ارسال می‌شود.',
  'سلام همکار گرامی، دسترسی به وب‌هوک‌های مالی و مستندات اتصال حسابداری فعال شد.',
  'درخواست شما جهت بررسی به تیم فنی ارجاع داده شد و نتیجه ظرف ۲ ساعت آینده اعلام خواهد شد.',
];

export const SupportView: React.FC = () => {
  const { tickets, replyToTicket, resolveTicket, closeTicket, addToast } = useAdmin();

  const [selectedTicketId, setSelectedTicketId] = useState<string>(tickets[0]?.id || '');
  const [replyText, setReplyText] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId) || tickets[0];

  const filteredTickets = tickets.filter((t) => {
    const matchPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchPriority && matchStatus;
  });

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket) return;
    replyToTicket(selectedTicket.id, replyText);
    setReplyText('');
  };

  const getPriorityBadge = (p: TicketPriority) => {
    switch (p) {
      case 'critical':
        return { label: 'بحرانی', color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-500/20' };
      case 'high':
        return { label: 'بالا', color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-500/20' };
      case 'medium':
        return { label: 'معمولی', color: 'text-sky-600 bg-sky-50 dark:bg-sky-950/40 border-sky-500/20' };
      case 'low':
        return { label: 'کم', color: 'text-zinc-500 bg-stone-100 dark:bg-zinc-800 border-stone-200' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            مرکز پشتیبانی و تیکت‌های سالن‌ها
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            رسیدگی به درخواست‌های فنی، مالی و راهنمایی مدیران سالن‌ها
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-white dark:bg-[#181B24] border border-stone-200 dark:border-zinc-800 rounded-xl text-zinc-800 dark:text-zinc-200 focus:outline-none cursor-pointer"
          >
            <option value="all">تمام وضعیت‌ها</option>
            <option value="open">تیکت‌های باز</option>
            <option value="in_progress">در حال بررسی</option>
            <option value="resolved">حل شده</option>
            <option value="closed">بسته شده</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-1.5 bg-white dark:bg-[#181B24] border border-stone-200 dark:border-zinc-800 rounded-xl text-zinc-800 dark:text-zinc-200 focus:outline-none cursor-pointer"
          >
            <option value="all">تمام اولویت‌ها</option>
            <option value="critical">بحرانی</option>
            <option value="high">بالا</option>
            <option value="medium">معمولی</option>
          </select>
        </div>
      </div>

      {/* Main Split: Ticket List & Conversation View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ticket List */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#181B24] border border-stone-200/90 dark:border-zinc-800 shadow-xs space-y-3">
          <h3 className="font-bold text-xs text-zinc-700 dark:text-zinc-300 px-1">
            لیست تیکت‌ها ({toPersianDigits(filteredTickets.length)})
          </h3>

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredTickets.map((t) => {
              const prio = getPriorityBadge(t.priority);
              const isSelected = selectedTicket?.id === t.id;

              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTicketId(t.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer text-xs ${
                    isSelected
                      ? 'border-rose-500 bg-rose-50/40 dark:bg-rose-950/20 shadow-xs'
                      : 'border-stone-100 dark:border-zinc-800 hover:border-stone-200 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h4 className="font-bold text-zinc-900 dark:text-zinc-100 truncate">{t.subject}</h4>
                    <span className={`px-1.5 py-0.2 text-[10px] rounded-md font-semibold border shrink-0 ${prio.color}`}>
                      {prio.label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-zinc-500">
                    <span>{t.salonName}</span>
                    <span>{t.updatedAt}</span>
                  </div>
                </div>
              );
            })}

            {filteredTickets.length === 0 && (
              <div className="py-8 text-center text-zinc-400">
                تیکتی یافت نشد.
              </div>
            )}
          </div>
        </div>

        {/* Selected Ticket Conversation */}
        {selectedTicket ? (
          <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-[#181B24] border border-stone-200/90 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
            <div>
              {/* Ticket Header */}
              <div className="flex items-start justify-between pb-3 border-b border-stone-100 dark:border-zinc-800">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{selectedTicket.subject}</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    سالن: {selectedTicket.salonName} · ثبت توسط: {selectedTicket.creatorName}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {selectedTicket.status !== 'resolved' && (
                    <button
                      onClick={() => resolveTicket(selectedTicket.id)}
                      className="px-3 py-1 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-colors cursor-pointer"
                    >
                      حل تیکت
                    </button>
                  )}
                  {selectedTicket.status !== 'closed' && (
                    <button
                      onClick={() => closeTicket(selectedTicket.id)}
                      className="px-3 py-1 text-xs text-zinc-500 hover:text-zinc-800 rounded-lg cursor-pointer"
                    >
                      بستن
                    </button>
                  )}
                </div>
              </div>

              {/* Messages Thread */}
              <div className="space-y-3 py-4 max-h-[380px] overflow-y-auto">
                {selectedTicket.messages.map((m) => (
                  <div
                    key={m.id}
                    className={`p-3.5 rounded-2xl text-xs max-w-[85%] leading-relaxed ${
                      m.senderRole === 'admin'
                        ? 'bg-rose-50 dark:bg-rose-950/30 border border-rose-500/20 text-zinc-800 dark:text-zinc-200 mr-auto'
                        : 'bg-stone-50 dark:bg-[#12141C] border border-stone-200/80 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 ml-auto'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
                      <span className="font-bold">{m.senderName} ({m.senderRole === 'admin' ? 'پشتیبان نوبت‌آرا' : 'سالن'})</span>
                      <span>{m.timestamp}</span>
                    </div>
                    <p>{m.content}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Canned Responses & Reply Form */}
            <div className="pt-3 border-t border-stone-100 dark:border-zinc-800 space-y-2.5">
              <div className="flex flex-wrap gap-1.5">
                {CANNED_RESPONSES.map((res, idx) => (
                  <button
                    key={idx}
                    onClick={() => setReplyText(res)}
                    className="px-2 py-0.5 text-[10px] bg-stone-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-lg hover:bg-stone-200 cursor-pointer"
                  >
                    {res.slice(0, 30)}...
                  </button>
                ))}
              </div>

              <form onSubmit={handleSendReply} className="flex gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="پاسخ به تیکت سالن..."
                  className="flex-1 px-3 py-2 bg-stone-50 dark:bg-[#12141C] border border-stone-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-rose-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>ارسال</span>
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 p-12 text-center text-zinc-400 bg-white dark:bg-[#181B24] rounded-2xl border border-stone-200 dark:border-zinc-800">
            لطفاً یک تیکت را از لیست انتخاب کنید.
          </div>
        )}
      </div>
    </div>
  );
};
