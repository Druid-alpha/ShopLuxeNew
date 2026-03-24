import Link from "next/link";

export const metadata = {
  title: "Auth Learning Hub | ShopLuxe",
  description: "Parallel routes and intercepting routes in the auth group.",
};

export default function LearnPage() {
  return (
    <section className="mx-auto max-w-5xl px-6 pt-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Auth</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Learning Hub</h1>
          <p className="mt-2 text-sm text-slate-600">
            This page demonstrates parallel routes and intercepting routes in the auth group.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/next-concepts"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold"
          >
            Concepts checklist
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold"
          >
            Back to login
          </Link>
        </div>
      </div>
    </section>
  );
}
