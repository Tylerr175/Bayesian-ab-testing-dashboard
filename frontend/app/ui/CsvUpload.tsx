'use client';

import { useRef, useState } from 'react';
import Papa from 'papaparse';

export interface ParsedVariant {
  name: string;
  visitors: number;
  conversions: number;
}

interface Props {
  onParsed: (variants: ParsedVariant[], filename: string) => void;
}

const EXAMPLE_CSV = `variant,visitors,conversions\nA,1000,80\nB,1000,100\nC,1000,92\n`;
const EXAMPLE_HREF = `data:text/csv;charset=utf-8,${encodeURIComponent(EXAMPLE_CSV)}`;

type Row = Record<string, string>;

function requireNonNegativeInt(raw: string | undefined, label: string): number {
  if (raw === undefined || raw.trim() === '')
    throw new Error(`Missing value for "${label}".`);
  const v = Number(raw.trim());
  if (!Number.isInteger(v) || v < 0)
    throw new Error(`"${label}" must be a non-negative integer, got "${raw.trim()}".`);
  return v;
}

// Format A: variant, visitors, conversions — one row per variant (2–6 variants)
function parseFormatA(rows: Row[]): ParsedVariant[] {
  // Preserve order of first appearance; deduplicate by name
  const seen = new Map<string, Row>();
  for (const row of rows) {
    const raw = row.variant?.trim();
    if (raw && !seen.has(raw)) seen.set(raw, row);
  }
  if (seen.size < 2) throw new Error('CSV must have at least 2 variant rows.');

  return Array.from(seen.entries()).map(([name, row]) => {
    const visitors    = requireNonNegativeInt(row.visitors,    `${name} visitors`);
    const conversions = requireNonNegativeInt(row.conversions, `${name} conversions`);
    if (conversions > visitors)
      throw new Error(`Variant "${name}": conversions (${conversions}) cannot exceed visitors (${visitors}).`);
    return { name, visitors, conversions };
  });
}

// Format B: a_visitors, a_conversions, b_visitors, b_conversions — single row, two variants only
function parseFormatB(row: Row): ParsedVariant[] {
  const get = (a: string, b: string) => row[a] ?? row[b];
  const aV  = requireNonNegativeInt(get('a_visitors',    'avisitors'),    'a_visitors');
  const aC  = requireNonNegativeInt(get('a_conversions', 'aconversions'), 'a_conversions');
  const bV  = requireNonNegativeInt(get('b_visitors',    'bvisitors'),    'b_visitors');
  const bC  = requireNonNegativeInt(get('b_conversions', 'bconversions'), 'b_conversions');
  if (aC > aV) throw new Error(`Variant A: conversions (${aC}) cannot exceed visitors (${aV}).`);
  if (bC > bV) throw new Error(`Variant B: conversions (${bC}) cannot exceed visitors (${bV}).`);
  return [
    { name: 'A', visitors: aV, conversions: aC },
    { name: 'B', visitors: bV, conversions: bC },
  ];
}

function findHeaderLine(lines: string[]): number {
  for (let i = 0; i < lines.length; i++) {
    const fields = lines[i].split(',').map(f => f.trim().toLowerCase().replace(/\s+/g, '_'));
    const isFormatA = fields.includes('variant');
    const isFormatB = fields.some(f => f === 'a_visitors' || f === 'a_conversions' || f === 'b_visitors');
    if (isFormatA || isFormatB) return i;
  }
  return 0;
}

function parseCsvText(text: string): ParsedVariant[] {
  const lines   = text.split(/\r?\n/);
  const section = lines.slice(findHeaderLine(lines)).join('\n');

  const result = Papa.parse<Row>(section, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim().toLowerCase().replace(/\s+/g, '_'),
  });

  if (result.data.length === 0) throw new Error('CSV has no data rows.');

  const headers = result.meta.fields ?? [];

  if (headers.includes('variant')) {
    return parseFormatA(result.data);
  } else if (headers.some(h => h.startsWith('a_') || h.startsWith('b_'))) {
    return parseFormatB(result.data[0]);
  } else {
    throw new Error(
      'Unrecognised CSV format. Expected either:\n' +
      '  • variant, visitors, conversions  (one row per variant, 2+ variants)\n' +
      '  • a_visitors, a_conversions, b_visitors, b_conversions  (single row)',
    );
  }
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function CsvUpload({ onParsed }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [loadedName, setLoadedName] = useState<string | null>(null);
  const fileInputRef                = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      setError('Please select a .csv file.');
      return;
    }
    try {
      const variants = parseCsvText(await file.text());
      setLoadedName(file.name);
      onParsed(variants, file.name);
    } catch (err) {
      setLoadedName(null);
      setError(err instanceof Error ? err.message : 'Failed to parse CSV.');
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  }

  const zoneBase = 'cursor-pointer select-none rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors';
  const zoneColor = isDragging
    ? 'border-indigo-400 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-950'
    : loadedName
    ? 'border-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950 dark:hover:bg-emerald-900'
    : 'border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:hover:border-slate-500 dark:hover:bg-slate-700';

  return (
    <div className="space-y-3">
      <div
        role="button" tabIndex={0}
        className={`${zoneBase} ${zoneColor}`}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false); }}
        onDrop={handleDrop}
      >
        {loadedName ? (
          <>
            <svg className="mx-auto h-8 w-8 text-emerald-500 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="mt-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">{loadedName}</p>
            <p className="mt-0.5 text-xs text-emerald-600 dark:text-emerald-500">Click to replace</p>
          </>
        ) : (
          <>
            <svg className="mx-auto h-8 w-8 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              {isDragging ? 'Drop to upload' : 'Drag and drop a CSV file here'}
            </p>
            <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">or click to browse</p>
          </>
        )}
        <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleInputChange} className="sr-only" />
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-950">
          <p className="whitespace-pre-wrap text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs dark:border-slate-700 dark:bg-slate-800">
        <p className="mb-3 font-semibold text-slate-600 dark:text-slate-300">Accepted formats</p>
        <div className="space-y-3">
          <div>
            <p className="mb-1 text-slate-500 dark:text-slate-400">Format A — one row per variant (2–6 variants):</p>
            <pre className="overflow-x-auto rounded border border-slate-200 bg-white px-3 py-2 font-mono leading-relaxed text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">{
`variant,visitors,conversions
A,1000,80
B,1000,100
C,1000,92`
            }</pre>
          </div>
          <div>
            <p className="mb-1 text-slate-500 dark:text-slate-400">Format B — single row (two variants only):</p>
            <pre className="overflow-x-auto rounded border border-slate-200 bg-white px-3 py-2 font-mono leading-relaxed text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">{
`a_visitors,a_conversions,b_visitors,b_conversions
1000,80,1000,100`
            }</pre>
          </div>
          <a href={EXAMPLE_HREF} download="ab_test_example.csv"
            className="inline-block text-indigo-600 transition-colors hover:text-indigo-500 hover:underline dark:text-indigo-400 dark:hover:text-indigo-300">
            Download example CSV ↓
          </a>
        </div>
      </div>
    </div>
  );
}
