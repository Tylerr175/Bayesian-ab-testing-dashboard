'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus } from 'lucide-react';

import type { AnalyzePayload, AnalyzeResponse } from '@/app/lib/types';
import AdvancedSettings, { type ThresholdPreset, PRESET_VALUES } from '@/app/ui/AdvancedSettings';
import CsvUpload, { type ParsedVariant } from '@/app/ui/CsvUpload';
import ResultsPanel from '@/app/ui/ResultsPanel';
import ResultsSkeleton from '@/app/ui/ResultsSkeleton';

// ── Constants ──────────────────────────────────────────────────────────────────

type ActiveTab = 'manual' | 'csv';

const MIN_VARIANTS  = 2;
const MAX_VARIANTS  = 6;
const DEFAULT_NAMES = ['A', 'B', 'C', 'D', 'E', 'F'];
const API_URL       = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'}/api/analyze`;

// Color palette — index matches PosteriorChart's PALETTE array
const CARD_COLORS = [
  { dot: 'bg-indigo-500',  border: 'border-indigo-200 dark:border-indigo-800' },
  { dot: 'bg-emerald-500', border: 'border-emerald-200 dark:border-emerald-800' },
  { dot: 'bg-amber-500',   border: 'border-amber-200 dark:border-amber-800'   },
  { dot: 'bg-rose-500',    border: 'border-rose-200 dark:border-rose-800'     },
  { dot: 'bg-violet-500',  border: 'border-violet-200 dark:border-violet-800' },
  { dot: 'bg-cyan-500',    border: 'border-cyan-200 dark:border-cyan-800'     },
];

// ── Types ──────────────────────────────────────────────────────────────────────

interface VariantField {
  id: string;          // stable React key
  name: string;
  visitors: string;
  conversions: string;
}

type FieldErrors = { name?: string; visitors?: string; conversions?: string };
type FormErrors  = Record<string, FieldErrors>;  // keyed by VariantField.id

// ── Helpers ────────────────────────────────────────────────────────────────────

function parseNonNegativeInt(raw: string): number | null {
  if (!/^\d+$/.test(raw.trim())) return null;
  return parseInt(raw, 10);
}

function validateAll(variants: VariantField[]): FormErrors {
  const errors: FormErrors = {};
  const seenNames = new Set<string>();

  for (const v of variants) {
    const e: FieldErrors = {};
    const trimmedName = v.name.trim().toUpperCase();

    if (!v.name.trim()) {
      e.name = 'Required';
    } else if (seenNames.has(trimmedName)) {
      e.name = 'Duplicate name';
    } else {
      seenNames.add(trimmedName);
    }

    if (!v.visitors.trim()) {
      e.visitors = 'Required';
    } else if (parseNonNegativeInt(v.visitors) === null) {
      e.visitors = 'Must be a whole number ≥ 0';
    }

    if (!v.conversions.trim()) {
      e.conversions = 'Required';
    } else if (parseNonNegativeInt(v.conversions) === null) {
      e.conversions = 'Must be a whole number ≥ 0';
    } else if (!e.visitors && parseNonNegativeInt(v.conversions)! > parseNonNegativeInt(v.visitors)!) {
      e.conversions = 'Cannot exceed visitors';
    }

    if (Object.keys(e).length > 0) errors[v.id] = e;
  }
  return errors;
}

async function extractApiError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body.detail === 'string') return body.detail;
    if (Array.isArray(body.detail))
      return body.detail.map((e: { msg: string }) => e.msg).join('; ');
  } catch { /* ignore */ }
  return `Unexpected error (HTTP ${res.status})`;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function NumberField({ label, id, value, error, onChange }: {
  label: string; id: string; value: string; error?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-500">
        {label}
      </label>
      <input
        id={id} type="text" inputMode="numeric"
        value={value} onChange={e => onChange(e.target.value)} placeholder="0"
        className={[
          'mt-1.5 block h-11 w-full rounded-lg border px-4 text-sm font-mono tabular-nums',
          'focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400',
          error
            ? 'border-red-400 bg-red-50 text-red-900 placeholder-red-300 dark:border-red-700 dark:bg-red-950 dark:text-red-300 dark:placeholder-red-700'
            : 'border-slate-300 bg-white text-slate-900 placeholder-slate-400 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-slate-500',
        ].join(' ')}
      />
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button" onClick={onClick}
      className={[
        'flex-1 rounded-md py-1.5 text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 dark:focus-visible:ring-indigo-400 dark:focus:ring-offset-zinc-900',
        active
          ? 'bg-white text-slate-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100'
          : 'text-slate-500 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-slate-300',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function VariantForm() {
  const baseId      = useId();
  const counterRef  = useRef(2); // 0 and 1 reserved for the two default variants
  const resultsRef  = useRef<HTMLDivElement>(null);
  function uid() { return `${baseId}-${counterRef.current++}`; }

  const [activeTab,    setActiveTab]    = useState<ActiveTab>('manual');
  const [csvFilename,  setCsvFilename]  = useState<string | null>(null);
  const [variants,     setVariants]     = useState<VariantField[]>([
    { id: `${baseId}-0`, name: 'A', visitors: '', conversions: '' },
    { id: `${baseId}-1`, name: 'B', visitors: '', conversions: '' },
  ]);
  const [errors,       setErrors]       = useState<FormErrors>({});
  const [isLoading,    setIsLoading]    = useState(false);
  const [apiError,     setApiError]     = useState<string | null>(null);
  const [result,       setResult]       = useState<AnalyzeResponse | null>(null);
  const [thresholdPreset,  setThresholdPreset]  = useState<ThresholdPreset>('balanced');
  const [customThreshold, setCustomThreshold] = useState('');

  // ── Scroll to results once they arrive ────────────────────────────────────

  useEffect(() => {
    if (result && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [result]);

  // ── Variant list mutations ─────────────────────────────────────────────────

  function updateField(id: string, field: keyof Omit<VariantField, 'id'>, value: string) {
    setVariants(prev => prev.map(v => v.id === id ? { ...v, [field]: value } : v));
    if (errors[id]?.[field])
      setErrors(prev => ({ ...prev, [id]: { ...prev[id], [field]: undefined } }));
  }

  function addVariant() {
    if (variants.length >= MAX_VARIANTS) return;
    const idx = variants.length;
    setVariants(prev => [...prev, { id: uid(), name: DEFAULT_NAMES[idx] ?? String(idx + 1), visitors: '', conversions: '' }]);
  }

  function removeVariant(id: string) {
    if (variants.length <= MIN_VARIANTS) return;
    setVariants(prev => prev.filter(v => v.id !== id));
    setErrors(prev => { const next = { ...prev }; delete next[id]; return next; });
  }

  // ── CSV handler ────────────────────────────────────────────────────────────

  function handleCsvParsed(parsed: ParsedVariant[], filename: string) {
    setVariants(parsed.map(v => ({ id: uid(), name: v.name, visitors: String(v.visitors), conversions: String(v.conversions) })));
    setErrors({});
    setApiError(null);
    setResult(null);
    setCsvFilename(filename);
    setActiveTab('manual');
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const errs = validateAll(variants);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      if (activeTab === 'csv') setActiveTab('manual');
      return;
    }

    let stopThreshold: number;
    if (thresholdPreset === 'custom') {
      const v = parseFloat(customThreshold);
      if (isNaN(v) || v <= 0) {
        setApiError('Custom threshold is invalid — open Advanced Settings and enter a positive percentage like 0.5.');
        return;
      }
      stopThreshold = v / 100;
    } else {
      stopThreshold = PRESET_VALUES[thresholdPreset];
    }

    const payload: AnalyzePayload = {
      variants: variants.map(v => ({
        name: v.name.trim(),
        visitors:    parseNonNegativeInt(v.visitors)!,
        conversions: parseNonNegativeInt(v.conversions)!,
      })),
      stop_threshold: stopThreshold,
    };

    setIsLoading(true);
    setApiError(null);
    setResult(null);

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { setApiError(await extractApiError(res)); return; }
      setResult(await res.json());
    } catch (err) {
      setApiError(err instanceof TypeError
        ? 'Could not reach the backend. Is the server running on port 8000?'
        : 'An unexpected error occurred. Check the browser console for details.');
    } finally {
      setIsLoading(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <form onSubmit={handleSubmit} noValidate className="space-y-6">

        {/* ── Tab switcher ── */}
        <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-zinc-800 dark:bg-zinc-950">
          <TabButton label="Manual Input" active={activeTab === 'manual'} onClick={() => setActiveTab('manual')} />
          <TabButton label="Upload CSV"   active={activeTab === 'csv'}    onClick={() => setActiveTab('csv')}    />
        </div>

        {/* ── Manual tab ── */}
        {activeTab === 'manual' ? (
          <>
            {csvFilename && (
              <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 dark:border-emerald-800 dark:bg-emerald-950">
                <p className="text-sm text-emerald-700 dark:text-emerald-400">
                  <span className="font-medium">Fields loaded from {csvFilename}</span>
                  {' '}— review and submit, or edit below.
                </p>
                <button type="button" onClick={() => setCsvFilename(null)} aria-label="Dismiss"
                  className="ml-3 text-emerald-500 transition-colors hover:text-emerald-700 dark:text-emerald-600 dark:hover:text-emerald-400">
                  ✕
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <AnimatePresence initial={false}>
              {variants.map((v, idx) => {
                const color = CARD_COLORS[idx % CARD_COLORS.length];
                const errs  = errors[v.id];
                return (
                  <motion.div key={v.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className={`space-y-4 rounded-xl border p-5 bg-slate-50 dark:bg-zinc-800 ${color.border}`}>

                    {/* Card header: dot + editable name + remove button */}
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${color.dot}`} />
                      <input
                        type="text"
                        value={v.name}
                        onChange={e => updateField(v.id, 'name', e.target.value)}
                        maxLength={20}
                        placeholder="Name"
                        aria-label="Variant name"
                        className={[
                          'min-w-0 flex-1 border-0 bg-transparent text-base font-medium outline-none',
                          'placeholder-slate-400 dark:placeholder-zinc-500',
                          errs?.name
                            ? 'text-red-700 dark:text-red-400'
                            : 'text-slate-900 dark:text-zinc-100',
                        ].join(' ')}
                      />
                      {variants.length > MIN_VARIANTS && (
                        <button
                          type="button"
                          onClick={() => removeVariant(v.id)}
                          aria-label={`Remove Variant ${v.name}`}
                          className={[
                            'ml-auto shrink-0 rounded p-0.5 text-slate-400 transition-colors',
                            'hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/30 dark:hover:text-rose-400',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                          ].join(' ')}
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                    {errs?.name && (
                      <p className="-mt-3 text-xs text-red-600 dark:text-red-400">{errs.name}</p>
                    )}

                    <NumberField label="Visitors"    id={`${v.id}-visitors`}
                      value={v.visitors}    error={errs?.visitors}
                      onChange={val => updateField(v.id, 'visitors', val)} />
                    <NumberField label="Conversions" id={`${v.id}-conversions`}
                      value={v.conversions} error={errs?.conversions}
                      onChange={val => updateField(v.id, 'conversions', val)} />
                  </motion.div>
                );
              })}
              </AnimatePresence>
            </div>

            {variants.length < MAX_VARIANTS && (
              <div className="flex justify-center py-6">
                <button
                  type="button"
                  onClick={addVariant}
                  className={[
                    'flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors duration-150',
                    'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700',
                    'dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-200',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:focus-visible:ring-indigo-400',
                  ].join(' ')}
                >
                  <Plus className="h-4 w-4" />
                  <span className="font-medium">Add variant</span>
                  <span className="ml-1 text-xs text-slate-400 dark:text-zinc-500">
                    {variants.length} / {MAX_VARIANTS}
                  </span>
                </button>
              </div>
            )}
          </>
        ) : (
          <CsvUpload onParsed={handleCsvParsed} />
        )}

        <AdvancedSettings
          preset={thresholdPreset}
          customValue={customThreshold}
          onPresetChange={setThresholdPreset}
          onCustomChange={setCustomThreshold}
        />

        {apiError && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-950">
            <p className="text-sm text-red-700 dark:text-red-400">{apiError}</p>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading}
            className={[
              'flex h-12 w-full items-center justify-center gap-2.5 rounded-lg px-8 text-sm font-semibold text-white sm:w-auto',
              'bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500',
              'shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900',
              isLoading
                ? 'cursor-not-allowed opacity-60'
                : 'hover:opacity-90 hover:shadow-[0_4px_14px_0_rgb(99,102,241,0.4)] active:scale-[0.98]',
            ].join(' ')}
          >
            {isLoading && (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {isLoading ? 'Analyzing…' : 'Run Analysis'}
          </button>
        </div>
      </form>

      <div ref={resultsRef}>
        {isLoading && <ResultsSkeleton />}
        {result && !isLoading && <ResultsPanel result={result} />}
      </div>
    </>
  );
}
