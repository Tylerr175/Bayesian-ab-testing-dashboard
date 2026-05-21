import VariantForm from '@/app/ui/VariantForm';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-3xl px-6 py-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
            Bayesian Statistics
          </span>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            A/B Testing Dashboard
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <p className="leading-7 text-slate-600">
          Enter visitor and conversion counts for two variants and this tool
          applies a Bayesian Beta-Binomial model to compute each variant&apos;s
          posterior conversion-rate distribution. You&apos;ll see the probability that
          B outperforms A, a 95% credible interval on the lift, and an
          expected-loss metric that tells you when it is statistically safe to
          stop the test and declare a winner — without the arbitrary p-value
          thresholds of frequentist testing.
        </p>

        <section className="mt-10 rounded-xl border border-slate-200 bg-white p-8">
          <VariantForm />
        </section>
      </main>
    </div>
  );
}
