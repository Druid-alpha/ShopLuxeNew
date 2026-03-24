import Link from "next/link";
import { notFound } from "next/navigation";
import ModalClose from "@/components/ModalClose";
import ModalNavigate from "@/components/ModalNavigate";
import { connectDB } from "@/lib/db";
import Order from "@/lib/db/models/order";

type Params = Promise<{ id: string }>;

export default async function AdminOrderModal({ params }: { params: Params }) {
  const { id } = await params;
  await connectDB();
  const order = await Order.findById(id).select("status totalAmount createdAt").lean();

  if (!order) notFound();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
      <ModalClose
        fallbackHref="/admin/overview"
        ariaLabel="Close order modal"
        className="absolute inset-0 bg-black/50"
      >
        <span className="sr-only">Close</span>
      </ModalClose>
      <div className="relative z-10 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-black text-slate-900">Order #{order._id}</h2>
        <div className="mt-4 space-y-2 text-sm text-slate-600">
          <p>Status: <span className="font-semibold text-slate-900">{order.status || "pending"}</span></p>
          <p>Total: <span className="font-semibold text-slate-900">₦{Number(order.totalAmount || 0).toLocaleString()}</span></p>
          <p>Created: {new Date(order.createdAt).toLocaleString()}</p>
        </div>
        <div className="mt-6 flex gap-3">
          <ModalClose
            fallbackHref="/admin/overview"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold"
          >
            Close
          </ModalClose>
          <ModalNavigate
            href={`/admin/overview/orders/${id}`}
            className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white"
          >
            Open full page
          </ModalNavigate>
        </div>
      </div>
    </div>
  );
}
