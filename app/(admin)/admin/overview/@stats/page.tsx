import { getAdminStats } from "@/lib/server/adminStats";

export default async function StatsSlot() {
  const stats = await getAdminStats();

  const items = [
    { label: "Total users", value: stats.totalUsers },
    { label: "Total orders", value: stats.totalOrders },
    { label: "Pending orders", value: stats.pendingOrders },
    { label: "Active products", value: stats.totalProducts },
  ];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">Stats</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item.label} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{item.label}</p>
            <p className="mt-2 text-2xl font-black text-slate-900">{item.value.toLocaleString()}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
