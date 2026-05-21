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
  return `[${pct(lower)},  ${pct(upper)}]`;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Divider() {
  return <hr className="border-slate-200" />;
}

interface MetricRowProps {
  label: string;
  description: string;
  a: string;
  b: string;
  winner: 'A' | 'B' | null;
  lowerIsBetter?: boolean;
}

function MetricRow({ label, description, a, b, winner, lowerIsBetter = false }: MetricRowProps) {
  const aWins = lowerIsBetter ? winner === 'A' : winner === 'A';
  const bWins = lowerIsBetter ? winner === 'B' : winner === 'B';

  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="py-4 pr-6">
        <p className="font-medium text-slate-700">{label}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{description}</p>
      </td>
      <td className={[
        'py-4 pr-6 text-right tabular-nums',
        aWins ? 'font-semibold text-slate-900' : 'text-slate-500',
      ].join(' ')}>
        {a}
      </td>
      <td className={[
        'py-4 text-right tabular-nums',
        bWins ? 'font-semibold text-slate-900' : 'text-slate-500',
      ].join(' ')}>
        {b}
      </td>
    </tr>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  result: AnalyzeResponse;
}

export default function ResultsPanel({ result }: Props) {
  const { prob_b_better, posterior_means, credible_intervals, expected_loss, lift_ci, recommendation } = result;
  const { action, winner, winner_loss, threshold } = recommendation;

  const isStop = action === 'STOP';
  const liftMean = posterior_means.b - posterior_means.a;
  const liftPositive = lift_ci.lower > 0;
  const liftNegative = lift_ci.upper < 0;

  return (
    <div className="mt-8 space-y-6">
      <Divider />

      {/* ── Hero: probability headline ── */}
      <div className="py-2 text-center">
        <p className="text-7xl font-bold tracking-tight text-indigo-600">
          {pct(prob_b_better, 1)}
        </p>
        <p className="mt-3 text-base text-slate-600">
          probability that Variant B outperforms Variant A
        </p>
        <div className="mt-3 flex items-center justify-center gap-2">
          <span className={[
            'rounded-full px-3 py-1 text-sm font-medium tabular-nums',
            liftPositive ? 'bg-emerald-50 text-emerald-700' :
            liftNegative ? 'bg-red-50 text-red-700' :
                           'bg-slate-100 text-slate-600',
          ].join(' ')}>
            Expected lift {pctSigned(liftMean)}
          </span>
          <span className="text-sm text-slate-400">
            95% CI {pctSigned(lift_ci.lower)} to {pctSigned(lift_ci.upper)}
          </span>
        </div>
      </div>

      {/* ── Chart ── */}
      <PosteriorChart
        posteriorParams={result.posterior_params}
        credibleIntervals={result.credible_intervals}
      />

      {/* ── Recommendation banner ── */}
      {isStop ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-lg leading-none text-emerald-500">✓</span>
            <div>
              <p className="font-semibold text-emerald-800">
                Ship Variant {winner}
              </p>
              <p className="mt-1 text-sm text-emerald-700">
                Expected loss of choosing {winner} is {pct(winner_loss, 3)} — below
                the {pct(threshold)} stopping threshold. It is statistically safe
                to end the test.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-lg leading-none text-amber-500">◎</span>
            <div>
              <p className="font-semibold text-amber-800">
                Keep collecting data
              </p>
              <p className="mt-1 text-sm text-amber-700">
                Neither variant&apos;s expected loss is below the {pct(threshold)} threshold
                yet (A: {pct(expected_loss.a, 3)}, B: {pct(expected_loss.b, 3)}).
                There is not yet enough certainty to declare a winner.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Comparison table ── */}
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full text-sm">
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
          <tbody className="divide-y divide-slate-100 bg-white pl-4">
            <tr className="border-b border-slate-100">
              <td className="py-4 pl-4 pr-6">
                <p className="font-medium text-slate-700">Conversion rate</p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
                  Best single estimate of the true rate, given the data so far
                </p>
              </td>
              <td className={['py-4 pr-6 text-right tabular-nums', winner === 'A' ? 'font-semibold text-slate-900' : 'text-slate-500'].join(' ')}>
                {pct(posterior_means.a)}
              </td>
              <td className={['py-4 pr-4 text-right tabular-nums', winner === 'B' ? 'font-semibold text-slate-900' : 'text-slate-500'].join(' ')}>
                {pct(posterior_means.b)}
              </td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="py-4 pl-4 pr-6">
                <p className="font-medium text-slate-700">95% credible interval</p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
                  There is a 95% probability the true rate falls within this range
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
                  Conversion rate forfeited if you declare this variant winner now and you&apos;re wrong — lower is safer
                </p>
              </td>
              <td className={['py-4 pr-6 text-right tabular-nums', winner === 'A' ? 'font-semibold text-slate-900' : 'text-slate-500'].join(' ')}>
                {pct(expected_loss.a, 3)}
              </td>
              <td className={['py-4 pr-4 text-right tabular-nums', winner === 'B' ? 'font-semibold text-slate-900' : 'text-slate-500'].join(' ')}>
                {pct(expected_loss.b, 3)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
