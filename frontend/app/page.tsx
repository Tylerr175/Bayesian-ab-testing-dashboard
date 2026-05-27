import StickyHeader from '@/app/ui/StickyHeader';
import HeroSection from '@/app/ui/HeroSection';
import WhatItsForSection from '@/app/ui/WhatItsForSection';
import WhyNotDivideSection from '@/app/ui/WhyNotDivideSection';
import ProblemSection from '@/app/ui/ProblemSection';
import HowItWorksSection from '@/app/ui/HowItWorksSection';
import ToolSection from '@/app/ui/ToolSection';

function SectionDivider() {
  return (
    <div className="px-6 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-zinc-800" />
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">

      <StickyHeader />

      {/* ── Scroll-narrative sections ── */}
      <main className="flex-1">
        <HeroSection />
        <SectionDivider />
        <WhatItsForSection />
        <SectionDivider />
        <WhyNotDivideSection />
        <SectionDivider />
        <ProblemSection />
        <SectionDivider />
        <HowItWorksSection />
        <SectionDivider />

        {/* ── Estimator hint ── */}
        <div className="px-6 py-6 sm:px-8">
          <div className="mx-auto max-w-3xl">
            <div className="flex flex-col gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 px-5 py-4 dark:border-indigo-900/40 dark:bg-indigo-950/20 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600 dark:text-zinc-400">
                <span className="font-medium text-slate-800 dark:text-zinc-200">Don&apos;t have data yet?</span>
                {' '}Estimate the sample size you&apos;ll need for your test before you start.
              </p>
              <a
                href="/estimator"
                className="shrink-0 text-sm font-medium text-indigo-600 transition-colors duration-150 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 focus-visible:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                Estimate sample size →
              </a>
            </div>
          </div>
        </div>

        <ToolSection />
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto max-w-3xl px-6 py-10 sm:px-8">

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">

            {/* Col 1 — Brand */}
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 shadow-inner">
                  <span className="text-xs font-bold leading-none text-white">β</span>
                </div>
                <span className="text-sm font-semibold text-slate-900 dark:text-zinc-50">BayesLab</span>
              </div>
              <p className="mt-2.5 text-sm text-slate-500 dark:text-zinc-500">
                Bayesian inference for A/B testing
              </p>
            </div>

            {/* Col 2 — Resources */}
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-500">
                Resources
              </p>
              <ul className="mt-3 space-y-2.5">
                {[
                  { label: 'How it works', href: '#explainer' },
                  { label: 'Methodology',  href: 'https://github.com/Tylerr175/Bayesian-ab-testing-dashboard#methodology' },
                  { label: 'GitHub repo',  href: 'https://github.com/Tylerr175/Bayesian-ab-testing-dashboard' },
                ].map(({ label, href }) => (
                  <li key={label}>
                    <a
                      href={href}
                      target={href.startsWith('http') ? '_blank' : undefined}
                      rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
                      className="text-sm text-slate-600 transition-colors duration-150 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 focus-visible:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-indigo-500 dark:focus-visible:ring-indigo-400"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 3 — About */}
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-500">
                About
              </p>
              <ul className="mt-3 space-y-2.5">
                {[
                  { label: 'Built by Tyler Greenwell', href: 'https://linkedin.com/in/tylergreenwell' },
                  { label: 'Source code',              href: 'https://github.com/Tylerr175/Bayesian-ab-testing-dashboard' },
                ].map(({ label, href }) => (
                  <li key={label}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-slate-600 transition-colors duration-150 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 focus-visible:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-indigo-500 dark:focus-visible:ring-indigo-400"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

          </div>

          <div className="mt-10 border-t border-slate-200 pt-6 text-center dark:border-zinc-800">
            <p className="text-xs text-slate-400 dark:text-zinc-600">
              © 2026 Tyler Greenwell · Open source under the MIT license
            </p>
          </div>

        </div>
      </footer>

    </div>
  );
}
