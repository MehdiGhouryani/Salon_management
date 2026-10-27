import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface ThemeToggleProps {
  variant?: 'pill' | 'icon' | 'segmented' | 'switch';
  className?: string;
  showLabels?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = 'segmented',
  className = '',
  showLabels = true,
}) => {
  const { isDark, toggleTheme, setTheme } = useTheme();

  if (variant === 'segmented') {
    return (
      <div
        className={`inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-elevated border border-slate-200 dark:border-border-default shadow-xs text-xs font-semibold select-none transition-colors ${className}`}
        role="group"
        aria-label="انتخاب تم روشنایی"
      >
        <button
          type="button"
          onClick={() => setTheme('light')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
            !isDark
              ? 'bg-white text-slate-900 shadow-xs font-bold border border-slate-200'
              : 'text-text-muted hover:text-slate-900 dark:text-text-muted dark:hover:text-text-main'
          }`}
          title="حالت روز (روشن)"
        >
          <Sun className="w-3.5 h-3.5 text-amber-500" />
          {showLabels && <span>روز</span>}
        </button>

        <button
          type="button"
          onClick={() => setTheme('dark')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
            isDark
              ? 'bg-dk-surface text-[#FB7185] shadow-xs font-bold border border-dk-border'
              : 'text-text-muted hover:text-slate-900 dark:text-text-muted dark:hover:text-text-main'
          }`}
          title="حالت شب (تیره)"
        >
          <Moon className="w-3.5 h-3.5 text-brand-accent" />
          {showLabels && <span>شب</span>}
        </button>
      </div>
    );
  }

  if (variant === 'switch') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`w-full flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer hover:bg-slate-100 dark:hover:bg-elevated ${className}`}
        title={isDark ? 'تغییر به حالت روز' : 'تغییر به حالت شب'}
      >
        <div className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-text-main">
          {isDark ? (
            <Moon className="w-4 h-4 text-brand-accent" />
          ) : (
            <Sun className="w-4 h-4 text-amber-500" />
          )}
          <span>{isDark ? 'حالت شب فعال است' : 'حالت روز فعال است'}</span>
        </div>

        <div
          className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${
            isDark ? 'bg-brand justify-end' : 'bg-slate-300 justify-start'
          }`}
        >
          <div className="w-4 h-4 rounded-full bg-white shadow-xs transition-transform" />
        </div>
      </button>
    );
  }

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer bg-slate-100 hover:bg-slate-200/80 dark:bg-elevated dark:hover:bg-dk-hover text-slate-800 dark:text-text-main border border-slate-200 dark:border-border-default shadow-xs active:scale-95 ${className}`}
        title={isDark ? 'تغییر به حالت روز' : 'تغییر به حالت شب'}
        aria-label="تغییر تم"
      >
        {isDark ? (
          <>
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            <span>حالت روز</span>
          </>
        ) : (
          <>
            <Moon className="w-3.5 h-3.5 text-brand-accent" />
            <span>حالت شب</span>
          </>
        )}
      </button>
    );
  }

  // Default 'icon' variant
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`p-2 rounded-xl transition-all cursor-pointer bg-slate-100 hover:bg-slate-200/80 dark:bg-elevated dark:hover:bg-dk-hover text-slate-700 dark:text-text-main border border-slate-200 dark:border-border-default shadow-xs active:scale-95 flex items-center justify-center ${className}`}
      title={isDark ? 'تغییر به حالت روز' : 'تغییر به حالت شب'}
      aria-label="تغییر تم"
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400" />
      ) : (
        <Moon className="w-4 h-4 text-brand-accent dark:text-brand-accent" />
      )}
    </button>
  );
};
