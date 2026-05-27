'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import type { EstimateResponse } from '@/app/lib/types';
import { useCountUp } from '@/app/hooks/useCountUp';
import PowerCurveChart from '@/app/ui/PowerCurveChart';

interface Props {
  result: EstimateResponse;
  minimumLift: number;
  dailyTraffic: number | null;
  onReset: () => void;
}

export default function EstimatorResults({ result, minimumLift, dailyTraffic, onReset }: Props) {
  const { sample_size_per_variant, total_sample_size, power_achieved, feasible, power_curve } = result;
  const animatedN = useCountUp(sample_size_per_variant, 600);

  const days = dailyTraffic ? Math.ceil(sample_size_per_variant / dailyTraffic) : null;
  const showLargeNWarning = feasible && sample_size_per_variant > 50_000;
  const showCurve = power_curve.length >= 2;

  return (
    <motion.div
      className="mt-10 space-y-8"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <hr className="border-slate-200 dark:border-zinc-800" />

      {/* Hero number */}
      <div className="py-4 text-center">
        <p className="font-mono text-7xl font-bold tabular-nums tracking-tight text-indigo-500 dark:text-indigo-400">
          ~{Math.round(animatedN).toLocaleString()}
        </p>
        <p className="mt-3 text-base text-slate-600 dark:text-zinc-400">
          visitors per variant
        </p>
      </div>

      {/* Secondary stats */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-zinc-800">
        <div className={`grid divide-slate-200 dark:divide-zinc-800 ${days ? 'grid-cols-3 divide-x' : 'grid-cols-2 divide-x'}`}>
          <div className="px-6 py-5">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-500">
              Total visitors
            </p>
            <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-slate-900 dark:text-zinc-100">
              {feasible ? `~${total_sample_size.toLocaleString()}` : '200,000+'}
            </p>
          </div>
          <div className="px-6 py-5">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-500">
              {feasible ? 'Statistical power' : 'Power at cap'}
            </p>
            <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-slate-900 dark:text-zinc-100">
              {(power_achieved * 100).toFixed(1)}%
            </p>
          </div>
          {days && (
            <div className="px-6 py-5">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-500">
                Est. duration
              </p>
              <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-slate-900 dark:text-zinc-100">
                ~{days.toLocaleString()} days
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Interpretation / warnings */}
      {feasible ? (
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm leading-relaxed text-slate-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            Run your test until each variant has at least{' '}
            <span className="font-mono font-semibold text-slate-900 dark:text-zinc-100">
              {sample_size_per_variant.toLocaleString()}
            </span>{' '}
            visitors. At that point you&apos;ll have a{' '}
            <span className="font-semibold text-slate-900 dark:text-zinc-100">
              {Math.round(power_achieved * 100)}% chance
            </span>{' '}
            of correctly identifying a winner if the true lift is at least{' '}
            <span className="font-mono font-semibold text-slate-900 dark:text-zinc-100">
              {(minimumLift * 100).toFixed(1)}%
            </span>.
            {days && (
              <>{' '}At {dailyTraffic!.toLocaleString()} visitors per day per variant, that&apos;s approximately{' '}
                <span className="font-semibold text-slate-900 dark:text-zinc-100">{days} days</span>.
              </>
            )}
          </div>

          {showLargeNWarning && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-900/50 dark:bg-amber-950/30">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              <p className="text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
                This is a large sample size — likely because the baseline rate is low or the lift is small. Consider whether a larger minimum detectable lift is realistic for your use case.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-900/50 dark:bg-amber-950/30">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <p className="text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
            This test may require more data than is practical. Consider testing for a larger lift, accepting lower confidence, or reconsidering whether this comparison is feasible.
          </p>
        </div>
      )}

      {/* Power curve chart */}
      {showCurve && (
        <PowerCurveChart
          data={power_curve}
          recommendedN={sample_size_per_variant}
          targetPower={power_achieved >= 0.8 ? Math.floor(power_achieved * 10) / 10 : power_achieved}
        />
      )}

      {/* Reset */}
      <div className="flex justify-center pt-2">
        <button
          type="button"
          onClick={onReset}
          className={[
            'flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors duration-150',
            'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700',
            'dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:focus-visible:ring-indigo-400',
          ].join(' ')}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          New estimation
        </button>
      </div>
    </motion.div>
  );
}
