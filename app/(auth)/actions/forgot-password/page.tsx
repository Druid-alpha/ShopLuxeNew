import Link from "next/link";
import ForgotForm from "./ForgotForm";

export const metadata = {
  title: "Server Action Password Reset | ShopLuxe",
};

export default function ForgotActionPage() {
  return (
    <section className="min-h-[calc(100vh-130px)] bg-gradient-to-b from-white via-slate-50 to-slate-100 px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Server Action Reset
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            This form submits directly to a server action.
          </p>
        </div>

        <ForgotForm />

        <div className="mt-8 border-t border-slate-200 pt-6 text-center">
          <Link href="/forgot-password" className="text-sm font-semibold text-slate-900 hover:underline">
            Back to regular flow
          </Link>
        </div>
      </div>
    </section>
  );
}
