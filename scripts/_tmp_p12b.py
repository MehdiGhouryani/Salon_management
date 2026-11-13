# Temporary Phase-12 patch B: walk-in/settle/cancel/save-booking through the engine
p = 'src/components/views/SalonAppView.tsx'
s = open(p, encoding='utf-8').read()

old = """  const handleCreateWalkIn = (v: WalkInValues): boolean => {
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
  };"""

new = """  // Walk-in (manual) booking — the SAME engine as the public path, on both modes.
  // Demo mode keeps a local preview record in addition.
  const handleCreateWalkIn = async (v: WalkInValues): Promise<boolean> => {
    const result = await ops.createManualBooking({
      clientName: v.clientName,
      clientPhone: v.clientPhone,
      serviceId: v.serviceId || salonDetailed.services[0]?.id || '',
      staffId: v.staffId || salonDetailed.staff[0]?.id || '',
      // WalkInSheet submits a Persian-clock time for "today" — the engine
      // validates against Asia/Tehran; the date is canonical Tehran-today.
      bookingDate: tehranTodayIso(),
      bookingTime: v.time,
      price: v.price,
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
  };"""
assert old in s, 'mutation block anchor not found'
s = s.replace(old, new)
open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('part B done')
