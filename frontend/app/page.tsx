import ThemeToggle from '@/app/ui/ThemeToggle';
import VariantForm from '@/app/ui/VariantForm';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">

      {/* ── Header ── */}
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 shadow-sm">
              <span className="text-base font-bold leading-none text-white">β</span>
            </div>
            <div>
              <h1 className="text-base font-semibold leading-tight text-slate-900 dark:text-slate-50">
                BayesLab
              </h1>
              <p className="text-xs text-slate-400 dark:text-slate-500">Beta-Binomial model · No p-values</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* ── Main ── */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <p className="mb-6 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          Enter visitor and conversion counts for two to six variants. The Bayesian
          Beta-Binomial model returns each variant&apos;s full posterior distribution,
          the probability each variant is the best, and an expected-loss metric
          that tells you when it&apos;s safe to stop — no arbitrary p-value threshold required.
        </p>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-8">
          <VariantForm />
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-3xl px-4 py-5 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-2 text-xs text-slate-400 dark:text-slate-500 sm:flex-row">
            <span>Built with FastAPI · Next.js · Recharts</span>
            <a
              href="https://github.com/Tylerr175/Bayesian-ab-testing-dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-slate-600 dark:hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-indigo-400 dark:focus-visible:ring-offset-slate-900 rounded"
            >
              View on GitHub →
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}
