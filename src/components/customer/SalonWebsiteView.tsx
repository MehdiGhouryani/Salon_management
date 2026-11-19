import React, { useEffect, useMemo, useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import {
  getSalonBySlug,
  DetailedSalonData,
  SalonServiceItem,
} from '../../mock/salonDirectoryData';
import { CustomerBooking } from '../../types/admin';
import { formatNumber, toPersianDigits } from '../../utils/formatters';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { BookingModal } from './BookingModal';
import { BookingReceiptModal } from './BookingReceiptModal';
import { CustomerSiteDrawer } from './CustomerSiteDrawer';

const fa = (n: number) => toPersianDigits(String(n));

/**
 * The salon's own page. The service menu is the page: read it like a printed menu, with the
 * salon's photograph beside it. One action ("رزرو نوبت") on a phone and in the first screen.
 */
export const SalonWebsiteView: React.FC = () => {
  const { salons, currentSalonSlug, setCurrentSalonSlug, clientSession, customerBookings, addCustomerBooking, isDemoMode } = useAdmin();

  // Phase 11 — real URL deep links: /salon/:slug. Refresh and direct links
  // resolve to the correct salon; the persona itself stays server-guarded.
  useEffect(() => {
    const applyPath = () => {
      const match = window.location.pathname.match(/^\/salon\/([\w-]+)\/?$/);
      if (match && match[1] && match[1] !== currentSalonSlug) {
        setCurrentSalonSlug(match[1]);
      }
    };
    applyPath();
    window.addEventListener('popstate', applyPath);
    return () => window.removeEventListener('popstate', applyPath);
  }, [currentSalonSlug, setCurrentSalonSlug]);

  // Keep the URL in sync when the slug changes (shareable storefront links).
  useEffect(() => {
    const desired = `/salon/${currentSalonSlug}`;
    if (window.location.pathname !== desired) {
      window.history.replaceState(null, '', desired);
    }
  }, [currentSalonSlug]);

  // Phase 15 SEO: canonical URL, robots directives, and salon JSON-LD.
  // The storefront is the ONLY indexable persona; private consoles set noindex.
  useEffect(() => {
    const canonical = `https://nobatara.ir/salon/${currentSalonSlug}`;
    const setMeta = (attr: 'name' | 'property', key: string, content: string) => {
      let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = canonical;

    setMeta('name', 'robots', 'index, follow');
    setMeta('property', 'og:url', canonical);
    setMeta('property', 'og:type', 'business.business');

    return () => {
      document.getElementById('nobatara-jsonld')?.remove();
    };
  }, [currentSalonSlug]);

  // Phase 11: live server data always wins. In production posture a failed
  // fetch shows an explicit error state — the static demo catalog is used
  // ONLY in demo mode, never silently in production.
  const [liveSalon, setLiveSalon] = useState<DetailedSalonData | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  useEffect(() => {
    let alive = true;
    setLoadState('loading');
    setLiveSalon(null);
    fetch(`/api/public/salons/${encodeURIComponent(currentSalonSlug)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('http_' + r.status))))
      .then((data) => {
        if (alive && data.success && data.salon) {
          setLiveSalon(data.salon);
          setLoadState('ready');
        } else if (alive) {
          setLoadState(isDemoMode ? 'ready' : 'error');
        }
      })
      .catch(() => {
        if (alive) setLoadState(isDemoMode ? 'ready' : 'error');
      });
    return () => {
      alive = false;
    };
  }, [currentSalonSlug, isDemoMode]);

  const salon = useMemo(() => {
    if (liveSalon) return liveSalon;
    if (!isDemoMode && loadState !== 'ready') return null; // never show demo catalog as production data
    return getSalonBySlug(currentSalonSlug, salons);
  }, [liveSalon, currentSalonSlug, salons, isDemoMode, loadState]);

  // Phase 15 SEO: salon JSON-LD structured data (needs resolved salon).
  useEffect(() => {
    const ld = document.getElementById('nobatara-jsonld');
    if (ld) ld.remove();
    if (!salon) return;
    const script = document.createElement('script');
    script.id = 'nobatara-jsonld';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BeautySalon',
      name: salon.name,
      address: { '@type': 'PostalAddress', streetAddress: salon.address, addressLocality: salon.city, addressCountry: 'IR' },
      telephone: salon.phone,
      aggregateRating: salon.rating
        ? { '@type': 'AggregateRating', ratingValue: salon.rating, reviewCount: salon.reviewsCount || 0 }
        : undefined,
    });
    document.head.appendChild(script);
    return () => {
      document.getElementById('nobatara-jsonld')?.remove();
    };
  }, [salon]);

  const [search, setSearch] = useState('');
  const [imgOk, setImgOk] = useState(true);
  useEffect(() => setImgOk(true), [salon?.bannerImage]);
  const services = salon?.services || [];
  const showSearch = (salon?.services || []).length > 12;

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return services;
    return services.filter(
      (s: SalonServiceItem) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)
    );
  }, [services, search]);

  const groups = useMemo(() => {
    const map = new Map<string, { label: string; items: SalonServiceItem[] }>();
    shown.forEach((s) => {
      const g = map.get(s.category) ?? { label: s.categoryLabel, items: [] };
      g.items.push(s);
      map.set(s.category, g);
    });
    return [...map.values()];
  }, [shown]);


  const [bookingOpen, setBookingOpen] = useState(false);
  const [serviceId, setServiceId] = useState<string | undefined>(undefined);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receipt, setReceipt] = useState<CustomerBooking | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);

  // Only the verified client's own bookings are counted.
  const myCount = useMemo(
    () =>
      clientSession.isLoggedIn && clientSession.phone
        ? customerBookings.filter((b) => b.clientPhone === clientSession.phone).length
        : 0,
    [customerBookings, clientSession]
  );

  // Phase 11: explicit loading / error / not-found states (after all hooks).
  if (loadState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <div className="animate-pulse text-sm text-[var(--text-secondary)]">در حال بارگذاری سالن…</div>
      </div>
    );
  }
  if (loadState === 'error' || !salon) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" dir="rtl">
        <div className="max-w-sm text-center space-y-3">
          <p className="text-sm font-semibold text-rose-600">
            {loadState === 'error' ? 'بارگذاری اطلاعات سالن ناموفق بود.' : 'سالن مورد نظر یافت نشد.'}
          </p>
          <p className="text-xs text-[var(--text-secondary)]">اتصال اینترنت را بررسی کنید یا دقایقی دیگر تلاش کنید.</p>
          <button
            onClick={() => setLoadState('loading')}
            className="px-4 py-2 rounded-xl bg-[var(--brand-primary)] text-white text-xs font-bold cursor-pointer"
          >
            تلاش دوباره
          </button>
        </div>
      </div>
    );
  }

  const book = (id?: string) => {
    setServiceId(id);
    setBookingOpen(true);
  };

  const hasImage = Boolean(salon.bannerImage) && imgOk;
  const hasRating = salon.rating > 0 && salon.reviewsCount > 0;

  // With a photograph the name sits in the text column. Without one, the name becomes the
  // dominant thing on the page: set large on a flat field where the photograph would be.
  const titleBlock = (
    <>
      <h1
        className={
          hasImage
            ? 'text-[28px] sm:text-4xl font-bold leading-[1.35]'
            : 'text-[40px] sm:text-6xl lg:text-7xl font-bold leading-[1.25]'
        }
      >
        {salon.name}
      </h1>
      {salon.tagline && (
        <p
          className={`text-[var(--text-secondary)] max-w-[40ch] ${
            hasImage ? 'mt-3 text-base sm:text-lg' : 'mt-5 text-lg sm:text-xl lg:text-2xl'
          }`}
        >
          {salon.tagline}
        </p>
      )}
    </>
  );

  const header = (cls: string) => (
    <header className={`items-center justify-between gap-4 px-5 sm:px-8 lg:px-14 h-16 ${cls}`}>
      <p className="text-[17px] font-bold truncate">{salon.name}</p>
      <button
        type="button"
        onClick={() => setAccountOpen(true)}
        className="shrink-0 inline-flex items-center gap-2 h-11 px-4 rounded-full border border-[var(--border-strong)] text-sm text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
      >
        نوبت‌های من
        {myCount > 0 && (
          <span className="min-w-5 h-5 px-1.5 rounded-full bg-[var(--text-primary)] text-[var(--bg-surface)] text-xs flex items-center justify-center">
            {fa(myCount)}
          </span>
        )}
      </button>
    </header>
  );

  return (
    <div
      dir="rtl"
      className="min-h-dvh bg-[var(--bg-canvas)] text-[var(--text-primary)] pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:pb-0"
    >
      {header('flex lg:hidden')}

      <div className="flex flex-col lg:grid lg:grid-cols-2">
        {hasImage ? (
          <div className="h-[36dvh] sm:h-[44dvh] lg:h-dvh lg:sticky lg:top-0 bg-[var(--bg-elevated)]">
            <img
              src={salon.bannerImage}
              alt=""
              className="w-full h-full object-cover"
              onError={() => setImgOk(false)}
            />
          </div>
        ) : (
          <div className="min-h-[34dvh] lg:min-h-0 lg:h-dvh lg:sticky lg:top-0 bg-[var(--bg-elevated)] flex flex-col justify-end px-5 sm:px-8 lg:px-14 py-10 lg:py-16">
            {titleBlock}
          </div>
        )}
        <div className="min-w-0">
          {header('hidden lg:flex')}

          <div className="px-5 sm:px-8 lg:px-14">
            <section className="pt-6 lg:pt-12">
              {hasImage && titleBlock}
              <dl className={`${hasImage ? 'mt-6' : 'mt-0'} space-y-2 text-base`}>
                {hasRating && (
                  <div className="flex gap-3">
                    <dt className="w-20 shrink-0 text-[var(--text-secondary)]">امتیاز</dt>
                    <dd>
                      {fa(salon.rating)} از {fa(salon.reviewsCount)} نظر
                    </dd>
                  </div>
                )}
                <div className="flex gap-3">
                  <dt className="w-20 shrink-0 text-[var(--text-secondary)]">آدرس</dt>
                  <dd>
                    {salon.city}، {salon.address}
                  </dd>
                </div>
                <div className="flex gap-3">
                  <dt className="w-20 shrink-0 text-[var(--text-secondary)]">ساعت کاری</dt>
                  <dd>{toPersianDigits(salon.workingHours)}</dd>
                </div>
              </dl>
              <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
                <div className="hidden sm:block">
                  <Button size="lg" className="rounded-full px-8" onClick={() => book()}>
                    رزرو نوبت
                  </Button>
                </div>
                <p className="text-sm text-[var(--text-secondary)]">
                  رزرو رایگان است؛ هزینه را حضوری در سالن می‌پردازید.
                </p>
              </div>
            </section>

            <section className="mt-14" aria-labelledby="services-title">
              <h2 id="services-title" className="text-2xl font-bold">
                خدمات و قیمت‌ها
              </h2>
              {showSearch && (
                <label className="block mt-4">
                  <span className="sr-only">جستجوی خدمت</span>
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="جستجوی خدمت"
                    className="w-full sm:w-80 h-11 px-4 rounded-full bg-[var(--bg-surface)] border border-[var(--border-strong)] text-base placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-primary)]"
                  />
                </label>
              )}
              {groups.length === 0 ? (
                <p className="mt-6 text-base text-[var(--text-secondary)]">
                  {search ? 'خدمتی با این عنوان پیدا نشد.' : 'هنوز خدمتی ثبت نشده است.'}
                </p>
              ) : (
                groups.map((g) => (
                  <div key={g.label} className="mt-8">
                    <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-1">{g.label}</h3>
                    <ul>
                      {g.items.map((s) => (
                        <li
                          key={s.id}
                          className="flex items-start gap-4 -mx-3 px-3 py-4 rounded-2xl hover:bg-[var(--bg-surface)] transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-base font-semibold">{s.name}</p>
                            {s.description && (
                              <p className="mt-1 text-base text-[var(--text-secondary)] line-clamp-2">
                                {s.description}
                              </p>
                            )}
                            <p className="mt-2 text-base text-[var(--text-secondary)]">
                              {s.duration}،{' '}
                              <span className="tabular-nums text-[var(--text-primary)]">
                                {formatNumber(s.price)} تومان
                              </span>
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => book(s.id)}
                            aria-label={`رزرو ${s.name}`}
                            className="shrink-0 h-10 px-5 rounded-full border border-[var(--border-strong)] text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
                          >
                            رزرو
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </section>

            {salon.staff.length > 0 && (
              <section className="mt-14" aria-labelledby="team-title">
                <h2 id="team-title" className="text-2xl font-bold">
                  پرسنل
                </h2>
                <ul className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                  {salon.staff.map((m) => (
                    <li key={m.id} className="flex items-center gap-3">
                      <Avatar src={m.avatar} name={m.name} size={48} />
                      <div className="min-w-0">
                        <p className="text-base font-semibold">{m.name}</p>
                        <p className="text-base text-[var(--text-secondary)]">
                          {m.role}
                          {m.specialty ? `، ${m.specialty}` : ''}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {salon.features && salon.features.length > 0 && (
              <section className="mt-14" aria-labelledby="features-title">
                <h2 id="features-title" className="text-2xl font-bold">
                  امکانات
                </h2>
                <p className="mt-3 text-base text-[var(--text-secondary)]">{salon.features.join('، ')}.</p>
              </section>
            )}

            <footer className="mt-16 pb-14">
              <p className="text-3xl sm:text-4xl font-bold leading-[1.35]">{salon.name}</p>
              <Button size="lg" className="mt-6 rounded-full px-8" onClick={() => book()}>
                رزرو نوبت
              </Button>
              <p className="mt-8 text-sm text-[var(--text-muted)]">این صفحه با نوبت‌آرا ساخته شده است.</p>
            </footer>
          </div>
        </div>

      </div>

      <div className="sm:hidden fixed inset-x-0 bottom-0 z-30 bg-[var(--bg-surface)] shadow-[0_-6px_20px_rgb(0_0_0/0.06)] px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <Button size="lg" className="w-full rounded-full" onClick={() => book()}>
          رزرو نوبت
        </Button>
      </div>

      <BookingModal
        isOpen={bookingOpen}
        onClose={() => setBookingOpen(false)}
        salon={salon}
        initialServiceId={serviceId}
        onBookingSuccess={(booking) => {
          // The booking is already persisted by the public booking API in
          // production. Only mirror it into local fixture state in Demo mode.
          if (isDemoMode) addCustomerBooking(booking);
          setBookingOpen(false);
          setReceipt(booking);
          setReceiptOpen(true);
        }}
      />
      <BookingReceiptModal
        isOpen={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        booking={receipt}
        salonPhone={salon.phone}
        salonAddress={salon.address ? `${salon.city}، ${salon.address}` : undefined}
      />
      <CustomerSiteDrawer
        isOpen={accountOpen}
        onClose={() => setAccountOpen(false)}
        currentSalon={salon}
        onOpenReceipt={(booking) => {
          setReceipt(booking);
          setReceiptOpen(true);
        }}
      />
    </div>
  );
};
