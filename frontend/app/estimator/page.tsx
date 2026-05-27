import StickyHeader from '@/app/ui/StickyHeader';
import ScrollReveal from '@/app/ui/ScrollReveal';
import EstimatorForm from '@/app/ui/EstimatorForm';

function SectionDivider() {
  return (
    <div className="px-6 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-zinc-800" />
      </div>
    </div>
  );
}

export default function EstimatorPage() {
  return (
    <div className="flex min-h-screen flex-col">

      <StickyHeader />

      <main className="flex-1">

        {/* ── Section 1: Hero ── */}
        <section className="relative flex min-h-screen flex-col items-center justify-center px-6 pb-24 pt-16 sm:px-8">
          <div className="mx-auto max-w-2xl text-center">

            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600 dark:border-indigo-800/60 dark:bg-indigo-950/50 dark:text-indigo-400">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
              Bayesian A/B Testing
            </span>

            <ScrollReveal className="mt-6">
              <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-zinc-50 sm:text-5xl lg:text-6xl">
                Sample size estimator
              </h1>
            </ScrollReveal>

            <ScrollReveal delay={150} className="mt-6">
              <p className="text-lg leading-relaxed text-slate-500 dark:text-zinc-400 sm:text-xl">
                Before you start a test, find out how many visitors you&apos;ll need to detect a meaningful difference.
              </p>
            </ScrollReveal>

            <div className="mt-8">
              <a
                href="#estimator"
                className="inline-flex h-12 items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-8 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 hover:shadow-[0_4px_14px_0_rgb(99,102,241,0.4)] active:scale-[0.98]"
              >
                Get started
              </a>
            </div>

          </div>
        </section>

        <SectionDivider />

        {/* ── Section 2: When to use this ── */}
        <section className="px-6 py-16 sm:px-8 sm:py-24">
          <div className="mx-auto max-w-3xl">
            <ScrollReveal>
              <div>
                <p className="font-mono text-sm text-slate-500 dark:text-zinc-500">
                  01 / When to use this
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-zinc-50 sm:text-5xl">
                  Planning ahead beats guessing.
                </h2>
                <div className="mt-5 space-y-4 text-lg text-slate-500 dark:text-zinc-400">
                  <p>
                    This tool is for the planning stage — before your test goes live. Give it your current conversion rate and the smallest lift you&apos;d care about detecting, and it tells you how many visitors each variant needs before the results will be trustworthy.
                  </p>
                  <p>
                    Skipping this step is one of the most common testing mistakes. Running a test without knowing your sample size means you might stop too early and ship a winner that isn&apos;t one, or collect data indefinitely without realising you never had enough traffic to detect what you were looking for.
                  </p>
                  <p>
                    If you already have test data and want to analyse results, you want the analyzer instead.{' '}
                    <a
                      href="/"
                      className="font-medium text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400 focus-visible:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-indigo-500"
                    >
                      ← Run an analysis instead
                    </a>
                  </p>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        <SectionDivider />

        {/* ── Section 3 + 4: Form and results ── */}
        <section id="estimator" className="px-6 py-16 sm:px-8 sm:py-24">
          <div className="mx-auto max-w-3xl">

            <ScrollReveal className="mb-16">
              <div>
                <p className="font-mono text-sm text-slate-500 dark:text-zinc-500">
                  02 / The estimator
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-zinc-50 sm:text-5xl">
                  Tell me about your test.
                </h2>
                <p className="mt-5 text-lg text-slate-500 dark:text-zinc-400">
                  Enter your baseline conversion rate and the lift you want to be able to detect. Results appear in a few seconds.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={150}>
              <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <EstimatorForm />
              </div>
            </ScrollReveal>

          </div>
        </section>

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
                  { label: 'Analyzer',      href: '/' },
                  { label: 'How it works',  href: '/#explainer' },
                  { label: 'GitHub repo',   href: 'https://github.com/Tylerr175/Bayesian-ab-testing-dashboard' },
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
