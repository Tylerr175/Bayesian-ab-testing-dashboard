'use client';

import { useState } from 'react';

// ── Content ────────────────────────────────────────────────────────────────────
// Paragraphs are plain strings — avoids JSX whitespace trimming issues that
// occur when inline elements (<em>, <strong>) land at line boundaries.

interface Item {
  question: string;
  paragraphs: string[];
  multiVariantOnly?: boolean;
}

const ITEMS: Item[] = [
  {
    question: 'What is a posterior distribution?',
    paragraphs: [
      `Before you collect any data, every conversion rate between 0% and 100% is possible. After you collect data, some rates become far more plausible than others. A posterior distribution is your updated belief about where the true rate probably lives, given what you've observed.`,
      `It's a full probability curve, not a single number. The peak shows the most likely rate; the width shows how certain you are. More visitors → narrower curve → more certainty. With only 50 visitors your curve is wide and flat. With 5,000 visitors it becomes a sharp spike.`,
      `The chart above shows each variant's posterior. Overlapping curves mean the data isn't yet decisive — both rates are consistent with what you've seen so far. Non-overlapping curves mean there's a clear winner.`,
    ],
  },
  {
    question: 'What does the credible interval mean?',
    paragraphs: [
      `A 95% credible interval like [8.3%, 12.0%] means exactly what it sounds like: given the data, there is a 95% probability that the true conversion rate falls between 8.3% and 12.0%.`,
      `This is actually what most people think a frequentist confidence interval says — but it doesn't. A classical 95% CI means: "if we repeated this experiment many times, 95% of the intervals we construct would contain the true rate." You can't say anything about this particular interval. Bayesian credible intervals don't have that limitation.`,
      `Practically: narrow interval = you have a tight grip on the true rate. Wide interval = you need more data. The shaded regions on the chart are these intervals — watch them shrink as you add more visitors.`,
    ],
  },
  {
    question: 'Why "probability of being best" instead of P(B > A)?',
    multiVariantOnly: true,
    paragraphs: [
      `With two variants, P(B > A) answers "what's the chance B's true rate is higher than A's?" — simple enough. But with three variants A, B, and C you'd have three separate pairwise probabilities that don't combine into a clear winner.`,
      `"Probability of being best" fixes this by asking: across 10,000 simulated possible worlds (random draws from each posterior), how often does each variant come out on top? The results sum to 100%, one number per variant, and directly answer the question you care about: which variant should I ship?`,
      `For two variants, P(best) and P(B > A) are identical. The generalized metric just scales cleanly to any number of variants without requiring pairwise comparisons.`,
    ],
  },
  {
    question: 'What is expected loss?',
    paragraphs: [
      `Expected loss answers: "If I declare this variant the winner right now and I'm wrong, how much conversion rate would I give up on average?"`,
      `Imagine you ship Variant B. In most possible worlds B really is best — no loss. But in some worlds A was actually better by a small margin. Expected loss averages that "oops" across all the worlds where you made the wrong call.`,
      `A loss of 0.01% means that even if you're wrong (on average), you'd only forfeit 0.01 percentage points of conversion rate — probably not worth running the test longer. A loss of 1% means you might be leaving significant gains on the table by stopping early.`,
      `The winning variant always has the lower expected loss, because it's more likely to actually be the best.`,
    ],
  },
  {
    question: 'How does the stopping rule work?',
    paragraphs: [
      `The stopping rule compares the winner's expected loss against your chosen threshold. When expected loss falls below the threshold, the analysis recommends stopping.`,
      `Think of the threshold as: "how much conversion rate am I willing to risk losing by stopping early?" Conservative (0.1%) demands near-certainty before stopping — good for core checkout flows or pricing. Balanced (0.5%) is the industry default. Aggressive (1.0%) stops earlier and accepts more uncertainty — fine for copy tweaks or low-stakes UI changes.`,
      `This approach sidesteps two classic mistakes in frequentist testing: peeking (stopping the moment p < 0.05) and running forever waiting for significance that never arrives. You set your risk tolerance upfront; the test tells you when it's met.`,
    ],
  },
  {
    question: 'What does this analysis assume?',
    paragraphs: [
      `Independence: every visitor's conversion is treated as independent of every other. This breaks down when users share accounts, when your product has social or network effects (one user's action influences another's), or when the same person can appear in both variants.`,
      `Stationarity: the true conversion rate is assumed to be stable over the life of the test. Day-of-week patterns, seasonality, a simultaneous marketing push, or a site change mid-experiment can all shift rates in ways the model can't detect.`,
      `Novelty effects: users often engage with anything that's new or different, regardless of whether it's actually better. That initial bump fades. Run for at least two full business cycles — typically two weeks minimum — before trusting a result.`,
      `Practical significance: a statistically confident result can still be too small to act on. A 0.05% lift at 99% probability might not justify an engineering sprint. Always compare the expected lift to the cost of shipping the change before calling it a win.`,
    ],
  },
  {
    question: 'How is this different from frequentist A/B testing?',
    paragraphs: [
      `Frequentist testing asks: "Assuming there's no real difference, how surprising is this data?" A p-value below 0.05 just means the result would be unlikely if nothing were going on — it says nothing about the probability that B is actually better.`,
      `Bayesian testing directly answers: "Given the data we've seen, what's the probability B is the best variant?" No pre-registered sample size, no binary pass/fail, no silent assumption that the test was run exactly once and never peeked at.`,
      `The tradeoff: Bayesian requires a prior — a starting belief before any data. This dashboard uses a uniform prior (Beta(1, 1)), which says "every conversion rate between 0 and 100% is equally plausible before we see anything." That's a sensible, conservative default for most product experiments.`,
    ],
  },
];

// ── Accordion item ─────────────────────────────────────────────────────────────

function AccordionItem({
  item, index, isOpen, onToggle,
}: {
  item: Item; index: number; isOpen: boolean; onToggle: () => void;
}) {
  return (
    <div className="border-b border-slate-100 last:border-0 dark:border-zinc-800">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className={[
          'flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors',
          'hover:bg-slate-50 dark:hover:bg-zinc-800/60',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 dark:focus-visible:ring-indigo-400',
        ].join(' ')}
      >
        {/* Number badge */}
        <span className={[
          'mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
          isOpen
            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
            : 'bg-slate-100 text-slate-500 dark:bg-zinc-700 dark:text-zinc-400',
        ].join(' ')}>
          {index + 1}
        </span>

        <span className={[
          'flex-1 text-sm font-medium leading-snug',
          isOpen
            ? 'text-indigo-700 dark:text-indigo-300'
            : 'text-slate-700 dark:text-zinc-300',
        ].join(' ')}>
          {item.question}
        </span>

        {/* Chevron */}
        <svg
          className={[
            'mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 dark:text-zinc-500',
            isOpen ? 'rotate-180' : '',
          ].join(' ')}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className="space-y-3 pb-4 pl-12 pr-4">
          {item.paragraphs.map((text, i) => (
            <p key={i} className="text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
              {text}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  isMultiVariant: boolean;
}

export default function ExplainerAccordion({ isMultiVariant }: Props) {
  const [openSet, setOpenSet] = useState<Set<number>>(new Set());

  const items = ITEMS.filter(item => !item.multiVariantOnly || isMultiVariant);

  function toggle(idx: number) {
    setOpenSet(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
      {/* Section header */}
      <div className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-3.5 dark:border-zinc-800">
        <svg className="h-4 w-4 shrink-0 text-indigo-400 dark:text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
        </svg>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
          Understanding the Results
        </h3>
        <span className="ml-auto text-xs text-slate-400 dark:text-zinc-600">
          {openSet.size === 0 ? 'click any question to expand' : `${openSet.size} open`}
        </span>
      </div>

      {/* Accordion items */}
      <div>
        {items.map((item, idx) => (
          <AccordionItem
            key={item.question}
            item={item}
            index={idx}
            isOpen={openSet.has(idx)}
            onToggle={() => toggle(idx)}
          />
        ))}
      </div>
    </div>
  );
}
