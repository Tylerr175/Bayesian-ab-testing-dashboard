import StickyHeader from '@/app/ui/StickyHeader';
import HeroSection from '@/app/ui/HeroSection';
import WhatItsForSection from '@/app/ui/WhatItsForSection';
import WhyNotDivideSection from '@/app/ui/WhyNotDivideSection';
import ProblemSection from '@/app/ui/ProblemSection';
import HowItWorksSection from '@/app/ui/HowItWorksSection';
import ToolSection from '@/app/ui/ToolSection';
import SectionDivider from '@/app/ui/SectionDivider';
import Footer from '@/app/ui/Footer';

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

      <Footer />

    </div>
  );
}
