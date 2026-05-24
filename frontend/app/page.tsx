import ThemeToggle from '@/app/ui/ThemeToggle';
import VariantForm from '@/app/ui/VariantForm';

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-zinc-950">

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md dark:bg-zinc-950/80 animate-fade-up">
        {/* Signature gradient strip — 1px above the border */}
        <div className="h-px w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" />
        <div className="border-b border-slate-200 dark:border-zinc-800">
          <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-6 sm:px-8">

            {/* ── Wordmark ── */}
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 shadow-inner">
                <span className="text-sm font-bold leading-none text-white">β</span>
              </div>
              <div>
                <h1 className="text-base font-semibold leading-tight tracking-tight text-slate-900 dark:text-zinc-50">
                  BayesLab
                </h1>
                <p className="text-xs font-medium text-slate-500 dark:text-zinc-500">
                  Bayesian A/B Analysis
                </p>
              </div>
            </div>

            {/* ── Right side ── */}
            <div className="flex items-center gap-3">
              <a
                href="https://github.com/Tylerr175/Bayesian-ab-testing-dashboard"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View source on GitHub"
                className={[
                  'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                  'text-slate-500 hover:bg-slate-100 hover:text-slate-700',
                  'dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
                  'dark:focus-visible:ring-indigo-400 dark:focus-visible:ring-offset-zinc-900',
                ].join(' ')}
              >
                <GitHubIcon />
              </a>
              <ThemeToggle />
            </div>

          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 sm:px-8 sm:py-20 animate-fade-up animation-delay-200">
        <p className="mb-8 text-sm leading-relaxed text-slate-500 dark:text-zinc-400">
          Enter visitor and conversion counts for two to six variants. The Bayesian
          Beta-Binomial model returns each variant&apos;s full posterior distribution,
          the probability each variant is the best, and an expected-loss metric
          that tells you when it&apos;s safe to stop — no arbitrary p-value threshold required.
        </p>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <VariantForm />
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 animate-fade-up animation-delay-400">
        <div className="mx-auto max-w-3xl px-6 py-8 sm:px-8">
          <div className="flex flex-col items-center justify-between gap-2 text-xs text-slate-400 dark:text-zinc-500 sm:flex-row">
            <span>Built with FastAPI · Next.js · Recharts</span>
            <a
              href="https://github.com/Tylerr175/Bayesian-ab-testing-dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded transition-colors hover:text-slate-600 dark:hover:text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-indigo-400 dark:focus-visible:ring-offset-zinc-950"
            >
              View on GitHub →
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}
