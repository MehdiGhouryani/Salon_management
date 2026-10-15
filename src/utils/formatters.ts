// Utilities for Persian formatting, currency, dates, and export

export function toPersianDigits(n: number | string): string {
  const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(n).replace(/[0-9]/g, (w) => farsiDigits[+w]);
}

export function formatCurrency(amount: number, unit: 'toman' | 'rial' = 'toman', persianDigits = true): string {
  const formatted = amount.toLocaleString('en-US');
  const unitLabel = unit === 'toman' ? 'تومان' : 'ریال';
  const text = `${formatted} ${unitLabel}`;
  return persianDigits ? toPersianDigits(text) : text;
}

export function formatNumber(n: number, persianDigits = true): string {
  const formatted = n.toLocaleString('en-US');
  return persianDigits ? toPersianDigits(formatted) : formatted;
}

export function maskPhone(phone: string): string {
  if (!phone || phone.length < 8) return phone;
  // Format: 0912***3456
  const clean = phone.replace(/\s+/g, '');
  return `${clean.slice(0, 4)}****${clean.slice(-3)}`;
}

export function maskApiKey(key: string): string {
  if (!key || key.length < 10) return '••••••••••••';
  return `${key.slice(0, 4)}••••••••••••${key.slice(-4)}`;
}

export function exportToCsv(filename: string, rows: Record<string, unknown>[]): void {
  if (!rows || !rows.length) return;
  const separator = ',';
  const keys = Object.keys(rows[0]);
  const csvContent =
    '\uFEFF' + // UTF-8 BOM for Persian excel compatibility
    keys.join(separator) +
    '\n' +
    rows
      .map((row) => {
        return keys
          .map((k) => {
            let cell = row[k] === null || row[k] === undefined ? '' : String(row[k]);
            cell = cell.replace(/"/g, '""');
            if (cell.search(/("|,|\n)/g) >= 0) {
              cell = `"${cell}"`;
            }
            return cell;
          })
          .join(separator);
      })
      .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function getStatusBadge(status: string): { label: string; bg: string; text: string; border: string } {
  switch (status) {
    case 'active':
      return { label: 'فعال', bg: 'bg-emerald-500/10 dark:bg-[#34D399]/15', text: 'text-emerald-700 dark:text-[#34D399]', border: 'border-emerald-500/20 dark:border-[#34D399]/30' };
    case 'pending':
      return { label: 'در انتظار تایید', bg: 'bg-amber-500/10 dark:bg-[#FBBF24]/15', text: 'text-amber-800 dark:text-[#FBBF24]', border: 'border-amber-500/20 dark:border-[#FBBF24]/30' };
    case 'suspended':
      return { label: 'معلق شده', bg: 'bg-rose-500/10 dark:bg-[#FB7185]/15', text: 'text-rose-700 dark:text-[#FB7185]', border: 'border-rose-500/20 dark:border-[#FB7185]/30' };
    case 'trial':
      return { label: 'دوره آزمایشی', bg: 'bg-sky-500/10 dark:bg-[#38BDF8]/15', text: 'text-sky-800 dark:text-[#38BDF8]', border: 'border-sky-500/20 dark:border-[#38BDF8]/30' };
    case 'banned':
      return { label: 'مسدود شده', bg: 'bg-rose-500/15 dark:bg-[#FB7185]/20', text: 'text-rose-800 dark:text-[#FB7185]', border: 'border-rose-500/30 dark:border-[#FB7185]/40' };
    case 'delivered':
      return { label: 'تحویل شده', bg: 'bg-emerald-500/10 dark:bg-[#34D399]/15', text: 'text-emerald-700 dark:text-[#34D399]', border: 'border-emerald-500/20 dark:border-[#34D399]/30' };
    case 'queued':
      return { label: 'در صف ارسال', bg: 'bg-sky-500/10 dark:bg-[#38BDF8]/15', text: 'text-sky-700 dark:text-[#38BDF8]', border: 'border-sky-500/20 dark:border-[#38BDF8]/30' };
    case 'failed':
      return { label: 'ناموفق', bg: 'bg-rose-500/10 dark:bg-[#FB7185]/15', text: 'text-rose-700 dark:text-[#FB7185]', border: 'border-rose-500/20 dark:border-[#FB7185]/30' };
    case 'retrying':
      return { label: 'در حال تلاش مجدد', bg: 'bg-amber-500/10 dark:bg-[#FBBF24]/15', text: 'text-amber-800 dark:text-[#FBBF24]', border: 'border-amber-500/20 dark:border-[#FBBF24]/30' };
    case 'open':
      return { label: 'باز', bg: 'bg-amber-500/10 dark:bg-[#FBBF24]/15', text: 'text-amber-800 dark:text-[#FBBF24]', border: 'border-amber-500/20 dark:border-[#FBBF24]/30' };
    case 'in_progress':
      return { label: 'در حال بررسی', bg: 'bg-sky-500/10 dark:bg-[#38BDF8]/15', text: 'text-sky-700 dark:text-[#38BDF8]', border: 'border-sky-500/20 dark:border-[#38BDF8]/30' };
    case 'resolved':
      return { label: 'حل شده', bg: 'bg-emerald-500/10 dark:bg-[#34D399]/15', text: 'text-emerald-700 dark:text-[#34D399]', border: 'border-emerald-500/20 dark:border-[#34D399]/30' };
    case 'closed':
      return { label: 'بسته شده', bg: 'bg-slate-500/10 dark:bg-[#18243A]/60', text: 'text-slate-600 dark:text-[#9AAAC2]', border: 'border-slate-500/20 dark:border-[#344258]' };
    default:
      return { label: status, bg: 'bg-slate-500/10 dark:bg-[#18243A]/60', text: 'text-slate-600 dark:text-[#9AAAC2]', border: 'border-slate-500/20 dark:border-[#344258]' };
  }
}

export function getRoleBadge(role: string): { label: string; color: string } {
  switch (role) {
    case 'super_admin':
      return { label: 'ادمین کل سیستم', color: 'text-rose-700 dark:text-[#FB7185] bg-rose-500/10 dark:bg-[#F43F7A]/15 border-rose-500/20 dark:border-[#F43F7A]/30' };
    case 'salon_admin':
      return { label: 'مدیر سالن', color: 'text-sky-700 dark:text-[#38BDF8] bg-sky-500/10 dark:bg-[#38BDF8]/15 border-sky-500/20 dark:border-[#38BDF8]/30' };
    case 'staff':
      return { label: 'آرایشگر / پرسنل', color: 'text-slate-700 dark:text-[#E7ECF5] bg-slate-100 dark:bg-[#18243A] border-slate-200 dark:border-[#344258]' };
    case 'support_auditor':
      return { label: 'پشتیبان و بازرس', color: 'text-amber-800 dark:text-[#FBBF24] bg-amber-500/10 dark:bg-[#FBBF24]/15 border-amber-500/20 dark:border-[#FBBF24]/30' };
    case 'financial_manager':
      return { label: 'مدیر مالی', color: 'text-emerald-700 dark:text-[#34D399] bg-emerald-500/10 dark:bg-[#34D399]/15 border-emerald-500/20 dark:border-[#34D399]/30' };
    default:
      return { label: role, color: 'text-slate-700 dark:text-[#9AAAC2] bg-slate-100 dark:bg-[#18243A] border-slate-200 dark:border-[#344258]' };
  }
}
