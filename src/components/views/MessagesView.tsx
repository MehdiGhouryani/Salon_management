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
  Radio,
  Search,
  Check,
  X,
  ExternalLink,
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
  const [broadcastSalonName, setBroadcastSalonName] = useState('سیستم مرکزی سالن‌دستیار');
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
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-sky-400" />
            مرکز پیامک، دیسپچ و صف مخابراتی
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            نظارت بر ارسال پیامک‌های نوبت، یادآوری، الگوهای خدماتی کاوه‌نگار، و رفع خطاهای بلک‌لیست
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsBroadcastModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>ارسال پیامک همگانی</span>
          </button>

          {failedCount > 0 && (
            <button
              onClick={retryAllFailedMessages}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-lg shadow-rose-600/25 transition-all cursor-pointer animate-pulse"
            >
              <RotateCcw className="w-4 h-4" />
              <span>تلاش مجدد پیام‌های ناموفق ({toPersianDigits(failedCount)})</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <span className="text-slate-400 block mb-1">پیامک‌های تحویل‌شده</span>
          <span className="text-xl font-bold text-emerald-400 tabular-nums">
            {toPersianDigits(deliveredCount)} عدد
          </span>
          <p className="text-[11px] text-slate-500 mt-1">نرخ تحویل ۹۸.۷٪ در شبکه مخابرات</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <span className="text-slate-400 block mb-1">پیام‌های ناموفق / بلک‌لیست</span>
          <span className={`text-xl font-bold tabular-nums ${failedCount > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
            {toPersianDigits(failedCount)} عدد
          </span>
          <p className="text-[11px] text-slate-500 mt-1">آماده ارسال از طریق خط خدماتی اشتراکی</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <span className="text-slate-400 block mb-1">پیام‌های در صف دیسپچ</span>
          <span className="text-xl font-bold text-sky-400 tabular-nums">
            {toPersianDigits(queuedCount)} عدد
          </span>
          <p className="text-[11px] text-slate-500 mt-1">نرخ پردازش: ۵۰ پیام در ثانیه</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <span className="text-slate-400 block mb-1">درگاه اصلی پیامک فعال</span>
          <span className="text-xl font-bold text-indigo-300">
            کاوه‌نگار (پایدار)
          </span>
          <p className="text-[11px] text-slate-500 mt-1">پشتیبان خودکار: ملی‌پیامک / فراز</p>
        </div>
      </div>

      {/* Subtab Toggle (Queue vs Templates) */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs">
        <button
          onClick={() => setActiveSubTab('queue')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
            activeSubTab === 'queue'
              ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>صف ارسال و تاریخچه دیسپچ ({toPersianDigits(messages.length)})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('templates')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
            activeSubTab === 'templates'
              ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>الگوها و متن‌های هوشمند پیامک ({toPersianDigits(templates.length)})</span>
        </button>
      </div>

      {/* SUBTAB 1: Queue & Messages */}
      {activeSubTab === 'queue' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="w-full sm:w-72 relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="جستجوی شماره، نام سالن یا متن..."
                className="w-full pl-3 pr-9 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="all">تمام وضعیت‌ها</option>
                <option value="delivered">تحویل شده</option>
                <option value="failed">ناموفق</option>
                <option value="queued">در صف ارسال</option>
                <option value="retrying">در حال تلاش مجدد</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold">
                  <tr>
                    <th className="py-3 px-4">گیرنده و سالن</th>
                    <th className="py-3 px-4">نوع الگو</th>
                    <th className="py-3 px-4">متن پیامک</th>
                    <th className="py-3 px-4">درگاه</th>
                    <th className="py-3 px-4">زمان ارسال</th>
                    <th className="py-3 px-4">وضعیت</th>
                    <th className="py-3 px-4 text-center">اقدام</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-300">
                  {filteredMessages.map((msg) => {
                    const badge = getStatusBadge(msg.status);
                    const isError = msg.status === 'failed' || msg.status === 'retrying';

                    return (
                      <tr key={msg.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-mono text-slate-200 block" dir="ltr">
                            {maskPhone(msg.recipientPhone)}
                          </span>
                          <span className="text-[11px] text-slate-400">{msg.salonName}</span>
                        </td>

                        <td className="py-3 px-4 text-slate-300">
                          {msg.templateType === 'appointment_reminder'
                            ? 'یادآوری نوبت'
                            : msg.templateType === 'booking_confirmed'
                            ? 'تایید رزرو'
                            : msg.templateType === 'invoice'
                            ? 'صورت‌حساب'
                            : msg.templateType === 'cancelled'
                            ? 'لغو نوبت'
                            : 'پیام عمومی'}
                        </td>

                        <td className="py-3 px-4 max-w-xs">
                          <p className="line-clamp-2 text-slate-200 text-[11px] leading-relaxed">{msg.text}</p>
                          {msg.errorMessage && (
                            <p className="text-[10px] text-rose-400 mt-1 font-medium">{msg.errorMessage}</p>
                          )}
                        </td>

                        <td className="py-3 px-4 text-slate-400 font-medium">
                          {msg.gateway}
                        </td>

                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          {msg.sentAt}
                        </td>

                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-0.5 text-[10px] rounded-md font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}>
                            {badge.label}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center">
                          {isError ? (
                            <button
                              onClick={() => retryFailedMessage(msg.id)}
                              className="px-2.5 py-1 text-[11px] font-semibold text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-600 rounded-lg border border-rose-500/20 transition-all cursor-pointer flex items-center gap-1 mx-auto"
                              title="ارسال مجدد پیامک"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>ارسال مجدد</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-emerald-400 font-medium">
                              ✓ انجام شد
                            </span>
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
      )}

      {/* SUBTAB 2: Templates */}
      {activeSubTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-100">{tpl.title}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                        tpl.enabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {tpl.enabled ? 'فعال' : 'غیرفعال'}
                    </span>
                  </div>
                  <button
                    onClick={() => openTemplateEdit(tpl)}
                    className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    ویرایش الگو
                  </button>
                </div>

                <div className="space-y-2 my-3">
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">الگوی متغیرها:</span>
                    <code className="block p-2.5 bg-slate-950/80 border border-slate-800 rounded-xl font-mono text-[11px] text-rose-300 leading-relaxed">
                      {tpl.pattern}
                    </code>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">پیش‌نمایش خروجی برای مشتری:</span>
                    <p className="p-2.5 bg-slate-800/50 rounded-xl text-slate-300 text-[11px] leading-relaxed">
                      {tpl.samplePreview}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span>شناسه درگاه: خدماتی (بدون بلاک تبلیغات)</span>
                <span className="text-emerald-400">تایید شده توسط ناظر ارتباطات</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Broadcast Modal */}
      {isBroadcastModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="fixed inset-0" onClick={() => setIsBroadcastModalOpen(false)}></div>

          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 z-10 text-right space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-sky-400" />
                ارسال پیامک اطلاع‌رسانی سراسری
              </h3>
              <button onClick={() => setIsBroadcastModalOpen(false)} className="p-1 text-slate-400 hover:text-white rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendBroadcast} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">عنوان فرستنده / سالن</label>
                <input
                  type="text"
                  value={broadcastSalonName}
                  onChange={(e) => setBroadcastSalonName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">متن پیامک عمومی *</label>
                <textarea
                  required
                  rows={4}
                  value={broadcastText}
                  onChange={(e) => setBroadcastText(e.target.value)}
                  placeholder="متن پیامک حاوی تبریک، تغییر ساعات کاری سامانه یا اطلاعیه نگهداری..."
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-rose-500 leading-relaxed"
                ></textarea>
                <span className="text-[10px] text-slate-400 block mt-1">
                  تعداد کاراکتر: {toPersianDigits(broadcastText.length)} (۱ صفحه پیامک فارسی)
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBroadcastModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 rounded-xl"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow"
                >
                  تایید و ارسال دیسپچ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Template Modal */}
      {editingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="fixed inset-0" onClick={() => setEditingTemplate(null)}></div>

          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 z-10 text-right space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">ویرایش الگوی پیامک ({editingTemplate.title})</h3>
              <button onClick={() => setEditingTemplate(null)} className="p-1 text-slate-400 hover:text-white rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">الگوی متن (شامل متغیرها)</label>
                <textarea
                  rows={4}
                  value={templatePattern}
                  onChange={(e) => setTemplatePattern(e.target.value)}
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 font-mono text-xs focus:outline-none focus:border-rose-500 leading-relaxed"
                ></textarea>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  متغیرهای مجاز: {'{customer_name}'}، {'{service_name}'}، {'{time}'}، {'{date}'}، {'{salon_name}'}
                </span>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={templateEnabled}
                    onChange={(e) => setTemplateEnabled(e.target.checked)}
                    className="rounded text-rose-500 focus:ring-rose-500"
                  />
                  <span>فعال بودن الگو برای دیسپچ خودکار</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingTemplate(null)}
                className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 rounded-xl"
              >
                انصراف
              </button>
              <button
                onClick={handleSaveTemplate}
                className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow"
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
