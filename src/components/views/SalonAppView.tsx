import React, { useEffect, useMemo, useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { useTheme } from '../../context/ThemeContext';
import { CustomerBooking } from '../../types/admin';
import {
  getSalonBySlug,
  updateSalonDetails,
  luxuryBannerPresets,
  DetailedSalonData,
} from '../../mock/salonDirectoryData';
import { SalonQrModal } from '../common/SalonQrModal';
import { SalonShell, SalonTab } from '../salon/SalonShell';
import { TodayTab } from '../salon/TodayTab';
import { ServicesTab } from '../salon/ServicesTab';
import { ShowcaseTab } from '../salon/ShowcaseTab';
import { ProfileTab } from '../salon/ProfileTab';
import { WalkInSheet, WalkInValues } from '../salon/WalkInSheet';
import { BookingDetailSheet, BookingChanges } from '../salon/BookingDetailSheet';
import { SubscriptionSheet } from '../salon/SubscriptionSheet';
import { GatewayId, PlanId } from '../salon/plans';

/**
 * The salon manager's app. This file holds state and the actions; every screen lives in
 * components/salon/. Behaviour is unchanged: the same context actions, the same demo-mode guards.
 */
export const SalonAppView: React.FC = () => {
  const {
    isDemoMode,
    salons,
    currentSalonSlug,
    setCurrentSalonSlug,
    customerBookings,
    completeCustomerBookingInSalon,
    cancelCustomerBooking,
    addCustomerBooking,
    updateCustomerBooking,
    updateSalonPlan,
    setPersona,
    addToast,
  } = useAdmin();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const currentSalon = useMemo(
    () => salons.find((s) => s.slug === currentSalonSlug) || salons[0],
    [salons, currentSalonSlug]
  );

  const [salonDetailed, setSalonDetailed] = useState<DetailedSalonData>(() =>
    getSalonBySlug(currentSalon.slug || 'gisara', salons)
  );
  useEffect(() => {
    setSalonDetailed(getSalonBySlug(currentSalon.slug || 'gisara', salons));
  }, [currentSalon, salons]);

  const [activeTab, setActiveTab] = useState<SalonTab>('appointments');
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<CustomerBooking | null>(null);

  const [selectedPlan, setSelectedPlan] = useState<PlanId>('gold_vip');
  const [selectedGateway, setSelectedGateway] = useState<GatewayId>('zarinpal');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const [onlineBookingEnabled, setOnlineBookingEnabled] = useState(true);
  const [smsNotificationEnabled, setSmsNotificationEnabled] = useState(true);

  const salonBookings = useMemo(
    () =>
      customerBookings.filter(
        (b) => b.salonId === currentSalon.id || b.salonName.includes(currentSalon.name)
      ),
    [customerBookings, currentSalon]
  );

  // The sheet shows the live booking, so a status change is reflected without reopening it.
  const liveSelected = selectedBooking
    ? (customerBookings.find((b) => b.id === selectedBooking.id) ?? selectedBooking)
    : null;

  const handleCopySalonUrl = () => {
    const url = `https://nobatara.ir/${currentSalon.slug || 'gisara'}`;
    navigator.clipboard?.writeText(url);
    setCopiedLink(true);
    addToast({ type: 'success', title: 'لینک صفحه سالن کپی شد', message: url });
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleSelectBanner = (url: string) => {
    setSalonDetailed(updateSalonDetails(currentSalon.slug || 'gisara', { bannerImage: url }));
    addToast({
      type: 'success',
      title: 'تصویر هدر سایت سالن تغییر یافت',
      message: 'تغییرات بلافاصله در وب‌سایت مشتریان اعمال گردید.',
    });
  };

  const handleSaveCustomBanner = (url: string) => {
    if (!url.trim()) return;
    setSalonDetailed(updateSalonDetails(currentSalon.slug || 'gisara', { bannerImage: url.trim() }));
    addToast({ type: 'success', title: 'تصویر اختصاصی بنر سالن ذخیره شد' });
  };

  const handleSaveShowcase = (v: { tagline: string; workingHours: string; address: string }) => {
    setSalonDetailed(updateSalonDetails(currentSalon.slug || 'gisara', v));
    addToast({
      type: 'success',
      title: 'مشخصات ویترین سالن ذخیره شد',
      message: 'اطلاعات در وب‌سایت به‌روزرسانی شدند.',
    });
  };

  const handleCreateWalkIn = (v: WalkInValues): boolean => {
    if (!isDemoMode) {
      addToast({
        type: 'error',
        title: 'ثبت در نسخه عملیاتی مسدود است',
        message: 'در محیط عملیاتی، ثبت نوبت منوط به اتصال پایگاه‌داده و سرور در فاز ۳ تا ۵ است.',
      });
      return false;
    }
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const trackingPrefix = currentSalon.slug ? currentSalon.slug.slice(0, 3).toUpperCase() : 'ARA';
    addCustomerBooking({
      id: `manual-${Date.now()}`,
      trackingCode: `${trackingPrefix}-${randomSuffix}`,
      salonId: currentSalon.id,
      salonName: currentSalon.name,
      clientName: v.clientName,
      clientPhone: v.clientPhone,
      serviceName: v.serviceName || 'خدمت حضوری سالن',
      serviceCategory: 'نوبت حضوری سالن',
      staffName: v.staffName || salonDetailed.staff[0]?.name || 'پرسنل سالن',
      date: 'امروز',
      time: v.time,
      price: v.price,
      paymentMethod: 'in_person',
      createdAt: 'هم‌اکنون',
      status: 'confirmed',
      isDemo: true,
      notes: 'ثبت دستی در حافظه آزمایشی',
    });
    addToast({
      type: 'info',
      title: '[شبیه‌سازی دمو] نوبت جدید در حافظه مرورگر ثبت شد',
      message: `${v.clientName} · ساعت ${v.time}`,
    });
    return true;
  };

  const handleSaveBooking = (b: CustomerBooking, changes: BookingChanges): boolean => {
    if (!isDemoMode) {
      addToast({
        type: 'error',
        title: 'ویرایش نوبت در محیط عملیاتی مسدود است',
        message: 'پایدارسازی تغییرات نوبت در فاز ۴ با پایگاه‌داده انجام خواهد شد.',
      });
      return false;
    }
    updateCustomerBooking(b.id, changes);
    setSelectedBooking({ ...b, ...changes });
    addToast({ type: 'info', title: '[شبیه‌سازی دمو] تغییرات نوبت در حافظه کلاینت ثبت شد' });
    return true;
  };

  const handleSettle = (b: CustomerBooking) => {
    completeCustomerBookingInSalon(b.id);
    setSelectedBooking(null);
  };

  const handleCancel = (b: CustomerBooking) => {
    cancelCustomerBooking(b.id);
    setSelectedBooking(null);
  };

  const handleSms = (b: CustomerBooking) => {
    if (!isDemoMode) {
      addToast({
        type: 'error',
        title: 'سرویس پیامک در سرور متصل نیست',
        message: 'ارسال پیامک واقعی نیازمند اتصال وب‌سرویس پیامک در فاز ۱۰ است.',
      });
      return;
    }
    addToast({
      type: 'info',
      title: '[شبیه‌سازی دمو] ثبت درخواست پیامک در حافظه آزمایشی',
      message: `توجه: هیچ پیامکی به شبکه مخابرات ارسال نشد. در حالت دمو، ثبت پیامک به ${b.clientPhone} (${b.clientName}) صرفاً شبیه‌سازی گردید.`,
    });
  };

  // A setting is only reported as changed when something really changed it.
  const guardedToggle =
    (label: string, apply: (next: boolean) => void) => (next: boolean) => {
      if (!isDemoMode) {
        addToast({
          type: 'error',
          title: 'تغییر تنظیمات در نسخه عملیاتی متصل نیست',
          message: 'ذخیره تنظیمات پس از اتصال به سرور فعال می‌شود.',
        });
        return;
      }
      apply(next);
      addToast({ type: 'info', title: `[شبیه‌سازی دمو] ${label} ${next ? 'فعال' : 'غیرفعال'} شد` });
    };

  const handlePaySubscription = () => {
    if (!isDemoMode) {
      addToast({
        type: 'error',
        title: 'درگاه بانکی متصل نیست',
        message: 'در محیط عملیاتی، اتصال به درگاه شاپرک در فاز ۱۰ پیاده‌سازی خواهد شد.',
      });
      return;
    }
    setIsProcessingPayment(true);
    setTimeout(() => {
      setIsProcessingPayment(false);
      updateSalonPlan(currentSalon.id, selectedPlan);
      setSubModalOpen(false);
      addToast({
        type: 'info',
        title: '[شبیه‌سازی دمو] اشتراک سالن در حافظه آزمایشی ارتقا یافت',
        message: 'توجه: این یک پرداخت شبیه‌سازی شده است و هیچ تراکنش مالی واقعی انجام نشد.',
      });
    }, 1200);
  };

  return (
    <SalonShell
      salonName={currentSalon.name}
      salonCity={currentSalon.city}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onOpenQr={() => setQrModalOpen(true)}
      isDark={isDark}
      onToggleTheme={toggleTheme}
    >
      {activeTab === 'appointments' && (
        <TodayTab
          bookings={salonBookings}
          onOpenBooking={setSelectedBooking}
          onSettle={handleSettle}
          onNewBooking={() => setWalkInOpen(true)}
          onSimulateOnline={isDemoMode ? () => setPersona('salon_website') : undefined}
        />
      )}
      {activeTab === 'services' && (
        <ServicesTab services={salonDetailed.services} staff={salonDetailed.staff} />
      )}
      {activeTab === 'showcase' && (
        <ShowcaseTab
          salon={salonDetailed}
          presets={luxuryBannerPresets}
          copied={copiedLink}
          onCopyLink={handleCopySalonUrl}
          onOpenQr={() => setQrModalOpen(true)}
          onSelectBanner={handleSelectBanner}
          onSaveCustomBanner={handleSaveCustomBanner}
          onSaveDetails={handleSaveShowcase}
        />
      )}
      {activeTab === 'profile' && (
        <ProfileTab
          salon={currentSalon}
          isDemoMode={isDemoMode}
          onlineBooking={onlineBookingEnabled}
          onToggleOnlineBooking={guardedToggle('پذیرش نوبت آنلاین', setOnlineBookingEnabled)}
          smsEnabled={smsNotificationEnabled}
          onToggleSms={guardedToggle('پیامک اطلاع‌رسانی', setSmsNotificationEnabled)}
          isDark={isDark}
          onSetDark={(dark) => {
            if (dark !== isDark) toggleTheme();
          }}
          onOpenSubscription={() => setSubModalOpen(true)}
          salonOptions={salons.map((s) => ({ slug: s.slug || '', name: s.name }))}
          currentSlug={currentSalon.slug || ''}
          onChangeSalon={setCurrentSalonSlug}
          onOpenSuperAdmin={() => setPersona('super_admin')}
        />
      )}

      <WalkInSheet
        isOpen={walkInOpen}
        onClose={() => setWalkInOpen(false)}
        services={salonDetailed.services}
        staff={salonDetailed.staff}
        onSubmit={handleCreateWalkIn}
      />
      <BookingDetailSheet
        booking={liveSelected}
        staff={salonDetailed.staff}
        onClose={() => setSelectedBooking(null)}
        onSettle={handleSettle}
        onCancel={handleCancel}
        onSave={handleSaveBooking}
        onSms={handleSms}
      />
      <SubscriptionSheet
        isOpen={subModalOpen}
        onClose={() => setSubModalOpen(false)}
        isDemoMode={isDemoMode}
        plan={selectedPlan}
        onPlanChange={setSelectedPlan}
        gateway={selectedGateway}
        onGatewayChange={setSelectedGateway}
        isProcessing={isProcessingPayment}
        onPay={handlePaySubscription}
      />
      <SalonQrModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        salon={salonDetailed}
      />
    </SalonShell>
  );
};
