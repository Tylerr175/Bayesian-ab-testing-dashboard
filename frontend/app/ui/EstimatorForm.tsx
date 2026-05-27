'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { HelpCircle } from 'lucide-react';
import type { EstimatePayload, EstimateResponse } from '@/app/lib/types';
import { extractApiError } from '@/app/lib/api';
import EstimatorResults from '@/app/ui/EstimatorResults';

const API_URL = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'}/api/estimate-sample-size`;

// ── Tooltip ────────────────────────────────────────────────────────────────────

function FieldTooltip({ text }: { text: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        aria-label="More information"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onClick={() => setVisible(v => !v)}
        className="rounded text-slate-400 transition-colors duration-150 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>
      {visible && (
        <div className="absolute left-full top-0 z-10 ml-2 w-[260px] rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left text-sm text-slate-700 shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
          {text}
        </div>
      )}
    </span>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────


// ── Main component ─────────────────────────────────────────────────────────────

type FormErrors = { baseline?: string; lift?: string; dailyTraffic?: string };

export default function EstimatorForm() {
  const baseId     = useId();
  const formRef    = useRef<HTMLFormElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const abortRef   = useRef<AbortController | null>(null);

  const [baselineRate,        setBaselineRate]        = useState('');
  const [minimumLift,         setMinimumLift]         = useState('');
  const [confidenceThreshold, setConfidenceThreshold] = useState('0.95');
  const [dailyTraffic,        setDailyTraffic]        = useState('');
  const [errors,              setErrors]              = useState<FormErrors>({});
  const [isLoading,           setIsLoading]           = useState(false);
  const [apiError,            setApiError]            = useState<string | null>(null);
  const [result,              setResult]              = useState<EstimateResponse | null>(null);
  const [submittedLift,       setSubmittedLift]       = useState(0);
  const [submittedTraffic,    setSubmittedTraffic]    = useState<number | null>(null);

  // ── Abort any in-flight request when the component unmounts ──────────────

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  useEffect(() => {
    if (result && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [result]);

  function validate(): boolean {
    const errs: FormErrors = {};
    const b = parseFloat(baselineRate);
    const l = parseFloat(minimumLift);

    if (!baselineRate.trim())
      errs.baseline = 'Required';
    else if (isNaN(b) || b <= 0 || b >= 1)
      errs.baseline = 'Must be between 0 and 1 (e.g. 0.10 for 10%)';

    if (!minimumLift.trim())
      errs.lift = 'Required';
    else if (isNaN(l) || l <= 0)
      errs.lift = 'Must be a positive number (e.g. 0.02 for a 2 point lift)';
    else if (l >= 1)
      errs.lift = 'Must be less than 1';
    else if (!errs.baseline && b + l > 1)
      errs.lift = 'Baseline + lift cannot exceed 1.0';

    if (dailyTraffic.trim()) {
      const d = parseInt(dailyTraffic, 10);
      if (isNaN(d) || d <= 0 || !/^\d+$/.test(dailyTraffic.trim()))
        errs.dailyTraffic = 'Must be a positive whole number';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validate()) return;

    const payload: EstimatePayload = {
      baseline_rate:        parseFloat(baselineRate),
      minimum_lift:         parseFloat(minimumLift),
      confidence_threshold: parseFloat(confidenceThreshold),
    };

    // Cancel any previous in-flight request before starting a new one
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setApiError(null);
    setResult(null);

    try {
      const res = await fetch(API_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
        signal:  controller.signal,
      });
      if (!res.ok) { setApiError(await extractApiError(res)); return; }
      setSubmittedLift(payload.minimum_lift);
      setSubmittedTraffic(dailyTraffic.trim() ? parseInt(dailyTraffic, 10) : null);
      setResult(await res.json());
    } catch (err) {
      if (controller.signal.aborted) return; // intentional cancel — discard silently
      setApiError(err instanceof TypeError
        ? 'Could not reach the backend. Is the server running on port 8000?'
        : 'An unexpected error occurred. Check the browser console for details.');
    } finally {
      // Only clear loading state if this request is still the active one
      if (!controller.signal.aborted) setIsLoading(false);
    }
  }

  function handleReset() {
    setBaselineRate('');
    setMinimumLift('');
    setConfidenceThreshold('0.95');
    setDailyTraffic('');
    setErrors({});
    setApiError(null);
    setResult(null);
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  const inputBase = [
    'mt-1.5 block h-11 w-full rounded-lg border px-4 text-sm font-mono tabular-nums',
    'focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400',
  ].join(' ');
  const inputNormal = 'border-slate-300 bg-white text-slate-900 placeholder-slate-400 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-slate-500';
  const inputError  = 'border-red-400 bg-red-50 text-red-900 placeholder-red-300 dark:border-red-700 dark:bg-red-950 dark:text-red-300 dark:placeholder-red-700';

  return (
    <>
      <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-6">
        <div className="space-y-5 rounded-xl border border-slate-200 bg-slate-50 p-6 dark:border-zinc-800 dark:bg-zinc-800/50">

          {/* Baseline conversion rate */}
          <div>
            <div className="flex items-center gap-1.5">
              <label htmlFor={`${baseId}-baseline`} className="block text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Baseline Conversion Rate
              </label>
              <FieldTooltip text="Your current variant's conversion rate. For example, 0.10 means 10%." />
            </div>
            <input
              id={`${baseId}-baseline`}
              type="text" inputMode="decimal"
              value={baselineRate}
              onChange={e => { setBaselineRate(e.target.value); if (errors.baseline) setErrors(p => ({ ...p, baseline: undefined })); }}
              placeholder="e.g. 0.10"
              className={`${inputBase} ${errors.baseline ? inputError : inputNormal}`}
            />
            {errors.baseline && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.baseline}</p>}
          </div>

          {/* Minimum detectable lift */}
          <div>
            <div className="flex items-center gap-1.5">
              <label htmlFor={`${baseId}-lift`} className="block text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Minimum Detectable Lift
              </label>
              <FieldTooltip text="The smallest improvement you'd care about catching, in percentage points. For example, 0.02 means a 2 point lift." />
            </div>
            <input
              id={`${baseId}-lift`}
              type="text" inputMode="decimal"
              value={minimumLift}
              onChange={e => { setMinimumLift(e.target.value); if (errors.lift) setErrors(p => ({ ...p, lift: undefined })); }}
              placeholder="e.g. 0.02"
              className={`${inputBase} ${errors.lift ? inputError : inputNormal}`}
            />
            {errors.lift && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.lift}</p>}
          </div>

          {/* Confidence level */}
          <div>
            <div className="flex items-center gap-1.5">
              <label htmlFor={`${baseId}-confidence`} className="block text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Confidence Level
              </label>
              <FieldTooltip text="How confident you want to be when declaring a winner. Higher confidence requires more data." />
            </div>
            <select
              id={`${baseId}-confidence`}
              value={confidenceThreshold}
              onChange={e => setConfidenceThreshold(e.target.value)}
              className={[
                'mt-1.5 block h-11 w-full cursor-pointer appearance-none rounded-lg border px-4 text-sm',
                'focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400',
                'border-slate-300 bg-white text-slate-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100',
              ].join(' ')}
            >
              <option value="0.90">90%</option>
              <option value="0.95">95% (default)</option>
              <option value="0.99">99%</option>
            </select>
          </div>

          {/* Daily traffic — optional */}
          <div>
            <div className="flex items-center gap-1.5">
              <label htmlFor={`${baseId}-traffic`} className="block text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Daily Traffic Per Variant
                <span className="ml-1.5 normal-case font-normal text-slate-400 dark:text-zinc-500">(optional)</span>
              </label>
              <FieldTooltip text="How many visitors reach each variant per day. Used to estimate how long your test will need to run." />
            </div>
            <input
              id={`${baseId}-traffic`}
              type="text" inputMode="numeric"
              value={dailyTraffic}
              onChange={e => { setDailyTraffic(e.target.value); if (errors.dailyTraffic) setErrors(p => ({ ...p, dailyTraffic: undefined })); }}
              placeholder="e.g. 500"
              className={`${inputBase} ${errors.dailyTraffic ? inputError : inputNormal}`}
            />
            {errors.dailyTraffic && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.dailyTraffic}</p>}
          </div>
        </div>

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
            {isLoading ? 'Estimating…' : 'Estimate sample size'}
          </button>
        </div>
      </form>

      <div ref={resultsRef}>
        {result && !isLoading && (
          <EstimatorResults
            result={result}
            minimumLift={submittedLift}
            dailyTraffic={submittedTraffic}
            onReset={handleReset}
          />
        )}
      </div>
    </>
  );
}
