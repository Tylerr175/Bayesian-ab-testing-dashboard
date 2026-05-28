'use client';

import { type ReactNode, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Clock, HelpCircle, Scale } from 'lucide-react';
import type { AnalyzeResponse, VariantResult } from '@/app/lib/types';
import { useCountUp } from '@/app/hooks/useCountUp';
import ExplainerAccordion from '@/app/ui/ExplainerAccordion';
import PosteriorChart from '@/app/ui/PosteriorChart';
import PriorSensitivityPanel from '@/app/ui/PriorSensitivityPanel';

function pct(v: number, decimals = 2): string {
  return (v * 100).toFixed(decimals) + '%';
}
function ciStr(lower: number, upper: number): string {
  return `${pct(lower)} – ${pct(upper)}`;
}

// ── SRM detection ─────────────────────────────────────────────────────────────
// Chi-square goodness-of-fit against a uniform expected split (p = 0.01).
// Visitor counts are recovered from posterior params — valid when the uniform
// prior Beta(1,1) was used: visitors = alpha + beta − 2.

const SRM_CRITICAL: Record<number, number> = {
  1: 6.635, 2: 9.210, 3: 11.345, 4: 13.277, 5: 15.086,
};

interface SrmResult { detected: boolean; pcts: string[] }

function detectSRM(variants: VariantResult[]): SrmResult | null {
  const visitors = variants.map(v =>
    Math.round(v.posterior_params.alpha + v.posterior_params.beta - 2)
  );
  const total = visitors.reduce((a, b) => a + b, 0);
  if (total < 100) return null; // too few visitors for a meaningful test

  const expected = total / variants.length;
  const chi2 = visitors.reduce((sum, n) => sum + (n - expected) ** 2 / expected, 0);
  const critical = SRM_CRITICAL[variants.length - 1] ?? 15.086;

  return {
    detected: chi2 > critical,
    pcts: visitors.map(n => ((n / total) * 100).toFixed(0) + '%'),
  };
}

// ── Recommendation banner ──────────────────────────────────────────────────────

function RecommendationBanner({ result }: { result: AnalyzeResponse }) {
  const { variants, recommendation } = result;
  const { action, winner, winner_loss, threshold } = recommendation;
  const winnerVariant = variants.find(v => v.name === winner);
  const winnerProb = winnerVariant?.prob_best ?? 0;

  if (action === 'STOP' && winner !== null) {
    return (
      <div className="flex items-start gap-3 rounded-xl bg-emerald-50 px-5 py-4 dark:bg-emerald-950/40">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
        <div>
          <p className="font-medium text-slate-900 dark:text-zinc-100">
            Ship Variant {winner}
          </p>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-zinc-400">
            {pct(winnerProb, 1)} probability of being best — expected loss of{' '}
            <span className="font-mono tabular-nums">{pct(winner_loss, 3)}</span> is
            below the <span className="font-mono tabular-nums">{pct(threshold)}</span> threshold.
          </p>
        </div>
      </div>
    );
  }

  if (action === 'EQUIVALENT') {
    return (
      <div className="flex items-start gap-3 rounded-xl bg-slate-100 px-5 py-4 dark:bg-zinc-800/60">
        <Scale className="mt-0.5 h-5 w-5 shrink-0 text-slate-400 dark:text-zinc-400" />
        <div>
          <p className="font-medium text-slate-900 dark:text-zinc-100">
            Either variant works
          </p>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-zinc-400">
            The difference between variants is smaller than your{' '}
            <span className="font-mono tabular-nums">{pct(threshold)}</span> threshold —
            this is the answer, not a lack of data. Collecting more visitors will confirm
            the tie with greater precision but is unlikely to produce a winner worth acting
            on. Ship either.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-xl bg-amber-50 px-5 py-4 dark:bg-amber-950/40">
      <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
      <div>
        <p className="font-medium text-slate-900 dark:text-zinc-100">
          Keep testing
        </p>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-zinc-400">
          Expected loss of{' '}
          <span className="font-mono tabular-nums">{pct(winner_loss, 3)}</span> still
          exceeds the <span className="font-mono tabular-nums">{pct(threshold)}</span> threshold
          — collect more data before deciding.
        </p>
      </div>
    </div>
  );
}

// ── Variant palette ────────────────────────────────────────────────────────────

const VARIANT_COLORS = [
  '#6366f1', '#14b8a6', '#64748b', '#d946ef', '#8b5cf6', '#06b6d4',
];

// ── Metric grid ────────────────────────────────────────────────────────────────

function MetricColumn({ label, children, animDelay = 0 }: {
  label: string; children: ReactNode; animDelay?: number;
}) {
  return (
    <motion.div
      className="px-5 py-5 sm:px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: animDelay, duration: 0.3, ease: 'easeOut' }}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-500">
        {label}
      </p>
      <div className="mt-3 space-y-2.5">{children}</div>
    </motion.div>
  );
}

function MetricRow({ variant, idx, value, isWinner }: {
  variant: VariantResult; idx: number; value: string; isWinner: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex shrink-0 items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-500">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: VARIANT_COLORS[idx % VARIANT_COLORS.length] }} />
        {variant.name}
      </span>
      <span className={[
        'font-mono text-sm tabular-nums',
        isWinner
          ? 'font-semibold text-slate-900 dark:text-zinc-100'
          : 'text-slate-400 dark:text-zinc-500',
      ].join(' ')}>
        {value}
      </span>
    </div>
  );
}

// ── Lift tooltip ───────────────────────────────────────────────────────────────

function LiftHelpIcon() {
  const [visible, setVisible] = useState(false);
  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        aria-label="What is lift?"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onClick={() => setVisible(v => !v)}
        className="text-slate-400 transition-colors duration-150 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
      >
        <HelpCircle className="h-4 w-4" />
      </button>
      {visible && (
        <div className="absolute left-full top-0 z-10 ml-2 w-[280px] rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left text-sm text-slate-700 shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
          Lift is the percentage-point difference in conversion rate between the two variants, always shown from the winner's perspective. The 95% credible interval shows the plausible range for that difference — it is shown for transparency, but it is not the decision criterion. The recommendation is driven by expected loss, not by whether the CI excludes zero.
        </div>
      )}
    </span>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props { result: AnalyzeResponse }

export default function ResultsPanel({ result }: Props) {
  const { variants, recommendation } = result;
  const { winner, action } = recommendation;

  const isStop       = action === 'STOP';
  const isEquivalent = action === 'EQUIVALENT';

  // For EQUIVALENT and KEEP_TESTING, winner is null — fall back to the highest
  // prob_best variant so the hero percentage still has something meaningful to show.
  const byProb0 = [...variants].sort((a, b) => b.prob_best - a.prob_best)[0];
  const winnerVariant = variants.find(v => v.name === winner) ?? byProb0;

  const heroColor = isStop       ? 'text-emerald-500'
                  : isEquivalent ? 'text-slate-400 dark:text-zinc-500'
                  :                'text-amber-500';

  // Sort by prob_best to find winner and runner-up for lift (works for 2–6 variants)
  const byProb       = [...variants].sort((a, b) => b.prob_best - a.prob_best);
  const liftWinner   = byProb[0];
  const liftRunnerUp = byProb[1];

  // Lift is always computed in the direction of the winner so it reads as positive.
  // CI via normal approximation of independent Beta posteriors.
  const liftMean = liftWinner.posterior_mean - liftRunnerUp.posterior_mean;
  const betaVar = (a: number, b: number) => { const n = a + b; return (a * b) / (n * n * (n + 1)); };
  const liftStdErr = Math.sqrt(
    betaVar(liftWinner.posterior_params.alpha, liftWinner.posterior_params.beta) +
    betaVar(liftRunnerUp.posterior_params.alpha, liftRunnerUp.posterior_params.beta)
  );
  const liftCILower  = liftMean - 1.96 * liftStdErr;
  const liftCIUpper  = liftMean + 1.96 * liftStdErr;
  const liftEquivalent = liftCILower <= 0;

  // Count-up animation on the hero probability
  const animatedProb = useCountUp(winnerVariant.prob_best, 600);

  const srm = detectSRM(variants);

  return (
    <motion.div
      className="mt-10 space-y-8"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <hr className="border-slate-200 dark:border-zinc-800" />

      {/* ── SRM warning ── */}
      {srm?.detected && (
        <div className="flex items-start gap-3 rounded-xl border border-yellow-200 bg-yellow-50 px-5 py-4 dark:border-yellow-900/40 dark:bg-yellow-950/30">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-500 dark:text-yellow-400" />
          <div>
            <p className="font-medium text-slate-900 dark:text-zinc-100">
              Sample ratio mismatch detected
            </p>
            <p className="mt-0.5 text-sm text-slate-600 dark:text-zinc-400">
              Your traffic split ({srm.pcts.join(' / ')}) differs significantly from the
              expected equal split. This often indicates a randomization or logging bug —
              the groups may not be comparable. Treat these results with caution.
            </p>
          </div>
        </div>
      )}

      {/* ── Hero block ── */}
      <div className="py-4 text-center">
        <p className={`font-mono text-7xl font-bold tabular-nums tracking-tight ${heroColor}`}>
          {pct(animatedProb, 1)}
        </p>

        <p className="mt-3 text-base text-slate-600 dark:text-zinc-400">
          {isEquivalent
            ? `Variant ${winnerVariant.name} leads slightly — no meaningful difference`
            : `probability that Variant ${winnerVariant.name} is the best`}
        </p>

        {variants.length === 2 && (
          <div className="mt-4 flex flex-col items-center gap-1.5">
            {/* Only show the "equivalent" shortcut when the overall action also says
                equivalent — otherwise show the lift numbers even if the CI spans zero,
                so the STOP banner and the lift section never contradict each other. */}
            {liftEquivalent && !isStop ? (
              <span className="text-sm text-slate-500 dark:text-zinc-400">
                Variants performed equivalently
              </span>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <span className={[
                    'rounded-full px-3 py-1 font-mono text-sm font-medium tabular-nums',
                    liftEquivalent
                      ? 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400'
                      : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400',
                  ].join(' ')}>
                    +{pct(liftMean)} lift
                  </span>
                  <LiftHelpIcon />
                </div>
                <p className="text-xs text-slate-400 dark:text-zinc-500">
                  95% CI: {pct(liftCILower)} to {pct(liftCIUpper)}
                  {liftEquivalent && ' — CI includes zero'}
                </p>
              </>
            )}
          </div>
        )}

        <div className="mx-auto mt-6 max-w-lg text-left">
          <RecommendationBanner result={result} />
        </div>
      </div>

      {/* ── Supporting metrics grid ── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-zinc-800">
        <div className="grid grid-cols-1 divide-y divide-slate-200 dark:divide-zinc-800 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <MetricColumn label="Conversion Rate" animDelay={0}>
            {variants.map((v, idx) => (
              <MetricRow key={v.name} variant={v} idx={idx} isWinner={v.name === winner}
                value={pct(v.posterior_mean)} />
            ))}
          </MetricColumn>
          <MetricColumn label="95% Credible Interval" animDelay={0.1}>
            {variants.map((v, idx) => (
              <MetricRow key={v.name} variant={v} idx={idx} isWinner={v.name === winner}
                value={ciStr(v.credible_interval.lower, v.credible_interval.upper)} />
            ))}
          </MetricColumn>
          <MetricColumn label="Expected Loss" animDelay={0.2}>
            {variants.map((v, idx) => (
              <MetricRow key={v.name} variant={v} idx={idx} isWinner={v.name === winner}
                value={pct(v.expected_loss, 3)} />
            ))}
          </MetricColumn>
        </div>
      </div>

      {/* ── Chart ── */}
      <PosteriorChart variants={variants} />

      {/* ── Prior sensitivity ── */}
      <PriorSensitivityPanel result={result} />

      {/* ── Explainer accordion ── */}
      <ExplainerAccordion isMultiVariant={variants.length > 2} />
    </motion.div>
  );
}
