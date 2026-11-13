# NobatAra — Cross-Platform QA Report (Phase 15)

**Environment:** Windows 10 (win32), Node v24.22.1, Chromium via Playwright (local dev
server `npm run dev` with `VITE_APP_MODE=production`), in-memory dev adapter
(PostgreSQL still unprovisioned locally — CI runs the same journeys against an
isolated PostgreSQL 16 service).

## 1. E2E journeys (13 passed, 0 failed)
- Customer: storefront browse → booking wizard → OTP grant → receipt;
  OTP login → server-rendered history → server-confirmed cancellation; tracking.
- Salon: OTP login → dashboard (server stats) → walk-in booking (shared engine,
  date select) → server persistence; schedule persisted via API.
- Super Admin: OTP login → KPIs from /api/admin/stats → BusinessesView real
  rows → audited status lifecycle → audit trail → non-admin 403 verified.
- Invalid/expired states: invalid OTP rejected (400), consumed grant rejected
  (401 BOOKING_GRANT_ALREADY_USED), past-date/past-time rejected — covered by
  HTTP integration suites.

## 2. Responsive QA (widths 360/390/768/1024/1440)
Horizontal overflow checked via scrollWidth vs clientWidth on storefront,
booking modal (390+1440), salon panel and admin console — **no overflow
detected** on any tested width. Screenshots written to test-results/qa/ (not
committed).

## 3. Accessibility (axe-core, wcag2a/2aa/21aa)
Scans on storefront, booking modal, salon panel: **zero critical violations**
(color-contrast excluded — covered by the Phase-5d 24-state contrast report).
Remaining manual follow-ups (NOT covered by automated scans): full keyboard
walkthrough of every screen, screen-reader (NVDA/VoiceOver) passes, real-device
testing.

## 4. Performance (production build)
Main bundles (vite build, gzip):
- `index` core: ~340 kB raw / ~97.5 kB gzip
- `SalonAppView`: ~52 kB / 13.4 kB gzip (lazy route chunk)
- `SalonWebsiteView`: ~50 kB / 13.6 kB gzip (lazy route chunk)
- Components code-split via React.lazy per persona; fonts self-hosted
  (Vazirmatn variable). API patterns: parallel initial loads (profile +
  services + staff + hours in one Promise.all), paginated lists
  (limit/offset), names enriched server-side to avoid N+1 client lookups.

## 5. SEO (public storefront)
Canonical URL, robots (index for salon_website, noindex for private personas),
Open Graph tags, JSON-LD `BeautySalon` structured data with address/phone/
aggregateRating injected from live server data. Private dashboards and auth
screens render `noindex, nofollow`.

## 6. Known limitations (honest)
- E2E journeys locally run against the in-memory adapter; the identical
  journeys run against PostgreSQL 16 in the CI `e2e` job.
- axe scans ≠ full WCAG conformance (manual a11y follow-ups listed above).
- Performance figures are from a local dev server, not a production CDN
  environment.
