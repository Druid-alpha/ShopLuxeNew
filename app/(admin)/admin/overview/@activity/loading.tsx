export default function Loading() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="h-4 w-40 rounded bg-slate-200 animate-pulse" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: 5 }).map((_, idx) => (
          <div key={`activity-skeleton-${idx}`} className="h-10 rounded bg-slate-100 animate-pulse" />
        ))}
      </div>
    </section>
  );
}
