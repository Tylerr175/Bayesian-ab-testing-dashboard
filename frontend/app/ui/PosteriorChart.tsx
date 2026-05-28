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

function buildSeries(variants: VariantResult[]): { data: ChartPoint[]; lo: number; hi: number } {
  const { lo, hi } = buildChartRange(variants);
  const step = (hi - lo) / (N_POINTS - 1);
  const data = Array.from({ length: N_POINTS }, (_, i) => {
    const x = lo + i * step;
    const point: ChartPoint = { x };
    variants.forEach((v, idx) => {
      point[`pdf${idx}`] = betaPDF(x, v.posterior_params.alpha, v.posterior_params.beta);
    });
    return point;
  });
  return { data, lo, hi };
}

// ── Colour palette ─────────────────────────────────────────────────────────────

const PALETTE = [
  '#6366f1', // indigo-500  (A)
  '#14b8a6', // teal-500    (B) — teal slate
  '#64748b', // slate-500   (C) — powder slate
  '#d946ef', // fuchsia-500 (D) — magenta pink
  '#8b5cf6', // violet-500  (E)
  '#06b6d4', // cyan-500    (F)
];

// ── Theme-aware chart colours ──────────────────────────────────────────────────

const MONO_FONT = 'var(--font-jetbrains-mono, ui-monospace, monospace)';

const LIGHT = {
  grid:      '#e2e8f0', // slate-200
  axis:      '#64748b', // slate-500
  axisLine:  '#cbd5e1', // slate-300
  tooltip:   { bg: '#ffffff', border: '#e2e8f0', label: '#475569', text: '#64748b' },
};
const DARK = {
  grid:      '#27272a', // zinc-800
  axis:      '#71717a', // zinc-500
  axisLine:  '#3f3f46', // zinc-700
  tooltip:   { bg: '#18181b', border: '#3f3f46', label: '#e4e4e7', text: '#a1a1aa' },
};

// ── Custom tooltip ─────────────────────────────────────────────────────────────

interface TooltipPayloadItem { dataKey: string; name: string; value: number; color: string }

function CustomTooltip({ active, payload, label, colors }: {
  active?: boolean; payload?: TooltipPayloadItem[]; label?: number;
  colors: typeof LIGHT;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{ background: colors.tooltip.bg, border: `1px solid ${colors.tooltip.border}` }}
      className="rounded-lg p-3 shadow-md"
    >
      <p
        style={{ color: colors.tooltip.label }}
        className="mb-2 font-mono text-xs font-semibold tabular-nums"
      >
        {((label ?? 0) * 100).toFixed(2)}%
      </p>
      <div className="space-y-1">
        {payload.map((p) => (
          <div key={p.dataKey} className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: p.color }} />
            <span className="text-xs" style={{ color: p.color }}>{p.name}</span>
            <span
              style={{ color: colors.tooltip.text }}
              className="ml-auto font-mono text-xs tabular-nums"
            >
              {p.value.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Custom legend ──────────────────────────────────────────────────────────────

function CustomLegend({ variants, colors }: { variants: VariantResult[]; colors: typeof LIGHT }) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
      {variants.map((v, idx) => {
        const color = PALETTE[idx % PALETTE.length];
        const mean  = posteriorMean(v.posterior_params.alpha, v.posterior_params.beta);
        return (
          <span key={v.name} className="flex items-center gap-1.5">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
            <span className="text-xs text-slate-600 dark:text-zinc-400">Variant {v.name}</span>
            <span
              className="font-mono text-xs tabular-nums"
              style={{ color: colors.axis }}
            >
              {(mean * 100).toFixed(2)}%
            </span>
          </span>
        );
      })}
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

  const { data, lo, hi } = buildSeries(variants);
  const tickFmt          = (v: number) => `${(v * 100).toFixed(1)}%`;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      {/* Header */}
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-500">
        Posterior Distributions
      </p>
      <p className="mt-1 text-xs text-slate-400 dark:text-zinc-600">
        Each curve represents the plausible range of true conversion rates
      </p>

      <div className="mt-6">
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={colors.grid}
              strokeOpacity={0.5}
              vertical={false}
            />
            <XAxis
              dataKey="x"
              type="number"
              domain={[lo, hi]}
              tickFormatter={tickFmt}
              tickCount={7}
              tick={{ fontSize: 11, fill: colors.axis, fontFamily: MONO_FONT }}
              axisLine={{ stroke: colors.axisLine }}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip content={<CustomTooltip colors={colors} />} />

            {/* Credible interval shading + posterior mean line per variant */}
            {variants.map((v, idx) => {
              const color = PALETTE[idx % PALETTE.length];
              const ci    = v.credible_interval;
              const mean  = posteriorMean(v.posterior_params.alpha, v.posterior_params.beta);
              return [
                <ReferenceArea
                  key={`ci-${v.name}`}
                  x1={ci.lower} x2={ci.upper}
                  fill={color} fillOpacity={0.12} stroke="none"
                />,
                <ReferenceLine
                  key={`mean-${v.name}`}
                  x={mean}
                  stroke={color} strokeWidth={1.5} strokeDasharray="4 3" strokeOpacity={0.7}
                />,
              ];
            })}

            {/* PDF curves */}
            {variants.map((v, idx) => {
              const color = PALETTE[idx % PALETTE.length];
              return (
                <Area
                  key={v.name}
                  type="monotone"
                  dataKey={`pdf${idx}`}
                  name={`Variant ${v.name}`}
                  stroke={color} strokeWidth={2}
                  fill={color} fillOpacity={0.07}
                  dot={false} activeDot={false} legendType="none"
                  isAnimationActive
                  animationBegin={idx * 60}
                  animationDuration={500}
                  animationEasing="ease-out"
                />
              );
            })}

            <Legend content={<CustomLegend variants={variants} colors={colors} />} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
