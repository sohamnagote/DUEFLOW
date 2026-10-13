import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { motion } from 'motion/react';

interface ThemeToggleProps {
  variant?: 'icon' | 'dropdown-row' | 'segmented';
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ variant = 'icon', className = '' }) => {
  const { theme, isDark, toggleTheme, setTheme } = useTheme();

  if (variant === 'dropdown-row') {
    return (
      <div className={`flex items-center justify-between px-3 py-2 text-xs font-semibold text-[#1b1c19] dark:text-[#f3f6fa] hover:bg-[#f5f3ee] dark:hover:bg-[#203046] rounded-lg transition-colors ${className}`}>
        <div className="flex items-center gap-2.5">
          <span className="material-symbols-outlined text-[18px] text-[#44474d] dark:text-[#94a3b8]">
            {isDark ? 'dark_mode' : 'light_mode'}
          </span>
          <span>Theme</span>
        </div>
        <button
          onClick={toggleTheme}
          type="button"
          aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
          className="relative inline-flex items-center h-6 w-11 rounded-full bg-[#e4e2dd] dark:bg-[#334155] transition-colors cursor-pointer p-0.5"
        >
          <motion.div
            className="w-5 h-5 rounded-full bg-white dark:bg-[#0f172a] shadow-sm flex items-center justify-center text-[#15263c] dark:text-[#38bdf8]"
            animate={{ x: isDark ? 20 : 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          >
            <span className="material-symbols-outlined text-[12px]">
              {isDark ? 'dark_mode' : 'light_mode'}
            </span>
          </motion.div>
        </button>
      </div>
    );
  }

  if (variant === 'segmented') {
    return (
      <div className={`grid grid-cols-2 gap-3 max-w-sm ${className}`}>
        <button
          type="button"
          onClick={() => setTheme('light')}
          className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
            !isDark
              ? 'border-[#001126] dark:border-white bg-[#ffffff] dark:bg-[#1a283c] shadow-sm ring-2 ring-[#001126]/10 dark:ring-white/20'
              : 'border-[#001126]/10 dark:border-white/10 hover:border-[#001126]/20 dark:hover:border-white/20 bg-[#fbf9f4] dark:bg-[#141f2e]'
          }`}
        >
          <div className="w-10 h-10 rounded-lg bg-[#f0eee9] dark:bg-[#203046] flex items-center justify-center text-[#001126] dark:text-white">
            <span className="material-symbols-outlined text-[20px]">light_mode</span>
          </div>
          <span className="text-xs font-bold text-[#001126] dark:text-white">Light mode</span>
          <span className="text-[10px] text-[#74777d] dark:text-[#94a3b8]">Warm off-white</span>
        </button>

        <button
          type="button"
          onClick={() => setTheme('dark')}
          className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
            isDark
              ? 'border-[#38bdf8] bg-[#1a283c] shadow-sm ring-2 ring-[#38bdf8]/30'
              : 'border-[#001126]/10 dark:border-white/10 hover:border-[#001126]/20 dark:hover:border-white/20 bg-[#fbf9f4] dark:bg-[#141f2e]'
          }`}
        >
          <div className="w-10 h-10 rounded-lg bg-[#203046] flex items-center justify-center text-[#38bdf8]">
            <span className="material-symbols-outlined text-[20px]">dark_mode</span>
          </div>
          <span className="text-xs font-bold text-[#001126] dark:text-white">Dark mode</span>
          <span className="text-[10px] text-[#74777d] dark:text-[#94a3b8]">Deep charcoal</span>
        </button>
      </div>
    );
  }

  // Default: 'icon'
  return (
    <button
      onClick={toggleTheme}
      type="button"
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className={`btn-icon-subtle relative overflow-hidden ${className}`}
    >
      <motion.div
        key={theme}
        initial={{ rotate: -90, scale: 0.7, opacity: 0 }}
        animate={{ rotate: 0, scale: 1, opacity: 1 }}
        exit={{ rotate: 90, scale: 0.7, opacity: 0 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center justify-center"
      >
        <span className="material-symbols-outlined text-[19px]">
          {isDark ? 'dark_mode' : 'light_mode'}
        </span>
      </motion.div>
    </button>
  );
};
