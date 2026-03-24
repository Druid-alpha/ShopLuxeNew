import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-16 text-center">
      <h1 className="text-2xl font-bold text-slate-900">Admin section not found</h1>
      <p className="mt-3 text-sm text-slate-600">
        This admin section might be unavailable or removed.
      </p>
      <div className="mt-6">
        <Link href="/admin" className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white">
          Back to dashboard
        </Link>
      </div>
    </section>
  );
}

