import React, { useState, useEffect } from 'react';
import { ShieldCheck, Phone, KeyRound, RefreshCw, AlertCircle } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

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
    } catch {
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description="احراز هویت سرور با رمز یکبار مصرف (OTP)"
      icon={<ShieldCheck className="w-5 h-5 text-[var(--brand-primary)]" />}
      size="md"
    >
      <div className="space-y-4">
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
          {description}
        </p>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-[var(--status-error-bg)] border border-[var(--status-error-border)] text-xs text-[var(--status-error)] flex items-start gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {stage === 'input_phone' ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <Input
              label="شماره تلفن همراه"
              helperText="کد ورود به این شماره پیامک خواهد شد."
              type="tel"
              dir="ltr"
              placeholder="09123456789"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={isLoading}
              leadingIcon={<Phone className="w-4 h-4" />}
              tabularNums
              autoFocus
            />

            <Button
              type="submit"
              variant="primary"
              fullWidth
              isLoading={isLoading}
            >
              دریافت کد تایید
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-[var(--text-primary)]">
                  کد تایید ۶ رقمی
                </label>
                <button
                  type="button"
                  onClick={() => setStage('input_phone')}
                  className="text-[11px] text-[var(--brand-primary)] hover:underline"
                >
                  تغییر شماره ({phone})
                </button>
              </div>

              <Input
                type="text"
                dir="ltr"
                maxLength={6}
                placeholder="123456"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                disabled={isLoading}
                leadingIcon={<KeyRound className="w-4 h-4" />}
                tabularNums
                autoFocus
                className="text-center tracking-[0.4em] font-bold text-lg"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] pt-1">
              {countdown > 0 ? (
                <span>ارسال مجدد کد پس از {countdown} ثانیه</span>
              ) : (
                <button
                  type="button"
                  onClick={handleRequestOtp}
                  disabled={isLoading}
                  className="text-[var(--brand-primary)] font-medium hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>ارسال مجدد پیامک</span>
                </button>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              isLoading={isLoading}
            >
              تایید و ورود به سیستم
            </Button>
          </form>
        )}
      </div>
    </Modal>
  );
};
