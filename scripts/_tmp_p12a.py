# Temporary Phase-12 patch A: fix SalonAppView head + mutations
p = 'src/components/views/SalonAppView.tsx'
s = open(p, encoding='utf-8').read()

# 1. bookingTime helper is server-side only; compute Tehran today inline via Intl
s = s.replace(
  "import { useSalonOps } from '../../hooks/useSalonOps';\nimport { tehranTodayIso } from '../../utils/bookingTime';",
  "import { useSalonOps } from '../../hooks/useSalonOps';"
)
s = s.replace(
  "  const ops = useSalonOps(salonId, true);",
  "  const ops = useSalonOps(salonId, true);\n  const tehranTodayIso = () =>\n    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran' }).format(new Date());"
)

# 2. DetailedSalonData has no email — drop that overlay field
s = s.replace("        email: serverProfile.email || base.email,\n", "")

# 3. banner/showcase mutations: route through saveProfile (server) in production,
#    keep demo local mutation in demo mode
old_banner = """  const handleSelectBanner = (url: string) => {
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
  };"""
new_banner = """  const applyShowcase = async (payload: Record<string, unknown>, successTitle: string, successMessage?: string) => {
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
  };"""
assert old_banner in s, 'banner anchor not found'
s = s.replace(old_banner, new_banner)
open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('part A done')
