'use client';

import { motion } from 'framer-motion';
import ScrollReveal from '@/app/ui/ScrollReveal';

export default function HeroSection() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center px-6 pb-24 pt-16 sm:px-8">
      <div className="mx-auto max-w-2xl text-center">

        {/* Label chip — above fold, no scroll animation needed */}
        <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600 dark:border-indigo-800/60 dark:bg-indigo-950/50 dark:text-indigo-400">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
          Bayesian A/B Testing
        </span>

        <ScrollReveal className="mt-6">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-zinc-50 sm:text-5xl lg:text-6xl">
            A/B testing that answers the question you actually have.
          </h1>
        </ScrollReveal>

        <ScrollReveal delay={150} className="mt-6">
          <p className="text-lg leading-relaxed text-slate-500 dark:text-zinc-400 sm:text-xl">
            Get a clear recommendation in plain English — no p-values, no statistical
            guesswork. Just probability-based decisions.
          </p>
        </ScrollReveal>

        {/* CTA — static, in the same visual block as the headline */}
        <div className="mt-8">
          <a
            href="#try-it"
            className="inline-flex h-12 items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-8 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 hover:shadow-[0_4px_14px_0_rgb(99,102,241,0.4)] active:scale-[0.98]"
          >
            Try it now
          </a>
        </div>
      </div>

      {/* Scroll indicator — fades in after content, then bounces forever */}
      <ScrollReveal delay={300} className="absolute bottom-10 left-1/2 -translate-x-1/2">
        <a href="#explainer" aria-label="Scroll to learn more">
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            className="flex flex-col items-center gap-1.5 text-slate-400 transition-colors hover:text-slate-600 dark:text-zinc-600 dark:hover:text-zinc-400"
          >
            <span className="text-xs tracking-widest uppercase">scroll</span>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </motion.div>
        </a>
      </ScrollReveal>
    </section>
  );
}
