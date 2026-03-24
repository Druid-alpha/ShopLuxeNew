export default function Loading() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <div className="space-y-3">
        <div className="h-6 w-56 rounded bg-slate-200 animate-pulse" />
        <div className="h-4 w-80 rounded bg-slate-100 animate-pulse" />
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={`admin-skeleton-${idx}`} className="h-28 rounded-xl border border-slate-100 bg-white p-4">
            <div className="h-4 w-1/2 rounded bg-slate-100 animate-pulse" />
            <div className="mt-3 h-3 w-2/3 rounded bg-slate-100 animate-pulse" />
          </div>
        ))}
      </div>
    </section>
  );
}
