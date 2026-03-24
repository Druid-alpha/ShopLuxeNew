export default function Loading() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-10">
      <div className="h-6 w-48 rounded bg-slate-200 animate-pulse" />
      <div className="mt-6 space-y-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={`product-action-skeleton-${idx}`} className="h-16 rounded-xl bg-slate-100 animate-pulse" />
        ))}
      </div>
    </section>
  );
}
