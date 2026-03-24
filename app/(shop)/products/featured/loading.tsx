export default function Loading() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-10">
      <div className="h-6 w-48 rounded bg-slate-200 animate-pulse" />
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, idx) => (
          <div key={`featured-skeleton-${idx}`} className="h-48 rounded-xl bg-slate-100 animate-pulse" />
        ))}
      </div>
    </section>
  );
}
