'use client';

import { useEffect, useMemo, useState } from 'react';
import type { AnalyzeResponse } from '@/app/lib/types';
import { extractApiError } from '@/app/lib/api';

const API_URL = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'}/api/analyze`;

// ── Types ──────────────────────────────────────────────────────────────────────

interface PriorConfig {
  label:    string;
  sublabel: string;
  tooltip:  string;
  alpha:    number;
  beta:     number;
}

interface SensitivityRow {
  prior:          PriorConfig;
  leaderName:     string;
  leaderProbBest: number;
  leaderLoss:     number;
  action:         'STOP' | 'KEEP_TESTING';
}

// ── Pure helpers ───────────────────────────────────────────────────────────────

/**
 * Recover the original visitor/conversion counts from posterior parameters.
 * Valid only when the analysis used the default uniform prior Beta(1,1):
 *   alpha = 1 + conversions  →  conversions = alpha − 1
 *   beta  = 1 + failures     →  visitors    = alpha + beta − 2
 */
function recoverVariantData(result: AnalyzeResponse) {
  return result.variants.map(v => ({
    name:        v.name,
    conversions: Math.round(v.posterior_params.alpha - 1),
    visitors:    Math.round(v.posterior_params.alpha + v.posterior_params.beta - 2),
  }));
}

/** Weighted average conversion rate across all variants. */
function empiricalRate(variants: ReturnType<typeof recoverVariantData>): number {
  const totalV = variants.reduce((s, v) => s + v.visitors,    0);
  const totalC = variants.reduce((s, v) => s + v.conversions, 0);
  return totalV > 0 ? totalC / totalV : 0.1;
}

/**
 * Build three prior configs centred on the empirical baseline:
 *   Uniform   — Beta(1,1): no prior knowledge at all.
 *   Weak      — equivalent to ~20 prior pseudo-observations.
 *   Strong    — equivalent to ~50 prior pseudo-observations.
 *
 * Using the empirical rate as the prior mean (Empirical Bayes) is a standard
 * and defensible approach: you're encoding a realistic belief about the
 * space your product operates in, not cherry-picking a prior to favour a result.
 */
function buildPriorConfigs(baseline: number): [PriorConfig, PriorConfig, PriorConfig] {
  const params = (conc: number) => ({
    alpha: Math.max(1, Math.round(baseline * conc)),
    beta:  Math.max(1, Math.round((1 - baseline) * conc)),
  });

  const w = params(20);
  const s = params(50);
  const pct = (baseline * 100).toFixed(0);

  return [
    {
      label:    'Uniform',
      sublabel: `Beta(1, 1) — no prior knowledge`,
      tooltip:  'No assumptions at all. The result is driven entirely by the data you collected.',
      alpha: 1, beta: 1,
    },
    {
      label:    'Weak informative',
      sublabel: `Beta(${w.alpha}, ${w.beta}) — ~${pct}% rate, loosely held`,
      tooltip:  `Lightly assumes your conversion rate is around ${pct}%. Even a small amount of data will override it.`,
      ...w,
    },
    {
      label:    'Strong informative',
      sublabel: `Beta(${s.alpha}, ${s.beta}) — ~${pct}% rate, firmly held`,
      tooltip:  `Firmly assumes your conversion rate is around ${pct}%. Requires substantially more data before the result can shift.`,
      ...s,
    },
  ];
}

function rowFromResponse(prior: PriorConfig, res: AnalyzeResponse): SensitivityRow {
  const leader = [...res.variants].sort((a, b) => b.prob_best - a.prob_best)[0];
  return {
    prior,
    leaderName:     leader.name,
    leaderProbBest: leader.prob_best,
    leaderLoss:     res.recommendation.winner_loss,
    action:         res.recommendation.action,
  };
}

function allRowsAgree(rows: SensitivityRow[]): boolean {
  const actions = new Set(rows.map(r => r.action));
  const leaders = new Set(rows.map(r => r.leaderName));
  return actions.size === 1 && leaders.size === 1;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function VerdictBadge({ action }: { action: 'STOP' | 'KEEP_TESTING' }) {
  return action === 'STOP' ? (
    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
      Stop
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
      Keep testing
    </span>
  );
}

function PriorTooltip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex items-center">
      <button
        type="button"
        aria-label="What does this mean?"
        className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600 dark:bg-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-600 dark:hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        ?
      </button>
      <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-56 -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-600 shadow-md opacity-0 transition-opacity duration-150 group-hover:opacity-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
        {text}
      </div>
    </span>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-2 py-2">
      {[0, 1, 2].map(i => (
        <div key={i} className="grid grid-cols-[2fr_1fr_1fr_1fr] animate-pulse items-center gap-x-4 px-5 py-3">
          <div className="h-3 w-28 rounded bg-slate-100 dark:bg-zinc-700" />
          <div className="ml-auto h-3 w-12 rounded bg-slate-100 dark:bg-zinc-700" />
          <div className="ml-auto h-3 w-14 rounded bg-slate-100 dark:bg-zinc-700" />
          <div className="ml-auto h-5 w-20 rounded-full bg-slate-100 dark:bg-zinc-700" />
        </div>
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props { result: AnalyzeResponse }

export default function PriorSensitivityPanel({ result }: Props) {
  const [isOpen,    setIsOpen]    = useState(false);
  const [rows,      setRows]      = useState<SensitivityRow[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const recoveredVariants = useMemo(() => recoverVariantData(result), [result]);
  const baseline          = useMemo(() => empiricalRate(recoveredVariants), [recoveredVariants]);
  const priorConfigs      = useMemo(() => buildPriorConfigs(baseline), [baseline]);
  const stopThreshold     = result.recommendation.threshold;

  // Fetch the two informative-prior results the first time the panel is opened.
  // The uniform result is already in hand — no extra fetch needed for it.
  useEffect(() => {
    if (!isOpen || rows !== null || isLoading) return;

    setIsLoading(true);
    setError(null);

    const uniformRow = rowFromResponse(priorConfigs[0], result);

    Promise.all(
      priorConfigs.slice(1).map(prior =>
        fetch(API_URL, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            variants:       recoveredVariants,
            prior_alpha:    prior.alpha,
            prior_beta:     prior.beta,
            stop_threshold: stopThreshold,
          }),
        }).then(async res => {
          if (!res.ok) throw new Error(await extractApiError(res));
          return res.json() as Promise<AnalyzeResponse>;
        })
      )
    )
      .then(([weakRes, strongRes]) => {
        setRows([
          uniformRow,
          rowFromResponse(priorConfigs[1], weakRes),
          rowFromResponse(priorConfigs[2], strongRes),
        ]);
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : 'Sensitivity analysis failed.');
      })
      .finally(() => setIsLoading(false));
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const robust = rows ? allRowsAgree(rows) : null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">

      {/* ── Trigger ── */}
      <button
        type="button"
        onClick={() => setIsOpen(o => !o)}
        aria-expanded={isOpen}
        className={[
          'flex w-full items-center gap-3 px-5 py-4 text-left transition-colors',
          'hover:bg-slate-50 dark:hover:bg-zinc-800/60',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 dark:focus-visible:ring-indigo-400',
          isOpen ? 'rounded-t-2xl' : 'rounded-2xl',
        ].join(' ')}
      >
        {/* Icon */}
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-950/40">
          <svg className="h-3.5 w-3.5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h18M3 17h18" />
          </svg>
        </span>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800 dark:text-zinc-200">
            Prior sensitivity
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-500">
            Does the recommendation hold under different prior assumptions?
          </p>
        </div>

        {/* Robust badge — only visible once loaded */}
        {robust !== null && (
          <span className={[
            'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium',
            robust
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
          ].join(' ')}>
            {robust ? 'Robust' : 'Prior-sensitive'}
          </span>
        )}

        <svg
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 dark:text-zinc-500 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* ── Body ── */}
      {isOpen && (
        <div className="border-t border-slate-100 dark:border-zinc-800">

          {/* Column headers */}
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-x-4 px-5 pb-1 pt-3">
            {['Prior', 'P(leader)', 'Exp. loss', 'Verdict'].map((h, i) => (
              <p key={h} className={[
                'text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-600',
                i > 0 ? 'text-right' : '',
              ].join(' ')}>
                {h}
              </p>
            ))}
          </div>

          {/* Rows */}
          {isLoading && <LoadingRows />}

          {error && (
            <p className="px-5 py-4 text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          {rows && (
            <div className="divide-y divide-slate-50 dark:divide-zinc-800/60">
              {rows.map((row, i) => (
                <div
                  key={row.prior.label}
                  className={[
                    'grid grid-cols-[2fr_1fr_1fr_1fr] items-center gap-x-4 px-5 py-3',
                    i === 0 ? 'bg-slate-50/50 dark:bg-zinc-800/20' : '',
                  ].join(' ')}
                >
                  {/* Prior name + params */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
                      {row.prior.label}
                      <PriorTooltip text={row.prior.tooltip} />
                    </div>
                    <p className="mt-0.5 truncate text-xs text-slate-400 dark:text-zinc-600">
                      {row.prior.sublabel}
                    </p>
                  </div>

                  {/* P(leader) */}
                  <p className="text-right font-mono text-sm tabular-nums text-slate-700 dark:text-zinc-300">
                    {(row.leaderProbBest * 100).toFixed(1)}%
                  </p>

                  {/* Expected loss */}
                  <p className="text-right font-mono text-sm tabular-nums text-slate-500 dark:text-zinc-400">
                    {(row.leaderLoss * 100).toFixed(3)}%
                  </p>

                  {/* Verdict */}
                  <div className="flex justify-end">
                    <VerdictBadge action={row.action} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Summary */}
          {rows && (
            <div className={[
              'mx-5 mb-4 mt-3 rounded-xl px-4 py-3 text-sm leading-relaxed',
              robust
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300'
                : 'bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300',
            ].join(' ')}>
              {robust ? (
                <>
                  <span className="font-semibold">Robust result.</span>{' '}
                  All three priors agree: the recommendation is stable regardless of prior
                  assumptions. The data is doing the heavy lifting here, not your beliefs.
                </>
              ) : (
                <>
                  <span className="font-semibold">Prior-sensitive result.</span>{' '}
                  The recommendation changes depending on how much prior belief you bring in.
                  This usually means your sample size is still small relative to the effect
                  you&apos;re trying to detect. Collecting more data will reduce this sensitivity.
                </>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
