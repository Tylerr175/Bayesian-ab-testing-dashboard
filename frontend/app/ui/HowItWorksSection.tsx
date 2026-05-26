'use client';

import ScrollReveal from '@/app/ui/ScrollReveal';

const steps = [
  {
    num: '01',
    title: 'Enter your data',
    body:  'Add two to six variants with visitor and conversion counts. Name them anything — upload a CSV or type manually.',
  },
  {
    num: '02',
    title: 'Model the posteriors',
    body:  "A Beta-Binomial conjugate model fits each variant's conversion rate. No assumptions about normality, no minimum sample sizes.",
  },
  {
    num: '03',
    title: 'Read the verdict',
    body:  'Get the probability each variant is the best, expected loss from choosing wrong, and a plain-English recommendation to act on.',
  },
];

export default function HowItWorksSection() {
  return (
    <section className="px-6 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-3xl">

        <ScrollReveal className="mb-16">
          <div>
            <p className="font-mono text-sm text-slate-500 dark:text-zinc-500">
              04 / How it works
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-zinc-50 sm:text-5xl">
              Three steps from data to decision.
            </h2>
          </div>
        </ScrollReveal>

        <div role="list">
          {steps.map(({ num, title, body }, i) => (
            <ScrollReveal key={num} delay={i * 150}>
              <div
                role="listitem"
                className={`group relative flex gap-8 ${i < steps.length - 1 ? 'pb-12' : ''}`}
              >
                {/* Connector line */}
                {i < steps.length - 1 && (
                  <div className="absolute left-[27px] top-12 h-full w-px bg-slate-100 dark:bg-zinc-800" />
                )}

                {/* Step badge */}
                <div className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-indigo-200/60 bg-indigo-50/60 dark:border-indigo-800/40 dark:bg-indigo-950/30">
                  <span className="font-mono text-sm font-bold text-indigo-500 dark:text-indigo-400">
                    {num}
                  </span>
                </div>

                {/* Text */}
                <div className="pt-3">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-zinc-50">
                    {title}
                  </h3>
                  <p className="mt-2 text-base leading-relaxed text-slate-500 dark:text-zinc-400">
                    {body}
                  </p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

      </div>
    </section>
  );
}
