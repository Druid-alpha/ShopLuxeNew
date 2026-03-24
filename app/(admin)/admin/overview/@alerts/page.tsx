import { getAdminStats } from "@/lib/server/adminStats";

export default async function AlertsSlot() {
  const stats = await getAdminStats();
  const hasPending = stats.pendingOrders > 0;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">Alerts</h2>
      <div className="mt-4 space-y-4">
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">Pending orders</p>
          <p className="mt-1 text-sm text-slate-600">
            {hasPending
              ? `${stats.pendingOrders} orders need attention.`
              : "No pending orders right now."}
          </p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">Inventory health</p>
          <p className="mt-1 text-sm text-slate-600">
            {stats.totalProducts < 10
              ? "Low product count. Consider restocking."
              : "Inventory looks healthy."}
          </p>
        </div>
      </div>
    </section>
  );
}
