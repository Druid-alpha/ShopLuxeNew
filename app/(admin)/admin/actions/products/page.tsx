import Link from "next/link";
import { connectDB } from "@/lib/db";
import Product from "@/lib/db/models/product";
import ProductsList from "./ProductsList";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata = {
  title: "Admin Product Actions | ShopLuxe",
  description: "Server Actions with optimistic UI for product management.",
};

export default async function AdminProductActionsPage() {
  await connectDB();
  const products = await Product.find({ isDeleted: false })
    .sort({ createdAt: -1 })
    .limit(10)
    .select("_id title price featured isDeleted")
    .lean();

  const mapped = products.map((p: any) => ({
    id: String(p._id),
    title: String(p.title || "Untitled product"),
    price: Number(p.price || 0),
    featured: Boolean(p.featured),
    isDeleted: Boolean(p.isDeleted),
  }));

  return (
    <section className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Admin Product Actions</h1>
          <p className="mt-2 text-sm text-slate-600">
            This page demonstrates server actions + optimistic UI.
          </p>
        </div>
        <Link
          href="/admin"
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold"
        >
          Back to admin
        </Link>
      </div>

      <div className="mt-8">
        <ProductsList products={mapped} />
      </div>
    </section>
  );
}
