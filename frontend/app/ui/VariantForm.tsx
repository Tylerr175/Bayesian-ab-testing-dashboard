'use client';

import { useState } from 'react';

import type { AnalyzePayload, AnalyzeResponse } from '@/app/lib/types';
import AdvancedSettings, { type ThresholdPreset, PRESET_VALUES } from '@/app/ui/AdvancedSettings';
import ResultsPanel from '@/app/ui/ResultsPanel';
import ResultsSkeleton from '@/app/ui/ResultsSkeleton';

// ── Types ──────────────────────────────────────────────────────────────────────

interface FormValues {
  aVisitors: string;
  aConversions: string;
  bVisitors: string;
  bConversions: string;
}

interface FormErrors {
  aVisitors?: string;
  aConversions?: string;
  bVisitors?: string;
  bConversions?: string;
}

// ── API helpers ────────────────────────────────────────────────────────────────

const API_URL = 'http://localhost:8000/api/analyze';

async function extractApiError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body.detail === 'string') return body.detail;
    if (Array.isArray(body.detail)) {
      return body.detail.map((e: { msg: string }) => e.msg).join('; ');
    }
  } catch { /* ignore parse failures */ }
  return `Unexpected error (HTTP ${res.status})`;
}

// ── Validation helpers ─────────────────────────────────────────────────────────

function parseNonNegativeInt(raw: string): number | null {
  if (!/^\d+$/.test(raw.trim())) return null;
  return parseInt(raw, 10);
}

function validateField(raw: string): string | undefined {
  if (raw.trim() === '') return 'Required';
  if (parseNonNegativeInt(raw) === null) return 'Must be a whole number ≥ 0';
  return undefined;
}

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};

  const aVErr = validateField(values.aVisitors);
  if (aVErr) errors.aVisitors = aVErr;

  const aCErr = validateField(values.aConversions);
  if (aCErr) {
    errors.aConversions = aCErr;
  } else if (!aVErr) {
    if (parseNonNegativeInt(values.aConversions)! > parseNonNegativeInt(values.aVisitors)!)
      errors.aConversions = 'Cannot exceed visitors';
  }

  const bVErr = validateField(values.bVisitors);
  if (bVErr) errors.bVisitors = bVErr;

  const bCErr = validateField(values.bConversions);
  if (bCErr) {
    errors.bConversions = bCErr;
  } else if (!bVErr) {
    if (parseNonNegativeInt(values.bConversions)! > parseNonNegativeInt(values.bVisitors)!)
      errors.bConversions = 'Cannot exceed visitors';
  }

  return errors;
}

// ── Sub-component: a single labelled input ─────────────────────────────────────

interface FieldProps {
  label: string;
  name: keyof FormValues;
  value: string;
  error?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function Field({ label, name, value, error, onChange }: FieldProps) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="text"
        inputMode="numeric"
        value={value}
        onChange={onChange}
        placeholder="0"
        className={[
          'mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm',
          'focus:outline-none focus:ring-2 focus:ring-indigo-500',
          error
            ? 'border-red-400 bg-red-50 text-red-900 placeholder-red-300'
            : 'border-slate-300 bg-white text-slate-900 placeholder-slate-400',
        ].join(' ')}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function VariantForm() {
  const [values, setValues] = useState<FormValues>({
    aVisitors: '',
    aConversions: '',
    bVisitors: '',
    bConversions: '',
  });

  const [errors, setErrors]               = useState<FormErrors>({});
  const [isLoading, setIsLoading]         = useState(false);
  const [apiError, setApiError]           = useState<string | null>(null);
  const [result, setResult]               = useState<AnalyzeResponse | null>(null);
  const [thresholdPreset, setThresholdPreset] = useState<ThresholdPreset>('balanced');
  const [customThreshold, setCustomThreshold] = useState('');

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const errs = validate(values);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    // Resolve the stopping threshold before building the payload
    let stopThreshold: number;
    if (thresholdPreset === 'custom') {
      const v = parseFloat(customThreshold);
      if (isNaN(v) || v <= 0) {
        setApiError('Custom threshold is invalid — open Advanced Settings and enter a positive decimal like 0.005.');
        return;
      }
      stopThreshold = v / 100;
    } else {
      stopThreshold = PRESET_VALUES[thresholdPreset];
    }

    const payload: AnalyzePayload = {
      a_visitors:    parseNonNegativeInt(values.aVisitors)!,
      a_conversions: parseNonNegativeInt(values.aConversions)!,
      b_visitors:    parseNonNegativeInt(values.bVisitors)!,
      b_conversions: parseNonNegativeInt(values.bConversions)!,
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

      if (!res.ok) {
        setApiError(await extractApiError(res));
        return;
      }

      const data: AnalyzeResponse = await res.json();
      setResult(data);
    } catch (err) {
      setApiError(
        err instanceof TypeError
          ? 'Could not reach the backend. Is the server running on port 8000?'
          : 'An unexpected error occurred. Check the browser console for details.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

          {/* ── Variant A ── */}
          <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
              <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Variant A
              </h3>
            </div>
            <Field label="Visitors"    name="aVisitors"    value={values.aVisitors}    error={errors.aVisitors}    onChange={handleChange} />
            <Field label="Conversions" name="aConversions" value={values.aConversions} error={errors.aConversions} onChange={handleChange} />
          </div>

          {/* ── Variant B ── */}
          <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
              <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Variant B
              </h3>
            </div>
            <Field label="Visitors"    name="bVisitors"    value={values.bVisitors}    error={errors.bVisitors}    onChange={handleChange} />
            <Field label="Conversions" name="bConversions" value={values.bConversions} error={errors.bConversions} onChange={handleChange} />
          </div>

        </div>

        <AdvancedSettings
          preset={thresholdPreset}
          customValue={customThreshold}
          onPresetChange={setThresholdPreset}
          onCustomChange={setCustomThreshold}
        />

        {apiError && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-700">{apiError}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className={[
            'w-full rounded-md px-4 py-2.5 text-sm font-semibold text-white shadow-sm',
            'transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
            isLoading
              ? 'cursor-not-allowed bg-indigo-400'
              : 'bg-indigo-600 hover:bg-indigo-500',
          ].join(' ')}
        >
          {isLoading ? 'Analyzing…' : 'Run Analysis'}
        </button>
      </form>

      {isLoading && <ResultsSkeleton />}
      {result && !isLoading && <ResultsPanel result={result} />}
    </>
  );
}
