import Link from "next/link";
import { cookies } from "next/headers";
import { clearDemoCartAction } from "./actions";

export const metadata = {
  title: "Cart Server Actions | ShopLuxe",
  description: "Server actions demo for cart flows.",
};

export const runtime = "nodejs";

export default async function CartActionsPage() {
  const cookieStore = await cookies();
  const demoCart = cookieStore.get("demoCart")?.value || "";

  return (
    <section className="mx-auto max-w-4xl px-6 py-12">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-black text-slate-900">Cart Server Actions</h1>
        <p className="mt-2 text-sm text-slate-600">
          This is a demo cart cookie you can clear via a server action.
        </p>

        <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
          Current demo cart cookie: {demoCart ? demoCart : "empty"}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <form action={clearDemoCartAction}>
            <button
              type="submit"
              className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white"
            >
              Clear demo cart
            </button>
          </form>
          <Link
            href="/cart"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold"
          >
            Back to cart
          </Link>
        </div>
      </div>
    </section>
  );
}
