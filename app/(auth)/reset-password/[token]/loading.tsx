export default function Loading() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-6 w-56 rounded bg-slate-200 animate-pulse" />
        <div className="mt-3 h-4 w-72 rounded bg-slate-100 animate-pulse" />
        <div className="mt-8 space-y-4">
          <div className="h-11 rounded bg-slate-100 animate-pulse" />
          <div className="h-11 rounded bg-slate-100 animate-pulse" />
        </div>
      </div>
    </section>
  );
}
