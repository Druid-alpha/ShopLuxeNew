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
      <h1 className="text-2xl font-bold text-slate-900">Password reset failed</h1>
      <p className="mt-3 text-sm text-slate-600">
        {error?.message || "Your reset link might be expired. Please request a new one."}
      </p>
      <div className="mt-6 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white"
        >
          Retry
        </button>
        <Link href="/forgot-password" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold">
          Request new link
        </Link>
      </div>
    </section>
  );
}

