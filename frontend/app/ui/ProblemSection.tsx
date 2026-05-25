'use client';

import ScrollReveal from '@/app/ui/ScrollReveal';

const problems = [
  { stat: '< 0.05', label: 'p-value threshold', note: 'Arbitrary cutoff invented in the 1920s' },
  { stat: '∞',      label: 'sample size needed', note: 'Running tests longer doesn\'t always help' },
  { stat: '?',      label: 'practical significance', note: 'A significant result can still be useless' },
];

const solutions = [
  { stat: '94%',  label: 'probability B wins', note: 'A direct answer to your actual question' },
  { stat: '0.3%', label: 'expected loss',       note: 'Know the cost of being wrong before you ship' },
  { stat: '2–6',  label: 'variants at once',    note: 'Compare multiple ideas in a single test' },
];

function ComparisonCard({
  label,
  accent,
  items,
}: {
  label: string;
  accent: 'red' | 'indigo';
  items: { stat: string; label: string; note: string }[];
}) {
  const isRed = accent === 'red';

  return (
    <div
      className={[
        'rounded-2xl border p-8 h-full',
        isRed
          ? 'border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'
          : 'border-indigo-200/60 bg-indigo-50/40 dark:border-indigo-800/40 dark:bg-indigo-950/20',
      ].join(' ')}
    >
      <p
        className={[
          'mb-6 text-xs font-medium uppercase tracking-wider',
          isRed ? 'text-rose-500 dark:text-rose-400' : 'text-indigo-500 dark:text-indigo-400',
        ].join(' ')}
      >
        {label}
      </p>

      <ul className="space-y-5">
        {items.map(({ stat, label: itemLabel, note }) => (
          <li key={itemLabel} className="flex items-start gap-4">
            <span
              className={[
                'w-14 shrink-0 font-mono text-xl font-bold tabular-nums',
                isRed
                  ? 'text-rose-400 dark:text-rose-500'
                  : 'text-indigo-500 dark:text-indigo-400',
              ].join(' ')}
            >
              {stat}
            </span>
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-zinc-200">{itemLabel}</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-500">{note}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ProblemSection() {
  return (
    <section id="explainer" className="px-6 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-3xl">

        <ScrollReveal className="mb-16">
          <div>
            <p className="font-mono text-sm text-slate-500 dark:text-zinc-500">
              01 / The problem
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-zinc-50 sm:text-5xl">
              Frequentist A/B testing answers the wrong question.
            </h2>
            <p className="mt-5 text-lg text-slate-500 dark:text-zinc-400">
              You want to know{' '}
              <em className="not-italic text-slate-700 dark:text-zinc-300">which variant is better</em>.
              {' '}The null-hypothesis framework tells you whether your data is surprising under an
              assumption of no difference — which is not what you asked.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <ScrollReveal>
            <ComparisonCard label="The naive approach" accent="red"    items={problems} />
          </ScrollReveal>
          <ScrollReveal delay={200}>
            <ComparisonCard label="What BayesLab does" accent="indigo" items={solutions} />
          </ScrollReveal>
        </div>

      </div>
    </section>
  );
}
