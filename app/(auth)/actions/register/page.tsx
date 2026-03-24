import Link from "next/link";
import RegisterForm from "./RegisterForm";

export const metadata = {
  title: "Server Action Register | ShopLuxe",
};

export default function RegisterActionPage() {
  return (
    <section className="min-h-[calc(100vh-130px)] bg-gradient-to-b from-white via-slate-50 to-slate-100 px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Server Action Register
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            This form uses a server action and redirects to email verification.
          </p>
        </div>

        <RegisterForm />

        <div className="mt-8 border-t border-slate-200 pt-6 text-center">
          <Link href="/register" className="text-sm font-semibold text-slate-900 hover:underline">
            Back to regular register
          </Link>
        </div>
      </div>
    </section>
  );
}
