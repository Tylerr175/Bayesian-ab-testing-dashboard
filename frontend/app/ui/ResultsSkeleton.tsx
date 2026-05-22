function Bar({ w, h = 'h-3' }: { w: string; h?: string }) {
  return <div className={`${h} ${w} rounded bg-slate-200`} />;
}

export default function ResultsSkeleton() {
  return (
    <div className="mt-8 animate-pulse space-y-6">
      <hr className="border-slate-200" />

      {/* Hero */}
      <div className="py-2 text-center">
        <div className="mx-auto h-16 w-32 rounded-xl bg-slate-200" />
        <div className="mx-auto mt-4 h-3.5 w-64 rounded bg-slate-200" />
        <div className="mx-auto mt-3 h-8 w-44 rounded-full bg-slate-200" />
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-slate-200 bg-white px-6 pb-6 pt-5">
        <Bar w="w-52" h="h-3.5" />
        <Bar w="w-72 mt-2" h="h-2.5" />
        <div className="mt-5 h-56 rounded-lg bg-slate-100 sm:h-64" />
      </div>

      {/* Recommendation banner */}
      <div className="h-16 rounded-lg bg-slate-100" />

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <div className="h-10 border-b border-slate-200 bg-slate-50" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-4 border-t border-slate-100 bg-white px-4 py-4">
            <div className="space-y-2">
              <Bar w="w-28" />
              <Bar w="w-48" h="h-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
