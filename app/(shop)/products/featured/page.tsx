import Link from "next/link";
import { Suspense } from "react";
import { refreshFeaturedProducts } from "./actions";
import FeaturedGrid from "./FeaturedGrid";

export const metadata = {
  title: "Featured Products | ShopLuxe",
  description: "Server-rendered featured products with cache revalidation.",
};

export const revalidate = 120;
export const runtime = "nodejs";

export default async function FeaturedProductsPage() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Featured Products</h1>
          <p className="mt-2 text-sm text-slate-600">
            This page uses server cache + revalidation.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <form action={refreshFeaturedProducts}>
            <button
              type="submit"
              className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white"
            >
              Refresh featured
            </button>
          </form>
          <Link
            href="/products"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold"
          >
            Back to all products
          </Link>
        </div>
      </div>

      <div className="mt-8">
        <Suspense
          fallback={
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, idx) => (
                <div key={`featured-fallback-${idx}`} className="h-48 rounded-xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          }
        >
          <FeaturedGrid />
        </Suspense>
      </div>
    </section>
  );
}
