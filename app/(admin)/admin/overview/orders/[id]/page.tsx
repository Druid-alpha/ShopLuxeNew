import Link from "next/link";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import Order from "@/lib/db/models/order";

export async function generateMetadata({ params }: { params: { id: string } }) {
  return {
    title: `Order ${params.id} | Admin Overview`,
  };
}

export default async function AdminOrderPage({ params }: { params: { id: string } }) {
  await connectDB();
  const order = await Order.findById(params.id).select("status totalAmount createdAt").lean();

  if (!order) notFound();

  return (
    <section className="mx-auto max-w-4xl px-6 py-12">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-black text-slate-900">Order #{order._id}</h1>
        <div className="mt-4 space-y-2 text-sm text-slate-600">
          <p>Status: <span className="font-semibold text-slate-900">{order.status || "pending"}</span></p>
          <p>Total: <span className="font-semibold text-slate-900">₦{Number(order.totalAmount || 0).toLocaleString()}</span></p>
          <p>Created: {new Date(order.createdAt).toLocaleString()}</p>
        </div>
        <div className="mt-6">
          <Link
            href="/admin/overview"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold"
          >
            Back to overview
          </Link>
        </div>
      </div>
    </section>
  );
}
