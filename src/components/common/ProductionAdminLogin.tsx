import React, { useState } from 'react';
import { ShieldCheck, Phone, KeyRound, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext.tsx';
import { Button } from '../ui/Button';

interface ProductionAdminLoginProps {
  onCancel: () => void;
}

export const ProductionAdminLogin: React.FC<ProductionAdminLoginProps> = ({ onCancel }) => {
  const { checkServerSession, addToast } = useAdmin();

  const [stage, setStage] = useState<'input_phone' | 'input_otp'>('input_phone');
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [countdown, setCountdown] = useState(0);

  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanPhone = phone.trim();
    if (!cleanPhone || cleanPhone.length < 10) {
      setErrorMsg('لطفاً شماره موبایل معتبر (مثال: ۰۹۱۲۳۴۵۶۷۸۹) وارد فرمایید.');
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
        setErrorMsg(data.message || 'ارسال کد ورود با خطا مواجه شد.');
        if (data.resendAvailableInSeconds) {
          setCountdown(data.resendAvailableInSeconds);
        }
        return;
      }

      setStage('input_otp');
      setCountdown(data.resendAvailableInSeconds || 60);
      addToast({
        type: 'info',
        title: 'کد تایید پیامک شد',
        message: data.message || `کد تایید ورود به شماره ${data.phone} ارسال شد.`,
      });
    } catch {
      setErrorMsg('خطا در برقراری ارتباط با سرور.');
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

      // Refresh server session in context
      await checkServerSession();

      addToast({
        type: 'success',
        title: 'احراز هویت موفق',
        message: `${data.user?.fullName || 'کاربر گرامی'}، به سیستم مدیریت خوش آمدید.`,
      });
    } catch {
      setErrorMsg('خطا در تایید کد.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900 text-slate-100" dir="rtl">
      <div className="max-w-md w-full bg-[#111B2E] border border-rose-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">ورود به پنل مدیریت کل پلتفرم</h2>
            <p className="text-xs text-rose-300 font-semibold mt-1">احراز هویت سرور با کوکی امن HttpOnly و RBAC</p>
            <p className="text-xs text-slate-400 leading-relaxed mt-2">
              دسترسی به بخش مدیریت مستلزم احراز هویت شماره همراه و داشتن نقش super_admin در پایگاه‌داده است.
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800 text-xs text-red-300 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {stage === 'input_phone' ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                شماره موبایل مدیر
              </label>
              <div className="relative">
                <input
                  type="tel"
                  dir="ltr"
                  placeholder="09120000001"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isLoading}
                  autoFocus
                  className="w-full text-left pl-10 pr-3.5 py-2.5 rounded-xl border border-[#344258] bg-[#0B1120] text-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                کد تایید یکبار مصرف ۶ رقمی به این شماره ارسال خواهد شد.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>در حال ارسال پیامک...</span>
                </>
              ) : (
                <span>دریافت کد تایید یکبار مصرف</span>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  کد تایید ۶ رقمی
                </label>
                <button
                  type="button"
                  onClick={() => setStage('input_phone')}
                  className="text-[11px] text-rose-400 hover:underline cursor-pointer"
                >
                  ویرایش شماره ({phone})
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
                  className="w-full text-center tracking-[0.4em] py-2.5 rounded-xl border border-[#344258] bg-[#0B1120] text-white text-lg font-bold focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                />
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {countdown > 0 && (
              <p className="text-xs text-slate-400 text-center">
                امکان ارسال مجدد کد پس از {countdown} ثانیه
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>در حال بررسی کد...</span>
                </>
              ) : (
                <span>تایید کد و ورود</span>
              )}
            </button>
          </form>
        )}

        <div className="pt-2 border-t border-[#344258]/60">
          <button
            onClick={onCancel}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-xs font-medium text-slate-300 border border-slate-700/60 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>بازگشت به پرتال مشتریان</span>
          </button>
        </div>
      </div>
    </div>
  );
};
