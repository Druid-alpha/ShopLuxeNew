import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-16 text-center">
      <h1 className="text-2xl font-bold text-slate-900">Products not found</h1>
      <p className="mt-3 text-sm text-slate-600">Try adjusting filters or return to the full catalog.</p>
      <div className="mt-6">
        <Link href="/products" className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white">
          View all products
        </Link>
      </div>
    </section>
  );
}

