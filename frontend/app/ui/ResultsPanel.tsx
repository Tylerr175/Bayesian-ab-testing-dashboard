import type { AnalyzeResponse } from '@/app/lib/types';
import PosteriorChart from '@/app/ui/PosteriorChart';

// ── Formatting helpers ─────────────────────────────────────────────────────────

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
  const { prob_b_better, lift_ci, expected_loss, recommendation } = result;
  const { action, winner, winner_loss, threshold } = recommendation;

  const isStop       = action === 'STOP';
  // "Equivalent" = test says stop, but the lift CI spans zero (no directional signal)
  const liftSpansZero = lift_ci.lower <= 0 && lift_ci.upper >= 0;
  const isEquivalent  = isStop && liftSpansZero;
  const isClearWinner = isStop && !liftSpansZero;

  // Probability statement always refers to the winning direction
  const loser       = winner === 'B' ? 'A' : 'B';
  const winnerProb  = winner === 'B' ? prob_b_better : 1 - prob_b_better;

  if (isClearWinner) {
    return (
      <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 px-6 py-5">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
            <span className="text-lg font-bold text-emerald-600">✓</span>
          </div>
          <div>
            <p className="text-base font-bold text-emerald-900">
              Recommendation: Ship Variant {winner}
            </p>
            <p className="mt-1 text-sm text-emerald-800">
              Variant {winner} has a {pct(winnerProb, 1)} probability of outperforming
              Variant {loser}, and its expected loss of {pct(winner_loss, 3)} falls
              below the {pct(threshold)} stopping threshold.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isEquivalent) {
    return (
      <div className="rounded-xl border-2 border-slate-200 bg-slate-50 px-6 py-5">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200">
            <span className="text-lg font-bold text-slate-500">≈</span>
          </div>
          <div>
            <p className="text-base font-bold text-slate-800">
              Variants are equivalent — safe to stop
            </p>
            <p className="mt-1 text-sm text-slate-600">
              The expected loss of either choice ({pct(winner_loss, 3)}) is below
              the {pct(threshold)} threshold, but the 95% lift confidence interval
              spans zero — A and B show no meaningful difference in conversion rate.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // KEEP_TESTING
  return (
    <div className="rounded-xl border-2 border-amber-200 bg-amber-50 px-6 py-5">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
          <span className="text-lg font-bold text-amber-600">⏸</span>
        </div>
        <div>
          <p className="text-base font-bold text-amber-900">
            Keep testing — the result is inconclusive
          </p>
          <p className="mt-1 text-sm text-amber-800">
            P(B &gt; A) is {pct(prob_b_better, 1)}, but both variants&apos; expected
            losses exceed the {pct(threshold)} threshold (A: {pct(expected_loss.a, 3)},
            B: {pct(expected_loss.b, 3)}). Collect more data before deciding.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  result: AnalyzeResponse;
}

export default function ResultsPanel({ result }: Props) {
  const { prob_b_better, posterior_means, credible_intervals, expected_loss, lift_ci, recommendation } = result;
  const { winner } = recommendation;

  const liftMean     = posterior_means.b - posterior_means.a;
  const liftPositive = lift_ci.lower > 0;
  const liftNegative = lift_ci.upper < 0;

  const winnerCol = (variant: 'A' | 'B') =>
    winner === variant ? 'font-semibold text-slate-900' : 'text-slate-500';

  return (
    <div className="mt-8 space-y-6">
      <hr className="border-slate-200" />

      {/* ── Recommendation banner — verdict first, evidence below ── */}
      <RecommendationBanner result={result} />

      {/* ── Hero: probability headline ── */}
      <div className="py-2 text-center">
        <p className="text-5xl font-bold tracking-tight text-indigo-600 sm:text-7xl">
          {pct(prob_b_better, 1)}
        </p>
        <p className="mt-3 text-sm text-slate-600 sm:text-base">
          probability that Variant B outperforms Variant A
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <span className={[
            'rounded-full px-3 py-1 text-sm font-medium tabular-nums',
            liftPositive ? 'bg-emerald-50 text-emerald-700' :
            liftNegative ? 'bg-red-50 text-red-700'         :
                           'bg-slate-100 text-slate-600',
          ].join(' ')}>
            Expected lift {pctSigned(liftMean)}
          </span>
          <span className="text-xs text-slate-400 sm:text-sm">
            95% CI {pctSigned(lift_ci.lower)} to {pctSigned(lift_ci.upper)}
          </span>
        </div>
      </div>

      {/* ── Chart ── */}
      <PosteriorChart
        posteriorParams={result.posterior_params}
        credibleIntervals={result.credible_intervals}
      />

      {/* ── Comparison table ── */}
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="py-3 pl-4 pr-6 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Metric
                </th>
                <th className="py-3 pr-6 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-indigo-500" />
                    Variant A
                    {winner === 'A' && (
                      <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-700">
                        Winner
                      </span>
                    )}
                  </span>
                </th>
                <th className="py-3 pr-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-violet-500" />
                    Variant B
                    {winner === 'B' && (
                      <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-700">
                        Winner
                      </span>
                    )}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              <tr className="border-b border-slate-100">
                <td className="py-4 pl-4 pr-6">
                  <p className="font-medium text-slate-700">Conversion rate</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
                    Best single estimate of the true rate
                  </p>
                </td>
                <td className={`py-4 pr-6 text-right tabular-nums ${winnerCol('A')}`}>
                  {pct(posterior_means.a)}
                </td>
                <td className={`py-4 pr-4 text-right tabular-nums ${winnerCol('B')}`}>
                  {pct(posterior_means.b)}
                </td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-4 pl-4 pr-6">
                  <p className="font-medium text-slate-700">95% credible interval</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
                    The true rate falls within this range with 95% probability
                  </p>
                </td>
                <td className="py-4 pr-6 text-right tabular-nums text-slate-500">
                  {ci(credible_intervals.a.lower, credible_intervals.a.upper)}
                </td>
                <td className="py-4 pr-4 text-right tabular-nums text-slate-500">
                  {ci(credible_intervals.b.lower, credible_intervals.b.upper)}
                </td>
              </tr>
              <tr>
                <td className="py-4 pl-4 pr-6">
                  <p className="font-medium text-slate-700">Expected loss</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
                    Conversion rate forfeited if you declare this variant the winner now and you&apos;re wrong
                  </p>
                </td>
                <td className={`py-4 pr-6 text-right tabular-nums ${winnerCol('A')}`}>
                  {pct(expected_loss.a, 3)}
                </td>
                <td className={`py-4 pr-4 text-right tabular-nums ${winnerCol('B')}`}>
                  {pct(expected_loss.b, 3)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
