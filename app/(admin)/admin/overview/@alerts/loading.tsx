export default function Loading() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="h-4 w-24 rounded bg-slate-200 animate-pulse" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: 2 }).map((_, idx) => (
          <div key={`alerts-skeleton-${idx}`} className="h-20 rounded bg-slate-100 animate-pulse" />
        ))}
      </div>
    </section>
  );
}
