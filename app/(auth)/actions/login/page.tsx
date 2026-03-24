import Link from "next/link";
import LoginForm from "./LoginForm";

export const metadata = {
  title: "Server Action Login | ShopLuxe",
};

export default function LoginActionPage({
  searchParams,
}: {
  searchParams?: { returnTo?: string };
}) {
  return (
    <section className="min-h-[calc(100vh-130px)] bg-gradient-to-b from-white via-slate-50 to-slate-100 px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Server Action Login
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            This form submits with a server action and sets auth cookies.
          </p>
        </div>

        <LoginForm returnTo={searchParams?.returnTo} />

        <div className="mt-8 border-t border-slate-200 pt-6 text-center">
          <Link href="/login" className="text-sm font-semibold text-slate-900 hover:underline">
            Back to regular login
          </Link>
        </div>
      </div>
    </section>
  );
}
