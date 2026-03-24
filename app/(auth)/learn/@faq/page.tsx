export default function FAQSlot() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">FAQ</h2>
      <div className="mt-4 space-y-4 text-sm text-slate-600">
        <div>
          <p className="font-semibold text-slate-800">Why parallel routes?</p>
          <p>They let each panel load independently with its own loading/error states.</p>
        </div>
        <div>
          <p className="font-semibold text-slate-800">Why intercepting routes?</p>
          <p>They render a modal on top of the current page without losing context.</p>
        </div>
      </div>
    </section>
  );
}
