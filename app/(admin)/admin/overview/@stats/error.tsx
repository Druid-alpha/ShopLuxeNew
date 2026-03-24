"use client";

export default function Error({ error }: { error: Error & { digest?: string } }) {
  return (
    <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
      <h2 className="text-sm font-black uppercase tracking-[0.3em] text-rose-500">Stats Error</h2>
      <p className="mt-2 text-sm text-rose-700">{error?.message || "Failed to load stats."}</p>
    </section>
  );
}
