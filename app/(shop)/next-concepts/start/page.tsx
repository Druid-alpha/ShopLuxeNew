import Link from "next/link";

export const metadata = {
  title: "Start Here | Next Concepts",
  description: "A quick onboarding guide to explore the Next.js concepts in this project.",
};

export default function NextConceptsStartPage() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-12">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Onboarding</p>
        <h1 className="mt-2 text-3xl font-black text-slate-900">Start Here</h1>
        <p className="mt-3 text-sm text-slate-600">
          This page is a quick guide to explore every Next.js concept we wired into the app.
        </p>

        <div className="mt-6 space-y-3 text-sm text-slate-700">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            1. Visit the checklist page and scan the topics.
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            2. Open one concept at a time and inspect the route files.
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            3. Trace data flow: server actions, caches, and route handlers.
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            href="/next-concepts"
            className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white"
          >
            Open checklist
          </Link>
          <Link
            href="/products/featured"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold"
          >
            Start with caching demo
          </Link>
        </div>
      </div>
    </section>
  );
}
