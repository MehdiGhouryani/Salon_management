import React, { useState } from 'react';
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

  const filteredMessages = messages.filter((m) => {
    const matchStatus = filterStatus === 'all' || m.status === filterStatus;
    const matchSearch =
      m.recipientPhone.includes(search) ||
      m.salonName.toLowerCase().includes(search.toLowerCase()) ||
      m.text.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            مرکز پیامک و دیسپچ نوبت‌ها
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            پایش لحظه‌ای پیامک‌های نوبت‌دهی، الگوهای خدماتی و رفع خطای ارسال
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsBroadcastModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-[#181B24] border border-stone-200 dark:border-zinc-800 rounded-xl transition-colors cursor-pointer shadow-xs"
          >
            <Send className="w-3.5 h-3.5" />
            <span>پیامک همگانی</span>
          </button>

          {failedCount > 0 && (
            <button
              onClick={retryAllFailedMessages}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>تلاش مجدد ناموفق‌ها ({toPersianDigits(failedCount)})</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#181B24] border border-stone-200/90 dark:border-zinc-800 shadow-xs">
          <span className="text-zinc-500 block mb-1">پیامک‌های تحویل‌شده</span>
          <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {toPersianDigits(deliveredCount)} عدد
          </span>
          <p className="text-[11px] text-zinc-400 mt-1">نرخ تحویل ۹۸.۷٪ در شبکه مخابرات</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#181B24] border border-stone-200/90 dark:border-zinc-800 shadow-xs">
          <span className="text-zinc-500 block mb-1">ناموفق / بلک‌لیست</span>
          <span className={`text-xl font-bold tabular-nums ${failedCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-400'}`}>
            {toPersianDigits(failedCount)} عدد
          </span>
          <p className="text-[11px] text-zinc-400 mt-1">آماده ارسال مجدد با خط اشتراکی</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#181B24] border border-stone-200/90 dark:border-zinc-800 shadow-xs">
          <span className="text-zinc-500 block mb-1">در صف دیسپچ</span>
          <span className="text-xl font-bold text-sky-600 dark:text-sky-400 tabular-nums">
            {toPersianDigits(queuedCount)} عدد
          </span>
          <p className="text-[11px] text-zinc-400 mt-1">سرعت: ۵۰ پیام در ثانیه</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#181B24] border border-stone-200/90 dark:border-zinc-800 shadow-xs">
          <span className="text-zinc-500 block mb-1">درگاه اصلی</span>
          <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            کاوه‌نگار خدماتی
          </span>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">سرویس فعال و پایدار</p>
        </div>
      </div>

      {/* Subtab Toggle (Queue vs Templates) */}
      <div className="flex items-center gap-2 border-b border-stone-200 dark:border-zinc-800 pb-2 text-xs">
        <button
          onClick={() => setActiveSubTab('queue')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
            activeSubTab === 'queue'
              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-500/20'
              : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>صف ارسال پیامک ({toPersianDigits(messages.length)})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('templates')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
            activeSubTab === 'templates'
              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-500/20'
              : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>الگوهای خودکار پیامک ({toPersianDigits(templates.length)})</span>
        </button>
      </div>

      {activeSubTab === 'queue' ? (
        <div className="space-y-4">
          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-white dark:bg-[#181B24] border border-stone-200 dark:border-zinc-800 rounded-2xl shadow-xs text-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-zinc-400 absolute right-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="جستجوی شماره، متن یا سالن..."
                className="w-full pl-3 pr-9 py-1.5 bg-stone-50 dark:bg-[#12141C] border border-stone-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {['all', 'delivered', 'failed', 'queued'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-3 py-1 rounded-lg transition-colors cursor-pointer text-xs ${
                    filterStatus === st
                      ? 'bg-rose-600 text-white font-bold'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  {st === 'all' ? 'همه' : st === 'delivered' ? 'تحویل شده' : st === 'failed' ? 'ناموفق' : 'در صف'}
                </button>
              ))}
            </div>
          </div>

          {/* Messages List / Table */}
          <div className="rounded-2xl bg-white dark:bg-[#181B24] border border-stone-200 dark:border-zinc-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-stone-50 dark:bg-[#12141C] border-b border-stone-200 dark:border-zinc-800 text-zinc-500 font-semibold">
                  <tr>
                    <th className="py-3 px-4">گیرنده و سالن</th>
                    <th className="py-3 px-4">متن پیامک</th>
                    <th className="py-3 px-4">وضعیت</th>
                    <th className="py-3 px-4">زمان ثبت</th>
                    <th className="py-3 px-4 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300">
                  {filteredMessages.map((msg) => {
                    const badge = getStatusBadge(msg.status);
                    return (
                      <tr key={msg.id} className="hover:bg-stone-50/60 dark:hover:bg-zinc-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-mono block font-semibold text-zinc-900 dark:text-zinc-100" dir="ltr">
                            {maskPhone(msg.recipientPhone)}
                          </span>
                          <span className="text-[11px] text-zinc-500 block">{msg.salonName}</span>
                        </td>
                        <td className="py-3 px-4 max-w-md">
                          <p className="leading-relaxed text-zinc-700 dark:text-zinc-300 line-clamp-2">{msg.text}</p>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-0.5 text-[10px] rounded-md font-medium border ${badge.bg} ${badge.text} ${badge.border}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-zinc-500 text-[11px]">{msg.sentAt}</td>
                        <td className="py-3 px-4 text-center">
                          {msg.status === 'failed' && (
                            <button
                              onClick={() => retryFailedMessage(msg.id)}
                              className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                            >
                              ارسال مجدد
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Templates Sub-tab */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              className="p-5 rounded-2xl bg-white dark:bg-[#181B24] border border-stone-200/90 dark:border-zinc-800 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">{tpl.title}</h4>
                  <span className={`px-2 py-0.5 text-[10px] rounded-full font-medium ${tpl.enabled ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600' : 'bg-stone-100 text-zinc-500'}`}>
                    {tpl.enabled ? 'فعال' : 'غیرفعال'}
                  </span>
                </div>

                <div className="p-3 bg-stone-50 dark:bg-[#12141C] rounded-xl border border-stone-100 dark:border-zinc-800/80 my-3 text-xs font-mono text-zinc-700 dark:text-zinc-300 leading-relaxed" dir="rtl">
                  {tpl.pattern}
                </div>
              </div>

              <div className="pt-3 border-t border-stone-100 dark:border-zinc-800 flex justify-end">
                <button
                  onClick={() => openTemplateEdit(tpl)}
                  className="px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 bg-stone-100 dark:bg-zinc-800 rounded-xl cursor-pointer"
                >
                  ویرایش الگو
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Broadcast Modal */}
      {isBroadcastModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="fixed inset-0" onClick={() => setIsBroadcastModalOpen(false)}></div>

          <div className="relative w-full max-w-md bg-white dark:bg-[#181B24] border border-stone-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-5 z-10 text-right space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">ارسال پیامک همگانی</h3>
              <button onClick={() => setIsBroadcastModalOpen(false)} className="p-1 text-zinc-400 hover:text-zinc-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendBroadcast} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 mb-1">فرستنده</label>
                <input
                  type="text"
                  value={broadcastSalonName}
                  onChange={(e) => setBroadcastSalonName(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-[#12141C] border border-stone-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 mb-1">متن پیامک</label>
                <textarea
                  required
                  rows={4}
                  value={broadcastText}
                  onChange={(e) => setBroadcastText(e.target.value)}
                  placeholder="متن اطلاع‌رسانی به سالن‌ها و مشتریان..."
                  className="w-full p-3 bg-stone-50 dark:bg-[#12141C] border border-stone-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsBroadcastModalOpen(false)}
                  className="px-4 py-2 text-zinc-600 dark:text-zinc-400 bg-stone-100 dark:bg-zinc-800 rounded-xl"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-xs"
                >
                  ارسال به همه
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Template Modal */}
      {editingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="fixed inset-0" onClick={() => setEditingTemplate(null)}></div>

          <div className="relative w-full max-w-md bg-white dark:bg-[#181B24] border border-stone-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-5 z-10 text-right space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">ویرایش الگوی پیامک</h3>
              <button onClick={() => setEditingTemplate(null)} className="p-1 text-zinc-400 hover:text-zinc-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 mb-1">متن الگو و متغیرها</label>
                <textarea
                  rows={4}
                  value={templatePattern}
                  onChange={(e) => setTemplatePattern(e.target.value)}
                  className="w-full p-3 bg-stone-50 dark:bg-[#12141C] border border-stone-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 font-mono"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="tpl-enable"
                  checked={templateEnabled}
                  onChange={(e) => setTemplateEnabled(e.target.checked)}
                  className="rounded text-rose-600"
                />
                <label htmlFor="tpl-enable" className="text-zinc-700 dark:text-zinc-300 cursor-pointer">
                  فعال بودن ارسال خودکار این الگو
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200 dark:border-zinc-800">
              <button
                onClick={() => setEditingTemplate(null)}
                className="px-4 py-2 text-zinc-600 dark:text-zinc-400 bg-stone-100 dark:bg-zinc-800 rounded-xl"
              >
                انصراف
              </button>
              <button
                onClick={handleSaveTemplate}
                className="px-5 py-2 font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl"
              >
                ذخیره الگو
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
