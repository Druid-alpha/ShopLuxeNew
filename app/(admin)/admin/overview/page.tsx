import Link from "next/link";
import { Suspense } from "react";
import { refreshAdminOverview } from "./actions";
import Insights from "./Insights";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata = {
  title: "Admin Overview | ShopLuxe",
  description: "Live admin stats, activity, and alerts.",
};

export default function AdminOverviewPage() {
  return (
    <section className="mx-auto max-w-6xl px-6 pt-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Admin</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Overview</h1>
          <p className="mt-2 text-sm text-slate-600">
            Parallel routes + server cache + revalidation in one place.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <form action={refreshAdminOverview}>
            <button
              type="submit"
              className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white"
            >
              Refresh stats
            </button>
          </form>
          <Link
            href="/admin"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
      <div className="mt-6">
        <Suspense
          fallback={
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="h-4 w-24 rounded bg-slate-200 animate-pulse" />
              <div className="mt-3 h-4 w-72 rounded bg-slate-100 animate-pulse" />
            </div>
          }
        >
          <Insights />
        </Suspense>
      </div>
    </section>
  );
}
