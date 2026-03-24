"use client";

import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="mx-auto max-w-3xl px-6 py-16 text-center">
      <h1 className="text-2xl font-bold text-slate-900">Something went wrong</h1>
      <p className="mt-3 text-sm text-slate-600">
        {error?.message || "We ran into an unexpected issue while loading this page."}
      </p>
      <div className="mt-6 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white"
        >
          Try again
        </button>
        <Link href="/products" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold">
          Go to products
        </Link>
      </div>
    </section>
  );
}

