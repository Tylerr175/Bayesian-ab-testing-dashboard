function Shim({ className }: { className: string }) {
  return <div className={`animate-shimmer rounded ${className}`} />;
}

export default function ResultsSkeleton() {
  return (
    <div className="mt-10 space-y-8">
      <hr className="border-slate-200 dark:border-zinc-800" />

      {/* Hero — mirrors the text-7xl number + subtitle + banner */}
      <div className="py-4 text-center">
        <Shim className="mx-auto h-20 w-40 rounded-xl" />
        <Shim className="mx-auto mt-4 h-3.5 w-64" />
        <div className="mx-auto mt-4 max-w-lg">
          <Shim className="h-16 w-full rounded-xl" />
        </div>
      </div>

      {/* Metrics grid — mirrors the 3-column rounded-2xl card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-zinc-800">
        <div className="grid grid-cols-1 divide-y divide-slate-200 dark:divide-zinc-800 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-3 px-5 py-5 sm:px-6">
              <Shim className="h-2.5 w-28" />
              <Shim className="h-3.5 w-full" />
              <Shim className="h-3.5 w-4/5" />
            </div>
          ))}
        </div>
      </div>

      {/* Chart card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-zinc-700 dark:bg-zinc-900">
        <Shim className="h-2.5 w-40" />
        <Shim className="mt-2 h-2.5 w-64" />
        <Shim className="mt-6 h-56 w-full rounded-xl" />
      </div>
    </div>
  );
}
