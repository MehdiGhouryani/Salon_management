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
      return { label: 'فعال', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' };
    case 'pending':
      return { label: 'در انتظار تایید', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' };
    case 'suspended':
      return { label: 'معلق شده', bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' };
    case 'trial':
      return { label: 'دوره آزمایشی', bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' };
    case 'banned':
      return { label: 'مسدود شده', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' };
    case 'delivered':
      return { label: 'تحویل شده', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' };
    case 'queued':
      return { label: 'در صف ارسال', bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/20' };
    case 'failed':
      return { label: 'ناموفق', bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' };
    case 'retrying':
      return { label: 'در حال تلاش مجدد', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' };
    case 'open':
      return { label: 'باز', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' };
    case 'in_progress':
      return { label: 'در حال بررسی', bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/20' };
    case 'resolved':
      return { label: 'حل شده', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' };
    case 'closed':
      return { label: 'بسته شده', bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' };
    default:
      return { label: status, bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' };
  }
}

export function getRoleBadge(role: string): { label: string; color: string } {
  switch (role) {
    case 'super_admin':
      return { label: 'ادمین کل سیستم', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' };
    case 'salon_admin':
      return { label: 'مدیر سالن', color: 'text-sky-400 bg-sky-500/10 border-sky-500/20' };
    case 'staff':
      return { label: 'آرایشگر / پرسنل', color: 'text-slate-300 bg-slate-500/10 border-slate-500/20' };
    case 'support_auditor':
      return { label: 'پشتیبان و بازرس', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
    case 'financial_manager':
      return { label: 'مدیر مالی', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
    default:
      return { label: role, color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' };
  }
}
