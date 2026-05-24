'use client';

import { useState } from 'react';

export type ThresholdPreset = 'conservative' | 'balanced' | 'aggressive' | 'custom';

export const PRESET_VALUES: Record<Exclude<ThresholdPreset, 'custom'>, number> = {
  conservative: 0.001,
  balanced:     0.005,
  aggressive:   0.01,
};

// ── Tooltip ────────────────────────────────────────────────────────────────────

function Tooltip({ text }: { text: string }) {
  return (
    <span className="group relative shrink-0">
      <span className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-400 transition-colors group-hover:bg-slate-200 dark:bg-zinc-700 dark:text-zinc-500 dark:group-hover:bg-slate-600">
        ?
      </span>
      <span className="pointer-events-none absolute bottom-full right-0 z-10 mb-2 w-56 rounded-lg bg-slate-800 px-3 py-2 text-xs leading-relaxed text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 dark:bg-zinc-700">
        {text}
        <span className="absolute right-2 top-full border-4 border-transparent border-t-slate-800 dark:border-t-slate-700" />
      </span>
    </span>
  );
}

// ── Preset definitions ─────────────────────────────────────────────────────────

const PRESETS = [
  { id: 'conservative' as const, label: 'Conservative', display: '0.1%',
    tooltip: 'Requires strong evidence before stopping. Best for high-stakes changes — pricing, core checkout flows, or regulated products. Tests run longer but decisions are more reliable.' },
  { id: 'balanced' as const, label: 'Balanced', display: '0.5%', isDefault: true,
    tooltip: 'The industry standard. Stops the test when the expected cost of a wrong decision drops below 0.5 percentage points. Works well for most product experiments.' },
  { id: 'aggressive' as const, label: 'Aggressive', display: '1.0%',
    tooltip: 'Stops earlier with somewhat less certainty. Good for low-stakes changes — copy tweaks, colour adjustments, or rapid iteration where shipping speed matters more than precision.' },
];

// ── Radio card option ──────────────────────────────────────────────────────────

function RadioOption({ id, label, display, isDefault, tooltip, selected, onChange }: {
  id: ThresholdPreset; label: string; display?: string; isDefault?: boolean;
  tooltip: string; selected: boolean; onChange: () => void;
}) {
  return (
    <label className={[
      'group flex cursor-pointer items-center gap-3 rounded-lg border p-3',
      'transition-[colors,transform,box-shadow] duration-150',
      'hover:-translate-y-px hover:shadow-sm',
      'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-inset has-[:focus-visible]:ring-indigo-500 dark:has-[:focus-visible]:ring-indigo-400',
      selected
        ? 'border-indigo-400 bg-indigo-50/60 dark:border-indigo-500 dark:bg-indigo-950/25'
        : 'border-slate-200 bg-white hover:border-slate-300 dark:border-zinc-700 dark:bg-zinc-800/50 dark:hover:border-zinc-600',
    ].join(' ')}>
      <input type="radio" name="threshold-preset" value={id} checked={selected} onChange={onChange} className="sr-only" />
      <span className={['flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
        selected ? 'border-indigo-600 dark:border-indigo-400' : 'border-slate-300 dark:border-slate-600'].join(' ')}>
        {selected && <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />}
      </span>
      <span className="flex-1 text-sm">
        <span className={['font-medium', selected ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-zinc-300'].join(' ')}>
          {label}
        </span>
        {display && (
          <span className={['ml-2 font-mono tabular-nums', selected ? 'text-indigo-500 dark:text-indigo-400' : 'text-slate-400 dark:text-zinc-500'].join(' ')}>
            {display}
          </span>
        )}
        {isDefault && (
          <span className="ml-2 rounded-full bg-indigo-50 px-1.5 py-0.5 text-xs font-medium text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
            default
          </span>
        )}
      </span>
      <Tooltip text={tooltip} />
    </label>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  preset: ThresholdPreset;
  customValue: string;
  onPresetChange: (p: ThresholdPreset) => void;
  onCustomChange: (v: string) => void;
}

export default function AdvancedSettings({ preset, customValue, onPresetChange, onCustomChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const customParseError: string | null = (() => {
    if (preset !== 'custom' || customValue.trim() === '') return null;
    const v = parseFloat(customValue);
    if (isNaN(v) || v <= 0) return 'Enter a positive percentage, e.g. 0.5';
    if (v > 50)             return 'Value above 50% — did you mean e.g. 1 instead of 100?';
    return null;
  })();

  return (
    <div className="rounded-xl border border-slate-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 dark:focus-visible:ring-indigo-400"
        aria-expanded={isOpen}
      >
        <span className="text-sm font-medium text-slate-600 dark:text-zinc-400">Advanced Settings</span>
        <svg className={`h-4 w-4 text-slate-400 transition-transform duration-200 dark:text-zinc-500 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3 dark:border-zinc-800">
          <div className="mb-2 flex items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
              Stopping Threshold
            </p>
            <Tooltip text="The maximum expected loss below which it is considered safe to end the test and declare a winner. Lower values demand more certainty before stopping." />
          </div>

          <div className="space-y-1.5">
            {PRESETS.map((opt) => (
              <RadioOption key={opt.id} {...opt} selected={preset === opt.id} onChange={() => onPresetChange(opt.id)} />
            ))}
            <RadioOption
              id="custom" label="Custom"
              tooltip="Enter a percentage value. Example: 0.2 means the test stops when the expected loss of the wrong choice drops below 0.2 percentage points."
              selected={preset === 'custom'} onChange={() => onPresetChange('custom')}
            />

            {preset === 'custom' && (
              <div className="ml-9 pb-1 pt-1.5">
                <div className="flex items-center gap-2.5">
                  <input
                    type="text" inputMode="decimal" value={customValue}
                    onChange={(e) => onCustomChange(e.target.value)} placeholder="0.5"
                    className={[
                      'w-28 h-10 rounded-lg border px-3 text-sm font-mono tabular-nums',
                      'focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400',
                      customParseError
                        ? 'border-red-400 bg-red-50 text-red-900 dark:border-red-700 dark:bg-red-950 dark:text-red-300'
                        : 'border-slate-300 bg-white text-slate-900 dark:border-slate-600 dark:bg-zinc-800 dark:text-zinc-100',
                    ].join(' ')}
                  />
                  <span className="text-xs text-slate-400 dark:text-zinc-500">% &nbsp;e.g. 0.1 – 5</span>
                </div>
                {customParseError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{customParseError}</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
