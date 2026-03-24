export default function Loading() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-12">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="h-6 w-48 rounded bg-slate-200 animate-pulse" />
        <div className="mt-3 h-4 w-72 rounded bg-slate-100 animate-pulse" />
        <div className="mt-8 space-y-4">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={`auth-skeleton-${idx}`} className="h-11 rounded bg-slate-100 animate-pulse" />
          ))}
        </div>
      </div>
    </section>
  );
}
