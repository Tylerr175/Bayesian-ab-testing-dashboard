'use client';

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

// ── Beta PDF (no library needed) ───────────────────────────────────────────────
//
// Uses the Lanczos approximation for log-Gamma (Numerical Recipes, §6.1).
// Working in log-space avoids overflow for large alpha/beta values (thousands
// of visitors), where Gamma(n) itself is astronomically large.

function logGamma(x: number): number {
  const c = [
    76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5,
  ];
  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) ser += c[j] / ++y;
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

function betaPDF(x: number, alpha: number, beta: number): number {
  if (x <= 0 || x >= 1) return 0;
  const logNorm = logGamma(alpha) + logGamma(beta) - logGamma(alpha + beta);
  return Math.exp((alpha - 1) * Math.log(x) + (beta - 1) * Math.log(1 - x) - logNorm);
}

// ── Range calculation ──────────────────────────────────────────────────────────

function posteriorMean(alpha: number, beta: number) {
  return alpha / (alpha + beta);
}

function posteriorStd(alpha: number, beta: number) {
  const n = alpha + beta;
  return Math.sqrt((alpha * beta) / (n * n * (n + 1)));
}

function buildChartRange(aA: number, bA: number, aB: number, bB: number) {
  const means = [posteriorMean(aA, bA), posteriorMean(aB, bB)];
  const stds  = [posteriorStd(aA, bA),  posteriorStd(aB, bB)];
  const spread = Math.max(...stds) * 4.5;
  const lo = Math.max(0.001, Math.min(...means) - spread);
  const hi = Math.min(0.999, Math.max(...means) + spread);
  return { lo, hi };
}

// ── Data generation ────────────────────────────────────────────────────────────

const N_POINTS = 320;

interface ChartPoint {
  x: number;
  pdfA: number;
  pdfB: number;
}

function buildSeries(
  aA: number, bA: number,
  aB: number, bB: number,
): ChartPoint[] {
  const { lo, hi } = buildChartRange(aA, bA, aB, bB);
  const step = (hi - lo) / (N_POINTS - 1);
  return Array.from({ length: N_POINTS }, (_, i) => {
    const x = lo + i * step;
    return { x, pdfA: betaPDF(x, aA, bA), pdfB: betaPDF(x, aB, bB) };
  });
}

// ── Colours ────────────────────────────────────────────────────────────────────

const COLOR_A = '#6366f1'; // indigo-500 — matches VariantForm dot
const COLOR_B = '#8b5cf6'; // violet-500 — matches VariantForm dot

// ── Custom tooltip ─────────────────────────────────────────────────────────────

interface TooltipPayloadItem {
  dataKey: string;
  name: string;
  value: number;
  color: string;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-lg">
      <p className="mb-2 text-xs font-semibold text-slate-500">
        {((label ?? 0) * 100).toFixed(2)}% conversion rate
      </p>
      {payload.map((p) => (
        <p key={p.dataKey} className="text-xs" style={{ color: p.color }}>
          {p.name}
          <span className="ml-2 tabular-nums text-slate-700">
            density {p.value.toFixed(2)}
          </span>
        </p>
      ))}
    </div>
  );
}

// ── Custom legend ──────────────────────────────────────────────────────────────

function CustomLegend() {
  return (
    <div className="mt-3 flex items-center justify-center gap-6 text-xs text-slate-500">
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: COLOR_A }} />
        Variant A
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: COLOR_B }} />
        Variant B
      </span>
      <span className="flex items-center gap-1.5 text-slate-400">
        <span
          className="inline-block h-2.5 w-6 rounded-sm opacity-40"
          style={{ background: 'repeating-linear-gradient(90deg,#6366f1 0 8px,#8b5cf6 8px 16px)' }}
        />
        95% credible interval
      </span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  posteriorParams:   { a: { alpha: number; beta: number }; b: { alpha: number; beta: number } };
  credibleIntervals: { a: { lower: number; upper: number }; b: { lower: number; upper: number } };
}

export default function PosteriorChart({ posteriorParams, credibleIntervals }: Props) {
  const { a: pA, b: pB } = posteriorParams;
  const { a: ciA, b: ciB } = credibleIntervals;

  const data = buildSeries(pA.alpha, pA.beta, pB.alpha, pB.beta);
  const meanA = posteriorMean(pA.alpha, pA.beta);
  const meanB = posteriorMean(pB.alpha, pB.beta);

  const tickFmt = (v: number) => `${(v * 100).toFixed(1)}%`;
  const { lo, hi } = buildChartRange(pA.alpha, pA.beta, pB.alpha, pB.beta);

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-6 pb-5 pt-6">
      <h3 className="text-sm font-semibold text-slate-700">
        Posterior Conversion Rate Distributions
      </h3>
      <p className="mt-0.5 text-xs text-slate-400">
        Each curve shows the range of conversion rates consistent with the observed data.
        Narrower = more certain.
      </p>

      <div className="mt-5">
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />

            <XAxis
              dataKey="x"
              type="number"
              domain={[lo, hi]}
              tickFormatter={tickFmt}
              tickCount={7}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={false}
            />

            {/* Density axis — hidden; absolute values aren't meaningful to users */}
            <YAxis hide />

            <Tooltip content={<CustomTooltip />} />

            {/* CI shaded bands — rendered first so PDF curves sit on top */}
            <ReferenceArea
              x1={ciA.lower} x2={ciA.upper}
              fill={COLOR_A} fillOpacity={0.13}
              stroke="none"
            />
            <ReferenceArea
              x1={ciB.lower} x2={ciB.upper}
              fill={COLOR_B} fillOpacity={0.13}
              stroke="none"
            />

            {/* Posterior mean dashed markers */}
            <ReferenceLine
              x={meanA}
              stroke={COLOR_A} strokeWidth={1.5} strokeDasharray="4 3" strokeOpacity={0.7}
            />
            <ReferenceLine
              x={meanB}
              stroke={COLOR_B} strokeWidth={1.5} strokeDasharray="4 3" strokeOpacity={0.7}
            />

            {/* PDF curves */}
            <Area
              type="monotone"
              dataKey="pdfA"
              name="Variant A"
              stroke={COLOR_A}
              strokeWidth={2.5}
              fill={COLOR_A}
              fillOpacity={0.07}
              dot={false}
              activeDot={false}
              legendType="none"
            />
            <Area
              type="monotone"
              dataKey="pdfB"
              name="Variant B"
              stroke={COLOR_B}
              strokeWidth={2.5}
              fill={COLOR_B}
              fillOpacity={0.07}
              dot={false}
              activeDot={false}
              legendType="none"
            />

            <Legend content={<CustomLegend />} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
