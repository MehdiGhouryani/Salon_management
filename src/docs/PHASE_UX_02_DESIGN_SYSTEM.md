# Phase UX-2: Design System Consistency & UI Polish

## خلاصه اقدامات و بهبودهای بصری (Executive Summary)

در این فاز، تمامی کامپوننت‌های پایه رابط کاربری (Design System Primitives)، متغیرهای رنگی، لایه‌های Dark Mode، فاصله‌گذاری‌ها و حالت‌های Focus/Hover در سراسر اپلیکیشن نوبت‌آرا بررسی، یکدست و استانداردسازی شدند.

---

## ۱. ارتقاء و تکمیل کامپوننت‌های پایه Design System (`src/components/ui`)

| کامپوننت (Component) | امکانات و Variantهای جدید | توکن‌های متصل شده | حالت‌های پشتیبانی‌شده (States) |
|---|---|---|---|
| **`Button`** | اضافه شدن `variant="success"`, `variant="warning"`, `size="xs"` و `fullWidth` | `--brand-primary`, `--status-success`, `--status-error`, `--bg-elevated` | `isLoading`, `disabled`, `focus-visible`, `active:scale` |
| **`Input`** | اضافه شدن سایزها (`sm`, `md`, `lg`) و آیکون بارگذاری | `--bg-surface`, `--text-primary`, `--border-subtle`, `--status-error` | `disabled`, `isLoading`, `error`, `focused`, `tabularNums` |
| **`Select`** | اضافه شدن سایزها (`sm`, `md`, `lg`) و فلش شکیل RTL | `--bg-surface`, `--text-primary`, `--border-subtle` | `disabled`, `error`, `focused` |
| **`Card`** | اضافه شدن Variantها (`default`, `elevated`, `outlined`, `subtle`) و پدینگ استاندارد | `--bg-surface`, `--bg-elevated`, `--border-subtle` | `interactive` (hover elevation + border glow) |
| **`Badge`** | اضافه شدن سایزها (`sm`, `md`) و رنگ‌های `neutral`, `brand`, `success`, `warning`, `error`, `info`, `purple` | `--status-success-bg`, `--status-error-bg`, `--brand-subdued` | `dot` indicator |
| **`Skeleton`** | اتصال به CSS variables و کنترل انیمیشن Pulse | `--bg-elevated`, `--border-subtle` | `animate` |
| **`EmptyState`** | اتصال مستقیم به `Button` و CSS variable borders | `--border-strong`, `--bg-surface`, `--text-muted` | RTL + responsive padding |
| **`ErrorState`** | متصل به توکن‌های `--status-error` و دکمه‌های ثانویه | `--status-error-bg`, `--status-error-border` | `onRetry` action |

---

## ۲. بهبود حالت‌های تاریک و روشن (Light & Dark Mode Polish)

- **کنتراست عالی متون (WCAG AA Compliance):** 
  رنگ `--text-muted` در حالت Dark Mode به `#7E8DA6` ارتقاء یافت تا نسبت کنتراست (Contrast Ratio) در پس‌زمینه‌های تیره (`#0B1120` و `#111B2E`) بالاتر از 4.5:1 قرار گیرد.
- **ایزوله‌سازی رنگ‌ها با CSS Variables:**
  تمامی رنگ‌های متون، پس‌زمینه‌ها، حاشیه‌ها و وضعیت‌ها از متغیرهای ریشه (`var(--bg-surface)`, `var(--border-subtle)`, `var(--brand-primary)`, `var(--status-success)`, `var(--status-error)`, `var(--status-warning)`) خوانده می‌شوند و هیچ کلاس رنگی غیرمعتبر یا سخت‌کدشده (hardcoded) باقی نمانده است.

---

## ۳. استانداردسازی مودال‌ها و اجزای مشترک (Modals & Common Components)

- **`StatusReasonModal`:**
  مهاجرت کامل به کامپوننت‌های `Button` و `Badge` به همراه حاشیه‌ها و پس‌زمینه‌های متغیر و پشتیبانی کامل از حالت بارگذاری.
- **`ConfirmModal`:**
  هماهنگ‌سازی با `Badge` و `Button` و اصلاح فاصله‌گذاری و فوکوس کیبورد.
- **`ToastContainer`:**
  استفاده مستقیم از توکن‌های status برای آیکون‌ها و متون اعلان‌ها و پس‌زمینه Elevated با شفافیت شیشه‌ای (Backdrop Blur).
- **`Header` & `Sidebar`:**
  اتصال کامل به توکن‌های تم و ارتقاء تجربه کاربری در حالت موبایل و دسکتاپ.

---

## ۴. جدول کلاس‌های کاربردی کلیدی (Design Utility Classes)

```css
/* کانتینر جداول یکدست */
.nobat-table-container {
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-2xl);
  overflow: hidden;
}

/* هدر جداول */
.nobat-table-header {
  background-color: var(--bg-subsurface);
  border-bottom: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 0.75rem;
}

/* سطر جداول با اثر Hover نرم */
.nobat-table-row {
  border-bottom: 1px solid var(--border-subtle);
  transition: background-color 0.15s ease;
}
.nobat-table-row:hover {
  background-color: var(--bg-elevated);
}
```

---

## ۵. چک‌لیست اعتبارسنجی (Validation Checklist)
- [x] عدم تغییر در منطق بیزینسی و تست‌ها
- [x] اجرای `lint_applet` و عدم وجود خطای TypeCheck / Syntax
- [x] اجرای `compile_applet` و تایید Build موفق
- [x] اجرای `npm test` و پاس شدن کامل ۶۴ تست در ۴TestSuite
- [x] ثبت سند کامل در `docs/PHASE_UX_02_DESIGN_SYSTEM.md`
