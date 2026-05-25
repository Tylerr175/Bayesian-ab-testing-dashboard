'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/app/providers/ThemeProvider';

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle color theme"
      className={[
        'flex items-center justify-center rounded p-1 transition-colors duration-150',
        'text-slate-400 hover:text-slate-700',
        'dark:text-zinc-500 dark:hover:text-zinc-300',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
        'focus-visible:ring-offset-2 focus-visible:ring-offset-white',
        'dark:focus-visible:ring-indigo-400 dark:focus-visible:ring-offset-zinc-950',
      ].join(' ')}
    >
      <AnimatePresence mode="wait" initial={false}>
        {theme === 'light' ? (
          <motion.span
            key="moon"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <Moon className="h-4 w-4" />
          </motion.span>
        ) : (
          <motion.span
            key="sun"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <Sun className="h-4 w-4" />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
