import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-16 text-center">
      <h1 className="text-3xl font-extrabold text-slate-900">Admin page not found</h1>
      <p className="mt-3 text-sm text-slate-600">
        The admin page you are looking for does not exist.
      </p>
      <div className="mt-6">
        <Link href="/admin" className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white">
          Go to dashboard
        </Link>
      </div>
    </section>
  );
}

