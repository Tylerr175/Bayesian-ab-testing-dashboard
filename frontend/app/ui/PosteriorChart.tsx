'use client';

import {
  Area, CartesianGrid, ComposedChart, Legend,
  ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useTheme } from '@/app/providers/ThemeProvider';
import type { VariantResult } from '@/app/lib/types';

// ── Beta PDF ───────────────────────────────────────────────────────────────────

function logGamma(x: number): number {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091,
             -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x, tmp = x + 5.5;
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

function posteriorMean(a: number, b: number) { return a / (a + b); }
function posteriorStd(a: number, b: number) {
  const n = a + b;
  return Math.sqrt((a * b) / (n * n * (n + 1)));
}

function buildChartRange(variants: VariantResult[]) {
  const means  = variants.map(v => posteriorMean(v.posterior_params.alpha, v.posterior_params.beta));
  const spread = Math.max(...variants.map(v => posteriorStd(v.posterior_params.alpha, v.posterior_params.beta))) * 4.5;
  const lo     = Math.max(0.001, Math.min(...means) - spread);
  const hi     = Math.min(0.999, Math.max(...means) + spread);
  return { lo, hi };
}

const N_POINTS = 320;

type ChartPoint = { x: number; [key: string]: number };

function buildSeries(variants: VariantResult[]): ChartPoint[] {
  const { lo, hi } = buildChartRange(variants);
  const step = (hi - lo) / (N_POINTS - 1);
  return Array.from({ length: N_POINTS }, (_, i) => {
    const x = lo + i * step;
    const point: ChartPoint = { x };
    variants.forEach((v, idx) => {
      point[`pdf${idx}`] = betaPDF(x, v.posterior_params.alpha, v.posterior_params.beta);
    });
    return point;
  });
}

// ── Colour palette ─────────────────────────────────────────────────────────────

const PALETTE = [
  '#6366f1', // indigo-500 (A)
  '#8b5cf6', // violet-500 (B)
  '#06b6d4', // cyan-500   (C)
  '#10b981', // emerald-500 (D)
  '#f59e0b', // amber-500  (E)
  '#ef4444', // red-500    (F)
];

// ── Theme-aware chart colours ──────────────────────────────────────────────────
const LIGHT = {
  grid:      '#f1f5f9',
  axis:      '#94a3b8',
  axisLine:  '#e2e8f0',
  tooltip:   { bg: '#ffffff', border: '#e2e8f0', label: '#475569', text: '#64748b' },
  legend:    '#64748b',
};
const DARK = {
  grid:      '#1e293b',
  axis:      '#475569',
  axisLine:  '#334155',
  tooltip:   { bg: '#1e293b', border: '#475569', label: '#cbd5e1', text: '#94a3b8' },
  legend:    '#94a3b8',
};

// ── Custom tooltip ─────────────────────────────────────────────────────────────

interface TooltipPayloadItem { dataKey: string; name: string; value: number; color: string }

function CustomTooltip({ active, payload, label, colors }: {
  active?: boolean; payload?: TooltipPayloadItem[]; label?: number;
  colors: typeof LIGHT;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: colors.tooltip.bg, border: `1px solid ${colors.tooltip.border}` }}
      className="rounded-lg px-3 py-2.5 shadow-lg">
      <p style={{ color: colors.tooltip.label }} className="mb-2 font-mono text-xs font-semibold tabular-nums">
        {((label ?? 0) * 100).toFixed(2)}% conversion rate
      </p>
      {payload.map((p) => (
        <p key={p.dataKey} className="text-xs" style={{ color: p.color }}>
          {p.name}
          <span style={{ color: colors.tooltip.text }} className="ml-2 tabular-nums">
            density {p.value.toFixed(2)}
          </span>
        </p>
      ))}
    </div>
  );
}

// ── Custom legend ──────────────────────────────────────────────────────────────

function CustomLegend({ variants, colors }: { variants: VariantResult[]; colors: typeof LIGHT }) {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs" style={{ color: colors.legend }}>
      {variants.map((v, idx) => (
        <span key={v.name} className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: PALETTE[idx % PALETTE.length] }} />
          Variant {v.name}
        </span>
      ))}
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-2.5 w-6 rounded-sm opacity-40"
          style={{ background: 'repeating-linear-gradient(90deg,#6366f1 0 8px,#8b5cf6 8px 16px)' }} />
        95% credible interval
      </span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  variants: VariantResult[];
}

export default function PosteriorChart({ variants }: Props) {
  const { theme } = useTheme();
  const colors    = theme === 'dark' ? DARK : LIGHT;

  const data      = buildSeries(variants);
  const { lo, hi } = buildChartRange(variants);
  const tickFmt   = (v: number) => `${(v * 100).toFixed(1)}%`;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-6 pb-5 pt-6 dark:border-slate-700 dark:bg-slate-900">
      <h3 className="text-sm font-semibold tracking-tight text-slate-800 dark:text-slate-200">
        Posterior Conversion Rate Distributions
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-slate-400 dark:text-slate-500">
        Each curve shows the range of conversion rates consistent with the data observed so far.
        Narrower = more certain.
      </p>

      <div className="mt-5">
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
            <XAxis
              dataKey="x" type="number" domain={[lo, hi]}
              tickFormatter={tickFmt} tickCount={7}
              tick={{ fontSize: 11, fill: colors.axis }}
              axisLine={{ stroke: colors.axisLine }}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip content={<CustomTooltip colors={colors} />} />

            {/* Credible interval shading and mean lines for each variant */}
            {variants.map((v, idx) => {
              const color = PALETTE[idx % PALETTE.length];
              const ci    = v.credible_interval;
              const mean  = posteriorMean(v.posterior_params.alpha, v.posterior_params.beta);
              return [
                <ReferenceArea key={`ci-${v.name}`}
                  x1={ci.lower} x2={ci.upper}
                  fill={color} fillOpacity={0.13} stroke="none" />,
                <ReferenceLine key={`mean-${v.name}`}
                  x={mean} stroke={color}
                  strokeWidth={1.5} strokeDasharray="4 3" strokeOpacity={0.7} />,
              ];
            })}

            {/* PDF curves */}
            {variants.map((v, idx) => {
              const color = PALETTE[idx % PALETTE.length];
              return (
                <Area key={v.name}
                  type="monotone" dataKey={`pdf${idx}`}
                  name={`Variant ${v.name}`}
                  stroke={color} strokeWidth={2.5}
                  fill={color} fillOpacity={0.07}
                  dot={false} activeDot={false} legendType="none" />
              );
            })}

            <Legend content={<CustomLegend variants={variants} colors={colors} />} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
