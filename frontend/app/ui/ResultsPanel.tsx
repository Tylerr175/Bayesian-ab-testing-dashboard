import type { AnalyzeResponse, VariantResult } from '@/app/lib/types';
import ExplainerAccordion from '@/app/ui/ExplainerAccordion';
import PosteriorChart from '@/app/ui/PosteriorChart';

function pct(v: number, decimals = 2): string {
  return (v * 100).toFixed(decimals) + '%';
}
function pctSigned(v: number, decimals = 2): string {
  return (v >= 0 ? '+' : '') + pct(v, decimals);
}
function ci(lower: number, upper: number): string {
  return `[${pct(lower)}, ${pct(upper)}]`;
}

// ── Recommendation banner ──────────────────────────────────────────────────────

function RecommendationBanner({ result }: { result: AnalyzeResponse }) {
  const { variants, recommendation } = result;
  const { action, winner, winner_loss, threshold } = recommendation;

  const isStop = action === 'STOP';

  if (isStop && winner !== null) {
    const winnerVariant = variants.find(v => v.name === winner);
    const winnerProb    = winnerVariant?.prob_best ?? 0;

    return (
      <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 px-6 py-5 dark:border-emerald-800 dark:bg-emerald-950">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900">
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">✓</span>
          </div>
          <div>
            <p className="text-lg font-semibold text-emerald-900 dark:text-emerald-300">
              Recommendation: Ship Variant {winner}
            </p>
            <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-400">
              Variant {winner} has a {pct(winnerProb, 1)} probability of being the best
              variant, and its expected loss of {pct(winner_loss, 3)} falls below the{' '}
              {pct(threshold)} stopping threshold.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-amber-200 bg-amber-50 px-6 py-5 dark:border-amber-800 dark:bg-amber-950">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
          <span className="text-lg font-bold text-amber-600 dark:text-amber-400">⏸</span>
        </div>
        <div>
          <p className="text-lg font-semibold text-amber-900 dark:text-amber-300">
            Keep testing — the result is inconclusive
          </p>
          <p className="mt-1 text-sm text-amber-800 dark:text-amber-400">
            The leading variant ({winner ?? '—'}) has an expected loss of{' '}
            {pct(winner_loss, 3)}, which exceeds the {pct(threshold)} threshold.
            Collect more data before deciding.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Dot colour matching PosteriorChart palette ─────────────────────────────────

const VARIANT_COLORS = [
  '#6366f1', // indigo-500  (A)
  '#8b5cf6', // violet-500  (B)
  '#06b6d4', // cyan-500    (C)
  '#10b981', // emerald-500 (D)
  '#f59e0b', // amber-500   (E)
  '#ef4444', // red-500     (F)
];

// ── Main component ─────────────────────────────────────────────────────────────

interface Props { result: AnalyzeResponse }

export default function ResultsPanel({ result }: Props) {
  const { variants, recommendation } = result;
  const { winner } = recommendation;

  // For two-variant runs show a lift point-estimate chip (B − A in posterior means)
  const twoVariant = variants.length === 2;
  const liftMean   = twoVariant
    ? variants[1].posterior_mean - variants[0].posterior_mean
    : null;

  // Hero: winner's probability of being best
  const winnerVariant = variants.find(v => v.name === winner) ?? variants[0];

  const winnerColCls = (v: VariantResult) =>
    v.name === winner
      ? 'font-semibold text-slate-900 dark:text-slate-100'
      : 'text-slate-500 dark:text-slate-500';

  return (
    <div className="mt-8 animate-fade-up space-y-6">
      <hr className="border-slate-200 dark:border-slate-700" />

      {/* ── Recommendation banner ── */}
      <div className="animate-fade-up animation-delay-100">
        <RecommendationBanner result={result} />
      </div>

      {/* ── Hero ── */}
      <div className="py-2 text-center">
        <p className="font-mono text-5xl font-bold tabular-nums tracking-tight text-indigo-600 dark:text-indigo-400 sm:text-7xl">
          {pct(winnerVariant.prob_best, 1)}
        </p>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 sm:text-base">
          probability that Variant {winnerVariant.name} is the best performing variant
        </p>

        {twoVariant && liftMean !== null && (
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <span className={[
              'rounded-full px-3 py-1 text-sm font-medium tabular-nums',
              liftMean > 0
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                : liftMean < 0
                  ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
            ].join(' ')}>
              Expected lift {pctSigned(liftMean)}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500 sm:text-sm">
              (B − A posterior means)
            </span>
          </div>
        )}
      </div>

      {/* ── Chart ── */}
      <PosteriorChart variants={variants} />

      {/* ── Comparison table ── */}
      <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: `${Math.max(480, 200 + variants.length * 130)}px` }}>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                <th className="py-3 pl-4 pr-6 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Metric
                </th>
                {variants.map((v, idx) => (
                  <th key={v.name} className="py-3 pr-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: VARIANT_COLORS[idx % VARIANT_COLORS.length] }} />
                      Variant {v.name}
                      {winner === v.name && (
                        <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                          Winner
                        </span>
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900">
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <td className="py-4 pl-4 pr-6">
                  <p className="font-medium text-slate-700 dark:text-slate-300">Conversion rate</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-400 dark:text-slate-500">Best single estimate of the true rate</p>
                </td>
                {variants.map((v) => (
                  <td key={v.name} className={`py-4 pr-4 text-right tabular-nums ${winnerColCls(v)}`}>
                    {pct(v.posterior_mean)}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <td className="py-4 pl-4 pr-6">
                  <p className="font-medium text-slate-700 dark:text-slate-300">95% credible interval</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-400 dark:text-slate-500">The true rate falls within this range with 95% probability</p>
                </td>
                {variants.map((v) => (
                  <td key={v.name} className="py-4 pr-4 text-right tabular-nums text-slate-500 dark:text-slate-500">
                    {ci(v.credible_interval.lower, v.credible_interval.upper)}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <td className="py-4 pl-4 pr-6">
                  <p className="font-medium text-slate-700 dark:text-slate-300">P(best)</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-400 dark:text-slate-500">Probability this variant has the highest true conversion rate</p>
                </td>
                {variants.map((v) => (
                  <td key={v.name} className={`py-4 pr-4 text-right tabular-nums ${winnerColCls(v)}`}>
                    {pct(v.prob_best, 1)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-4 pl-4 pr-6">
                  <p className="font-medium text-slate-700 dark:text-slate-300">Expected loss</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-400 dark:text-slate-500">Conversion rate forfeited if you declare this variant the winner now and you&apos;re wrong</p>
                </td>
                {variants.map((v) => (
                  <td key={v.name} className={`py-4 pr-4 text-right tabular-nums ${winnerColCls(v)}`}>
                    {pct(v.expected_loss, 3)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Explainer accordion ── */}
      <ExplainerAccordion isMultiVariant={variants.length > 2} />
    </div>
  );
}
