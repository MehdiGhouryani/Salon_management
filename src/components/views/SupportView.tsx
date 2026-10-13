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
  'درود، خط خدماتی اختصاصی کاوه‌نگار برای سالن شما متصل شد و اکنون به تمام شماره‌ها (حتی مسدود تبلیغاتی) پیامک ارسال می‌شود.',
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
        return { label: 'بحرانی / فوری', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' };
      case 'high':
        return { label: 'اولویت بالا', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
      case 'medium':
        return { label: 'معمولی', color: 'text-sky-400 bg-sky-500/10 border-sky-500/30' };
      case 'low':
        return { label: 'کم‌اهمیت', color: 'text-slate-400 bg-slate-500/10 border-slate-500/30' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-sky-400" />
            مرکز پشتیبانی، تیکت‌ها و مکاتبات سالن‌داران
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            رسیدگی سریع به درخواست‌های فنی، مالی و احراز هویت سالن‌ها با پاسخ‌های آماده و تغییر وضعیت
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 focus:outline-none cursor-pointer"
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
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 focus:outline-none cursor-pointer"
          >
            <option value="all">تمام اولویت‌ها</option>
            <option value="critical">بحرانی</option>
            <option value="high">بالا</option>
            <option value="medium">معمولی</option>
          </select>
        </div>
      </div>

      {/* Split Inbox and Conversation View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[580px]">
        {/* Left Column (Inbox List, 5 Cols) */}
        <div className="lg:col-span-5 rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden flex flex-col">
          <div className="p-3.5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-200">صندوق تیکت‌ها ({toPersianDigits(filteredTickets.length)})</span>
            <span className="text-slate-400">مرتب‌سازی بر اساس تازه‌ترین</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/80">
            {filteredTickets.map((t) => {
              const isSelected = selectedTicket?.id === t.id;
              const pBadge = getPriorityBadge(t.priority);
              const sBadge = getStatusBadge(t.status);

              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTicketId(t.id)}
                  className={`p-3.5 text-right transition-colors cursor-pointer text-xs space-y-1.5 ${
                    isSelected ? 'bg-slate-800/80 border-r-4 border-rose-500' : 'hover:bg-slate-800/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-slate-400">{t.ticketNumber}</span>
                    <span className={`px-2 py-0.5 text-[10px] rounded border font-semibold ${pBadge.color}`}>
                      {pBadge.label}
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-100 line-clamp-1">{t.subject}</h4>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1 text-slate-300">
                      <Store className="w-3 h-3 text-rose-400" />
                      {t.salonName}
                    </span>
                    <span className={`px-1.5 py-0.2 text-[10px] rounded font-medium ${sBadge.text}`}>
                      {sBadge.label}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-1 pt-0.5">
                    {t.messages[t.messages.length - 1]?.content}
                  </p>
                </div>
              );
            })}

            {filteredTickets.length === 0 && (
              <div className="p-10 text-center text-slate-400 flex flex-col items-center gap-2">
                <Inbox className="w-8 h-8 text-slate-600" />
                <p className="text-xs">هیچ تیکتی در این بخش وجود ندارد.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (Conversation Thread & Composer, 7 Cols) */}
        {selectedTicket ? (
          <div className="lg:col-span-7 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between overflow-hidden">
            {/* Thread Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-start justify-between gap-3 text-xs">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-slate-400 text-[11px]">{selectedTicket.ticketNumber}</span>
                  <span className={`px-2 py-0.5 text-[10px] rounded border font-semibold ${getPriorityBadge(selectedTicket.priority).color}`}>
                    {getPriorityBadge(selectedTicket.priority).label}
                  </span>
                  <span className={`px-2 py-0.5 text-[10px] rounded border font-medium ${getStatusBadge(selectedTicket.status).bg} ${getStatusBadge(selectedTicket.status).text}`}>
                    {getStatusBadge(selectedTicket.status).label}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white mt-1">{selectedTicket.subject}</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  سالن: {selectedTicket.salonName} · ایجاد شده توسط: {selectedTicket.creatorName} ({selectedTicket.creatorRole})
                </p>
              </div>

              {/* Status Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {selectedTicket.status !== 'resolved' && (
                  <button
                    onClick={() => resolveTicket(selectedTicket.id)}
                    className="px-2.5 py-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>حل تیکت</span>
                  </button>
                )}

                {selectedTicket.status !== 'closed' && (
                  <button
                    onClick={() => closeTicket(selectedTicket.id)}
                    className="px-2.5 py-1 text-[11px] text-slate-400 hover:text-white bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  >
                    بستن تیکت
                  </button>
                )}
              </div>
            </div>

            {/* Conversation Messages */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4 text-xs">
              {selectedTicket.messages.map((msg) => {
                const isAdmin = msg.senderRole === 'admin';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isAdmin ? 'items-start' : 'items-end'}`}
                  >
                    <div className="flex items-center gap-2 mb-1 px-1 text-[11px] text-slate-400">
                      <span className="font-semibold text-slate-300">{msg.senderName}</span>
                      <span>·</span>
                      <span>{msg.timestamp}</span>
                    </div>

                    <div
                      className={`p-3.5 rounded-2xl max-w-[85%] leading-relaxed ${
                        isAdmin
                          ? 'bg-rose-500/15 border border-rose-500/30 text-rose-100 rounded-tr-none'
                          : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-none'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Canned Responses Suggestions */}
            <div className="p-3 bg-slate-950/40 border-t border-slate-800/80">
              <span className="text-[10px] text-slate-400 block mb-1.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-rose-400" />
                پاسخ‌های آماده و هوشمند (کلیک جهت درج در کادر):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {CANNED_RESPONSES.map((resp, i) => (
                  <button
                    key={i}
                    onClick={() => setReplyText(resp)}
                    className="px-2.5 py-1 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors truncate max-w-xs cursor-pointer border border-slate-700/60"
                  >
                    {resp}
                  </button>
                ))}
              </div>
            </div>

            {/* Reply Composer Form */}
            <form onSubmit={handleSendReply} className="p-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="پاسخ ادمین به تیکت را تایپ کنید..."
                className="flex-1 px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
              <button
                type="submit"
                disabled={!replyText.trim()}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>ارسال پاسخ</span>
              </button>
            </form>
          </div>
        ) : (
          <div className="lg:col-span-7 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-center p-12 text-slate-500 text-xs">
            لطفاً یک تیکت از ستون کناری انتخاب کنید.
          </div>
        )}
      </div>
    </div>
  );
};
