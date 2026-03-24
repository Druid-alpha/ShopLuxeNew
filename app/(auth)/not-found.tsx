import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-16 text-center">
      <h1 className="text-3xl font-extrabold text-slate-900">Auth page not found</h1>
      <p className="mt-3 text-sm text-slate-600">
        The account page you are looking for does not exist.
      </p>
      <div className="mt-6">
        <Link href="/login" className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white">
          Go to login
        </Link>
      </div>
    </section>
  );
}

