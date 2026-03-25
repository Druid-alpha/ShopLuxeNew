export default function Loading() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <div className="space-y-3">
        <div className="h-6 w-48 rounded bg-slate-200 animate-pulse" />
        <div className="h-4 w-80 rounded bg-slate-100 animate-pulse" />
      </div>
      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, idx) => (
          <div key={`root-skeleton-${idx}`} className="space-y-3 rounded-xl border border-slate-100 p-4">
            <div className="h-40 rounded bg-slate-100 animate-pulse" />
            <div className="h-4 w-3/4 rounded bg-slate-100 animate-pulse" />
            <div className="h-4 w-1/2 rounded bg-slate-100 animate-pulse" />
          </div>
        ))}
      </div>
    </section>
  );
}
