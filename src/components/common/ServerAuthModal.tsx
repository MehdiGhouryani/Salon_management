import React, { useState, useEffect } from 'react';
import { ShieldCheck, Phone, KeyRound, Loader2, X, RefreshCw, AlertCircle } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext.tsx';

interface ServerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  title?: string;
  description?: string;
  requiredRole?: string;
}

export const ServerAuthModal: React.FC<ServerAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title = 'ورود امن به نوبت‌آرا',
  description = 'جهت ورود به حساب کاربری، شماره موبایل خود را وارد نمایید تا کد تایید یکبار مصرف ارسال گردد.',
  requiredRole,
}) => {
  const { checkServerSession, addToast } = useAdmin();

  const [stage, setStage] = useState<'input_phone' | 'input_otp'>('input_phone');
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setStage('input_phone');
      setPhone('');
      setOtpCode('');
      setErrorMsg('');
      setCountdown(0);
      setIsLoading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  if (!isOpen) return null;

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanPhone = phone.trim();
    if (!cleanPhone || cleanPhone.length < 10) {
      setErrorMsg('لطفا یک شماره موبایل معتبر (مثال: ۰۹۱۲۳۴۵۶۷۸۹) وارد فرمایید.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/otp/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-NobatAra-Client': 'web',
        },
        body: JSON.stringify({
          phone: cleanPhone,
          purpose: 'login',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.message || 'ارسال کد تایید با خطا مواجه شد.');
        if (data.resendAvailableInSeconds) {
          setCountdown(data.resendAvailableInSeconds);
        }
        return;
      }

      setStage('input_otp');
      setCountdown(data.resendAvailableInSeconds || 60);
      addToast({
        type: 'info',
        title: 'کد تایید ارسال شد',
        message: data.message || `کد تایید به شماره ${data.phone} ارسال گردید.`,
      });
    } catch (err: any) {
      setErrorMsg('خطا در برقراری ارتباط با سرور. لطفا اتصال اینترنت را بررسی کنید.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanCode = otpCode.trim();
    if (!cleanCode || cleanCode.length !== 6) {
      setErrorMsg('کد تایید باید دقیقا ۶ رقم عددی باشد.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-NobatAra-Client': 'web',
        },
        body: JSON.stringify({
          phone: phone.trim(),
          code: cleanCode,
          purpose: 'login',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.message || 'کد تایید نامعتبر است.');
        return;
      }

      // Refresh server session in AdminContext
      await checkServerSession();

      if (requiredRole && data.user?.platformRole !== requiredRole) {
        setErrorMsg(`حساب کاربری شما (${data.user?.fullName}) احراز هویت شد، اما دسترسی ${requiredRole} را ندارد.`);
        return;
      }

      addToast({
        type: 'success',
        title: 'ورود موفقیت‌آمیز',
        message: `${data.user?.fullName || 'کاربر گرامی'}، به نوبت‌آرا خوش آمدید.`,
      });

      onSuccess?.();
      onClose();
    } catch {
      setErrorMsg('خطا در تایید کد. لطفا مجددا تلاش فرمایید.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      dir="rtl"
    >
      <div className="relative w-full max-w-md bg-white dark:bg-[#111B2E] border border-slate-200 dark:border-[#344258] rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-900 dark:text-[#E7ECF5] transition-colors">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-[#344258] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-200 dark:border-rose-900">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-[#E7ECF5]">{title}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">احراز هویت سرور با رمز یکبار مصرف (OTP)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1F2E47] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mb-5 leading-relaxed">
            {description}
          </p>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {stage === 'input_phone' ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  شماره تلفن همراه
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    dir="ltr"
                    placeholder="09123456789"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={isLoading}
                    autoFocus
                    className="w-full text-left pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#344258] bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all font-mono"
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                  کد ورود به این شماره پیامک خواهد شد.
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-xs transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>در حال ارسال پیامک...</span>
                  </>
                ) : (
                  <span>دریافت کد تایید</span>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    کد تایید ۶ رقمی
                  </label>
                  <button
                    type="button"
                    onClick={() => setStage('input_phone')}
                    className="text-[11px] text-rose-600 dark:text-rose-400 hover:underline"
                  >
                    تغییر شماره ({phone})
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    dir="ltr"
                    maxLength={6}
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    disabled={isLoading}
                    autoFocus
                    className="w-full text-center tracking-[0.4em] py-2.5 rounded-xl border border-slate-200 dark:border-[#344258] bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-white text-lg font-bold focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all font-mono"
                  />
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
                {countdown > 0 ? (
                  <span>ارسال مجدد کد پس از {countdown} ثانیه</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    disabled={isLoading}
                    className="text-rose-600 dark:text-rose-400 font-medium hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>ارسال مجدد پیامک</span>
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-xs transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>در حال بررسی کد...</span>
                  </>
                ) : (
                  <span>تایید و ورود به سیستم</span>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
