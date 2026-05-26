'use client';

import ScrollReveal from '@/app/ui/ScrollReveal';
import VariantForm from '@/app/ui/VariantForm';

export default function ToolSection() {
  return (
    <section id="try-it" className="px-6 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-3xl">

        <ScrollReveal className="mb-16">
          <div>
            <p className="font-mono text-sm text-slate-500 dark:text-zinc-500">
              05 / Try it now
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-zinc-50 sm:text-5xl">
              Run your first Bayesian test.
            </h2>
            <p className="mt-5 text-lg text-slate-500 dark:text-zinc-400">
              Enter visitor and conversion counts for each variant. Results appear instantly — no account required.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={150}>
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <VariantForm />
          </div>
        </ScrollReveal>

      </div>
    </section>
  );
}
