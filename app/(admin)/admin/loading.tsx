export default function Loading() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <div className="h-6 w-48 rounded bg-slate-200 animate-pulse" />
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={`admin-tab-skeleton-${idx}`} className="h-24 rounded-xl border border-slate-100 bg-white" />
        ))}
      </div>
    </section>
  );
}
