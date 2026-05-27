'use client';

import {
  CartesianGrid, ComposedChart, Line,
  ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useTheme } from '@/app/providers/ThemeProvider';
import type { PowerCurvePoint } from '@/app/lib/types';

const MONO_FONT = 'var(--font-jetbrains-mono, ui-monospace, monospace)';

const LIGHT = {
  grid:     '#e2e8f0',
  axis:     '#64748b',
  axisLine: '#cbd5e1',
  tooltip:  { bg: '#ffffff', border: '#e2e8f0', label: '#475569', text: '#64748b' },
};
const DARK = {
  grid:     '#27272a',
  axis:     '#71717a',
  axisLine: '#3f3f46',
  tooltip:  { bg: '#18181b', border: '#3f3f46', label: '#e4e4e7', text: '#a1a1aa' },
};

function fmtN(n: number): string {
  if (n >= 10_000) return `${Math.round(n / 1_000)}k`;
  if (n >= 1_000)  return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function CustomTooltip({ active, payload, label, colors }: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: number;
  colors: typeof LIGHT;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{ background: colors.tooltip.bg, border: `1px solid ${colors.tooltip.border}` }}
      className="rounded-lg p-3 shadow-md"
    >
      <p style={{ color: colors.tooltip.label }} className="mb-1 font-mono text-xs tabular-nums">
        N = {(label ?? 0).toLocaleString()}
      </p>
      <p style={{ color: '#6366f1' }} className="font-mono text-xs tabular-nums">
        {(payload[0].value * 100).toFixed(1)}% power
      </p>
    </div>
  );
}

interface Props {
  data: PowerCurvePoint[];
  recommendedN: number;
  targetPower: number;
}

export default function PowerCurveChart({ data, recommendedN, targetPower }: Props) {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? DARK : LIGHT;

  const xMin = data[0]?.sample_size ?? 100;
  const xMax = data[data.length - 1]?.sample_size ?? recommendedN;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-500">
        Power Curve
      </p>
      <p className="mt-1 text-xs text-slate-400 dark:text-zinc-600">
        How statistical power grows with sample size — lines mark your target
      </p>

      <div className="mt-6">
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={data} margin={{ top: 16, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={colors.grid}
              strokeOpacity={0.5}
              vertical={false}
            />
            <XAxis
              dataKey="sample_size"
              type="number"
              domain={[xMin, xMax]}
              tickFormatter={fmtN}
              tickCount={6}
              tick={{ fontSize: 11, fill: colors.axis, fontFamily: MONO_FONT }}
              axisLine={{ stroke: colors.axisLine }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 1]}
              tickFormatter={v => `${(v * 100).toFixed(0)}%`}
              tickCount={6}
              tick={{ fontSize: 11, fill: colors.axis, fontFamily: MONO_FONT }}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <Tooltip content={<CustomTooltip colors={colors} />} />

            {/* Target power — horizontal reference */}
            <ReferenceLine
              y={targetPower}
              stroke="#10b981"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              strokeOpacity={0.9}
              label={{
                value: `${(targetPower * 100).toFixed(0)}% target`,
                position: 'insideTopRight',
                fontSize: 10,
                fill: '#10b981',
                fontFamily: MONO_FONT,
              }}
            />

            {/* Recommended N — vertical reference */}
            <ReferenceLine
              x={recommendedN}
              stroke="#6366f1"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              strokeOpacity={0.9}
              label={{
                value: `N = ${fmtN(recommendedN)}`,
                position: 'top',
                fontSize: 10,
                fill: '#6366f1',
                fontFamily: MONO_FONT,
              }}
            />

            <Line
              type="monotone"
              dataKey="power"
              stroke="#6366f1"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: '#6366f1', stroke: 'none' }}
              isAnimationActive
              animationDuration={500}
              animationEasing="ease-out"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
