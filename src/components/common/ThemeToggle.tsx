import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface ThemeToggleProps {
  variant?: 'pill' | 'icon' | 'segmented';
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ variant = 'icon', className = '' }) => {
  const { theme, toggleTheme, setTheme, isDark } = useTheme();

  if (variant === 'segmented') {
    return (
      <div
        className={`inline-flex items-center p-1 rounded-xl bg-stone-100 dark:bg-zinc-800/90 border border-stone-200/90 dark:border-zinc-700/80 shadow-xs text-xs font-semibold select-none ${className}`}
        role="group"
        aria-label="انتخاب حالت روشنایی"
      >
        <button
          type="button"
          onClick={() => setTheme('light')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
            !isDark
              ? 'bg-white text-zinc-900 shadow-xs font-bold border border-stone-200/60'
              : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`}
          title="حالت روز (روشن)"
        >
          <Sun className="w-3.5 h-3.5 text-amber-500" />
          <span>روز</span>
        </button>

        <button
          type="button"
          onClick={() => setTheme('dark')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
            isDark
              ? 'bg-zinc-900 text-white shadow-xs font-bold border border-zinc-700'
              : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`}
          title="حالت شب (تیره)"
        >
          <Moon className="w-3.5 h-3.5 text-rose-400" />
          <span>شب</span>
        </button>
      </div>
    );
  }

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer bg-stone-100 hover:bg-stone-200/80 dark:bg-zinc-800/90 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-stone-200 dark:border-zinc-700 shadow-xs active:scale-95 ${className}`}
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
            <Moon className="w-3.5 h-3.5 text-rose-600" />
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
      className={`relative p-2 rounded-xl transition-all cursor-pointer bg-stone-100 hover:bg-stone-200/80 dark:bg-zinc-800/90 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-stone-200 dark:border-zinc-700 shadow-xs active:scale-95 ${className}`}
      title={isDark ? 'تغییر به حالت روز' : 'تغییر به حالت شب'}
      aria-label="تغییر تم"
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400 animate-in fade-in zoom-in-75 duration-200" />
      ) : (
        <Moon className="w-4 h-4 text-rose-600 animate-in fade-in zoom-in-75 duration-200" />
      )}
    </button>
  );
};
