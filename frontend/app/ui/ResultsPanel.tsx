'use client';

import { type ReactNode, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Clock, HelpCircle } from 'lucide-react';
import type { AnalyzeResponse, VariantResult } from '@/app/lib/types';
import { useCountUp } from '@/app/hooks/useCountUp';
import ExplainerAccordion from '@/app/ui/ExplainerAccordion';
import PosteriorChart from '@/app/ui/PosteriorChart';

function pct(v: number, decimals = 2): string {
  return (v * 100).toFixed(decimals) + '%';
}
function ciStr(lower: number, upper: number): string {
  return `${pct(lower)} – ${pct(upper)}`;
}

// ── Recommendation banner ──────────────────────────────────────────────────────

function RecommendationBanner({ result }: { result: AnalyzeResponse }) {
  const { variants, recommendation } = result;
  const { action, winner, winner_loss, threshold } = recommendation;
  const isStop = action === 'STOP';
  const winnerVariant = variants.find(v => v.name === winner);
  const winnerProb = winnerVariant?.prob_best ?? 0;

  if (isStop && winner !== null) {
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
  '#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4',
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
          Lift is the percentage-point difference in conversion rate between the two variants, always shown from the winner's perspective. The 95% credible interval tells you the plausible range for that difference — if it excludes zero, the result is meaningful.
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

  const isStop = action === 'STOP';
  const winnerVariant = variants.find(v => v.name === winner) ?? variants[0];

  const heroColor = isStop ? 'text-emerald-500' : 'text-amber-500';

  // Sort by prob_best to find winner and runner-up for lift (works for 2–6 variants)
  const byProb = [...variants].sort((a, b) => b.prob_best - a.prob_best);
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

  return (
    <motion.div
      className="mt-10 space-y-8"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <hr className="border-slate-200 dark:border-zinc-800" />

      {/* ── Hero block ── */}
      <div className="py-4 text-center">
        <p className={`font-mono text-7xl font-bold tabular-nums tracking-tight ${heroColor}`}>
          {pct(animatedProb, 1)}
        </p>

        <p className="mt-3 text-base text-slate-600 dark:text-zinc-400">
          probability that Variant {winnerVariant.name} is the best
        </p>

        {variants.length === 2 && (
          <div className="mt-4 flex flex-col items-center gap-1.5">
            {liftEquivalent ? (
              <span className="text-sm text-slate-500 dark:text-zinc-400">
                Variants performed equivalently
              </span>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <span className="rounded-full bg-emerald-50 px-3 py-1 font-mono text-sm font-medium tabular-nums text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                    +{pct(liftMean)} lift
                  </span>
                  <LiftHelpIcon />
                </div>
                <p className="text-xs text-slate-400 dark:text-zinc-500">
                  95% CI: {pct(liftCILower)} to {pct(liftCIUpper)}
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

      {/* ── Explainer accordion ── */}
      <ExplainerAccordion isMultiVariant={variants.length > 2} />
    </motion.div>
  );
}
