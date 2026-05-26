'use client';

import { BarChart, DollarSign, Mail, ShoppingCart } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import ScrollReveal from '@/app/ui/ScrollReveal';

const useCases: { icon: LucideIcon; label: string; note: string }[] = [
  {
    icon: Mail,
    label: 'Marketing campaigns',
    note: 'Email subject lines, ad creatives, landing page headlines',
  },
  {
    icon: ShoppingCart,
    label: 'Product changes',
    note: 'Checkout flows, signup forms, feature designs',
  },
  {
    icon: DollarSign,
    label: 'Pricing tests',
    note: 'Discount offers, price points, promo wording',
  },
  {
    icon: BarChart,
    label: 'Any binary outcome test',
    note: 'Anywhere you can count "did this work?"',
  },
];

export default function WhatItsForSection() {
  return (
    <section className="px-6 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-3xl">

        <ScrollReveal className="mb-12">
          <div>
            <p className="font-mono text-sm text-slate-500 dark:text-zinc-500">
              01 / Who is this for?
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-zinc-50 sm:text-5xl">
              Who is this for?
            </h2>
            <div className="mt-5 space-y-4 text-lg text-slate-500 dark:text-zinc-400">
              <p>
                A/B testing is how you decide between two versions of something — a button color,
                an email subject line, an ad headline, a product flow, anything where you can
                measure "did people respond?" You send some people version A, some people version B,
                and count what happens. The question is always the same: was the difference real,
                or just random?
              </p>
              <p>
                Here&apos;s where this tool comes in. You give it the visitor and conversion counts
                from your test — and it tells you which version actually won, by how much, and
                whether you can safely act on the result.
              </p>
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={150}>
          <div>
            <p className="mb-5 text-base font-semibold text-slate-800 dark:text-zinc-200">
              It works for:
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {useCases.map(({ icon: Icon, label, note }) => (
                <div
                  key={label}
                  className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-indigo-500 dark:text-indigo-400" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-zinc-200">{label}</p>
                    <p className="mt-0.5 text-sm text-slate-500 dark:text-zinc-400">{note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>

      </div>
    </section>
  );
}
