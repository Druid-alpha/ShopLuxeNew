export default function Loading() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="h-4 w-24 rounded bg-slate-200 animate-pulse" />
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={`stats-skeleton-${idx}`} className="h-20 rounded-xl bg-slate-100 animate-pulse" />
        ))}
      </div>
    </section>
  );
}
