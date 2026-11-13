import React, { useEffect, useMemo, useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { CustomerBooking } from '../../types/admin';
import {
  getSalonBySlug,
  luxuryBannerPresets,
  DetailedSalonData,
  SalonServiceItem,
  SalonStaffItem,
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
import { useSalonOps } from '../../hooks/useSalonOps';

/**
 * The salon manager's app (Phase 12): every operational surface is served by
 * the real, tenant-scoped /api/salon/* endpoints through useSalonOps.
 * Toasts fire only after the server confirms; failures stay visible.
 * Demo mode keeps the previous local-preview behavior, clearly labeled.
 */
export const SalonAppView: React.FC = () => {
  const {
    isDemoMode,
    salons,
    currentSalonSlug,
    setCurrentSalonSlug,
    customerBookings,
    updateSalonPlan,
    setPersona,
    addToast,
    addCustomerBooking,
    updateCustomerBooking,
    completeCustomerBookingInSalon,
    cancelCustomerBooking,
  } = useAdmin();
  const { theme, toggleTheme } = useTheme();
  const { serverAuth } = useAuth();
  const isDark = theme === 'dark';

  // The panel operates on the salon the authenticated user is a member of.
  const membershipSalonId = serverAuth.salonMemberships?.[0]?.salonId || '';
  const viewingSalon = salons.find((s) => s.slug === currentSalonSlug);
  const salonId = isDemoMode ? viewingSalon?.id || salons[0]?.id || '' : membershipSalonId || viewingSalon?.id || '';
  const currentSalon = useMemo(
    () => salons.find((s) => s.id === salonId) || salons.find((s) => s.slug === currentSalonSlug) || salons[0],
    [salons, salonId, currentSalonSlug]
  );

  const ops = useSalonOps(salonId, true);
  const tehranTodayIso = () =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran' }).format(new Date());
  const serverProfile = ops.profile;

  const [salonDetailed, setSalonDetailed] = useState<DetailedSalonData>(() =>
    getSalonBySlug(currentSalon.slug || 'gisara', salons)
  );
  useEffect(() => {
    if (serverProfile) {
      // Server truth overlays the static catalog shape (v11 UI intact).
      const base = getSalonBySlug(serverProfile.slug || currentSalon.slug || 'gisara', salons);
      setSalonDetailed({
        ...base,
        id: serverProfile.id,
        name: serverProfile.name,
        slug: serverProfile.slug,
        tagline: serverProfile.tagline || base.tagline,
        phone: serverProfile.phone || base.phone,
        city: serverProfile.city || base.city,
        address: serverProfile.address || base.address,
        bannerImage: serverProfile.bannerImage || base.bannerImage,
        features: serverProfile.features || base.features,
        rating: serverProfile.rating ?? base.rating,
        reviewsCount: serverProfile.reviewsCount ?? base.reviewsCount,
        services: ops.services,
        staff: ops.staff.map((st) => ({ ...st, avatar: (st as any).avatar || '' })),
      });
    } else {
      setSalonDetailed(getSalonBySlug(currentSalon.slug || 'gisara', salons));
    }
  }, [serverProfile, ops.services, ops.staff, currentSalon, salons]);

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

  const applyShowcase = async (payload: Record<string, unknown>, successTitle: string, successMessage?: string) => {
    if (isDemoMode) {
      setSalonDetailed((prev) => ({ ...prev, ...(payload as Partial<DetailedSalonData>) }));
      addToast({ type: 'info', title: `[شبیه‌سازی دمو] ${successTitle}` });
      return;
    }
    const ok = await ops.saveProfile(payload);
    if (ok) {
      addToast({ type: 'success', title: successTitle, message: successMessage });
    } else {
      addToast({ type: 'error', title: 'ذخیره ناموفق بود', message: ops.error });
    }
  };

  const handleSelectBanner = (url: string) => {
    applyShowcase({ bannerImage: url }, 'تصویر هدر سایت سالن تغییر یافت', 'تغییرات بلافاصله در وب‌سایت مشتریان اعمال گردید.');
  };

  const handleSaveCustomBanner = (url: string) => {
    if (!url.trim()) return;
    applyShowcase({ bannerImage: url.trim() }, 'تصویر اختصاصی بنر سالن ذخیره شد');
  };

  const handleSaveShowcase = (v: { tagline: string; workingHours: string; address: string }) => {
    applyShowcase(
      { tagline: v.tagline, address: v.address },
      'مشخصات ویترین سالن ذخیره شد',
      'اطلاعات در وب‌سایت به‌روزرسانی شدند.'
    );
  };

  // Walk-in (manual) booking — the SAME engine as the public path, on both modes.
  // Demo mode keeps a local preview record in addition.
  const handleCreateWalkIn = async (v: WalkInValues): Promise<boolean> => {
    const result = await ops.createManualBooking({
      clientName: v.clientName,
      clientPhone: v.clientPhone,
      serviceId: v.serviceId || salonDetailed.services[0]?.id || '',
      staffId: v.staffId || salonDetailed.staff[0]?.id || '',
      bookingDate: v.bookingDate,
      bookingTime: v.time,
      notes: 'ثبت حضوری توسط پرسنل سالن',
    });
    if (!result.ok) {
      addToast({
        type: 'error',
        title: 'ثبت نوبت ناموفق بود',
        message: result.message || result.code || 'خطای نامشخص.',
      });
      return false;
    }
    if (isDemoMode) {
      addCustomerBooking({
        id: `manual-${Date.now()}`,
        trackingCode: result.trackingCode || `ARA-${Math.floor(1000 + Math.random() * 9000)}`,
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
      addToast({ type: 'info', title: '[شبیه‌سازی دمو] نوبت جدید در حافظه مرورگر ثبت شد', message: `${v.clientName} · ساعت ${v.time}` });
      return true;
    }
    addToast({
      type: 'success',
      title: 'نوبت با موفقیت ثبت شد',
      message: `${v.clientName} · کد پیگیری ${result.trackingCode}`,
    });
    return true;
  };

  // Reschedule through the engine (rules + advisory lock + overlap in-transaction)
  const handleSaveBooking = async (b: CustomerBooking, changes: BookingChanges): Promise<boolean> => {
    if (!isDemoMode) {
      const staffId = changes.staffName
        ? ops.staff.find((st) => st.name === changes.staffName)?.id
        : undefined;
      const ok = await ops.rescheduleAppointment(b.id, tehranTodayIso(), changes.time, staffId);
      if (!ok) {
        addToast({ type: 'error', title: 'جابجایی نوبت ناموفق بود', message: ops.error });
        return false;
      }
      setSelectedBooking({ ...b, ...changes });
      addToast({ type: 'success', title: 'نوبت جابجا شد', message: `ساعت جدید: ${changes.time}` });
      return true;
    }
    updateCustomerBooking(b.id, changes);
    setSelectedBooking({ ...b, ...changes });
    addToast({ type: 'info', title: '[شبیه‌سازی دمو] تغییرات نوبت در حافظه کلاینت ثبت شد' });
    return true;
  };

  const handleSettle = async (b: CustomerBooking) => {
    const ok = await ops.updateAppointmentStatus(b.id, 'completed', 'تسویه حضوری توسط پرسنل');
    if (ok) {
      addToast({ type: 'success', title: 'نوبت تکمیل و تسویه شد', message: b.clientName });
      setSelectedBooking(null);
    } else {
      addToast({ type: 'error', title: 'تکمیل نوبت ناموفق بود', message: ops.error });
    }
  };

  const handleCancel = async (b: CustomerBooking) => {
    const ok = await ops.updateAppointmentStatus(b.id, 'cancelled', 'لغو توسط پرسنل سالن');
    if (ok) {
      addToast({ type: 'success', title: 'نوبت لغو شد', message: b.clientName });
      setSelectedBooking(null);
    } else {
      addToast({ type: 'error', title: 'لغو نوبت ناموفق بود', message: ops.error });
    }
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
          bookings={isDemoMode ? salonBookings : ops.appointments}
          stats={
            isDemoMode
              ? undefined
              : {
                  completed: ops.stats?.completedCount ?? 0,
                  confirmed: ops.stats?.confirmedCount ?? 0,
                  pending: ops.stats?.pendingCount ?? 0,
                  cancelled: ops.stats?.cancelledCount ?? 0,
                  collectedRevenue: ops.stats?.collectedRevenue ?? 0,
                  upcomingCount: ops.stats?.upcomingAppointments?.length ?? 0,
                }
          }
          loading={!isDemoMode && ops.loading}
          error={!isDemoMode ? ops.error : ''}
          onRetry={!isDemoMode ? () => {
            ops.clearError();
            ops.loadAppointments();
            ops.loadStats();
          } : undefined}
          onOpenBooking={setSelectedBooking}
          onSettle={handleSettle}
          onNewBooking={() => setWalkInOpen(true)}
          onSimulateOnline={isDemoMode ? () => setPersona('salon_website') : undefined}
        />
      )}
      {activeTab === 'services' && (
        <ServicesTab
          services={salonDetailed.services}
          staff={salonDetailed.staff}
        />
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
