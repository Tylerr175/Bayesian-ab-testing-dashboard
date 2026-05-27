'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggle from '@/app/ui/ThemeToggle';

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={[
        'rounded px-3 py-1.5 text-xs font-medium transition-colors duration-150 sm:text-sm',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
        'dark:focus-visible:ring-indigo-400 dark:focus-visible:ring-offset-zinc-950',
        active
          ? 'text-indigo-600 dark:text-indigo-400'
          : 'text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200',
      ].join(' ')}
    >
      {children}
    </Link>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

export default function StickyHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // Show border once the user has scrolled past most of the hero section
    const threshold = window.innerHeight - 80;
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll(); // sync on mount in case page loads mid-scroll
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md dark:bg-zinc-950/80 animate-fade-up">
      {/* Signature gradient strip */}
      <div className="h-px w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" />

      {/* Bottom border fades in once past the hero */}
      <div
        className={`border-b transition-colors duration-300 ${
          scrolled
            ? 'border-slate-200 dark:border-zinc-800'
            : 'border-transparent'
        }`}
      >
        <div className="mx-auto flex h-14 max-w-3xl items-center px-6 sm:px-8">

          {/* Wordmark */}
          <div className="flex shrink-0 items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 shadow-inner">
              <span className="text-sm font-bold leading-none text-white">β</span>
            </div>
            <div>
              <p className="text-base font-semibold leading-tight tracking-tight text-slate-900 dark:text-zinc-50">
                BayesLab
              </p>
              <p className="text-xs font-medium text-slate-500 dark:text-zinc-500">
                Bayesian A/B Analysis
              </p>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex flex-1 items-center justify-center gap-1" aria-label="Main navigation">
            <NavLink href="/">Analyze</NavLink>
            <NavLink href="/estimator">Estimate</NavLink>
          </nav>

          {/* Right side */}
          <div className="flex shrink-0 items-center gap-4">
            <a
              href="https://github.com/Tylerr175/Bayesian-ab-testing-dashboard"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View source on GitHub"
              className={[
                'flex items-center gap-1.5 rounded transition-colors duration-150',
                'text-slate-400 hover:text-slate-700',
                'dark:text-zinc-500 dark:hover:text-zinc-300',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                'focus-visible:ring-offset-2 focus-visible:ring-offset-white',
                'dark:focus-visible:ring-indigo-400 dark:focus-visible:ring-offset-zinc-950',
              ].join(' ')}
            >
              <GitHubIcon />
              <span className="text-sm font-medium">GitHub</span>
            </a>
            <ThemeToggle />
          </div>

        </div>
      </div>
    </header>
  );
}
