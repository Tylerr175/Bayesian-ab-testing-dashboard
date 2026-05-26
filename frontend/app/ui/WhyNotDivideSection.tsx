'use client';

import ScrollReveal from '@/app/ui/ScrollReveal';

const naive = [
  { stat: '÷',  label: 'Looks like a clear winner',       note: 'Observed rates — not ground truth' },
  { stat: '?',  label: 'No uncertainty shown',              note: 'How confident should you actually be?' },
  { stat: '∞',  label: 'No stopping rule',                  note: 'When do you have enough data to act?' },
  { stat: '!',  label: 'Easily fooled by small samples',    note: 'Tiny differences feel meaningful' },
];

const bayesian = [
  { stat: '94%',  label: 'probability B wins',      note: 'A real answer with confidence behind it' },
  { stat: '3.1%', label: 'expected gain',            note: 'Quantifies how much better B actually is' },
  { stat: '→',    label: 'Stop when safe to ship',   note: "Tells you when more data won't change the answer" },
  { stat: '±',    label: 'Honest about uncertainty', note: "Won't declare a winner that isn't one" },
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

      <ul className={isRed ? 'space-y-6' : 'space-y-5'}>
        {items.map(({ stat, label: itemLabel, note }) => (
          <li key={itemLabel} className={`flex items-start ${isRed ? 'gap-3' : 'gap-4'}`}>
            <span
              className={[
                `${isRed ? 'w-10' : 'w-14'} shrink-0 font-mono text-xl font-bold tabular-nums`,
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

export default function WhyNotDivideSection() {
  return (
    <section className="px-6 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-3xl">

        <ScrollReveal className="mb-16">
          <div>
            <p className="font-mono text-sm text-slate-500 dark:text-zinc-500">
              02 / Why not just divide it yourself?
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-zinc-50 sm:text-5xl">
              The math feels obvious — until it isn&apos;t.
            </h2>
            <p className="mt-5 text-lg text-slate-500 dark:text-zinc-400">
              If Version A converted 100 out of 1,000 and Version B converted 130 out of 1,000, B looks like the
              clear winner. 13% beats 10%. Ship it. But here&apos;s the question nobody asks: how
              sure are you? The numbers you observed are samples, not truth. The real conversion
              rates could be anywhere — and with small samples, &ldquo;anywhere&rdquo; is a much
              bigger range than people realize.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <ScrollReveal>
            <ComparisonCard label="Just dividing the numbers" accent="red"    items={naive} />
          </ScrollReveal>
          <ScrollReveal delay={200}>
            <ComparisonCard label="What BayesLab does"        accent="indigo" items={bayesian} />
          </ScrollReveal>
        </div>

      </div>
    </section>
  );
}
